import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';

import { createApp } from '../server.ts';
import { resetDbConnectionCheck } from '../src/db/index.ts';
import { resetJsonStoreCacheForTests } from '../src/db/repository.ts';
import { authRateLimiter, apiRateLimiter } from '../src/server/rateLimiter.ts';
import { DEMO_ROLE_PROFILES, ROLE_ACCESS_ORDER } from '../src/utils/demoAccounts.ts';

class TestCookieJar {
  private cookies = new Map<string, string>();

  updateFromResponse(res: Response): void {
    const rawSetCookies =
      typeof res.headers.getSetCookie === 'function'
        ? res.headers.getSetCookie()
        : res.headers.get('set-cookie')
        ? [res.headers.get('set-cookie')!]
        : [];
    for (const entry of rawSetCookies) {
      const firstPart = entry.split(';')[0] || '';
      const eq = firstPart.indexOf('=');
      if (eq <= 0) continue;
      const name = firstPart.slice(0, eq).trim();
      const val = firstPart.slice(eq + 1).trim();
      if (!val || /expires=Thu, 01 Jan 1970/i.test(entry) || /max-age=0/i.test(entry)) {
        this.cookies.delete(name);
      } else {
        this.cookies.set(name, val);
      }
    }
  }

  get cookieHeader(): string {
    return Array.from(this.cookies.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
  }

  get csrfToken(): string {
    return this.cookies.get('lynk_csrf') || '';
  }

  async request(baseUrl: string, pathname: string, init: RequestInit = {}): Promise<Response> {
    const headers = new Headers(init.headers || {});
    if (this.cookieHeader && !headers.has('Cookie')) {
      headers.set('Cookie', this.cookieHeader);
    }
    const method = (init.method || 'GET').toUpperCase();
    if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
      if (!headers.has('Origin')) {
        headers.set('Origin', baseUrl);
      }
      if (!headers.has('X-Lynk-Requested-With')) {
        headers.set('X-Lynk-Requested-With', 'fetch');
      }
      if (this.csrfToken && !headers.has('X-Lynk-CSRF')) {
        headers.set('X-Lynk-CSRF', this.csrfToken);
      }
    }
    const res = await fetch(`${baseUrl}${pathname}`, {
      ...init,
      headers,
      redirect: 'manual',
    });
    this.updateFromResponse(res);
    return res;
  }
}

describe('Multi-Role Access & Demo Seeding (Super Admin, Admin, Editor, Viewer)', () => {
  let tmpDataDir: string;
  let server: http.Server;
  let baseUrl: string;

  before(async () => {
    tmpDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lynk-roles-demo-test-'));
    process.env.LYNK_DATA_DIR = tmpDataDir;
    process.env.NODE_ENV = 'test';
    process.env.AUTH_RATE_LIMIT_MAX = '40';
    delete process.env.DATABASE_URL;
    delete process.env.PGHOST;

    authRateLimiter.reset();
    apiRateLimiter.reset();
    resetJsonStoreCacheForTests();
    await resetDbConnectionCheck();

    const app = await createApp({ attachViteOrStatic: false });
    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', () => resolve());
    });
    const addr = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${addr.port}`;
  });

  after(async () => {
    await new Promise<void>((resolve) => {
      server?.close(() => resolve());
    });
    fs.rmSync(tmpDataDir, { recursive: true, force: true });
    delete process.env.LYNK_DATA_DIR;
    delete process.env.AUTH_RATE_LIMIT_MAX;
    process.env.NODE_ENV = 'test';
  });

  it('reports safe demo metadata on empty store without leaking passwords', async () => {
    const jar = new TestCookieJar();
    const res = await jar.request(baseUrl, '/api/auth/me');
    assert.equal(res.status, 200);
    const bodyText = await res.text();
    const data = JSON.parse(bodyText) as {
      needsSetup: boolean;
      demoModeAvailable: boolean;
      demoAccountsSeeded: boolean;
      roleSummary: Record<string, number>;
    };

    assert.equal(data.needsSetup, true);
    assert.equal(data.demoModeAvailable, true);
    assert.equal(data.demoAccountsSeeded, false);
    assert.deepEqual(data.roleSummary, {
      super_admin: 0,
      admin: 0,
      editor: 0,
      viewer: 0,
    });

    for (const role of ROLE_ACCESS_ORDER) {
      assert.equal(
        bodyText.includes(DEMO_ROLE_PROFILES[role].demoPassword),
        false,
        `Password demo ${role} tidak boleh dikirim di /api/auth/me`
      );
    }
  });

  it('seeds all 4 RBAC demo accounts on empty store and allows login by email & username alias', async () => {
    const jar = new TestCookieJar();
    await jar.request(baseUrl, '/api/auth/me');

    const seedRes = await jar.request(baseUrl, '/api/auth/seed-demo-roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.equal(seedRes.status, 201);
    const seedBody = (await seedRes.json()) as {
      ok: boolean;
      createdCount: number;
      totalDemoRoles: number;
    };
    assert.equal(seedBody.ok, true);
    assert.equal(seedBody.createdCount, 4);
    assert.equal(seedBody.totalDemoRoles, 4);

    const meRes = await jar.request(baseUrl, '/api/auth/me');
    const meData = (await meRes.json()) as {
      needsSetup: boolean;
      demoAccountsSeeded: boolean;
      roleSummary: Record<string, number>;
    };
    assert.equal(meData.needsSetup, false);
    assert.equal(meData.demoAccountsSeeded, true);
    assert.deepEqual(meData.roleSummary, {
      super_admin: 1,
      admin: 1,
      editor: 1,
      viewer: 1,
    });

    for (const role of ROLE_ACCESS_ORDER) {
      const profile = DEMO_ROLE_PROFILES[role];

      const emailJar = new TestCookieJar();
      await emailJar.request(baseUrl, '/api/auth/me');
      const emailLogin = await emailJar.request(baseUrl, '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: profile.email,
          password: profile.demoPassword,
        }),
      });
      assert.equal(emailLogin.status, 200, `Login email gagal untuk ${role}`);
      const emailUser = (await emailLogin.json()) as {
        ok: boolean;
        user: { role: string; email: string; permissions: Record<string, boolean> };
      };
      assert.equal(emailUser.user.role, role);
      assert.equal(emailUser.user.email, profile.email);

      const aliasJar = new TestCookieJar();
      await aliasJar.request(baseUrl, '/api/auth/me');
      const aliasLogin = await aliasJar.request(baseUrl, '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: profile.usernameAlias,
          password: profile.demoPassword,
        }),
      });
      assert.equal(aliasLogin.status, 200, `Login alias username gagal untuk ${role}`);
      const aliasUser = (await aliasLogin.json()) as {
        user: { role: string; permissions: Record<string, boolean> };
      };
      assert.equal(aliasUser.user.role, role);

      const apiSettingsRes = await aliasJar.request(baseUrl, '/api/settings/api');
      if (role === 'super_admin') {
        assert.equal(apiSettingsRes.status, 200);
        assert.equal(aliasUser.user.permissions.access_control, true);
      } else {
        assert.equal(apiSettingsRes.status, 403);
        assert.equal(aliasUser.user.permissions.access_control, false);
      }
    }
  });

  it('rejects unauthenticated seed-demo-roles once users exist and blocks demo mode in production', async () => {
    const anonJar = new TestCookieJar();
    await anonJar.request(baseUrl, '/api/auth/me');

    const unauthSeed = await anonJar.request(baseUrl, '/api/auth/seed-demo-roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.equal(unauthSeed.status, 409);
    const conflictBody = (await unauthSeed.json()) as { code?: string };
    assert.equal(conflictBody.code, 'SETUP_ALREADY_COMPLETED');

    const prevNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const prodMe = await anonJar.request(baseUrl, '/api/auth/me');
      assert.equal(prodMe.status, 200);
      const prodMeBody = (await prodMe.json()) as {
        demoModeAvailable: boolean;
        demoAccountsSeeded: boolean;
      };
      assert.equal(prodMeBody.demoModeAvailable, false);
      assert.equal(prodMeBody.demoAccountsSeeded, false);

      const prodSeed = await anonJar.request(baseUrl, '/api/auth/seed-demo-roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      assert.equal(prodSeed.status, 403);

      const prodLogin = await anonJar.request(baseUrl, '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: DEMO_ROLE_PROFILES.super_admin.email,
          password: DEMO_ROLE_PROFILES.super_admin.demoPassword,
        }),
      });
      assert.equal(prodLogin.status, 200);
      const prodLoginBody = (await prodLogin.json()) as { ok: boolean; sessionToken?: string };
      assert.equal(prodLoginBody.ok, true);
      assert.equal(prodLoginBody.sessionToken, undefined);
    } finally {
      process.env.NODE_ENV = prevNodeEnv;
    }
  });

  it('supports cookie-less in-memory Bearer fallback for preview iframes in non-production mode', async () => {
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: baseUrl,
        'X-Lynk-Requested-With': 'fetch',
      },
      body: JSON.stringify({
        email: DEMO_ROLE_PROFILES.super_admin.email,
        password: DEMO_ROLE_PROFILES.super_admin.demoPassword,
      }),
    });
    assert.equal(loginRes.status, 200);
    const loginBody = (await loginRes.json()) as {
      ok: boolean;
      sessionToken?: string;
      user?: { role: string };
    };
    assert.equal(loginBody.ok, true);
    assert.equal(loginBody.user?.role, 'super_admin');
    assert.ok(loginBody.sessionToken, 'Non-production login should return fallback sessionToken for iframe mode');

    // Simulate browser dropping cookies: send request with NO Cookie header, only Bearer token
    const meRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${loginBody.sessionToken}`,
      },
    });
    assert.equal(meRes.status, 200);
    const meBody = (await meRes.json()) as {
      authenticated: boolean;
      user: { role: string } | null;
    };
    assert.equal(meBody.authenticated, true);
    assert.equal(meBody.user?.role, 'super_admin');

    const apiRes = await fetch(`${baseUrl}/api/settings/api`, {
      headers: {
        Authorization: `Bearer ${loginBody.sessionToken}`,
      },
    });
    assert.equal(apiRes.status, 200);
  });
});

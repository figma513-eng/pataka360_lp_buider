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
import { resetCachedSecretForTests, validateStartupSecrets } from '../src/server/secrets.ts';
import { assertSafeExternalUrl, safeFetch, readResponseTextWithCap } from '../src/server/ssrfGuard.ts';
import { INITIAL_PROJECT } from '../src/data/presets.ts';

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

describe('Security Suite (P0-A, SSRF, CSRF, Secrets, RateLimit, XSS)', () => {
  let tmpDataDir: string;
  let server: http.Server;
  let baseUrl: string;
  let ownerJar: TestCookieJar;
  let viewerJar: TestCookieJar;
  let editorJar: TestCookieJar;
  let ownerUserId: string;
  let projectAId: string;
  let projectBId: string;

  before(async () => {
    tmpDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lynk-sec-test-'));
    process.env.LYNK_DATA_DIR = tmpDataDir;
    process.env.NODE_ENV = 'test';
    process.env.AUTH_RATE_LIMIT_MAX = '6';
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
  });

  it('P0-A: Concurrent first-registration yields exactly ONE super_admin and others viewer', async () => {
    const jars = [new TestCookieJar(), new TestCookieJar(), new TestCookieJar()];
    // Fetch initial CSRF cookies
    await Promise.all(jars.map((j) => j.request(baseUrl, '/api/auth/me')));

    const payloads = [
      { name: 'User Satu', email: 'satu@test.local', password: 'Password123!' },
      { name: 'User Dua', email: 'dua@test.local', password: 'Password123!' },
      { name: 'User Tiga', email: 'tiga@test.local', password: 'Password123!' },
    ];

    const responses = await Promise.all(
      jars.map((j, idx) =>
        j.request(baseUrl, '/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payloads[idx]),
        })
      )
    );

    const bodies = await Promise.all(responses.map((r) => r.json() as Promise<{ user?: { id: string; role: string } }>));
    for (const r of responses) assert.equal(r.status, 201);

    const superAdmins = bodies
      .map((b, i) => ({ user: b.user!, jar: jars[i] }))
      .filter((x) => x.user.role === 'super_admin');
    const viewers = bodies
      .map((b, i) => ({ user: b.user!, jar: jars[i] }))
      .filter((x) => x.user.role === 'viewer');

    assert.equal(superAdmins.length, 1, 'Exactly one initial super_admin expected');
    assert.equal(viewers.length, 2, 'Remaining concurrent signups must become viewer');

    ownerJar = superAdmins[0].jar;
    ownerUserId = superAdmins[0].user.id;
    viewerJar = viewers[0].jar;
    editorJar = viewers[1].jar;

    // Verify HttpOnly & SameSite=Lax cookie flags on login
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: baseUrl,
        'X-Lynk-Requested-With': 'fetch',
        Cookie: `lynk_csrf=${ownerJar.csrfToken}`,
        'X-Lynk-CSRF': ownerJar.csrfToken,
      },
      body: JSON.stringify({
        email: payloads[bodies.findIndex((b) => b.user?.id === ownerUserId)].email,
        password: 'Password123!',
      }),
    });
    assert.equal(loginRes.status, 200);
    const setCookies = loginRes.headers.getSetCookie().join(' | ');
    assert.match(setCookies, /HttpOnly/i);
    assert.match(setCookies, /SameSite=Lax/i);
    assert.ok(!setCookies.includes('undefined'));
  });

  it('P0-A: Anonymous access to private endpoints returns 401 even if requireAuthForBuilder=false', async () => {
    const anon = new TestCookieJar();
    // Temporarily toggle requireAuthForBuilder = false as owner
    const setRes = await ownerJar.request(baseUrl, '/api/settings/api', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings: { requireAuthForBuilder: false } }),
    });
    assert.equal(setRes.status, 200);

    await anon.request(baseUrl, '/api/auth/me');

    const privatePaths: Array<{ method: string; path: string }> = [
      { method: 'GET', path: '/api/projects' },
      { method: 'GET', path: '/api/access-settings' },
      { method: 'GET', path: '/api/settings/api' },
      { method: 'GET', path: '/api/backup/export' },
      { method: 'POST', path: '/api/projects/proj_x/save' },
    ];
    for (const ep of privatePaths) {
      const r = await anon.request(baseUrl, ep.path, {
        method: ep.method,
        headers: ep.method === 'POST' ? { 'Content-Type': 'application/json' } : undefined,
        body: ep.method === 'POST' ? JSON.stringify({}) : undefined,
      });
      assert.equal(r.status, 401, `${ep.method} ${ep.path} must return 401 for anonymous`);
    }

    // Restore strict auth
    await ownerJar.request(baseUrl, '/api/settings/api', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings: { requireAuthForBuilder: true } }),
    });
  });

  it('P0-A: Role self-elevation, scope enforcement, and save/publish ID mismatch guards', async () => {
    // Owner creates two projects: A and B
    projectAId = 'proj_alpha_1';
    projectBId = 'proj_beta_2';

    const saveA = await ownerJar.request(baseUrl, `/api/projects/${projectAId}/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        record: {
          id: projectAId,
          project: {
            ...INITIAL_PROJECT,
            title: 'Usaha Alpha',
            publishing: { ...INITIAL_PROJECT.publishing, slug: 'usaha-alpha', isPublished: true },
          },
          updatedAt: Date.now(),
        },
        renderedHtml: '<html></html>',
      }),
    });
    assert.equal(saveA.status, 200);

    const saveB = await ownerJar.request(baseUrl, `/api/projects/${projectBId}/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        record: {
          id: projectBId,
          project: {
            ...INITIAL_PROJECT,
            title: 'Usaha Beta',
            publishing: { ...INITIAL_PROJECT.publishing, slug: 'usaha-beta', isPublished: false },
          },
          updatedAt: Date.now(),
        },
        renderedHtml: '<html></html>',
      }),
    });
    assert.equal(saveB.status, 200);

    // Owner updates second user as editor scoped ONLY to projectAId, and grants access_control to test self-elevation check
    const accRes = await ownerJar.request(baseUrl, '/api/access-settings');
    const accData = (await accRes.json()) as { settings: { members: Array<Record<string, unknown>> } };
    const editorMeRes = await editorJar.request(baseUrl, '/api/auth/me');
    const editorMe = (await editorMeRes.json()) as { user: { id: string } };

    const updatedMembers = accData.settings.members.map((m) =>
      m.id === editorMe.user.id
        ? {
            ...m,
            role: 'editor',
            unitScope: [projectAId],
            permissions: {
              editor: true,
              projects: false,
              publishing: true,
              ads_wa: false,
              analytics: true,
              export_backup: true,
              access_control: true,
            },
          }
        : m
    );
    const putAcc = await ownerJar.request(baseUrl, '/api/access-settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings: { ...accData.settings, members: updatedMembers } }),
    });
    assert.equal(putAcc.status, 200);

    // Test 4: Self-elevation attempt by editor must return 403
    const selfElevate = await editorJar.request(baseUrl, '/api/access-settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        settings: {
          ...accData.settings,
          members: updatedMembers.map((m) =>
            m.id === editorMe.user.id ? { ...m, role: 'super_admin' } : m
          ),
        },
      }),
    });
    assert.equal(selfElevate.status, 403);

    // Test 7: Out-of-scope access (editor accessing project B) returns 403
    const outOfScopeSave = await editorJar.request(baseUrl, `/api/projects/${projectBId}/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        record: { id: projectBId, project: INITIAL_PROJECT, updatedAt: Date.now() },
        renderedHtml: '',
      }),
    });
    assert.equal(outOfScopeSave.status, 403);

    // Viewer cannot save project A either (403)
    const viewerSave = await viewerJar.request(baseUrl, `/api/projects/${projectAId}/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        record: { id: projectAId, project: INITIAL_PROJECT, updatedAt: Date.now() },
        renderedHtml: '',
      }),
    });
    assert.equal(viewerSave.status, 403);

    // Test 8 & 9: Save and Publish with URL project A and body project B rejected (400)
    const mismatchSave = await editorJar.request(baseUrl, `/api/projects/${projectAId}/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        record: { id: projectBId, project: INITIAL_PROJECT, updatedAt: Date.now() },
        renderedHtml: '',
      }),
    });
    assert.equal(mismatchSave.status, 400);

    const mismatchPub = await editorJar.request(baseUrl, `/api/projects/${projectAId}/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        record: { id: projectBId, project: INITIAL_PROJECT, updatedAt: Date.now() },
        renderedHtml: '',
      }),
    });
    assert.equal(mismatchPub.status, 400);
  });

  it('F-03 SSRF Protection: Blocks private/loopback/metadata/hex IPs, non-standard ports, & redirect hops to localhost', async () => {
    const blockedUrls = [
      'http://127.0.0.1/secret',
      'http://localhost:3000/api/health',
      'http://169.254.169.254/latest/meta-data/',
      'http://[::1]/admin',
      'http://[::ffff:127.0.0.1]/admin',
      'http://10.0.0.1/',
      'http://192.168.1.1/',
      'http://100.64.0.5/',
      'https://user:pass@example.com/hook',
      'https://example.com:8443/hook',
      'ftp://example.com/file',
    ];
    for (const u of blockedUrls) {
      await assert.rejects(
        () => assertSafeExternalUrl(u),
        /diblokir|tidak diizinkan|terlarang|port|kredensial|userinfo|protokol/i,
        `Should block ${u}`
      );
    }

    // Also test webhook save rejects private URL via HTTP 400
    const badHook = await ownerJar.request(baseUrl, '/api/settings/api', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings: { webhookUrl: 'http://127.0.0.1/internal' } }),
    });
    assert.equal(badHook.status, 400);

    // Redirect hop from public-looking IP -> 127.0.0.1 is blocked inside safeFetch
    await assert.rejects(
      () =>
        safeFetch('http://127.0.0.1/redirect', { maxRedirects: 2 }),
      /diblokir/i
    );

    // Streaming response byte cap check
    const encoder = new TextEncoder();
    const bigStream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('A'.repeat(2048)));
        controller.close();
      },
    });
    const fakeRes = new Response(bigStream, { status: 200 });
    await assert.rejects(() => readResponseTextWithCap(fakeRes, 512), /batas maksimal|batas ukuran/i);
  });

  it('F-04 CSRF Guard: Blocks cross-site mutations and missing CSRF header', async () => {
    const crossOrigin = await fetch(`${baseUrl}/api/settings/api`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: ownerJar.cookieHeader,
        Origin: 'https://attacker.example',
        'Sec-Fetch-Site': 'cross-site',
        'X-Lynk-CSRF': ownerJar.csrfToken,
      },
      body: JSON.stringify({ settings: { rateLimitPerMinute: 99 } }),
    });
    assert.equal(crossOrigin.status, 403);

    const missingCsrf = await fetch(`${baseUrl}/api/settings/api`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: ownerJar.cookieHeader,
        Origin: baseUrl,
      },
      body: JSON.stringify({ settings: { rateLimitPerMinute: 99 } }),
    });
    assert.equal(missingCsrf.status, 403);
  });

  it('F-11 Production Secret Validation: Fail-closed if missing, weak, or placeholder', () => {
    const prevEnv = process.env.NODE_ENV;
    const prevSecret = process.env.SESSION_SECRET;
    try {
      process.env.NODE_ENV = 'production';
      delete process.env.SESSION_SECRET;
      assert.throws(() => validateStartupSecrets(), /SESSION_SECRET belum diatur/);

      process.env.SESSION_SECRET = 'short-secret';
      assert.throws(() => validateStartupSecrets(), /minimal 32/);

      process.env.SESSION_SECRET = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
      assert.throws(() => validateStartupSecrets(), /entropi/i);

      process.env.SESSION_SECRET = 'ganti-dengan-kombinasi-huruf-angka-acak-minimal-32-karakter';
      assert.throws(() => validateStartupSecrets(), /placeholder/i);

      process.env.SESSION_SECRET = '9b74c9897bac770ffc029102a200c5de112233445566778899aabbccddeeff00';
      assert.doesNotThrow(() => validateStartupSecrets());
    } finally {
      process.env.NODE_ENV = prevEnv;
      if (prevSecret === undefined) delete process.env.SESSION_SECRET;
      else process.env.SESSION_SECRET = prevSecret;
      resetCachedSecretForTests();
      validateStartupSecrets();
    }
  });

  it('F-12 Auth Rate Limiting & Enumeration Protection', async () => {
    const jar = new TestCookieJar();
    await jar.request(baseUrl, '/api/auth/me');

    // Identical error message for nonexistent email vs wrong password
    const rUnknown = await jar.request(baseUrl, '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'tidakada@test.local', password: 'WrongPassword1' }),
    });
    const rWrongPass = await jar.request(baseUrl, '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'satu@test.local', password: 'WrongPassword1' }),
    });
    assert.equal(rUnknown.status, 401);
    assert.equal(rWrongPass.status, 401);
    const b1 = (await rUnknown.json()) as { error: string };
    const b2 = (await rWrongPass.json()) as { error: string };
    assert.equal(b1.error, b2.error);

    // Exhaust email-scoped rate limit (max 6)
    let got429 = false;
    for (let i = 0; i < 8; i++) {
      const r = await jar.request(baseUrl, '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'dua@test.local', password: 'WrongPassword1' }),
      });
      if (r.status === 429) {
        got429 = true;
        assert.ok(r.headers.get('retry-after'));
        break;
      }
    }
    assert.equal(got429, true, 'Must enforce 429 rate limit on repeated login failures');
  });

  it('F-22 Stored XSS Sanitization: Server strips dangerous HTML & javascript: URIs before save and /p/:slug serve', async () => {
    const dirtyProject = {
      ...INITIAL_PROJECT,
      title: 'Toko Aman <script>alert(1)</script>',
      publishing: { ...INITIAL_PROJECT.publishing, slug: 'toko-aman-xss', isPublished: true },
      blocks: [
        {
          id: 'blk_xss_text',
          type: 'text' as const,
          style: { ...INITIAL_PROJECT.blocks[0].style, backgroundColor: 'expression(alert(1))' },
          content: {
            text: 'Teks biasa <script>rawTextTag()</script>',
          },
        },
        {
          id: 'blk_xss_rich',
          type: 'training_catalog' as const,
          style: { ...INITIAL_PROJECT.blocks[0].style },
          content: {
            trainingHeading: 'Kelas Aman',
            trainingDefaultExpanded: true,
            trainingCustomBoxes: [
              {
                id: 'box_xss',
                title: 'Deskripsi',
                contentHtml:
                  '<p>Halo</p><script>window.pwn=1</script><img src="x" onerror="alert(9)"><a href="javascript:alert(1)">Klik</a>',
              },
            ],
          },
        },
        {
          id: 'blk_xss_btn',
          type: 'button' as const,
          style: { ...INITIAL_PROJECT.blocks[0].style },
          content: {
            label: 'Tombol Bahaya',
            url: 'javascript:alert(document.cookie)',
          },
        },
      ],
    };

    const res = await ownerJar.request(baseUrl, `/api/projects/${projectAId}/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        record: {
          id: projectAId,
          baseRevision: 1,
          revision: 1,
          project: dirtyProject,
          updatedAt: Date.now(),
        },
        // Malicious spoofed HTML from client must be ignored by server!
        renderedHtml: '<html><body><script>alert("SPOOFED")</script></body></html>',
      }),
    });
    assert.equal(res.status, 200);

    // Fetch public rendered page
    const pubRes = await fetch(`${baseUrl}/p/toko-aman-xss`);
    assert.equal(pubRes.status, 200);
    const html = await pubRes.text();
    assert.ok(!html.includes('SPOOFED'), 'Server must ignore client-supplied HTML');
    assert.ok(!html.includes('<script>rawTextTag()</script>'), 'Plain text script tag must be escaped');
    assert.ok(!html.includes('window.pwn=1'), 'Stored rich HTML script tag & body must be stripped');
    assert.ok(!html.includes('onerror='), 'Event handler attribute must be stripped');
    assert.ok(!html.includes('javascript:alert'), 'javascript: URL must be neutralized');
    assert.ok(!html.includes('expression(alert'), 'CSS expression must be sanitized');
    assert.match(pubRes.headers.get('content-security-policy') || '', /object-src 'none'/);
  });

  it('Iframe & Cloud Run HTTPS Compatibility: Sets SameSite=None; Secure; Partitioned over HTTPS while preserving CSRF guard', async () => {
    const httpsMeRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: {
        'X-Forwarded-Proto': 'https',
      },
    });
    assert.equal(httpsMeRes.status, 200);
    const httpsMeCookies = httpsMeRes.headers.getSetCookie().join(' | ');
    assert.match(httpsMeCookies, /SameSite=None/i);
    assert.match(httpsMeCookies, /Secure/i);
    assert.match(httpsMeCookies, /Partitioned/i);

    const httpsMeData = (await httpsMeRes.json()) as { csrfToken?: string };
    assert.ok(httpsMeData.csrfToken);

    const httpsLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-Proto': 'https',
        Origin: baseUrl,
        'X-Lynk-Requested-With': 'fetch',
        Cookie: `lynk_csrf=${httpsMeData.csrfToken}`,
        'X-Lynk-CSRF': httpsMeData.csrfToken!,
      },
      body: JSON.stringify({
        email: 'satu@test.local',
        password: 'Password123!',
      }),
    });
    assert.equal(httpsLoginRes.status, 200);
    const loginCookies = httpsLoginRes.headers.getSetCookie().join(' | ');
    assert.match(loginCookies, /lynk_session=.*HttpOnly.*SameSite=None.*Secure.*Partitioned/i);

    // Cross-site request over HTTPS is still blocked by CSRF guard
    const csrfBlocked = await fetch(`${baseUrl}/api/settings/api`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-Proto': 'https',
        Origin: 'https://attacker.example',
        'Sec-Fetch-Site': 'cross-site',
        'X-Lynk-CSRF': httpsMeData.csrfToken!,
      },
      body: JSON.stringify({ settings: { rateLimitPerMinute: 77 } }),
    });
    assert.equal(csrfBlocked.status, 403);
  });

  it('Public Export Cart JS: GET /p/:slug emits valid executable <script> without broken escapes or stale renderedHtml', async () => {
    const pubRes = await fetch(`${baseUrl}/p/toko-aman-xss`);
    assert.equal(pubRes.status, 200);
    const html = await pubRes.text();

    // Every inline executable <script> in published HTML must parse cleanly without SyntaxError
    const scriptMatches = [...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)].filter(
      (m) => !/type=["']application\/(?:ld\+)?json["']/i.test(m[1]) && !/\bsrc=/i.test(m[1])
    );
    assert.ok(scriptMatches.length >= 1, 'Expected inline interactive script in published page');
    for (const m of scriptMatches) {
      assert.doesNotThrow(() => new Function(m[2]), 'Inline script must have valid JS syntax');
    }

    // Critical cart helpers & DOM hooks must be intact (not corrupted by template-literal unescaping)
    assert.ok(html.includes('id="lynk-cart-bar"'));
    assert.ok(html.includes('id="lynk-open-cart-btn"'));
    assert.ok(html.includes('id="lynk-subpage-cart"'));
    assert.ok(html.includes("replace(/[^\\d]/g, '')"), 'parsePrice/normalizeWa digit regex must stay intact');
    assert.ok(html.includes("lines.join('\\n')"), 'WhatsApp message newline join must stay escaped');
    assert.ok(!html.includes("split('\n')"), 'Unescaped literal newline inside split() must not exist');
  });
});

import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';

import { createApp } from '../server.ts';
import { resetDbConnectionCheck } from '../src/db/index.ts';
import { getProjectEntryBySlug, resetJsonStoreCacheForTests } from '../src/db/repository.ts';
import { authRateLimiter, apiRateLimiter } from '../src/server/rateLimiter.ts';
import { INITIAL_PROJECT, createBlock } from '../src/data/presets.ts';
import { cloneBlockDeep } from '../src/utils/treeHelpers.ts';
import { sanitizeBuilderProject } from '../src/utils/htmlSanitizer.ts';
import { generateProjectHtml } from '../src/utils/htmlExporter.ts';

class TestCookieJar {
  private cookies = new Map<string, string>();
  updateFromResponse(res: Response): void {
    const raw = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
    for (const entry of raw) {
      const part = entry.split(';')[0] || '';
      const eq = part.indexOf('=');
      if (eq > 0) this.cookies.set(part.slice(0, eq).trim(), part.slice(eq + 1).trim());
    }
  }
  async request(baseUrl: string, pathname: string, init: RequestInit = {}): Promise<Response> {
    const headers = new Headers(init.headers || {});
    const cookieStr = Array.from(this.cookies.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
    if (cookieStr) headers.set('Cookie', cookieStr);
    const method = (init.method || 'GET').toUpperCase();
    if (method !== 'GET' && method !== 'HEAD') {
      headers.set('Origin', baseUrl);
      headers.set('X-Lynk-Requested-With', 'fetch');
      const csrf = this.cookies.get('lynk_csrf');
      if (csrf) headers.set('X-Lynk-CSRF', csrf);
    }
    const res = await fetch(`${baseUrl}${pathname}`, { ...init, headers });
    this.updateFromResponse(res);
    return res;
  }
}

describe('Audit Regression Fixes: Clone IDs, Button Gradients & Canonical Slug Fallback', () => {
  let tmpDataDir: string;
  let server: http.Server;
  let baseUrl: string;
  let adminJar: TestCookieJar;

  before(async () => {
    tmpDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lynk-audit-test-'));
    process.env.LYNK_DATA_DIR = tmpDataDir;
    process.env.NODE_ENV = 'test';
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

    adminJar = new TestCookieJar();
    await adminJar.request(baseUrl, '/api/auth/me');
    const reg = await adminJar.request(baseUrl, '/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Audit Admin',
        email: 'audit-admin@test.local',
        password: 'StrongPassword123',
      }),
    });
    assert.equal(reg.status, 201);
  });

  after(async () => {
    await new Promise<void>((resolve) => {
      if (!server) return resolve();
      server.close(() => resolve());
    });
    fs.rmSync(tmpDataDir, { recursive: true, force: true });
    delete process.env.LYNK_DATA_DIR;
  });

  it('cloneBlockDeep generates fresh unique IDs for fnbItems and categoryButtons', () => {
    const fnb = createBlock('fnb_catalog');
    const originalFnbIds = (fnb.content.fnbItems ?? []).map((it) => it.id);
    assert.ok(originalFnbIds.length > 0);
    const clonedFnb = cloneBlockDeep(fnb);
    const clonedFnbIds = (clonedFnb.content.fnbItems ?? []).map((it) => it.id);

    assert.notEqual(clonedFnb.id, fnb.id);
    assert.equal(clonedFnbIds.length, originalFnbIds.length);
    for (let i = 0; i < originalFnbIds.length; i++) {
      assert.notEqual(clonedFnbIds[i], originalFnbIds[i]);
    }

    const tabs = createBlock('category_tabs');
    const originalTabIds = (tabs.content.categoryButtons ?? []).map((it) => it.id);
    assert.ok(originalTabIds.length > 0);
    const clonedTabs = cloneBlockDeep(tabs);
    const clonedTabIds = (clonedTabs.content.categoryButtons ?? []).map((it) => it.id);

    assert.notEqual(clonedTabs.id, tabs.id);
    assert.equal(clonedTabIds.length, originalTabIds.length);
    for (let i = 0; i < originalTabIds.length; i++) {
      assert.notEqual(clonedTabIds[i], originalTabIds[i]);
    }
  });

  it('Exports button linear-gradient, dynamic multi-column horizontal row, and category_tabs scroll attributes cleanly', () => {
    const btn = createBlock('button');
    btn.content.label = 'Pesan Promo';
    btn.style.backgroundMode = 'gradient';
    btn.style.gradientColor1 = '#FF6600';
    btn.style.gradientColor2 = '#CC0033';
    btn.style.gradientAngle = 75;

    const row = createBlock('row');
    row.content.rowLayoutMode = 'horizontal';
    row.content.rowColumns = 5;
    row.content.rowColumnWidth = 175;
    row.children = [
      createBlock('text'),
      createBlock('text'),
      createBlock('text'),
      createBlock('text'),
      createBlock('text'),
    ];

    const heading = createBlock('text');
    heading.content.text = 'Favorit';

    const tabs = createBlock('category_tabs');
    tabs.content.categoryScrollMode = 'horizontal';

    const proj = sanitizeBuilderProject({
      ...INITIAL_PROJECT,
      blocks: [btn, row, tabs, heading],
    });
    const html = generateProjectHtml(proj, { projectId: 'audit_proj_grad' });

    assert.ok(html.includes('linear-gradient(75deg, #FF6600 0%, #CC0033 100%)'));
    assert.ok(html.includes('flex: 0 0 175px'));
    assert.ok(html.includes('data-cat-jump'));
    assert.ok(html.includes('data-cat-target'));
    assert.ok(html.includes('flex-wrap:nowrap; overflow-x:auto;'));
    assert.ok(html.includes('data-jump-title="favorit"'));
  });

  it('Canonical slug fallback resolves /p/:slug and detects 409 SLUG_CONFLICT when publishing.slug is omitted', async () => {
    const projA = {
      ...INITIAL_PROJECT,
      title: 'Kopi Nusantara Jaya',
      publishing: {
        slug: '',
        customDomain: '',
        useCustomDomain: false,
        isPublished: true,
      },
    };

    const saveA = await adminJar.request(baseUrl, '/api/projects/proj_slug_a/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        record: {
          id: 'proj_slug_a',
          revision: 1,
          updatedAt: Date.now(),
          lastSavedAt: 0,
          project: projA,
        },
      }),
    });
    assert.equal(saveA.status, 200);
    const saveAData = (await saveA.json()) as { ok: boolean; slug: string };
    assert.equal(saveAData.slug, 'kopi-nusantara-jaya');

    // Direct repository JSON fallback lookup by canonical slug
    const foundBySlug = await getProjectEntryBySlug('kopi-nusantara-jaya');
    assert.ok(foundBySlug);
    assert.equal(foundBySlug.record.id, 'proj_slug_a');

    // Public SSR page renders 200
    const publicRes = await fetch(`${baseUrl}/p/kopi-nusantara-jaya`);
    assert.equal(publicRes.status, 200);
    const html = await publicRes.text();
    assert.ok(html.includes('Kopi Nusantara Jaya'));

    // Second project with same title and empty slug must fail with 409 SLUG_CONFLICT
    const projB = {
      ...INITIAL_PROJECT,
      title: 'Kopi Nusantara Jaya',
      publishing: {
        slug: '',
        customDomain: '',
        useCustomDomain: false,
        isPublished: false,
      },
    };
    const saveB = await adminJar.request(baseUrl, '/api/projects/proj_slug_b/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        record: {
          id: 'proj_slug_b',
          revision: 1,
          updatedAt: Date.now(),
          lastSavedAt: 0,
          project: projB,
        },
      }),
    });
    assert.equal(saveB.status, 409);
    const conflictJson = (await saveB.json()) as { code?: string };
    assert.equal(conflictJson.code, 'SLUG_CONFLICT');
  });
});

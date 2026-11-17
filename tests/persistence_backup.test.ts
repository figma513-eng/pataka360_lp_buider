import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';

import { createApp } from '../server.ts';
import { resetDbConnectionCheck, resolvePgSslConfig } from '../src/db/index.ts';
import { resetJsonStoreCacheForTests } from '../src/db/repository.ts';
import { authRateLimiter, apiRateLimiter } from '../src/server/rateLimiter.ts';
import { INITIAL_PROJECT } from '../src/data/presets.ts';
import { sanitizeCssColor, sanitizeRichHtmlIsomorphic } from '../src/utils/htmlSanitizer.ts';
import { sanitizeExternalUrl } from '../src/utils/urlHelpers.ts';

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

// Valid 1x1 PNG pixel binary
const TINY_PNG_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

describe('Persistence, OCC, Corrupt Recovery, Fail-Closed Prod, Media & Backup/Restore Suite', () => {
  let tmpDataDir: string;
  let server: http.Server;
  let baseUrl: string;
  let ownerJar: TestCookieJar;

  before(async () => {
    tmpDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lynk-persist-test-'));
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

    ownerJar = new TestCookieJar();
    await ownerJar.request(baseUrl, '/api/auth/me');
    const reg = await ownerJar.request(baseUrl, '/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Pemilik Backup',
        email: 'owner-backup@test.local',
        password: 'StrongPassword123',
      }),
    });
    assert.equal(reg.status, 201);
  });

  after(async () => {
    await new Promise<void>((resolve) => {
      server?.close(() => resolve());
    });
    fs.rmSync(tmpDataDir, { recursive: true, force: true });
    delete process.env.LYNK_DATA_DIR;
  });

  it('Pure unit checks: Isomorphic sanitizer, CSS color, URL helper, & PG TLS config defaults', () => {
    const clean = sanitizeRichHtmlIsomorphic(
      '<b>Tebal</b><svg onload=alert(1)></svg><a href="javascript:evil()">bad</a>'
    );
    assert.ok(clean.includes('<strong>Tebal</strong>'));
    assert.ok(!clean.includes('<svg'));
    assert.ok(!clean.includes('javascript:'));

    assert.equal(sanitizeCssColor('#10B981'), '#10B981');
    assert.equal(sanitizeCssColor('url(https://evil.test/x)', '#FFFFFF'), '#FFFFFF');
    assert.equal(sanitizeExternalUrl('javascript:alert(1)'), '#');
    assert.equal(sanitizeExternalUrl('javascript:alert(1)', ''), '');
    assert.equal(sanitizeExternalUrl('https://wa.me/628123456'), 'https://wa.me/628123456');

    const prevEnv = process.env.NODE_ENV;
    const prevInsec = process.env.PGSSL_REJECT_UNAUTHORIZED;
    try {
      process.env.NODE_ENV = 'production';
      const strictTls = resolvePgSslConfig(true);
      assert.equal(strictTls.sslVerifyMode, 'strict');
      assert.equal(strictTls.sslConfig?.rejectUnauthorized, true);

      // Even if PGSSL_REJECT_UNAUTHORIZED=false in prod, it is ignored
      process.env.PGSSL_REJECT_UNAUTHORIZED = 'false';
      const prodOverrideIgnored = resolvePgSslConfig(true);
      assert.equal(prodOverrideIgnored.sslConfig?.rejectUnauthorized, true);
    } finally {
      process.env.NODE_ENV = prevEnv;
      if (prevInsec === undefined) delete process.env.PGSSL_REJECT_UNAUTHORIZED;
      else process.env.PGSSL_REJECT_UNAUTHORIZED = prevInsec;
    }
  });

  it('F-06 OCC Revision Conflict: Concurrent stale save returns 409 without silent overwrite', async () => {
    const projId = 'proj_occ_test';
    const r1 = await ownerJar.request(baseUrl, `/api/projects/${projId}/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        record: {
          id: projId,
          revision: 1,
          project: { ...INITIAL_PROJECT, title: 'Versi Pertama' },
          updatedAt: Date.now(),
        },
      }),
    });
    assert.equal(r1.status, 200);
    const b1 = (await r1.json()) as { revision: number };
    assert.equal(b1.revision, 1);

    const r2 = await ownerJar.request(baseUrl, `/api/projects/${projId}/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        baseRevision: 1,
        record: {
          id: projId,
          revision: 1,
          project: { ...INITIAL_PROJECT, title: 'Versi Kedua Sah' },
          updatedAt: Date.now(),
        },
      }),
    });
    assert.equal(r2.status, 200);
    const b2 = (await r2.json()) as { revision: number };
    assert.equal(b2.revision, 2);

    // Stale save claiming baseRevision: 1 MUST fail with 409!
    const stale = await ownerJar.request(baseUrl, `/api/projects/${projId}/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        baseRevision: 1,
        record: {
          id: projId,
          revision: 1,
          project: { ...INITIAL_PROJECT, title: 'Versi Basi Berbahaya' },
          updatedAt: Date.now(),
        },
      }),
    });
    assert.equal(stale.status, 409);
    const staleBody = (await stale.json()) as {
      code: string;
      currentRevision: number;
      serverRecord: { project: { title: string } };
    };
    assert.equal(staleBody.code, 'REVISION_CONFLICT');
    assert.equal(staleBody.currentRevision, 2);
    assert.equal(staleBody.serverRecord.project.title, 'Versi Kedua Sah');
  });

  it('F-15 Media Upload: Magic-byte validation rejects spoofed SVG/HTML, serves PNG, blocks path traversal', async () => {
    const validUpload = await ownerJar.request(baseUrl, '/api/media/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataUrl: TINY_PNG_DATA_URL }),
    });
    assert.equal(validUpload.status, 201);
    const validBody = (await validUpload.json()) as { asset: { url: string; filename: string } };
    assert.match(validBody.asset.url, /^\/api\/media\/med_[a-f0-9]+\.png$/);

    const served = await fetch(`${baseUrl}${validBody.asset.url}`);
    assert.equal(served.status, 200);
    assert.equal(served.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(served.headers.get('content-type'), 'image/png');

    // Spoofed SVG/HTML payload pretending to be PNG
    const spoofedBase64 = Buffer.from('<script>alert(1)</script>').toString('base64');
    const spoofUpload = await ownerJar.request(baseUrl, '/api/media/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataUrl: `data:image/png;base64,${spoofedBase64}` }),
    });
    assert.equal(spoofUpload.status, 400);

    // Traversal test
    const trav = await fetch(`${baseUrl}/api/media/..%2Flynk-server-store.json`);
    assert.ok(trav.status === 400 || trav.status === 404);
  });

  it('F-14 Complete Backup Export & Staged Preview-Before-Restore Round-Trip', async () => {
    // Track an analytics event so backup also includes analyticsEvents
    await fetch(`${baseUrl}/api/track/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: 'proj_occ_test',
        projectTitle: 'Versi Kedua Sah',
        slug: 'versi-kedua-sah',
        eventType: 'wa_click',
        channel: 'meta_ads',
      }),
    });

    const expRes = await ownerJar.request(baseUrl, '/api/backup/export');
    assert.equal(expRes.status, 200);
    const bundle = (await expRes.json()) as {
      format: string;
      checksum: string;
      data: {
        projects: Array<{ record: { id: string; project: { title: string } } }>;
        analyticsEvents: unknown[];
        media: Array<{ filename: string; base64: string }>;
        accessPolicies: Record<string, unknown>;
      };
    };

    assert.equal(bundle.format, 'lynk-builder-backup');
    assert.ok(bundle.checksum.length === 64);
    assert.equal(bundle.data.projects.length, 1);
    assert.equal(bundle.data.media.length, 1);
    assert.ok(bundle.data.analyticsEvents.length >= 1);
    const bundleText = JSON.stringify(bundle);
    assert.ok(!bundleText.includes('passwordHash'), 'Backup must NEVER export passwordHash');
    assert.ok(!bundleText.includes('sessions'), 'Backup must NEVER export active sessions');

    // Preview valid bundle
    const prevOk = await ownerJar.request(baseUrl, '/api/backup/restore/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bundle }),
    });
    const prevOkBody = (await prevOk.json()) as {
      ok: boolean;
      summary: { valid: boolean; checksumValid: boolean };
    };
    assert.equal(prevOkBody.ok, true);
    assert.equal(prevOkBody.summary.checksumValid, true);

    // Tampered bundle must fail preview
    const tampered = structuredClone(bundle);
    tampered.data.projects[0].record.project.title = 'DITIMPA PERETAS';
    const prevBad = await ownerJar.request(baseUrl, '/api/backup/restore/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bundle: tampered }),
    });
    const prevBadBody = (await prevBad.json()) as {
      ok: boolean;
      summary: { valid: boolean; checksumValid: boolean };
    };
    assert.equal(prevBadBody.ok, false);
    assert.equal(prevBadBody.summary.checksumValid, false);

    // Mutate workspace before restoring
    await ownerJar.request(baseUrl, '/api/projects/proj_occ_test/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        baseRevision: 2,
        record: {
          id: 'proj_occ_test',
          project: { ...INITIAL_PROJECT, title: 'Setelah Backup Berubah' },
          updatedAt: Date.now(),
        },
      }),
    });

    // Apply without confirmOverwrite=true MUST fail (400)
    const noConfirm = await ownerJar.request(baseUrl, '/api/backup/restore/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bundle, confirmOverwrite: false }),
    });
    assert.equal(noConfirm.status, 400);

    // Apply WITH confirmOverwrite=true succeeds and restores original title + creates pre-restore snapshot
    const applyOk = await ownerJar.request(baseUrl, '/api/backup/restore/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bundle, confirmOverwrite: true }),
    });
    assert.equal(applyOk.status, 200);
    const applyBody = (await applyOk.json()) as {
      ok: boolean;
      preRestoreBackupPath: string;
      restoredCounts: { projects: number; analyticsEvents: number; media: number };
    };
    assert.equal(applyBody.ok, true);
    assert.ok(fs.existsSync(path.join(tmpDataDir, 'backups', applyBody.preRestoreBackupPath)));

    const listAfter = await ownerJar.request(baseUrl, '/api/projects');
    const listBody = (await listAfter.json()) as {
      projects: Array<{ project: { title: string } }>;
    };
    assert.equal(listBody.projects[0].project.title, 'Versi Kedua Sah');
  });

  it('F-25 Corrupt JSON Store & F-09 Fail-Closed Prod DB Readiness', async () => {
    const storeFile = path.join(tmpDataDir, 'lynk-server-store.json');
    const badContent = '{"users": [ CORRUPTED_JSON';
    fs.writeFileSync(storeFile, badContent);
    resetJsonStoreCacheForTests();

    const readyCorrupt = await fetch(`${baseUrl}/api/health/ready`);
    assert.equal(readyCorrupt.status, 503);
    const readyBody = (await readyCorrupt.json()) as { ok: boolean; corrupt: boolean };
    assert.equal(readyBody.ok, false);
    assert.equal(readyBody.corrupt, true);

    // Original corrupt file preserved & backup created, NOT overwritten with empty store!
    assert.equal(fs.readFileSync(storeFile, 'utf8'), badContent);
    const filesInDir = fs.readdirSync(tmpDataDir);
    assert.ok(filesInDir.some((f) => f.includes('.corrupt.')), 'Corrupt snapshot must be preserved');

    // F-09: In NODE_ENV=production without PostgreSQL and without ALLOW_LOCAL_JSON_STORAGE=true, ready MUST be 503
    const prevEnv = process.env.NODE_ENV;
    const prevAllow = process.env.ALLOW_LOCAL_JSON_STORAGE;
    try {
      process.env.NODE_ENV = 'production';
      delete process.env.ALLOW_LOCAL_JSON_STORAGE;
      await resetDbConnectionCheck();
      const prodReady = await fetch(`${baseUrl}/api/health/ready`);
      assert.equal(prodReady.status, 503);
      const prodBody = (await prodReady.json()) as { degraded: boolean; ready: boolean };
      assert.equal(prodBody.degraded, true);
      assert.equal(prodBody.ready, false);
    } finally {
      process.env.NODE_ENV = prevEnv;
      if (prevAllow === undefined) delete process.env.ALLOW_LOCAL_JSON_STORAGE;
      else process.env.ALLOW_LOCAL_JSON_STORAGE = prevAllow;
      await resetDbConnectionCheck();
    }
  });
});

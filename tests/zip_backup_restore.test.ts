import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import JSZip from 'jszip';

import { createApp } from '../server.ts';
import { resetDbConnectionCheck } from '../src/db/index.ts';
import { resetJsonStoreCacheForTests } from '../src/db/repository.ts';
import { authRateLimiter, apiRateLimiter } from '../src/server/rateLimiter.ts';
import { INITIAL_PROJECT } from '../src/data/presets.ts';

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

const TINY_PNG_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

describe('Full ZIP Export, Manifest Integrity, & Full/Project Restore Suite', () => {
  let tmpDataDir: string;
  let server: http.Server;
  let baseUrl: string;
  let ownerJar: TestCookieJar;
  let viewerJar: TestCookieJar;
  let exportedZipBuffer: Buffer;

  before(async () => {
    tmpDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lynk-zip-test-'));
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
    const boot = await ownerJar.request(baseUrl, '/api/auth/bootstrap-super-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Zip Owner',
        email: 'zip-owner@test.local',
        password: 'ZipPassword123!',
      }),
    });
    assert.equal(boot.status, 201);

    viewerJar = new TestCookieJar();
    await viewerJar.request(baseUrl, '/api/auth/me');
    const regViewer = await viewerJar.request(baseUrl, '/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Zip Viewer',
        email: 'zip-viewer@test.local',
        password: 'ZipPassword123!',
      }),
    });
    assert.equal(regViewer.status, 201);

    // Seed 2 projects + media + analytics event
    const mediaRes = await ownerJar.request(baseUrl, '/api/media/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataUrl: TINY_PNG_DATA_URL }),
    });
    assert.equal(mediaRes.status, 201);
    const mediaJson = (await mediaRes.json()) as { asset: { url: string; filename: string } };

    for (const [id, title, slug] of [
      ['proj_zip_a', 'Proyek Alpha ZIP', 'alpha-zip'],
      ['proj_zip_b', 'Proyek Beta ZIP', 'beta-zip'],
    ]) {
      const save = await ownerJar.request(baseUrl, `/api/projects/${id}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          record: {
            id,
            revision: 1,
            project: {
              ...INITIAL_PROJECT,
              title,
              publishing: { ...INITIAL_PROJECT.publishing, slug, isPublished: true },
              blocks: [
                {
                  ...INITIAL_PROJECT.blocks[0],
                  content: {
                    ...INITIAL_PROJECT.blocks[0].content,
                    imageUrl: mediaJson.asset.url,
                  },
                },
              ],
            },
            updatedAt: Date.now(),
          },
        }),
      });
      assert.equal(save.status, 200);
    }

    await fetch(`${baseUrl}/api/track/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: 'proj_zip_a',
        projectTitle: 'Proyek Alpha ZIP',
        slug: 'alpha-zip',
        eventType: 'wa_click',
        channel: 'organic',
      }),
    });
  });

  after(async () => {
    await new Promise<void>((resolve) => {
      server?.close(() => resolve());
    });
    fs.rmSync(tmpDataDir, { recursive: true, force: true });
    delete process.env.LYNK_DATA_DIR;
  });

  it('Exports complete ZIP with source, DB, configs, 6 docs, SHA-256 manifest, and NO secrets/sessions/node_modules', async () => {
    const res = await ownerJar.request(baseUrl, '/api/backup/export-zip');
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('content-type'), 'application/zip');
    const disp = res.headers.get('content-disposition') || '';
    assert.match(disp, /Lynk-Builder-Full-Backup-\d+\.\d+\.\d+-\d{4}-\d{2}-\d{2}\.zip/);

    exportedZipBuffer = Buffer.from(await res.arrayBuffer());
    const zip = await JSZip.loadAsync(exportedZipBuffer);
    const entryNames = Object.keys(zip.files).filter((n) => !zip.files[n].dir);

    // Must contain source, configs, 6 docs, database + .data copy, and manifest
    const requiredPaths = [
      'package.json',
      'package-lock.json',
      'vite.config.ts',
      'tsconfig.json',
      '.env.example',
      'server.ts',
      'index.html',
      'src/App.tsx',
      'src/db/repository.ts',
      'src/db/schema.ts',
      'src/db/schema.sql',
      'src/db/migrations.ts',
      'src/db/jsonToPgMigrator.ts',
      'scripts/migrate.ts',
      'scripts/migrate-json-to-postgres.ts',
      'tests/postgres_migration.test.ts',
      'tests/zip_backup_restore.test.ts',
      'README.md',
      'INSTALL.md',
      'LOCAL-TESTING.md',
      'DATABASE.md',
      'POSTGRESQL-SETUP.md',
      'DATABASE-MIGRATION.md',
      'BACKUP-RESTORE.md',
      'CHANGELOG.md',
      'database/lynk-server-store.json',
      'database/db-meta.json',
      '.data/lynk-server-store.json',
      'manifest.json',
    ];
    for (const reqPath of requiredPaths) {
      assert.ok(entryNames.includes(reqPath), `ZIP must contain ${reqPath}`);
    }

    // Must NEVER contain node_modules, .env, secret files, or active sessions
    for (const name of entryNames) {
      assert.ok(!name.startsWith('node_modules/'), 'ZIP must exclude node_modules');
      assert.ok(!name.startsWith('dist/'), 'ZIP must exclude dist');
      assert.ok(path.posix.basename(name) !== '.env', 'ZIP must exclude .env');
      assert.ok(!name.includes('.dev-session-secret'), 'ZIP must exclude session secret file');
      assert.ok(!name.includes('.runtime-session-secret'), 'ZIP must exclude runtime secret file');
    }

    const dbText = await zip.file('database/lynk-server-store.json')!.async('string');
    const dbJson = JSON.parse(dbText) as {
      sessions: unknown[];
      users: Array<{ email: string; passwordHash: string }>;
      projects: Record<string, unknown>;
    };
    assert.equal(dbJson.sessions.length, 0, 'Active sessions must be cleared inside exported DB');
    assert.equal(dbJson.users.length, 2, 'Full backup DB retains users for local login');
    assert.ok(dbJson.users[0].passwordHash.length > 20);
    assert.ok(Object.keys(dbJson.projects).length === 2);

    // Verify manifest SHA-256 checksums for every recorded file
    const manifest = JSON.parse(await zip.file('manifest.json')!.async('string')) as {
      format: string;
      databaseMode: string;
      schemaVersion: number;
      files: Array<{ path: string; sizeBytes: number; sha256: string }>;
    };
    assert.equal(manifest.format, 'lynk-builder-full-backup-zip');
    assert.equal(manifest.databaseMode, 'local-json');
    assert.ok(manifest.files.length >= requiredPaths.length - 1);

    for (const mf of manifest.files) {
      const f = zip.file(mf.path);
      assert.ok(f, `Manifest file missing from archive: ${mf.path}`);
      const content = await f!.async('nodebuffer');
      assert.equal(content.length, mf.sizeBytes);
      const actualHash = crypto.createHash('sha256').update(content).digest('hex');
      assert.equal(actualHash, mf.sha256, `SHA-256 mismatch on ${mf.path}`);
    }
  });

  it('Rejects tampered ZIP checksums, corrupt ZIPs, and secret-carrying/Zip-Slip archives safely', async () => {
    // 1. Corrupt random bytes
    const corruptPrev = await ownerJar.request(baseUrl, '/api/backup/restore/zip/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ zipBase64: Buffer.from('NOT_A_ZIP_FILE_123456').toString('base64') }),
    });
    const corruptBody = (await corruptPrev.json()) as {
      ok: boolean;
      summary: { valid: boolean; errors: string[] };
    };
    assert.equal(corruptBody.ok, false);
    assert.equal(corruptBody.summary.valid, false);

    // 2. Tamper database JSON without updating manifest checksum
    const tamperedZip = await JSZip.loadAsync(exportedZipBuffer);
    const origDb = await tamperedZip.file('database/lynk-server-store.json')!.async('string');
    tamperedZip.file('database/lynk-server-store.json', origDb.replace('Proyek Alpha ZIP', 'HACKED'));
    const tamperedBuf = await tamperedZip.generateAsync({ type: 'nodebuffer' });

    const tamperedPrev = await ownerJar.request(baseUrl, '/api/backup/restore/zip/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ zipBase64: tamperedBuf.toString('base64') }),
    });
    const tamperedBody = (await tamperedPrev.json()) as {
      ok: boolean;
      summary: { valid: boolean; checksumValid: boolean };
    };
    assert.equal(tamperedBody.ok, false);
    assert.equal(tamperedBody.summary.checksumValid, false);

    // 3. Inject forbidden .env secret file into ZIP
    const secretZip = await JSZip.loadAsync(exportedZipBuffer);
    secretZip.file('.env', 'SESSION_SECRET="leaked"');
    const secretBuf = await secretZip.generateAsync({ type: 'nodebuffer' });
    const secretPrev = await ownerJar.request(baseUrl, '/api/backup/restore/zip/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ zipBase64: secretBuf.toString('base64') }),
    });
    const secretBody = (await secretPrev.json()) as { ok: boolean };
    assert.equal(secretBody.ok, false);
  });

  it('Supports Selective Project Restore (preserving unrelated projects) and Full Restore with pre-restore snapshot', async () => {
    // Mutate proj_zip_a and add a brand new project proj_local_extra
    const mutA = await ownerJar.request(baseUrl, '/api/projects/proj_zip_a/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        baseRevision: 1,
        record: {
          id: 'proj_zip_a',
          project: { ...INITIAL_PROJECT, title: 'Alpha Berubah Lokal' },
          updatedAt: Date.now(),
        },
      }),
    });
    assert.equal(mutA.status, 200);

    const addExtra = await ownerJar.request(baseUrl, '/api/projects/proj_local_extra/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        record: {
          id: 'proj_local_extra',
          project: {
            ...INITIAL_PROJECT,
            title: 'Proyek Lokal Baru',
            publishing: { ...INITIAL_PROJECT.publishing, slug: 'lokal-baru' },
          },
          updatedAt: Date.now(),
        },
      }),
    });
    assert.equal(addExtra.status, 200);

    // Project Restore ONLY proj_zip_a
    const zipB64 = exportedZipBuffer.toString('base64');
    const projRestore = await ownerJar.request(baseUrl, '/api/backup/restore/zip/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        zipBase64: zipB64,
        confirmOverwrite: true,
        mode: 'project',
        selectedProjectIds: ['proj_zip_a'],
      }),
    });
    assert.equal(projRestore.status, 200);
    const projResBody = (await projRestore.json()) as {
      ok: boolean;
      mode: string;
      preRestoreBackupPath: string;
      restoredCounts: { projects: number };
    };
    assert.equal(projResBody.ok, true);
    assert.equal(projResBody.mode, 'project');
    assert.equal(projResBody.restoredCounts.projects, 1);
    assert.ok(fs.existsSync(path.join(tmpDataDir, 'backups', projResBody.preRestoreBackupPath)));

    const listAfterSelective = await ownerJar.request(baseUrl, '/api/projects');
    const selectiveJson = (await listAfterSelective.json()) as {
      projects: Array<{ id: string; project: { title: string } }>;
    };
    const byId = new Map(selectiveJson.projects.map((p) => [p.id, p.project.title]));
    assert.equal(byId.get('proj_zip_a'), 'Proyek Alpha ZIP', 'Selected project restored');
    assert.equal(byId.get('proj_local_extra'), 'Proyek Lokal Baru', 'Unselected local project preserved');

    // Full Restore restores snapshot state cleanly (2 projects from archive)
    const fullRestore = await ownerJar.request(baseUrl, '/api/backup/restore/zip/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        zipBase64: zipB64,
        confirmOverwrite: true,
        mode: 'full',
      }),
    });
    assert.equal(fullRestore.status, 200);
    const fullBody = (await fullRestore.json()) as {
      ok: boolean;
      mode: string;
      restoredCounts: { projects: number };
    };
    assert.equal(fullBody.ok, true);
    assert.equal(fullBody.mode, 'full');
    assert.equal(fullBody.restoredCounts.projects, 2);
  });
});

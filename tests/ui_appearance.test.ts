import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';

import { createApp } from '../server.ts';
import { resetDbConnectionCheck } from '../src/db/index.ts';
import {
  getUiAppearanceSettings,
  resetJsonStoreCacheForTests,
  saveApiSettings,
  saveUiAppearanceSettings,
} from '../src/db/repository.ts';
import { apiRateLimiter, authRateLimiter } from '../src/server/rateLimiter.ts';
import { DEMO_ROLE_PROFILES } from '../src/utils/demoAccounts.ts';
import {
  UI_LABEL_CATALOG,
  UI_LABEL_CATEGORIES,
  UI_LABEL_DEFAULT_MAP,
  getUiLabelKind,
  isUiLabelVisible,
  packUiAppearanceStoragePayload,
  resolveUiLabel,
  sanitizeUiAppearanceLabelsMap,
  unpackUiAppearanceStoragePayload,
} from '../src/utils/uiAppearanceLabels.ts';

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

describe('UI Appearance ("Tampilan") Catalog, Persistence, and RBAC API', () => {
  let tmpDataDir: string;
  let server: http.Server;
  let baseUrl: string;

  before(async () => {
    tmpDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lynk-ui-appearance-test-'));
    process.env.LYNK_DATA_DIR = tmpDataDir;
    process.env.NODE_ENV = 'test';
    process.env.AUTH_RATE_LIMIT_MAX = '50';
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

  it('has unique catalog keys across all 7 categories and sanitizes/resolves labels properly', () => {
    const keys = UI_LABEL_CATALOG.map((item) => item.key);
    assert.equal(new Set(keys).size, keys.length, 'Semua key katalog harus unik');
    assert.equal(UI_LABEL_DEFAULT_MAP['desain.sec.specific'], 'Pengaturan Khusus Komponen');

    const cleaned = sanitizeUiAppearanceLabelsMap({
      'desain.sec.specific': '  Komponen Utama\u0007  ',
      'alat.tab': 'Alat', // Matches default -> omitted
      'blok.tab': '   ', // Empty -> omitted
      '': 'ignored',
    });
    assert.deepEqual(cleaned, {
      'desain.sec.specific': 'Komponen Utama',
    });

    assert.equal(
      UI_LABEL_DEFAULT_MAP['konten.field.modeWadahIndukAnak'],
      'Mode Wadah Induk–Anak'
    );
    assert.equal(
      UI_LABEL_DEFAULT_MAP['konten.desc.modeWadahIndukAnak'],
      'Ubah wadah menjadi Slider Horizontal atau Vertikal tanpa merusak komponen anak di dalamnya.'
    );
    const titleItem = UI_LABEL_CATALOG.find((i) => i.key === 'konten.field.modeWadahIndukAnak');
    const descItem = UI_LABEL_CATALOG.find((i) => i.key === 'konten.desc.modeWadahIndukAnak');
    assert.ok(titleItem && descItem);
    assert.equal(getUiLabelKind(titleItem), 'judul');
    assert.equal(getUiLabelKind(descItem), 'deskripsi');
    assert.equal(titleItem.groupTitle, 'Mode Wadah Induk–Anak');
    assert.equal(descItem.groupTitle, 'Mode Wadah Induk–Anak');
    assert.ok(UI_LABEL_DEFAULT_MAP['konten.desc.stripBawahKartu']);
    assert.ok(UI_LABEL_DEFAULT_MAP['home.desc.top']);
    assert.ok(UI_LABEL_DEFAULT_MAP['konten.desc.formWaKhusus']);

    assert.equal(
      resolveUiLabel(cleaned, 'desain.sec.specific'),
      'Komponen Utama'
    );
    assert.equal(
      resolveUiLabel(cleaned, 'alat.tab'),
      'Alat'
    );
    assert.equal(
      resolveUiLabel(cleaned, 'unknown.key', 'Fallback Custom'),
      'Fallback Custom'
    );

    const packed = packUiAppearanceStoragePayload(
      { 'konten.field.modeWadahIndukAnak': 'Mode Wadah Kustom' },
      { 'konten.desc.modeWadahIndukAnak': true }
    );
    const unpacked = unpackUiAppearanceStoragePayload(packed);
    assert.deepEqual(unpacked.labels, {
      'konten.field.modeWadahIndukAnak': 'Mode Wadah Kustom',
    });
    assert.deepEqual(unpacked.hiddenKeys, {
      'konten.desc.modeWadahIndukAnak': true,
    });
    assert.equal(isUiLabelVisible(unpacked.hiddenKeys, 'konten.field.modeWadahIndukAnak'), true);
    assert.equal(isUiLabelVisible(unpacked.hiddenKeys, 'konten.desc.modeWadahIndukAnak'), false);

    // 5 separated core content categories (1..5) must appear first in order and cover judul, label, deskripsi
    const coreCats = UI_LABEL_CATEGORIES.filter((c) => c.isCoreContentSection);
    assert.deepEqual(
      coreCats.map((c) => c.id),
      ['konten_items', 'konten_main', 'konten_nav', 'konten_general', 'konten_actions']
    );
    for (const cat of coreCats) {
      const catItems = UI_LABEL_CATALOG.filter((i) => i.category === cat.id);
      const kinds = new Set(catItems.map((i) => getUiLabelKind(i)));
      assert.ok(kinds.has('judul'), `${cat.label} harus memiliki item Judul`);
      assert.ok(kinds.has('label'), `${cat.label} harus memiliki item Label`);
      assert.ok(kinds.has('deskripsi'), `${cat.label} harus memiliki item Deskripsi`);
    }
  });

  it('persists partial patches, single-key reset, full labels replacement, and resetAll in repository', async () => {
    const initial = await getUiAppearanceSettings();
    assert.deepEqual(initial.labels, {});

    const patched = await saveUiAppearanceSettings({
      patch: {
        'desain.sec.specific': 'Komponen Utama',
        'alat.tab': 'Perkakas',
      },
    });
    assert.equal(patched.labels['desain.sec.specific'], 'Komponen Utama');
    assert.equal(patched.labels['alat.tab'], 'Perkakas');

    // Single-key reset using empty string preserves other overrides
    const singleReset = await saveUiAppearanceSettings({
      patch: {
        'alat.tab': '',
      },
    });
    assert.equal(singleReset.labels['desain.sec.specific'], 'Komponen Utama');
    assert.equal(singleReset.labels['alat.tab'], undefined);

    // Setting back to default label also prunes the override
    const defaultPrune = await saveUiAppearanceSettings({
      patch: {
        'desain.sec.specific': 'Pengaturan Khusus Komponen',
      },
    });
    assert.deepEqual(defaultPrune.labels, {});

    // Full labels replacement
    const replaced = await saveUiAppearanceSettings({
      labels: {
        'home.tab': 'Beranda',
        'konten.sec.main': 'Isi Utama',
      },
    });
    assert.deepEqual(replaced.labels, {
      'home.tab': 'Beranda',
      'konten.sec.main': 'Isi Utama',
    });

    // Hidden keys patch & unhide
    const hiddenPatched = await saveUiAppearanceSettings({
      hiddenPatch: {
        'konten.field.modeWadahIndukAnak': true,
        'konten.desc.modeWadahIndukAnak': true,
      },
    });
    assert.deepEqual(hiddenPatched.hiddenKeys, {
      'konten.field.modeWadahIndukAnak': true,
      'konten.desc.modeWadahIndukAnak': true,
    });
    const unhideOne = await saveUiAppearanceSettings({
      hiddenPatch: {
        'konten.field.modeWadahIndukAnak': false,
      },
    });
    assert.deepEqual(unhideOne.hiddenKeys, {
      'konten.desc.modeWadahIndukAnak': true,
    });

    // Reset all clears both labels and hiddenKeys
    const reset = await saveUiAppearanceSettings({ resetAll: true });
    assert.deepEqual(reset.labels, {});
    assert.deepEqual(reset.hiddenKeys, {});
  });

  it('enforces RBAC on /api/settings/appearance and broadcasts updated labels readable by active users', async () => {
    // Seed 4 demo accounts & enforce builder auth requirement
    const anonJar = new TestCookieJar();
    await anonJar.request(baseUrl, '/api/auth/me');
    const seedRes = await anonJar.request(baseUrl, '/api/auth/seed-demo-roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.equal(seedRes.status, 201);

    await saveApiSettings({ requireAuthForBuilder: true });

    // Unauthenticated GET & PUT must return 401 when requireAuthForBuilder is true
    const unauthGet = await anonJar.request(baseUrl, '/api/settings/appearance');
    assert.equal(unauthGet.status, 401);

    const unauthPut = await anonJar.request(baseUrl, '/api/settings/appearance', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patch: { 'desain.sec.specific': 'Komponen Utama' } }),
    });
    assert.equal(unauthPut.status, 401);

    // Viewer cannot mutate appearance settings (403)
    const viewerJar = new TestCookieJar();
    await viewerJar.request(baseUrl, '/api/auth/me');
    const viewerLogin = await viewerJar.request(baseUrl, '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: DEMO_ROLE_PROFILES.viewer.email,
        password: DEMO_ROLE_PROFILES.viewer.demoPassword,
      }),
    });
    assert.equal(viewerLogin.status, 200);

    const viewerPut = await viewerJar.request(baseUrl, '/api/settings/appearance', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patch: { 'desain.sec.specific': 'Hack' } }),
    });
    assert.equal(viewerPut.status, 403);

    // Super Admin can validate & save custom labels
    const adminJar = new TestCookieJar();
    await adminJar.request(baseUrl, '/api/auth/me');
    const adminLogin = await adminJar.request(baseUrl, '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: DEMO_ROLE_PROFILES.super_admin.email,
        password: DEMO_ROLE_PROFILES.super_admin.demoPassword,
      }),
    });
    assert.equal(adminLogin.status, 200);

    const badPayload = await adminJar.request(baseUrl, '/api/settings/appearance', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.equal(badPayload.status, 400);

    const saveRes = await adminJar.request(baseUrl, '/api/settings/appearance', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patch: {
          'desain.sec.specific': 'Komponen Utama',
          'tema.sec.pengaturanLokal': 'Token Lokal',
          'konten.field.modeWadahIndukAnak': 'Mode Wadah Slider',
        },
        hiddenPatch: {
          'konten.desc.modeWadahIndukAnak': true,
        },
      }),
    });
    assert.equal(saveRes.status, 200);
    const saveJson = (await saveRes.json()) as {
      ok: boolean;
      settings: { labels: Record<string, string>; hiddenKeys?: Record<string, boolean> };
    };
    assert.equal(saveJson.ok, true);
    assert.equal(saveJson.settings.labels['desain.sec.specific'], 'Komponen Utama');
    assert.equal(saveJson.settings.labels['tema.sec.pengaturanLokal'], 'Token Lokal');
    assert.equal(saveJson.settings.labels['konten.field.modeWadahIndukAnak'], 'Mode Wadah Slider');
    assert.equal(saveJson.settings.hiddenKeys?.['konten.desc.modeWadahIndukAnak'], true);

    // Viewer reads updated labels & hiddenKeys cleanly
    const viewerGet = await viewerJar.request(baseUrl, '/api/settings/appearance');
    assert.equal(viewerGet.status, 200);
    const viewerJson = (await viewerGet.json()) as {
      settings: { labels: Record<string, string>; hiddenKeys?: Record<string, boolean> };
    };
    assert.equal(viewerJson.settings.labels['desain.sec.specific'], 'Komponen Utama');
    assert.equal(viewerJson.settings.labels['tema.sec.pengaturanLokal'], 'Token Lokal');
    assert.equal(viewerJson.settings.hiddenKeys?.['konten.desc.modeWadahIndukAnak'], true);

    // Super Admin resets all
    const resetRes = await adminJar.request(baseUrl, '/api/settings/appearance', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resetAll: true }),
    });
    assert.equal(resetRes.status, 200);
    const resetJson = (await resetRes.json()) as {
      ok: boolean;
      settings: { labels: Record<string, string>; hiddenKeys?: Record<string, boolean> };
    };
    assert.deepEqual(resetJson.settings.labels, {});
    assert.deepEqual(resetJson.settings.hiddenKeys, {});
  });
});

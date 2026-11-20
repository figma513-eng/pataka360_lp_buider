import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { after, before, describe, it } from 'node:test';
import { INITIAL_PROJECT } from '../src/data/presets.ts';
import { generateProjectHtml } from '../src/utils/htmlExporter.ts';
import { buildLiveUrls } from '../src/utils/publishingHelpers.ts';

interface MockFsSandboxResult {
  fsBtn: {
    id: string;
    hidden: boolean;
    style: { display: string };
    click: () => void;
    hasHiddenAttr: () => boolean;
  };
  requestCalls: number;
  replacedUrls: string[];
  alertsTriggered: number;
  reloadsTriggered: number;
  setActiveFullscreen: (active: boolean) => void;
  dispatchFullscreenChange: () => void;
}

function runFullscreenRuntimeInVm(opts: {
  html: string;
  pathname: string;
  search?: string;
  hash?: string;
  fullscreenEnabled: boolean;
  hasRequestMethod: boolean;
  rejectRequest?: boolean;
}): MockFsSandboxResult {
  const docListeners = new Map<string, Array<() => void>>();
  const btnListeners = new Map<string, Array<() => void>>();
  let hiddenAttr = true;
  let requestCalls = 0;
  let activeFsEl: unknown = null;
  const replacedUrls: string[] = [];
  let alertsTriggered = 0;
  let reloadsTriggered = 0;

  const fsBtn = {
    id: 'lynk-fullscreen-btn',
    hidden: true,
    style: { display: 'none' },
    getAttribute: (k: string) => (k === 'hidden' && hiddenAttr ? '' : null),
    setAttribute: (k: string) => {
      if (k === 'hidden') hiddenAttr = true;
    },
    removeAttribute: (k: string) => {
      if (k === 'hidden') hiddenAttr = false;
    },
    addEventListener: (ev: string, fn: () => void) => {
      const list = btnListeners.get(ev) || [];
      list.push(fn);
      btnListeners.set(ev, list);
    },
    click: () => {
      for (const fn of btnListeners.get('click') || []) fn();
    },
    hasHiddenAttr: () => hiddenAttr,
  };

  const docEl: Record<string, unknown> = {};
  if (opts.hasRequestMethod) {
    docEl.requestFullscreen = () => {
      requestCalls += 1;
      if (opts.rejectRequest) {
        return Promise.reject(new Error('Permissions check failed'));
      }
      activeFsEl = docEl;
      return Promise.resolve();
    };
  }

  const documentObj = {
    documentElement: docEl,
    body: { style: {} },
    fullscreenEnabled: opts.fullscreenEnabled,
    get fullscreenElement() {
      return activeFsEl;
    },
    getElementById: (id: string) => (id === 'lynk-fullscreen-btn' ? fsBtn : null),
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: (ev: string, fn: () => void) => {
      const list = docListeners.get(ev) || [];
      list.push(fn);
      docListeners.set(ev, list);
    },
  };

  const locationObj = {
    protocol: 'https:',
    pathname: opts.pathname,
    search: opts.search ?? '',
    hash: opts.hash ?? '',
    reload: () => {
      reloadsTriggered += 1;
    },
  };

  const historyObj = {
    state: null,
    replaceState: (_s: unknown, _t: string, url: string) => {
      replacedUrls.push(url);
      const qIdx = url.indexOf('?');
      const hIdx = url.indexOf('#');
      const pathEnd = qIdx >= 0 ? qIdx : hIdx >= 0 ? hIdx : url.length;
      locationObj.pathname = url.slice(0, pathEnd);
    },
  };

  const windowObj: Record<string, unknown> = {
    innerWidth: 420,
    history: historyObj,
    location: locationObj,
    addEventListener: () => {},
    alert: () => {
      alertsTriggered += 1;
    },
  };
  windowObj.window = windowObj;

  const sandbox: Record<string, unknown> = {
    window: windowObj,
    document: documentObj,
    location: locationObj,
    history: historyObj,
    navigator: { sendBeacon: () => true },
    sessionStorage: {
      getItem: () => null,
      setItem: () => {},
    },
    URL,
    URLSearchParams,
    Blob: class MockBlob {},
    fetch: async () => ({ ok: false, json: async () => null }),
    alert: () => {
      alertsTriggered += 1;
    },
    encodeURIComponent,
    decodeURIComponent,
    setTimeout,
    clearTimeout,
    Promise,
    console,
    Math,
    Number,
    String,
    Boolean,
    Array,
    Object,
    JSON,
    RegExp,
    Date,
    isFinite,
    isNaN,
  };

  const scripts = [...opts.html.matchAll(/<script(?![^>]*src)([^>]*)>([\s\S]*?)<\/script>/gi)].filter(
    (m) => !/type=["']application\/(?:ld\+)?json["']/i.test(m[1])
  );
  assert.ok(scripts.length >= 1, 'Expected inline executable script');
  for (const sc of scripts) {
    assert.doesNotThrow(() => new Function(sc[2]), 'Exported JS must have valid syntax');
    vm.runInNewContext(sc[2], sandbox);
  }

  return {
    fsBtn,
    get requestCalls() {
      return requestCalls;
    },
    replacedUrls,
    get alertsTriggered() {
      return alertsTriggered;
    },
    get reloadsTriggered() {
      return reloadsTriggered;
    },
    setActiveFullscreen: (active: boolean) => {
      activeFsEl = active ? docEl : null;
    },
    dispatchFullscreenChange: () => {
      for (const fn of docListeners.get('fullscreenchange') || []) fn();
    },
  };
}

describe('Browser Mode & Fullscreen Mode — Unit, Runtime, UI & Live Server Integration', () => {
  it('buildLiveUrls automatically generates Browser Mode and Fullscreen Mode URLs following slug and custom domain', () => {
    const urls1 = buildLiveUrls(
      {
        slug: 'jasclub',
        customDomain: '',
        useCustomDomain: false,
        isPublished: true,
      },
      'https://cekdetail.pataka360.com'
    );
    assert.equal(urls1.internalPath, '/p/jasclub');
    assert.equal(urls1.internalUrl, 'https://cekdetail.pataka360.com/p/jasclub');
    assert.equal(urls1.internalFullPath, '/p/jasclub/full');
    assert.equal(urls1.internalFullUrl, 'https://cekdetail.pataka360.com/p/jasclub/full');
    assert.equal(urls1.primaryUrl, 'https://cekdetail.pataka360.com/p/jasclub');
    assert.equal(urls1.primaryFullUrl, 'https://cekdetail.pataka360.com/p/jasclub/full');

    // Slug change automatically updates both URLs
    const urls2 = buildLiveUrls(
      {
        slug: 'dapur-kangendari',
        customDomain: 'promo.tokoanda.com',
        useCustomDomain: true,
        isPublished: true,
      },
      'https://cekdetail.pataka360.com'
    );
    assert.equal(urls2.internalUrl, 'https://cekdetail.pataka360.com/p/dapur-kangendari');
    assert.equal(urls2.internalFullUrl, 'https://cekdetail.pataka360.com/p/dapur-kangendari/full');
    assert.equal(urls2.customUrl, 'https://promo.tokoanda.com');
    assert.equal(urls2.customFullUrl, 'https://promo.tokoanda.com/full');
    assert.equal(urls2.customSlugUrl, 'https://promo.tokoanda.com/dapur-kangendari');
    assert.equal(urls2.customSlugFullUrl, 'https://promo.tokoanda.com/dapur-kangendari/full');
    assert.equal(urls2.primaryUrl, 'https://promo.tokoanda.com');
    assert.equal(urls2.primaryFullUrl, 'https://promo.tokoanda.com/full');
  });

  it('Conditional Fullscreen Button hides completely when browser does NOT support Fullscreen API', () => {
    const project = structuredClone(INITIAL_PROJECT);
    const html = generateProjectHtml(project, { projectId: 'proj_fs_unsupported' });

    const res1 = runFullscreenRuntimeInVm({
      html,
      pathname: '/p/jasclub',
      fullscreenEnabled: false,
      hasRequestMethod: true,
    });
    assert.equal(res1.fsBtn.hidden, true);
    assert.equal(res1.fsBtn.style.display, 'none');
    assert.equal(res1.requestCalls, 0);
    assert.equal(res1.alertsTriggered, 0);

    const res2 = runFullscreenRuntimeInVm({
      html,
      pathname: '/p/jasclub',
      fullscreenEnabled: true,
      hasRequestMethod: false,
    });
    assert.equal(res2.fsBtn.hidden, true);
    assert.equal(res2.fsBtn.style.display, 'none');
    assert.equal(res2.requestCalls, 0);
  });

  it('Click on Lihat Penuh calls requestFullscreen synchronously, updates URL to /full preserving UTM/hash, and syncs on exit', async () => {
    const project = structuredClone(INITIAL_PROJECT);
    const html = generateProjectHtml(project, { projectId: 'proj_fs_click' });

    const res = runFullscreenRuntimeInVm({
      html,
      pathname: '/p/jasclub',
      search: '?utm_source=meta&utm_campaign=ramadan',
      hash: '#katalog',
      fullscreenEnabled: true,
      hasRequestMethod: true,
      rejectRequest: false,
    });

    // Initially visible because browser supports Fullscreen API
    assert.equal(res.fsBtn.hidden, false);
    assert.equal(res.fsBtn.style.display, 'inline-flex');
    assert.equal(res.requestCalls, 0);

    // Click triggers synchronous requestFullscreen + History API URL update
    res.fsBtn.click();
    assert.equal(res.requestCalls, 1, 'requestFullscreen must be called synchronously inside click');
    assert.deepEqual(res.replacedUrls, [
      '/p/jasclub/full?utm_source=meta&utm_campaign=ramadan#katalog',
    ]);

    await new Promise((r) => setTimeout(r, 10));
    // While in fullscreen, button hides cleanly
    assert.equal(res.fsBtn.hidden, true);
    assert.equal(res.fsBtn.style.display, 'none');

    // Exiting fullscreen syncs button back without reload or forcing re-entry
    res.setActiveFullscreen(false);
    res.dispatchFullscreenChange();
    assert.equal(res.fsBtn.hidden, false);
    assert.equal(res.fsBtn.style.display, 'inline-flex');
    assert.equal(res.requestCalls, 1, 'Must NOT force re-entry into fullscreen on exit');
    assert.equal(res.reloadsTriggered, 0, 'Must NOT reload page on exit');
    assert.equal(res.alertsTriggered, 0, 'Must NOT show any alerts');
  });

  it('Rejected requestFullscreen (click or direct /full load) fails silently with zero retries and zero popups', async () => {
    const project = structuredClone(INITIAL_PROJECT);
    const html = generateProjectHtml(project, { projectId: 'proj_fs_reject' });

    // Direct /full open where browser blocks fullscreen without user activation
    const directRes = runFullscreenRuntimeInVm({
      html,
      pathname: '/p/jasclub/full',
      fullscreenEnabled: true,
      hasRequestMethod: true,
      rejectRequest: true,
    });
    await new Promise((r) => setTimeout(r, 15));

    assert.equal(directRes.requestCalls, 1, 'Direct /full must attempt fullscreen at most once');
    assert.equal(directRes.alertsTriggered, 0);
    assert.equal(directRes.reloadsTriggered, 0);
    assert.equal(directRes.replacedUrls.length, 0, 'Must NOT redirect back from /full');

    // Clicking button when rejected also stays silent and normal
    directRes.fsBtn.click();
    await new Promise((r) => setTimeout(r, 15));
    assert.equal(directRes.requestCalls, 2);
    assert.equal(directRes.alertsTriggered, 0);
    assert.equal(directRes.reloadsTriggered, 0);
  });

  it('DomainAndAdsModal renders Tautan Live Bawaan (Browser Mode) & Tautan Lihat Penuh (Fullscreen Mode) with inactive draft state and zero PWA/manual-URL bloat', () => {
    const modalSrc = fs.readFileSync(
      path.resolve('src/components/DomainAndAdsModal.tsx'),
      'utf8'
    );
    assert.match(modalSrc, /Tautan Live Bawaan/);
    assert.match(modalSrc, /Browser Mode/);
    assert.match(modalSrc, /Buka Live/);
    assert.match(modalSrc, /Tautan Lihat Penuh/);
    assert.match(modalSrc, /Fullscreen Mode/);
    assert.match(modalSrc, /urls\.internalFullUrl/);
    assert.match(modalSrc, /pub\.isPublished\s*\?/);
    assert.match(modalSrc, /Draft · Nonaktif/);
    assert.doesNotMatch(modalSrc, /manifest\.json|beforeinstallprompt/i);
  });

  describe('Live Express Server Routing (/p/:slug, /p/:slug/full, trailing slash, UTM, Draft guard, Custom Domain)', () => {
    let tmpDir = '';
    let closeServer: (() => Promise<void>) | null = null;
    let baseUrl = '';

    before(async () => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lynk-fs-mode-'));
      process.env.LYNK_DATA_DIR = tmpDir;
      process.env.DATABASE_URL = '';
      process.env.SESSION_SECRET = 'test_secret_fullscreen_mode_1234567890';
      process.env.NODE_ENV = 'test';

      const { upsertProjectEntry } = await import('../src/db/repository.ts');
      const { createApp } = await import('../server.ts');

      const pubProj = structuredClone(INITIAL_PROJECT);
      pubProj.title = 'Pataka Jas Club';
      pubProj.publishing = {
        slug: 'jasclub',
        customDomain: 'promo.tokoanda.com',
        useCustomDomain: true,
        isPublished: true,
        publishedAt: Date.now(),
      };

      const draftProj = structuredClone(INITIAL_PROJECT);
      draftProj.title = 'Usaha Draft Rahasia';
      draftProj.publishing = {
        slug: 'draft-usaha',
        customDomain: '',
        useCustomDomain: false,
        isPublished: false,
      };

      await upsertProjectEntry({
        record: {
          id: 'proj_pub_fs',
          revision: 1,
          project: pubProj,
          updatedAt: Date.now(),
          lastSavedAt: Date.now(),
        },
        renderedHtml: '',
        savedAt: Date.now(),
        ownerUserId: 'usr_seed',
      });

      await upsertProjectEntry({
        record: {
          id: 'proj_draft_fs',
          revision: 1,
          project: draftProj,
          updatedAt: Date.now(),
          lastSavedAt: Date.now(),
        },
        renderedHtml: '',
        savedAt: Date.now(),
        ownerUserId: 'usr_seed',
      });

      const app = await createApp({ attachViteOrStatic: false });
      const server = http.createServer(app);
      await new Promise<void>((resolve) => {
        server.listen(0, '127.0.0.1', () => resolve());
      });
      const addr = server.address();
      if (!addr || typeof addr === 'string') {
        throw new Error('Failed to bind test server');
      }
      baseUrl = `http://127.0.0.1:${addr.port}`;
      closeServer = () =>
        new Promise<void>((resolve) => {
          server.close(() => resolve());
        });
    });

    after(async () => {
      if (closeServer) await closeServer();
      if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('serves identical HTML for /p/:slug, /p/:slug/, /p/:slug/full, /p/:slug/full/, and UTM query params', async () => {
      const rBrowser = await fetch(`${baseUrl}/p/jasclub`);
      assert.equal(rBrowser.status, 200);
      const htmlBrowser = await rBrowser.text();
      assert.ok(htmlBrowser.includes('id="lynk-fullscreen-btn"'));
      assert.ok(htmlBrowser.includes('Pataka Jas Club'));

      const rBrowserSlash = await fetch(`${baseUrl}/p/jasclub/`);
      assert.equal(rBrowserSlash.status, 200);

      const rFull = await fetch(`${baseUrl}/p/jasclub/full`);
      assert.equal(rFull.status, 200);
      const htmlFull = await rFull.text();
      assert.equal(htmlFull, htmlBrowser, 'Fullscreen route must serve the exact same page HTML');

      const rFullSlash = await fetch(`${baseUrl}/p/jasclub/full/`);
      assert.equal(rFullSlash.status, 200);

      const rFullUtm = await fetch(
        `${baseUrl}/p/jasclub/full?utm_source=meta&utm_medium=paid_social&utm_campaign=promo`
      );
      assert.equal(rFullUtm.status, 200);
      assert.equal(await rFullUtm.text(), htmlBrowser);
    });

    it('enforces draft access control identically on /p/:slug/full', async () => {
      const rDraftFull = await fetch(`${baseUrl}/p/draft-usaha/full`);
      assert.equal(rDraftFull.status, 403);
    });

    it('serves custom domain Browser Mode and Fullscreen Mode routes (/, /full, /:slug, /:slug/full)', async () => {
      const parsedBase = new URL(baseUrl);
      const port = Number(parsedBase.port);
      const requestWithHost = (reqPath: string, hostHeader: string) =>
        new Promise<{ status: number; body: string }>((resolve, reject) => {
          const req = http.request(
            {
              hostname: '127.0.0.1',
              port,
              path: reqPath,
              method: 'GET',
              headers: { Host: hostHeader },
            },
            (res) => {
              let body = '';
              res.setEncoding('utf8');
              res.on('data', (chunk) => {
                body += chunk;
              });
              res.on('end', () => resolve({ status: res.statusCode ?? 0, body }));
            }
          );
          req.on('error', reject);
          req.end();
        });

      const paths = [
        '/',
        '/full',
        '/full/',
        '/jasclub',
        '/jasclub/',
        '/jasclub/full',
        '/jasclub/full/',
        '/jasclub/full?utm_source=meta&utm_campaign=custom',
      ];
      for (const p of paths) {
        const res = await requestWithHost(p, 'promo.tokoanda.com');
        assert.equal(res.status, 200, `Expected 200 for custom domain path ${p}`);
        assert.ok(res.body.includes('Pataka Jas Club'), `Expected page title for custom domain path ${p}`);
        assert.ok(res.body.includes('id="lynk-fullscreen-btn"'));
      }
    });
  });
});

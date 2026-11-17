import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import type { Request } from 'express';

import { createApp } from '../server.ts';
import { resetDbConnectionCheck } from '../src/db/index.ts';
import { resetJsonStoreCacheForTests } from '../src/db/repository.ts';
import { authRateLimiter, apiRateLimiter } from '../src/server/rateLimiter.ts';
import { publicPageCache } from '../src/server/publicPageCache.ts';
import {
  isInternalProxyIp,
  normalizeIpCandidate,
  resolveClientIp,
} from '../src/server/proxyIp.ts';
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
      if (!headers.has('Origin')) headers.set('Origin', baseUrl);
      if (!headers.has('X-Lynk-Requested-With')) headers.set('X-Lynk-Requested-With', 'fetch');
      const csrf = this.cookies.get('lynk_csrf');
      if (csrf && !headers.has('X-Lynk-CSRF')) headers.set('X-Lynk-CSRF', csrf);
    }
    const res = await fetch(`${baseUrl}${pathname}`, { ...init, headers });
    this.updateFromResponse(res);
    return res;
  }
}

describe('Proxy IP Resolution, /p/:slug HTML Cache, & Multi-User Access Suite', () => {
  let tmpDataDir: string;
  let server: http.Server;
  let baseUrl: string;
  let ownerJar: TestCookieJar;
  let editorJar: TestCookieJar;

  before(async () => {
    tmpDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lynk-pcm-test-'));
    process.env.LYNK_DATA_DIR = tmpDataDir;
    process.env.NODE_ENV = 'test';
    process.env.TRUST_PROXY = 'true';
    delete process.env.DATABASE_URL;
    delete process.env.PGHOST;

    authRateLimiter.reset();
    apiRateLimiter.reset();
    publicPageCache.clear();
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
        name: 'Owner Utama',
        email: 'owner@tim.local',
        password: 'OwnerPassword123',
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
    delete process.env.TRUST_PROXY;
    publicPageCache.clear();
  });

  it('Proxy IP parser: extracts real visitor IP behind GCP 169.254.169.126 multi-hop proxy and ignores spoofing when untrusted', () => {
    assert.equal(normalizeIpCandidate('::ffff:203.0.113.45'), '203.0.113.45');
    assert.equal(normalizeIpCandidate('198.51.100.9:51234'), '198.51.100.9');
    assert.equal(normalizeIpCandidate('"[2001:db8::1]"'), '2001:db8::1');

    assert.equal(isInternalProxyIp('169.254.169.126'), true);
    assert.equal(isInternalProxyIp('10.8.0.5'), true);
    assert.equal(isInternalProxyIp('127.0.0.1'), true);
    assert.equal(isInternalProxyIp('203.0.113.45'), false);

    // Multi-hop Cloud Run X-Forwarded-For: [spoofed_or_user, real_client, gcp_lb, cloud_run_proxy]
    const reqBehindCloudRun = {
      headers: {
        'x-forwarded-for': '1.1.1.1, 114.124.200.55, 169.254.169.126, 10.0.0.12',
      },
      ip: '169.254.169.126',
      socket: { remoteAddress: '127.0.0.1' },
    } as unknown as Pick<Request, 'headers' | 'ip' | 'socket'>;

    assert.equal(
      resolveClientIp(reqBehindCloudRun, { trustedProxy: true }),
      '114.124.200.55',
      'Must walk X-Forwarded-For right-to-left and skip internal GCP proxy IPs'
    );

    // When proxy is untrusted, ignore forwarding headers completely
    assert.equal(
      resolveClientIp(reqBehindCloudRun, { trustedProxy: false }),
      '127.0.0.1',
      'Must ignore X-Forwarded-For when trustedProxy=false'
    );

    // Cloudflare edge header takes precedence over multi-hop XFF when present
    const reqBehindCf = {
      headers: {
        'cf-connecting-ip': '182.253.44.10',
        'x-forwarded-for': '182.253.44.10, 169.254.169.126',
      },
      ip: '169.254.169.126',
      socket: { remoteAddress: '127.0.0.1' },
    } as unknown as Pick<Request, 'headers' | 'ip' | 'socket'>;
    assert.equal(resolveClientIp(reqBehindCf, { trustedProxy: true }), '182.253.44.10');

    // RFC 7239 Forwarded fallback
    const reqForwarded = {
      headers: {
        forwarded: 'for=203.0.113.77;proto=https, for="169.254.169.126"',
      },
      ip: '169.254.169.126',
      socket: { remoteAddress: '127.0.0.1' },
    } as unknown as Pick<Request, 'headers' | 'ip' | 'socket'>;
    assert.equal(resolveClientIp(reqForwarded, { trustedProxy: true }), '203.0.113.77');
  });

  it('Multi-user access: admin-created editor immediately sees and edits shared project, preserving rich block fields', async () => {
    const projectId = 'proj_shared_1';
    const richProject = {
      ...INITIAL_PROJECT,
      title: 'Kafe Kangen Sari',
      publishing: {
        ...INITIAL_PROJECT.publishing,
        slug: 'kafe-kangen-sari',
        isPublished: true,
      },
      blocks: [
        {
          id: 'blk_hero_custom',
          type: 'hero_profile' as const,
          style: {
            ...INITIAL_PROJECT.blocks[0].style,
            backgroundColor: '#FFFFFF',
            gradientEnabled: true,
            gradientColor1: '#EA580C',
            gradientColor2: '#9A3412',
            gradientAngle: 135,
          },
          content: {
            heroName: 'Kafe Kangen Sari',
            heroTagline: 'Kopi gula aren & roti bakar',
            heroCoverImage: 'https://example.com/cover.jpg',
            heroCoverFontFamily: "'Playfair Display', serif",
            heroLogoBg: '#FFEDD5',
            heroLogoColor: '#C2410C',
          },
        },
        {
          id: 'blk_fnb_custom',
          type: 'fnb_catalog' as const,
          style: { ...INITIAL_PROJECT.blocks[0].style },
          content: {
            fnbAccentColor: '#EA580C',
            fnbItems: [
              {
                id: 'item_kopi',
                title: 'Es Kopi Susu',
                category: 'Minuman',
                price: 'Rp 22.000',
                image: 'https://example.com/kopi.jpg',
              },
            ],
          },
        },
      ],
    };

    const saveOwner = await ownerJar.request(baseUrl, `/api/projects/${projectId}/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        record: {
          id: projectId,
          revision: 1,
          project: richProject,
          updatedAt: Date.now(),
        },
      }),
    });
    assert.equal(saveOwner.status, 200);

    // Owner creates 2nd team user with role 'editor' WITHOUT explicitly sending unitScope -> must default to 'all'
    const createRes = await ownerJar.request(baseUrl, '/api/auth/admin-create-member', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Admin Kedua',
        email: 'user2@tim.local',
        password: 'UserDua1234',
        role: 'editor',
      }),
    });
    assert.equal(createRes.status, 201);
    const createData = (await createRes.json()) as {
      user: { unitScope: string | string[]; role: string };
    };
    assert.equal(createData.user.role, 'editor');
    assert.equal(createData.user.unitScope, 'all');

    // User #2 logs in from a fresh browser session behind GCP proxy
    editorJar = new TestCookieJar();
    await editorJar.request(baseUrl, '/api/auth/me');
    const loginRes = await editorJar.request(baseUrl, '/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': '118.99.77.12, 169.254.169.126',
      },
      body: JSON.stringify({
        email: 'user2@tim.local',
        password: 'UserDua1234',
      }),
    });
    assert.equal(loginRes.status, 200);

    // Verify stored session recorded real visitor IP, NOT 169.254.169.126
    const storeRaw = JSON.parse(
      fs.readFileSync(path.join(tmpDataDir, 'lynk-server-store.json'), 'utf8')
    ) as { sessions: Array<{ ipAddress: string }> };
    assert.ok(storeRaw.sessions.some((s) => s.ipAddress === '118.99.77.12'));
    assert.ok(!storeRaw.sessions.some((s) => s.ipAddress === '169.254.169.126'));

    // User #2 fetches /api/projects and sees project + all Turn-9 fields
    const listRes = await editorJar.request(baseUrl, '/api/projects');
    assert.equal(listRes.status, 200);
    const listBody = (await listRes.json()) as {
      projects: Array<{
        id: string;
        revision: number;
        project: typeof richProject;
      }>;
    };
    assert.equal(listBody.projects.length, 1);
    assert.equal(listBody.projects[0].id, projectId);
    assert.equal(listBody.projects[0].project.blocks[0].style.gradientAngle, 135);
    assert.equal(listBody.projects[0].project.blocks[1].content.fnbItems?.[0]?.title, 'Es Kopi Susu');

    // User #2 edits title & saves with baseRevision: 1 -> revision increments to 2
    const updatedByUser2 = {
      ...listBody.projects[0].project,
      title: 'Kafe Kangen Sari — Cabang 2',
    };
    const saveUser2 = await editorJar.request(baseUrl, `/api/projects/${projectId}/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        baseRevision: listBody.projects[0].revision,
        record: {
          id: projectId,
          revision: listBody.projects[0].revision,
          project: updatedByUser2,
          updatedAt: Date.now(),
        },
      }),
    });
    assert.equal(saveUser2.status, 200);
    const saveUser2Body = (await saveUser2.json()) as { revision: number };
    assert.equal(saveUser2Body.revision, 2);
  });

  it('/p/:slug HTML cache: serves MISS -> HIT with ETag/304, invalidates on publish/delete, bypasses draft preview', async () => {
    const slug = 'kafe-kangen-sari';

    // First public hit: cache MISS
    const r1 = await fetch(`${baseUrl}/p/${slug}`);
    assert.equal(r1.status, 200);
    assert.equal(r1.headers.get('x-cache'), 'MISS');
    assert.match(r1.headers.get('cache-control') || '', /public, max-age=30/);
    const etag1 = r1.headers.get('etag');
    assert.ok(etag1);
    const html1 = await r1.text();
    assert.ok(html1.includes('Kafe Kangen Sari — Cabang 2'));

    // Second hit: cache HIT with identical ETag
    const r2 = await fetch(`${baseUrl}/p/${slug}`);
    assert.equal(r2.status, 200);
    assert.equal(r2.headers.get('x-cache'), 'HIT');
    assert.equal(r2.headers.get('etag'), etag1);

    // Conditional request with If-None-Match -> 304 Not Modified
    const r304 = await fetch(`${baseUrl}/p/${slug}`, {
      headers: { 'If-None-Match': etag1 },
    });
    assert.equal(r304.status, 304);

    // Owner publishes updated title -> cache MUST immediately invalidate
    const pubRes = await ownerJar.request(baseUrl, '/api/projects/proj_shared_1/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        baseRevision: 2,
        record: {
          id: 'proj_shared_1',
          revision: 2,
          project: {
            ...INITIAL_PROJECT,
            title: 'Kafe Kangen Sari — Promo Baru',
            publishing: { ...INITIAL_PROJECT.publishing, slug, isPublished: true },
          },
          updatedAt: Date.now(),
        },
      }),
    });
    assert.equal(pubRes.status, 200);

    const rAfterPub = await fetch(`${baseUrl}/p/${slug}`);
    assert.equal(rAfterPub.status, 200);
    assert.equal(rAfterPub.headers.get('x-cache'), 'MISS');
    const etag2 = rAfterPub.headers.get('etag');
    assert.notEqual(etag2, etag1);
    const htmlAfterPub = await rAfterPub.text();
    assert.ok(htmlAfterPub.includes('Kafe Kangen Sari — Promo Baru'));

    // Unpublish (isPublished: false) -> invalidates cache so public immediately gets 403 Draft (no stale cache leak)
    const unpubRes = await ownerJar.request(baseUrl, '/api/projects/proj_shared_1/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        baseRevision: 3,
        record: {
          id: 'proj_shared_1',
          revision: 3,
          project: {
            ...INITIAL_PROJECT,
            title: 'Draft Rahasia Baru',
            publishing: { ...INITIAL_PROJECT.publishing, slug, isPublished: false },
          },
          updatedAt: Date.now(),
        },
      }),
    });
    assert.equal(unpubRes.status, 200);

    // Unauthenticated visitor sees 403 draft block even with ?preview=1
    const anonDraft = await fetch(`${baseUrl}/p/${slug}?preview=1`);
    assert.equal(anonDraft.status, 403);
    assert.match(anonDraft.headers.get('cache-control') || '', /no-store/);

    // Authenticated owner sees ?preview=1 draft with BYPASS & no-store
    const ownerDraft = await ownerJar.request(baseUrl, `/p/${slug}?preview=1`);
    assert.equal(ownerDraft.status, 200);
    assert.equal(ownerDraft.headers.get('x-cache'), 'BYPASS');
    assert.match(ownerDraft.headers.get('cache-control') || '', /no-store/);
    const draftHtml = await ownerDraft.text();
    assert.ok(draftHtml.includes('Draft Rahasia Baru'));
  });
});

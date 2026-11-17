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
import { INITIAL_PROJECT } from '../src/data/presets.ts';
import { generateProjectHtml } from '../src/utils/htmlExporter.ts';

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

describe('Performance & Load Evaluation Suite', () => {
  let tmpDataDir: string;
  let server: http.Server;
  let baseUrl: string;
  let cookieHeader = '';
  let csrfToken = '';

  before(async () => {
    tmpDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lynk-perf-test-'));
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

    const me = await fetch(`${baseUrl}/api/auth/me`);
    const cookies = me.headers.getSetCookie();
    const csrfMatch = cookies.find((c) => c.startsWith('lynk_csrf='))?.split(';')[0]?.split('=')[1] || '';
    csrfToken = csrfMatch;

    const reg = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `lynk_csrf=${csrfToken}`,
        Origin: baseUrl,
        'X-Lynk-CSRF': csrfToken,
        'X-Lynk-Requested-With': 'fetch',
      },
      body: JSON.stringify({
        name: 'Perf Owner',
        email: 'perf@test.local',
        password: 'PerfPassword123!',
      }),
    });
    const allCookies = reg.headers.getSetCookie().map((c) => c.split(';')[0]);
    cookieHeader = allCookies.join('; ');
    const newCsrf = allCookies.find((c) => c.startsWith('lynk_csrf='))?.split('=')[1];
    if (newCsrf) csrfToken = newCsrf;

    const pub = await fetch(`${baseUrl}/api/projects/proj_perf_1/publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader,
        Origin: baseUrl,
        'X-Lynk-CSRF': csrfToken,
        'X-Lynk-Requested-With': 'fetch',
      },
      body: JSON.stringify({
        record: {
          id: 'proj_perf_1',
          project: {
            ...INITIAL_PROJECT,
            title: 'Perf Landing Page',
            publishing: { ...INITIAL_PROJECT.publishing, slug: 'perf-page', isPublished: true },
          },
          updatedAt: Date.now(),
        },
      }),
    });
    assert.equal(pub.status, 200);
  });

  after(async () => {
    await new Promise<void>((resolve) => {
      server?.close(() => resolve());
    });
    fs.rmSync(tmpDataDir, { recursive: true, force: true });
    delete process.env.LYNK_DATA_DIR;
  });

  it('Measures HTML export CPU, 100 concurrent health & public page reads, and 25 atomic saves', async () => {
    const rssBefore = process.memoryUsage().rss;

    // 1. HTML generation benchmark (20 iterations)
    const genLatencies: number[] = [];
    for (let i = 0; i < 20; i++) {
      const t0 = performance.now();
      const html = generateProjectHtml(INITIAL_PROJECT, { projectId: 'proj_perf_1' });
      const t1 = performance.now();
      assert.ok(html.length > 50_000);
      genLatencies.push(t1 - t0);
    }
    genLatencies.sort((a, b) => a - b);

    // Warmup 1 request so TCP/JIT initialization is excluded from concurrency benchmark
    const warm = await fetch(`${baseUrl}/p/perf-page`);
    await warm.text();

    // 2. 100 concurrent public /p/perf-page reads
    const pubStart = performance.now();
    const pubLatencies = await Promise.all(
      Array.from({ length: 100 }, async () => {
        const t0 = performance.now();
        const r = await fetch(`${baseUrl}/p/perf-page`);
        await r.text();
        assert.equal(r.status, 200);
        return performance.now() - t0;
      })
    );
    const pubTotalMs = performance.now() - pubStart;
    pubLatencies.sort((a, b) => a - b);

    // 3. 25 sequential OCC save mutations + atomic disk persist
    const saveLatencies: number[] = [];
    let currentRev = 1;
    for (let i = 0; i < 25; i++) {
      const t0 = performance.now();
      const r = await fetch(`${baseUrl}/api/projects/proj_perf_1/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader,
          Origin: baseUrl,
          'X-Lynk-CSRF': csrfToken,
          'X-Lynk-Requested-With': 'fetch',
        },
        body: JSON.stringify({
          baseRevision: currentRev,
          record: {
            id: 'proj_perf_1',
            revision: currentRev,
            project: {
              ...INITIAL_PROJECT,
              title: `Perf Save #${i}`,
              publishing: { ...INITIAL_PROJECT.publishing, slug: 'perf-page', isPublished: true },
            },
            updatedAt: Date.now(),
          },
        }),
      });
      assert.equal(r.status, 200);
      const body = (await r.json()) as { revision: number };
      currentRev = body.revision;
      saveLatencies.push(performance.now() - t0);
    }
    saveLatencies.sort((a, b) => a - b);

    const rssAfter = process.memoryUsage().rss;
    const rssDeltaMb = ((rssAfter - rssBefore) / (1024 * 1024)).toFixed(2);

    console.log(
      `[PERF] HTML Export (20x): p50=${percentile(genLatencies, 50).toFixed(2)}ms p95=${percentile(genLatencies, 95).toFixed(2)}ms max=${genLatencies[genLatencies.length - 1].toFixed(2)}ms`
    );
    console.log(
      `[PERF] Public /p/perf-page (100 concurrent): total=${pubTotalMs.toFixed(1)}ms p50=${percentile(pubLatencies, 50).toFixed(2)}ms p95=${percentile(pubLatencies, 95).toFixed(2)}ms max=${pubLatencies[pubLatencies.length - 1].toFixed(2)}ms`
    );
    console.log(
      `[PERF] Atomic Save+OCC (25x): p50=${percentile(saveLatencies, 50).toFixed(2)}ms p95=${percentile(saveLatencies, 95).toFixed(2)}ms max=${saveLatencies[saveLatencies.length - 1].toFixed(2)}ms`
    );
    console.log(`[PERF] Memory RSS delta: ${rssDeltaMb} MB`);

    assert.ok(percentile(genLatencies, 95) < 50, 'HTML generation should stay under 50ms');
    assert.ok(percentile(pubLatencies, 95) < 1000, 'Public SSR serve under concurrency should stay under 1000ms p95');
  });
});

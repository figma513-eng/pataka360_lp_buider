import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import { WebSocket } from 'ws';

import { attachCollabToServer, createApp, getCollabHub } from '../server.ts';
import { resetDbConnectionCheck } from '../src/db/index.ts';
import { resetJsonStoreCacheForTests } from '../src/db/repository.ts';
import { authRateLimiter, apiRateLimiter } from '../src/server/rateLimiter.ts';
import { publicPageCache } from '../src/server/publicPageCache.ts';
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

  getCookieHeader(): string {
    return Array.from(this.cookies.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
  }

  async request(baseUrl: string, pathname: string, init: RequestInit = {}): Promise<Response> {
    const headers = new Headers(init.headers || {});
    const cookieStr = this.getCookieHeader();
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

interface ParsedWsMessage {
  type: string;
  [key: string]: unknown;
}

class WsTestClient {
  readonly ws: WebSocket;
  readonly messages: ParsedWsMessage[] = [];
  private waiters: Array<(msg: ParsedWsMessage) => boolean> = [];

  constructor(url: string, cookieHeader?: string) {
    this.ws = new WebSocket(
      url,
      cookieHeader ? { headers: { Cookie: cookieHeader } } : undefined
    );
    this.ws.on('message', (data) => {
      try {
        const parsed = JSON.parse(String(data)) as ParsedWsMessage;
        this.messages.push(parsed);
        const remaining: typeof this.waiters = [];
        for (const fn of this.waiters) {
          if (!fn(parsed)) remaining.push(fn);
        }
        this.waiters = remaining;
      } catch {
        // ignore
      }
    });
  }

  waitForOpen(): Promise<void> {
    if (this.ws.readyState === WebSocket.OPEN) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('WS open timeout')), 4000);
      this.ws.once('open', () => {
        clearTimeout(timer);
        resolve();
      });
      this.ws.once('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });
  }

  waitForMessage<T extends ParsedWsMessage = ParsedWsMessage>(
    predicate: (msg: ParsedWsMessage) => boolean,
    timeoutMs = 4000
  ): Promise<T> {
    const existing = this.messages.find(predicate);
    if (existing) return Promise.resolve(existing as T);

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Timed out waiting for WS message'));
      }, timeoutMs);
      this.waiters.push((msg) => {
        if (predicate(msg)) {
          clearTimeout(timer);
          resolve(msg as T);
          return true;
        }
        return false;
      });
    });
  }

  sendJson(payload: Record<string, unknown>): void {
    this.ws.send(JSON.stringify(payload));
  }

  close(): void {
    try {
      this.ws.close();
    } catch {
      // ignore
    }
  }
}

describe('Real-Time Multi-User WebSocket Collaboration Suite', () => {
  let tmpDataDir: string;
  let server: http.Server;
  let appRef: Awaited<ReturnType<typeof createApp>>;
  let baseUrl: string;
  let wsUrl: string;
  let ownerJar: TestCookieJar;
  let editorJar: TestCookieJar;
  let restrictedJar: TestCookieJar;
  const openSockets: WsTestClient[] = [];

  before(async () => {
    tmpDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lynk-ws-test-'));
    process.env.LYNK_DATA_DIR = tmpDataDir;
    process.env.NODE_ENV = 'test';
    delete process.env.DATABASE_URL;
    delete process.env.PGHOST;

    authRateLimiter.reset();
    apiRateLimiter.reset();
    publicPageCache.clear();
    resetJsonStoreCacheForTests();
    await resetDbConnectionCheck();

    appRef = await createApp({ attachViteOrStatic: false });
    server = http.createServer(appRef);
    attachCollabToServer(appRef, server);

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => resolve());
    });
    const addr = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${addr.port}`;
    wsUrl = `ws://127.0.0.1:${addr.port}/ws/collab`;

    ownerJar = new TestCookieJar();
    await ownerJar.request(baseUrl, '/api/auth/me');
    const reg = await ownerJar.request(baseUrl, '/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Desainer Satu',
        email: 'user1@tim.local',
        password: 'PasswordSatu123',
      }),
    });
    assert.equal(reg.status, 201);

    const createEditor = await ownerJar.request(baseUrl, '/api/auth/admin-create-member', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Desainer Dua',
        email: 'user2@tim.local',
        password: 'PasswordDua123',
        role: 'editor',
        unitScope: 'all',
      }),
    });
    assert.equal(createEditor.status, 201);

    editorJar = new TestCookieJar();
    await editorJar.request(baseUrl, '/api/auth/me');
    const loginEditor = await editorJar.request(baseUrl, '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'user2@tim.local',
        password: 'PasswordDua123',
      }),
    });
    assert.equal(loginEditor.status, 200);

    const createRestricted = await ownerJar.request(baseUrl, '/api/auth/admin-create-member', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Staf Terbatas',
        email: 'restricted@tim.local',
        password: 'PasswordStaf123',
        role: 'viewer',
        unitScope: ['proj_only_other'],
      }),
    });
    assert.equal(createRestricted.status, 201);

    restrictedJar = new TestCookieJar();
    await restrictedJar.request(baseUrl, '/api/auth/me');
    const loginRestricted = await restrictedJar.request(baseUrl, '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'restricted@tim.local',
        password: 'PasswordStaf123',
      }),
    });
    assert.equal(loginRestricted.status, 200);
  });

  after(async () => {
    for (const sock of openSockets) {
      sock.close();
    }
    getCollabHub(appRef)?.close();
    await new Promise<void>((resolve) => {
      server?.close(() => resolve());
    });
    fs.rmSync(tmpDataDir, { recursive: true, force: true });
    delete process.env.LYNK_DATA_DIR;
    publicPageCache.clear();
  });

  it('rejects unauthenticated WebSocket upgrades with HTTP 401', async () => {
    const statusCode = await new Promise<number>((resolve, reject) => {
      const ws = new WebSocket(wsUrl);
      ws.once('unexpected-response', (_req, res) => {
        ws.terminate();
        resolve(res.statusCode ?? 0);
      });
      ws.once('open', () => {
        ws.close();
        reject(new Error('Unauthenticated WS upgrade should have failed'));
      });
      ws.once('error', () => {
        // handled by unexpected-response
      });
    });

    assert.equal(statusCode, 401);
  });

  it('syncs room presence, block selection, live project saves, and deletion while isolating unit scopes', async () => {
    const projectId = 'proj_collab_live';
    const baseRecord = {
      id: projectId,
      revision: 1,
      updatedAt: Date.now(),
      lastSavedAt: 0,
      project: {
        ...structuredClone(INITIAL_PROJECT),
        title: 'Kopi Senja Live',
        publishing: {
          slug: 'kopi-senja-live',
          isPublished: false,
          useCustomDomain: false,
          customDomain: '',
        },
      },
    };

    const initialSave = await ownerJar.request(baseUrl, `/api/projects/${projectId}/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ record: baseRecord }),
    });
    assert.equal(initialSave.status, 200);
    const savedMeta = (await initialSave.json()) as { revision: number };
    assert.equal(savedMeta.revision, 1);

    const wsUser1 = new WsTestClient(wsUrl, ownerJar.getCookieHeader());
    const wsUser2 = new WsTestClient(wsUrl, editorJar.getCookieHeader());
    const wsRestricted = new WsTestClient(wsUrl, restrictedJar.getCookieHeader());
    openSockets.push(wsUser1, wsUser2, wsRestricted);

    await Promise.all([wsUser1.waitForOpen(), wsUser2.waitForOpen(), wsRestricted.waitForOpen()]);
    await Promise.all([
      wsUser1.waitForMessage((m) => m.type === 'collab:connected'),
      wsUser2.waitForMessage((m) => m.type === 'collab:connected'),
      wsRestricted.waitForMessage((m) => m.type === 'collab:connected'),
    ]);

    // User 1 & User 2 join shared project room
    const firstBlockId = baseRecord.project.blocks[0]?.id ?? 'blk_hero_1';
    wsUser1.sendJson({ type: 'room:join', projectId, selectedBlockId: firstBlockId });
    wsUser2.sendJson({ type: 'room:join', projectId, selectedBlockId: null });

    const presenceOnUser2 = await wsUser2.waitForMessage<{
      type: 'presence:update';
      projectId: string;
      peers: Array<{ email: string; selectedBlockId: string | null }>;
    }>(
      (m) =>
        m.type === 'presence:update' &&
        m.projectId === projectId &&
        Array.isArray(m.peers) &&
        m.peers.some((p: { email: string; selectedBlockId: string | null }) =>
          p.email === 'user1@tim.local' && p.selectedBlockId === firstBlockId
        )
    );
    assert.equal(presenceOnUser2.projectId, projectId);

    // Restricted viewer attempts to join shared project -> FORBIDDEN
    wsRestricted.sendJson({ type: 'room:join', projectId, selectedBlockId: null });
    const forbiddenErr = await wsRestricted.waitForMessage<{ type: 'collab:error'; code: string }>(
      (m) => m.type === 'collab:error' && m.code === 'FORBIDDEN'
    );
    assert.equal(forbiddenErr.code, 'FORBIDDEN');

    // User 1 updates block focus -> User 2 immediately receives updated block selection
    const secondBlockId = baseRecord.project.blocks[1]?.id ?? 'blk_second';
    wsUser1.sendJson({ type: 'block:select', projectId, selectedBlockId: secondBlockId });
    await wsUser2.waitForMessage(
      (m) =>
        m.type === 'presence:update' &&
        Array.isArray(m.peers) &&
        m.peers.some((p: { email: string; selectedBlockId: string | null }) =>
          p.email === 'user1@tim.local' && p.selectedBlockId === secondBlockId
        )
    );

    // User 1 saves a design change -> User 2 receives live project:updated, Restricted User does NOT
    const v2Record = {
      ...baseRecord,
      revision: savedMeta.revision,
      updatedAt: Date.now(),
      project: {
        ...baseRecord.project,
        title: 'Kopi Senja Edisi Live Update',
      },
    };
    const saveV2 = await ownerJar.request(baseUrl, `/api/projects/${projectId}/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ record: v2Record, baseRevision: savedMeta.revision }),
    });
    assert.equal(saveV2.status, 200);

    const liveUpdate = await wsUser2.waitForMessage<{
      type: 'project:updated';
      projectId: string;
      eventType: 'saved' | 'published';
      updatedBy: { name: string; email: string };
      record: { revision: number; project: { title: string } };
    }>(
      (m) =>
        m.type === 'project:updated' &&
        m.projectId === projectId &&
        (m.record as { revision?: number })?.revision === 2
    );

    assert.equal(liveUpdate.eventType, 'saved');
    assert.equal(liveUpdate.updatedBy.email, 'user1@tim.local');
    assert.equal(liveUpdate.record.project.title, 'Kopi Senja Edisi Live Update');

    // Give small window to confirm restricted user never received project:updated for shared project
    await new Promise((r) => setTimeout(r, 80));
    const leaked = wsRestricted.messages.some(
      (m) => m.type === 'project:updated' && m.projectId === projectId
    );
    assert.equal(leaked, false, 'Restricted user must not receive out-of-scope project updates');

    // User 1 deletes project -> User 2 receives project:deleted
    const delRes = await ownerJar.request(baseUrl, `/api/projects/${projectId}`, {
      method: 'DELETE',
    });
    assert.equal(delRes.status, 200);

    const deletedEvt = await wsUser2.waitForMessage<{
      type: 'project:deleted';
      projectId: string;
      deletedBy: { email: string };
    }>((m) => m.type === 'project:deleted' && m.projectId === projectId);
    assert.equal(deletedEvt.deletedBy.email, 'user1@tim.local');
  });
});

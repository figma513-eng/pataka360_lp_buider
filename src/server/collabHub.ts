import type http from 'node:http';
import crypto from 'node:crypto';
import { WebSocket, WebSocketServer } from 'ws';
import type { AccessRole, ProjectRecord } from '../types/builder.ts';
import type { StoredUserRecord } from '../db/repository.ts';

export interface CollabPeerInfo {
  connectionId: string;
  userId: string;
  name: string;
  email: string;
  role: AccessRole;
  color: string;
  projectId: string | null;
  selectedBlockId: string | null;
}

export interface CollabActorSummary {
  id: string;
  name: string;
  email: string;
}

export type CollabServerMessage =
  | {
      type: 'collab:connected';
      self: {
        connectionId: string;
        userId: string;
        name: string;
        email: string;
        role: AccessRole;
        color: string;
      };
    }
  | {
      type: 'presence:update';
      projectId: string;
      peers: CollabPeerInfo[];
    }
  | {
      type: 'project:updated';
      projectId: string;
      record: ProjectRecord;
      eventType: 'saved' | 'published';
      updatedBy: CollabActorSummary;
      timestamp: number;
    }
  | {
      type: 'project:deleted';
      projectId: string;
      deletedBy: CollabActorSummary;
      timestamp: number;
    }
  | {
      type: 'access:updated';
      targetUserId?: string;
      timestamp: number;
    }
  | {
      type: 'collab:error';
      code: string;
      message: string;
    };

interface ConnectedCollabClient {
  connectionId: string;
  ws: WebSocket;
  user: StoredUserRecord;
  color: string;
  projectId: string | null;
  selectedBlockId: string | null;
  isAlive: boolean;
}

export interface CollabHubDeps {
  authenticateUpgrade: (req: http.IncomingMessage) => Promise<StoredUserRecord | null>;
  canAccessProject: (user: StoredUserRecord, projectId: string) => Promise<boolean>;
}

const PEER_PALETTE = [
  '#2563EB',
  '#059669',
  '#EA580C',
  '#7C3AED',
  '#DB2777',
  '#0891B2',
  '#D97706',
];

function pickPeerColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i += 1) {
    hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  }
  return PEER_PALETTE[hash % PEER_PALETTE.length];
}

function userCanSeeProjectId(user: StoredUserRecord, projectId: string): boolean {
  if (!user.isActive) return false;
  if (user.role === 'super_admin' || user.unitScope === 'all') return true;
  if (Array.isArray(user.unitScope)) return user.unitScope.includes(projectId);
  return false;
}

function sendJson(ws: WebSocket, payload: CollabServerMessage): void {
  if (ws.readyState !== WebSocket.OPEN) return;
  try {
    ws.send(JSON.stringify(payload));
  } catch {
    // Abaikan socket yang sedang tertutup
  }
}

export class CollabHub {
  private readonly wss: WebSocketServer;
  private readonly clients = new Set<ConnectedCollabClient>();
  private deps: CollabHubDeps | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.wss = new WebSocketServer({ noServer: true, maxPayload: 64 * 1024 });
    this.wss.on('connection', (ws, _req, clientMeta?: unknown) => {
      const user = clientMeta as StoredUserRecord | undefined;
      if (!user || !user.isActive) {
        ws.close(4001, 'Unauthorized');
        return;
      }

      const client: ConnectedCollabClient = {
        connectionId: crypto.randomUUID(),
        ws,
        user,
        color: pickPeerColor(user.id),
        projectId: null,
        selectedBlockId: null,
        isAlive: true,
      };
      this.clients.add(client);

      sendJson(ws, {
        type: 'collab:connected',
        self: {
          connectionId: client.connectionId,
          userId: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          color: client.color,
        },
      });

      ws.on('pong', () => {
        client.isAlive = true;
      });

      ws.on('message', (raw) => {
        void this.handleClientMessage(client, raw);
      });

      ws.on('close', () => {
        const prevProjectId = client.projectId;
        this.clients.delete(client);
        if (prevProjectId) {
          this.broadcastPresence(prevProjectId);
        }
      });

      ws.on('error', () => {
        const prevProjectId = client.projectId;
        this.clients.delete(client);
        if (prevProjectId) {
          this.broadcastPresence(prevProjectId);
        }
      });
    });

    this.heartbeatTimer = setInterval(() => {
      for (const client of this.clients) {
        if (!client.isAlive) {
          const prevProjectId = client.projectId;
          this.clients.delete(client);
          try {
            client.ws.terminate();
          } catch {
            // ignore
          }
          if (prevProjectId) {
            this.broadcastPresence(prevProjectId);
          }
          continue;
        }
        client.isAlive = false;
        try {
          client.ws.ping();
        } catch {
          // ignore
        }
      }
    }, 25_000);
    if (typeof this.heartbeatTimer.unref === 'function') {
      this.heartbeatTimer.unref();
    }
  }

  attach(httpServer: http.Server, deps: CollabHubDeps): void {
    this.deps = deps;
    httpServer.on('upgrade', (req, socket, head) => {
      let pathname = '';
      try {
        const parsed = new URL(req.url || '/', 'http://localhost');
        pathname = parsed.pathname;
      } catch {
        return;
      }
      if (pathname !== '/ws/collab') {
        return;
      }

      void (async () => {
        try {
          const user = await deps.authenticateUpgrade(req);
          if (!user || !user.isActive) {
            socket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n');
            socket.destroy();
            return;
          }
          this.wss.handleUpgrade(req, socket, head, (ws) => {
            this.wss.emit('connection', ws, req, user);
          });
        } catch {
          try {
            socket.write('HTTP/1.1 500 Internal Server Error\r\nConnection: close\r\n\r\n');
          } catch {
            // ignore
          }
          socket.destroy();
        }
      })();
    });
  }

  private async handleClientMessage(client: ConnectedCollabClient, raw: unknown): Promise<void> {
    let parsed: { type?: string; projectId?: unknown; selectedBlockId?: unknown } | null = null;
    try {
      const text = typeof raw === 'string' ? raw : Buffer.isBuffer(raw) ? raw.toString('utf8') : '';
      if (!text || text.length > 32 * 1024) return;
      parsed = JSON.parse(text) as { type?: string; projectId?: unknown; selectedBlockId?: unknown };
    } catch {
      return;
    }
    if (!parsed || typeof parsed.type !== 'string') return;

    if (parsed.type === 'room:join') {
      const projectId =
        typeof parsed.projectId === 'string' ? parsed.projectId.trim().slice(0, 120) : '';
      const selectedBlockId =
        typeof parsed.selectedBlockId === 'string'
          ? parsed.selectedBlockId.trim().slice(0, 120)
          : null;

      if (!projectId) {
        const prev = client.projectId;
        client.projectId = null;
        client.selectedBlockId = null;
        if (prev) this.broadcastPresence(prev);
        return;
      }

      const allowed = this.deps
        ? await this.deps.canAccessProject(client.user, projectId)
        : userCanSeeProjectId(client.user, projectId);
      if (!allowed) {
        sendJson(client.ws, {
          type: 'collab:error',
          code: 'FORBIDDEN',
          message: 'Tidak memiliki akses ke unit usaha ini.',
        });
        return;
      }

      const prevProjectId = client.projectId;
      client.projectId = projectId;
      client.selectedBlockId = selectedBlockId;
      if (prevProjectId && prevProjectId !== projectId) {
        this.broadcastPresence(prevProjectId);
      }
      this.broadcastPresence(projectId);
      return;
    }

    if (parsed.type === 'block:select') {
      const projectId =
        typeof parsed.projectId === 'string' ? parsed.projectId.trim().slice(0, 120) : '';
      if (!projectId || client.projectId !== projectId) return;
      client.selectedBlockId =
        typeof parsed.selectedBlockId === 'string'
          ? parsed.selectedBlockId.trim().slice(0, 120)
          : null;
      this.broadcastPresence(projectId);
    }
  }

  private getRoomPeers(projectId: string): CollabPeerInfo[] {
    const peers: CollabPeerInfo[] = [];
    for (const client of this.clients) {
      if (client.ws.readyState === WebSocket.OPEN && client.projectId === projectId) {
        peers.push({
          connectionId: client.connectionId,
          userId: client.user.id,
          name: client.user.name,
          email: client.user.email,
          role: client.user.role,
          color: client.color,
          projectId: client.projectId,
          selectedBlockId: client.selectedBlockId,
        });
      }
    }
    return peers;
  }

  private broadcastPresence(projectId: string): void {
    const peers = this.getRoomPeers(projectId);
    for (const client of this.clients) {
      if (client.ws.readyState === WebSocket.OPEN && client.projectId === projectId) {
        sendJson(client.ws, {
          type: 'presence:update',
          projectId,
          peers,
        });
      }
    }
  }

  broadcastProjectUpdated(
    record: ProjectRecord,
    actor: CollabActorSummary,
    eventType: 'saved' | 'published'
  ): void {
    const payload: CollabServerMessage = {
      type: 'project:updated',
      projectId: record.id,
      record,
      eventType,
      updatedBy: actor,
      timestamp: Date.now(),
    };
    for (const client of this.clients) {
      if (
        client.ws.readyState === WebSocket.OPEN &&
        userCanSeeProjectId(client.user, record.id)
      ) {
        sendJson(client.ws, payload);
      }
    }
  }

  broadcastProjectDeleted(projectId: string, actor: CollabActorSummary): void {
    const payload: CollabServerMessage = {
      type: 'project:deleted',
      projectId,
      deletedBy: actor,
      timestamp: Date.now(),
    };
    for (const client of this.clients) {
      if (
        client.ws.readyState === WebSocket.OPEN &&
        userCanSeeProjectId(client.user, projectId)
      ) {
        sendJson(client.ws, payload);
        if (client.projectId === projectId) {
          client.projectId = null;
          client.selectedBlockId = null;
        }
      }
    }
  }

  broadcastAccessUpdated(targetUserId?: string): void {
    const payload: CollabServerMessage = {
      type: 'access:updated',
      targetUserId,
      timestamp: Date.now(),
    };
    for (const client of this.clients) {
      if (client.ws.readyState === WebSocket.OPEN) {
        if (!targetUserId || client.user.id === targetUserId) {
          sendJson(client.ws, payload);
        }
      }
    }
  }

  updateConnectedUsers(users: StoredUserRecord[]): void {
    const byId = new Map(users.map((u) => [u.id, u]));
    const roomsToUpdate = new Set<string>();
    for (const client of this.clients) {
      const updated = byId.get(client.user.id);
      if (!updated || !updated.isActive) {
        const prev = client.projectId;
        this.clients.delete(client);
        if (prev) roomsToUpdate.add(prev);
        try {
          client.ws.close(4003, 'Account updated or disabled');
        } catch {
          // ignore
        }
        continue;
      }
      client.user = updated;
      if (client.projectId && !userCanSeeProjectId(updated, client.projectId)) {
        const prev = client.projectId;
        client.projectId = null;
        client.selectedBlockId = null;
        roomsToUpdate.add(prev);
        sendJson(client.ws, {
          type: 'collab:error',
          code: 'FORBIDDEN',
          message: 'Akses unit usaha ini telah dicabut oleh administrator.',
        });
      }
    }
    for (const pid of roomsToUpdate) {
      this.broadcastPresence(pid);
    }
  }

  getConnectedCount(): number {
    return this.clients.size;
  }

  close(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    for (const client of this.clients) {
      try {
        client.ws.close();
      } catch {
        // ignore
      }
    }
    this.clients.clear();
    try {
      this.wss.close();
    } catch {
      // ignore
    }
  }
}

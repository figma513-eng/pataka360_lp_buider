import type { AccessRole, ProjectRecord } from '../types/builder';

export interface CollabPeer {
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

export type IncomingCollabEvent =
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
      peers: CollabPeer[];
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

export interface CollabClientHandlers {
  onSelfConnected?: (connectionId: string) => void;
  onPresenceUpdate?: (projectId: string, peers: CollabPeer[]) => void;
  onProjectUpdated?: (event: Extract<IncomingCollabEvent, { type: 'project:updated' }>) => void;
  onProjectDeleted?: (event: Extract<IncomingCollabEvent, { type: 'project:deleted' }>) => void;
  onAccessUpdated?: () => void;
  onReconnected?: () => void;
}

export class CollabSocketClient {
  private ws: WebSocket | null = null;
  private disposed = false;
  private reconnectTimer: number | null = null;
  private reconnectDelayMs = 1000;
  private hasConnectedOnce = false;
  private activeProjectId: string | null = null;
  private activeBlockId: string | null = null;
  private handlers: CollabClientHandlers;

  constructor(handlers: CollabClientHandlers) {
    this.handlers = handlers;
  }

  updateHandlers(handlers: CollabClientHandlers): void {
    this.handlers = handlers;
  }

  connect(): void {
    if (this.disposed || typeof window === 'undefined' || typeof WebSocket === 'undefined') return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${window.location.host}/ws/collab`;

    try {
      const socket = new WebSocket(url);
      this.ws = socket;

      socket.onopen = () => {
        if (this.disposed) {
          socket.close();
          return;
        }
        const wasReconnect = this.hasConnectedOnce;
        this.hasConnectedOnce = true;
        this.reconnectDelayMs = 1000;
        if (this.activeProjectId) {
          this.sendRaw({
            type: 'room:join',
            projectId: this.activeProjectId,
            selectedBlockId: this.activeBlockId,
          });
        }
        if (wasReconnect) {
          this.handlers.onReconnected?.();
        }
      };

      socket.onmessage = (msg) => {
        if (this.disposed || typeof msg.data !== 'string') return;
        let parsed: IncomingCollabEvent | null = null;
        try {
          parsed = JSON.parse(msg.data) as IncomingCollabEvent;
        } catch {
          return;
        }
        if (!parsed || typeof parsed.type !== 'string') return;

        switch (parsed.type) {
          case 'collab:connected':
            this.handlers.onSelfConnected?.(parsed.self.connectionId);
            break;
          case 'presence:update':
            this.handlers.onPresenceUpdate?.(parsed.projectId, parsed.peers);
            break;
          case 'project:updated':
            this.handlers.onProjectUpdated?.(parsed);
            break;
          case 'project:deleted':
            this.handlers.onProjectDeleted?.(parsed);
            break;
          case 'access:updated':
            this.handlers.onAccessUpdated?.();
            break;
          default:
            break;
        }
      };

      socket.onclose = () => {
        if (this.ws === socket) {
          this.ws = null;
        }
        if (!this.disposed) {
          this.scheduleReconnect();
        }
      };

      socket.onerror = () => {
        // onclose handles reconnect
      };
    } catch {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.disposed || this.reconnectTimer !== null || typeof window === 'undefined') return;
    const delay = this.reconnectDelayMs;
    this.reconnectDelayMs = Math.min(15_000, this.reconnectDelayMs * 2);
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  private sendRaw(payload: Record<string, unknown>): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    try {
      this.ws.send(JSON.stringify(payload));
    } catch {
      // ignore send failure
    }
  }

  joinProjectRoom(projectId: string | null, selectedBlockId: string | null): void {
    this.activeProjectId = projectId;
    this.activeBlockId = selectedBlockId;
    this.sendRaw({
      type: 'room:join',
      projectId: projectId ?? '',
      selectedBlockId,
    });
  }

  selectBlock(projectId: string | null, selectedBlockId: string | null): void {
    this.activeProjectId = projectId;
    this.activeBlockId = selectedBlockId;
    if (!projectId) return;
    this.sendRaw({
      type: 'block:select',
      projectId,
      selectedBlockId,
    });
  }

  dispose(): void {
    this.disposed = true;
    if (this.reconnectTimer !== null && typeof window !== 'undefined') {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // ignore
      }
      this.ws = null;
    }
  }
}

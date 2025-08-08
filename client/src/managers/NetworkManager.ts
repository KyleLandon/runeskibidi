export type LatencyHandler = (ms: number, avgMs: number) => void;
export type PlayerEventHandler = (playerId: string) => void;
export type PlayerMoveHandler = (playerId: string, pos: { x: number; y: number; z: number }) => void;
export type ChatHandler = (from: string, text: string, t: number) => void;

export class NetworkManager {
  private ws: WebSocket | null = null;
  private url: string;
  private playerId: string;
  private sessionId: string;
  private apiBase: string;
  private authToken: string | null = null;
  private latencySamples: number[] = [];
  private maxSamples = 12;
  private pingIntervalId: number | null = null;
  private presenceIntervalId: number | null = null;
  private seqCounter = 0;
  onLatency: LatencyHandler | null = null;
  onWelcome: ((playerId: string) => void) | null = null;
  onPlayerJoined: PlayerEventHandler | null = null;
  onPlayerLeft: PlayerEventHandler | null = null;
  onPlayerMoved: PlayerMoveHandler | null = null;
  onChat: ChatHandler | null = null;
  // Reserved for future server reconciliation
  // private positionProvider: (() => { x: number; y: number; z: number } | null) | null = null;

  constructor(url: string, apiBase: string, playerId: string, sessionId: string, authToken?: string | null) {
    this.url = url;
    this.apiBase = apiBase.replace(/\/$/, '');
    this.playerId = playerId;
    this.sessionId = sessionId;
    this.authToken = authToken || null;
  }

  connect() {
    const wsUrl = this.authToken ? `${this.url}${this.url.includes('?') ? '&' : '?'}token=${encodeURIComponent(this.authToken)}` : this.url;
    this.ws = new WebSocket(wsUrl);
    this.ws.onopen = () => {
      this.safePost('/api/connection', { playerId: this.playerId, sessionId: this.sessionId, event: 'connected', timestamp: Date.now() });
      this.startPing();
      this.startPresence();
    };
    this.ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === 'welcome' && msg.playerId) {
          this.onWelcome?.(msg.playerId);
          // Seed existing snapshot (array of entities: {id,x,y,dir})
          if (Array.isArray(msg.snapshot)) {
            for (const ent of msg.snapshot) {
              const id = ent.id;
              if (!id) continue;
              this.onPlayerJoined?.(id);
              // Map server 2D (x,y) to client 3D (x,z), fixed y=1
              this.onPlayerMoved?.(id, { x: Number(ent.x) || 0, y: 1, z: Number(ent.y) || 0 });
            }
          }
          return;
        }
        if (msg.type === 'pong' && typeof msg.clientT === 'number') {
          const rtt = Date.now() - msg.clientT;
          this.recordLatency(rtt);
          return;
        }
        if (msg.type === 'player_joined' && msg.playerId) {
          this.onPlayerJoined?.(msg.playerId);
          return;
        }
        if (msg.type === 'player_left' && msg.playerId) {
          this.onPlayerLeft?.(msg.playerId);
          return;
        }
        if (msg.type === 'snapshot_delta') {
          // apply add/update/remove
          const add = Array.isArray(msg.add) ? msg.add : [];
          const update = Array.isArray(msg.update) ? msg.update : [];
          const remove = Array.isArray(msg.remove) ? msg.remove : [];
          for (const ent of add) {
            if (!ent?.id) continue;
            this.onPlayerJoined?.(ent.id);
            this.onPlayerMoved?.(ent.id, { x: Number(ent.x) || 0, y: 1, z: Number(ent.y) || 0 });
          }
          for (const ent of update) {
            if (!ent?.id) continue;
            this.onPlayerMoved?.(ent.id, { x: Number(ent.x) || 0, y: 1, z: Number(ent.y) || 0 });
          }
          for (const id of remove) {
            if (typeof id !== 'string') continue;
            this.onPlayerLeft?.(id);
          }
          return;
        }
        if (msg.type === 'chat' && msg.from && typeof msg.text === 'string') {
          this.onChat?.(msg.from, msg.text, msg.t || Date.now());
          return;
        }
      } catch (e) {
        // ignore
      }
    };
    this.ws.onclose = () => {
      this.safePost('/api/connection', { playerId: this.playerId, sessionId: this.sessionId, event: 'disconnected', timestamp: Date.now() });
      this.stopPing();
      this.stopPresence();
      // optional: reconnect logic later
    };
    window.addEventListener('beforeunload', () => {
      try {
        navigator.sendBeacon(`${this.apiBase}/api/connection`, JSON.stringify({ playerId: this.playerId, sessionId: this.sessionId, event: 'disconnected', timestamp: Date.now() }));
      } catch {}
    });
  }

  private startPing() {
    this.pingIntervalId = window.setInterval(() => {
      this.send({ type: 'ping', t: Date.now() });
    }, 5000);
  }
  private stopPing() {
    if (this.pingIntervalId) window.clearInterval(this.pingIntervalId);
    this.pingIntervalId = null;
  }

  private startPresence() {
    this.presenceIntervalId = window.setInterval(() => {
      this.safePost('/api/connection', { playerId: this.playerId, sessionId: this.sessionId, event: 'presence', timestamp: Date.now() });
    }, 30000);
  }
  private stopPresence() {
    if (this.presenceIntervalId) window.clearInterval(this.presenceIntervalId);
    this.presenceIntervalId = null;
  }

  private recordLatency(ms: number) {
    this.latencySamples.push(ms);
    if (this.latencySamples.length > this.maxSamples) this.latencySamples.shift();
    const avg = this.latencySamples.reduce((a, b) => a + b, 0) / this.latencySamples.length;
    if (this.onLatency) this.onLatency(ms, avg);
  }

  private send(obj: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(obj));
    }
  }

  sendMove(pos: { x: number; y: number; z: number }) {
    // Server expects 2D x,y (map y=z) and supports seq for reconciliation
    const seq = ++this.seqCounter;
    this.send({ type: 'move', x: pos.x, y: pos.z, seq });
  }

  sendChat(text: string) {
    this.send({ type: 'chat', text: String(text || '').slice(0, 256) });
  }

  // setPositionProvider(getter: () => { x: number; y: number; z: number } | null) {
  //   this.positionProvider = getter;
  // }

  private async safePost(path: string, body: any) {
    try {
      await fetch(`${this.apiBase}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    } catch {}
  }
}



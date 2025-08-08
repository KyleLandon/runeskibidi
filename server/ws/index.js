// server/ws/index.js
const WebSocket = require('ws');
const os = require('os');
const { createClient } = require('@supabase/supabase-js');

// module-level state for metrics export
const wsState = {
  wss: null,
  clientsRef: null,
  perIpCounts: new Map(),
  stats: {
    messagesIn: 0,
    messagesDroppedBurst: 0,
    messagesDroppedRate: 0,
    sent: 0,
    slowConsumerClosed: 0,
    connectionsDeniedPerIp: 0,
  },
  maxPerIp: 0,
};

function getClientIp(req) {
  const xfwd = req.headers['x-forwarded-for'];
  const first = (Array.isArray(xfwd) ? xfwd[0] : xfwd)?.split(',')[0]?.trim();
  const ip = first || req.socket?.remoteAddress || req.connection?.remoteAddress || '';
  // Normalize IPv6-mapped IPv4
  return ip.startsWith('::ffff:') ? ip.slice(7) : ip;
}

function getWebSocketStats() {
  const wss = wsState.wss;
  const clients = wsState.clientsRef;
  const perIpCounts = wsState.perIpCounts;
  const totalBuffered = wss ? Array.from(wss.clients).reduce((s, ws) => s + (ws.bufferedAmount || 0), 0) : 0;
  // Top 10 IPs by connection count
  const topIps = Array.from(perIpCounts.entries())
    .sort((a,b) => b[1] - a[1])
    .slice(0, 10)
    .map(([ip, count]) => ({ ip, count }));
  return {
    clientCount: wss ? wss.clients.size : 0,
    trackedClients: clients ? clients.size : 0,
    totalBufferedBytes: totalBuffered,
    perIpTop: topIps,
    maxConnectionsPerIp: wsState.maxPerIp,
    counters: { ...wsState.stats },
  };
}

function setupWebSocketServer(server, world, options = {}) {
  const wss = new WebSocket.Server({ server, perMessageDeflate: {
    zlibDeflateOptions: { level: 3 },
    zlibInflateOptions: { chunkSize: 16 * 1024 },
    clientNoContextTakeover: true,
    serverNoContextTakeover: true,
    concurrencyLimit: os.cpus()?.length || 4,
    threshold: 1024
  }});

  const jwtRequired = !!options.requireAuth;
  const supabase = (options.supabaseUrl && options.supabaseServiceKey)
    ? createClient(options.supabaseUrl, options.supabaseServiceKey)
    : null;

  const clients = new Map(); // playerId -> ws
  const perIpCounts = wsState.perIpCounts; // shared map
  const maxConnectionsPerIp = Number(process.env.MAX_CONNECTIONS_PER_IP || options.maxConnectionsPerIp || 5);
  wsState.wss = wss;
  wsState.clientsRef = clients;
  wsState.maxPerIp = maxConnectionsPerIp;

  // Validate auth header if required
  async function validateAuth(req) {
    if (!jwtRequired) return { ok: true, playerId: req.headers['x-player-id'] || null };
    try {
      const token = (req.url && new URL(req.url, 'ws://localhost').searchParams.get('token'))
        || req.headers['sec-websocket-protocol']
        || req.headers['authorization']?.replace('Bearer ', '')
        || null;
      if (!token || !supabase) return { ok: false, error: 'missing_token' };
      const { data, error } = await supabase.auth.getUser(token);
      if (error || !data?.user?.id) return { ok: false, error: 'invalid_token' };
      return { ok: true, playerId: data.user.id };
    } catch {
      return { ok: false, error: 'auth_error' };
    }
  }

  // Backpressure-safe send
  function safeSend(ws, str) {
    if (!ws || ws.readyState !== WebSocket.OPEN) return false;
    // Drop if socket is too backed up (slow consumer protection)
    if (ws.bufferedAmount > 2_000_000) { // ~2MB
      wsState.stats.slowConsumerClosed++;
      try { ws.close(1001, 'slow_consumer'); } catch {}
      return false;
    }
    try { ws.send(str); wsState.stats.sent++; return true; } catch { return false; }
  }

  wss.on('connection', async (ws, req) => {
    // Per-IP cap
    const ip = getClientIp(req);
    const cur = perIpCounts.get(ip) || 0;
    if (cur >= maxConnectionsPerIp) {
      wsState.stats.connectionsDeniedPerIp++;
      try { ws.close(1008, 'too_many_connections'); } catch {}
      return;
    }
    perIpCounts.set(ip, cur + 1);
    ws._ip = ip;

    const auth = await validateAuth(req);
    if (!auth.ok) {
      ws.close(4401, 'unauthorized');
      // decrement the per-ip we incremented above
      const left = (perIpCounts.get(ip) || 1) - 1;
      if (left <= 0) perIpCounts.delete(ip); else perIpCounts.set(ip, left);
      return;
    }
    const playerId = auth.playerId || req.headers['x-player-id'] || `guest:${Math.random().toString(36).slice(2,8)}`;
    const sessionId = Math.random().toString(36).slice(2,10);

    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });

    // Per-connection state
    ws._rlLastSec = Math.floor(Date.now() / 1000);
    ws._rlCount = 0;
    ws._rlBurst = 40;      // allow bursts
    ws._rlPerSec = 20;     // sustained inputs/sec

    clients.set(playerId, ws);
    // Add to world on connect
    world.addPlayer(playerId);
    safeSend(ws, JSON.stringify({ type: 'welcome', playerId, snapshot: world.getSnapshotFor(playerId) }));
    world.broadcastExcept(playerId, { type: 'player_joined', playerId });
    console.log(`[${new Date().toISOString()}] ws_connected player=${playerId} ip=${ip}`);

    // Notify admin tracking if provided
    if (typeof options.onPlayerConnect === 'function') {
      try { options.onPlayerConnect({ playerId, sessionId, timestamp: Date.now() }); } catch {}
    }

    ws.on('message', (msg) => {
      wsState.stats.messagesIn++;
      let data;
      try { data = JSON.parse(msg.toString()); } catch { return; }
      if (!data || typeof data !== 'object') return;

      // Token bucket style rate limit
      const nowSec = Math.floor(Date.now() / 1000);
      if (nowSec !== ws._rlLastSec) { ws._rlLastSec = nowSec; ws._rlCount = 0; }
      ws._rlCount++;
      if (ws._rlCount > ws._rlBurst) { wsState.stats.messagesDroppedBurst++; return; }
      if (ws._rlCount > ws._rlPerSec) { wsState.stats.messagesDroppedRate++; return; }

      switch (data.type) {
        case 'ping': {
          safeSend(ws, JSON.stringify({ type: 'pong', clientT: data.t, serverT: Date.now() }));
          return;
        }
        case 'move': {
          world.queueInput({ playerId, kind: 'move', payload: data });
          return;
        }
        case 'cast': {
          world.queueInput({ playerId, kind: 'cast', payload: data });
          return;
        }
        case 'chat': {
          // Route through world for interest-based broadcast
          world.queueInput({ playerId, kind: 'chat', payload: { text: String(data.text || '').slice(0,256) } });
          return;
        }
        case 'equip': {
          // payload: { slotIndex }
          world.queueInput({ playerId, kind: 'equip', payload: data });
          return;
        }
        case 'unequip': {
          // payload: { slot }
          world.queueInput({ playerId, kind: 'unequip', payload: data });
          return;
        }
        default:
          return;
      }
    });

    ws.on('close', () => {
      clients.delete(playerId);
      world.removePlayer(playerId);
      world.broadcast({ type: 'player_left', playerId });
      console.log(`[${new Date().toISOString()}] ws_disconnected player=${playerId} ip=${ip}`);
      if (typeof options.onPlayerDisconnect === 'function') {
        try { options.onPlayerDisconnect({ playerId, sessionId, timestamp: Date.now() }); } catch {}
      }
      // decrement per-IP count
      const ipKey = ws._ip;
      if (ipKey) {
        const left = (perIpCounts.get(ipKey) || 1) - 1;
        if (left <= 0) perIpCounts.delete(ipKey); else perIpCounts.set(ipKey, left);
      }
    });
  });

  // Heartbeat interval
  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) return ws.terminate();
      ws.isAlive = false;
      try { ws.ping(); } catch {}
    });
  }, 30000);

  wss.on('close', () => clearInterval(interval));

  // Wire world outbound sends to actual sockets
  world.onSend((playerId, msg) => {
    const ws = clients.get(playerId);
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    const str = JSON.stringify(msg);
    safeSend(ws, str);
  });

  world.onBroadcast((msg) => {
    const str = JSON.stringify(msg);
    for (const ws of wss.clients) {
      if (ws.readyState === WebSocket.OPEN) safeSend(ws, str);
    }
  });

  world.onBroadcastExcept((excludeId, msg) => {
    const str = JSON.stringify(msg);
    for (const [pid, ws] of clients.entries()) {
      if (pid === excludeId) continue;
      if (ws.readyState === WebSocket.OPEN) safeSend(ws, str);
    }
  });

  world.onMulticast((playerIds, msg) => {
    const str = JSON.stringify(msg);
    for (const pid of playerIds) {
      const ws = clients.get(pid);
      if (ws && ws.readyState === WebSocket.OPEN) safeSend(ws, str);
    }
  });

  return wss;
}

module.exports = { setupWebSocketServer, getWebSocketStats };
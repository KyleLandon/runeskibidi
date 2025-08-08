// server/ws/index.js
const WebSocket = require('ws');
const os = require('os');
const { createClient } = require('@supabase/supabase-js');

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

  wss.on('connection', async (ws, req) => {
    const auth = await validateAuth(req);
    if (!auth.ok) {
      ws.close(4401, 'unauthorized');
      return;
    }
    const playerId = auth.playerId || req.headers['x-player-id'] || `guest:${Math.random().toString(36).slice(2,8)}`;
    const sessionId = Math.random().toString(36).slice(2,10);

    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });

    clients.set(playerId, ws);
    // Add to world on connect
    world.addPlayer(playerId);
    ws.send(JSON.stringify({ type: 'welcome', playerId, snapshot: world.getSnapshotFor(playerId) }));
    world.broadcastExcept(playerId, { type: 'player_joined', playerId });

    // Notify admin tracking if provided
    if (typeof options.onPlayerConnect === 'function') {
      try { options.onPlayerConnect({ playerId, sessionId, timestamp: Date.now() }); } catch {}
    }

    // Per-connection simple rate limit (inputs/sec)
    let lastSecond = Math.floor(Date.now() / 1000);
    let counter = 0;

    ws.on('message', (msg) => {
      let data;
      try { data = JSON.parse(msg.toString()); } catch { return; }
      if (!data || typeof data !== 'object') return;

      const nowSec = Math.floor(Date.now() / 1000);
      if (nowSec !== lastSecond) { lastSecond = nowSec; counter = 0; }
      counter++;
      if (counter > 30) { // basic global input cap per client
        return; // drop silently
      }

      switch (data.type) {
        case 'ping': {
          ws.send(JSON.stringify({ type: 'pong', clientT: data.t, serverT: Date.now() }));
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
          world.broadcast({ type: 'chat', from: playerId, text: String(data.text || '').slice(0,256), t: Date.now() });
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
      if (typeof options.onPlayerDisconnect === 'function') {
        try { options.onPlayerDisconnect({ playerId, sessionId, timestamp: Date.now() }); } catch {}
      }
    });
  });

  // Heartbeat interval
  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => clearInterval(interval));

  // Wire world outbound sends to actual sockets
  world.onSend((playerId, msg) => {
    const ws = clients.get(playerId);
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    try { ws.send(JSON.stringify(msg)); } catch { /* ignore */ }
  });

  world.onBroadcast((msg) => {
    const str = JSON.stringify(msg);
    for (const ws of wss.clients) {
      if (ws.readyState === WebSocket.OPEN) ws.send(str);
    }
  });

  world.onBroadcastExcept((excludeId, msg) => {
    const str = JSON.stringify(msg);
    for (const [pid, ws] of clients.entries()) {
      if (pid === excludeId) continue;
      if (ws.readyState === WebSocket.OPEN) ws.send(str);
    }
  });

  return wss;
}

module.exports = { setupWebSocketServer };
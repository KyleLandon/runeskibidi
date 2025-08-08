// server/ws/index.js
const WebSocket = require('ws');
const os = require('os');

function setupWebSocketServer(server) {
  const wss = new WebSocket.Server({ server, perMessageDeflate: {
    zlibDeflateOptions: { level: 3 },
    zlibInflateOptions: { chunkSize: 16 * 1024 },
    clientNoContextTakeover: true,
    serverNoContextTakeover: true,
    concurrencyLimit: os.cpus()?.length || 4,
    threshold: 1024
  }});
  const clients = new Map(); // Map of playerId -> ws
  const heartbeats = new WeakMap();

  wss.on('connection', (ws, req) => {
    let playerId = null;
    ws.isAlive = true;
    heartbeats.set(ws, Date.now());
    ws.on('pong', () => { ws.isAlive = true; heartbeats.set(ws, Date.now()); });
    // Parse JSON safely
    ws.on('message', (msg) => {
      try {
        const data = JSON.parse(msg.toString());
        if (data.type === 'hello') {
          playerId = data.playerId;
          clients.set(playerId, ws);
          ws.send(JSON.stringify({ type: 'welcome', playerId }));
          // Notify others only
          const payload = JSON.stringify({ type: 'player_joined', playerId });
          for (const [pid, client] of clients.entries()) {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(payload);
            }
          }
        } else if (data.type === 'move') {
          // Broadcast movement to all other clients
          const payload = { type: 'player_moved', playerId, pos: data.pos };
          const str = JSON.stringify(payload);
          wss.clients.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(str);
            }
          });
        } else if (data.type === 'ping') {
          // Echo back client timestamp so client can compute RTT
          ws.send(JSON.stringify({ type: 'pong', clientT: data.t, serverT: Date.now() }));
        } else if (data.type === 'chat' && typeof data.text === 'string') {
          const payload = { type: 'chat', from: playerId || 'unknown', text: String(data.text).slice(0, 256), t: Date.now() };
          const str = JSON.stringify(payload);
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) client.send(str);
          });
        }
        // Add more message types as needed
      } catch (e) {
        ws.send(JSON.stringify({ type: 'error', error: e.message }));
      }
    });
    ws.on('close', () => {
      if (playerId) {
        clients.delete(playerId);
        const payload = JSON.stringify({ type: 'player_left', playerId });
        for (const [pid, client] of clients.entries()) {
          if (client.readyState === WebSocket.OPEN) client.send(payload);
        }
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

  wss.on('close', () => {
    clearInterval(interval);
  });

  function broadcast(msg) {
    const str = JSON.stringify(msg);
    for (const ws of clients.values()) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(str);
      }
    }
  }

  return wss;
}

module.exports = { setupWebSocketServer }; 
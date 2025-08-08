// server/ws/index.js
const WebSocket = require('ws');

function setupWebSocketServer(server) {
  const wss = new WebSocket.Server({ server });
  const clients = new Map(); // Map of playerId -> ws
  const heartbeats = new WeakMap();

  wss.on('connection', (ws, req) => {
    let playerId = null;
    ws.isAlive = true;
    heartbeats.set(ws, Date.now());
    ws.on('pong', () => { ws.isAlive = true; heartbeats.set(ws, Date.now()); });
    ws.on('message', (msg) => {
      try {
        const data = JSON.parse(msg);
        if (data.type === 'hello') {
          playerId = data.playerId;
          clients.set(playerId, ws);
          ws.send(JSON.stringify({ type: 'welcome', playerId }));
          // Broadcast join
          broadcast({ type: 'player_joined', playerId });
        } else if (data.type === 'move') {
          // Broadcast movement to all
          broadcast({ type: 'player_moved', playerId, pos: data.pos });
        }
        // Add more message types as needed
      } catch (e) {
        ws.send(JSON.stringify({ type: 'error', error: e.message }));
      }
    });
    ws.on('close', () => {
      if (playerId) {
        clients.delete(playerId);
        broadcast({ type: 'player_left', playerId });
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
// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const app = express();
const PORT = process.env.PORT || 4000;
const http = require('http');
const { setupWebSocketServer, getWebSocketStats } = require('./ws');
const { World } = require('./simulation/world');
const { upsertPresence, savePosition } = require('./db/playerRepo');

// Helper to coerce timestamps safely
function coerceTimestamp(ts) {
  if (typeof ts === 'number' && Number.isFinite(ts)) return ts;
  if (typeof ts === 'string') {
    const n = Number(ts);
    if (Number.isFinite(n)) return n;
    const p = Date.parse(ts);
    if (Number.isFinite(p)) return p;
  }
  return Date.now();
}

// Trust proxy when behind a load balancer (e.g., Render/Heroku/Nginx)
app.set('trust proxy', 1);

// Security & performance middleware
app.use(helmet());
app.use(compression());
app.use(express.json({ limit: '256kb' }));
app.use(morgan('tiny'));

// Tighten CORS by origin if configured
const allowedOrigin = process.env.CORS_ORIGIN;
app.use(cors(allowedOrigin ? { origin: allowedOrigin, credentials: true } : {}));

// Basic rate limiting on API
const limiter = rateLimit({ windowMs: 60 * 1000, max: 200 });
app.use('/api', limiter);

// In-memory store for admin panel
let connections = [];
let logs = [];
let activePlayers = new Map(); // playerId -> { playerId, sessionId, connectedAt, lastSeen }

// Endpoint for client to report connection events
app.post('/api/connection', (req, res) => {
  const { playerId, sessionId, event, timestamp } = req.body || {};
  const ts = coerceTimestamp(timestamp);
  connections.push({ playerId, sessionId, event, timestamp: ts });
  
  if (event === 'connected') {
    activePlayers.set(playerId, { 
      playerId, 
      sessionId, 
      connectedAt: new Date(ts),
      lastSeen: new Date(ts)
    });
  } else if (event === 'disconnected') {
    activePlayers.delete(playerId);
  } else if (event === 'presence') {
    const rec = activePlayers.get(playerId);
    if (rec) {
      rec.lastSeen = new Date(ts);
      activePlayers.set(playerId, rec);
    }
  }
  
  logs.push(`[${new Date(ts).toISOString()}] ${event} - Player: ${playerId}, Session: ${sessionId}`);
  res.json({ status: 'ok' });
});

// Endpoint for client to report errors
app.post('/api/error', (req, res) => {
  const { playerId, sessionId, error, timestamp } = req.body || {};
  const ts = coerceTimestamp(timestamp);
  logs.push(`[${new Date(ts).toISOString()}] ERROR - Player: ${playerId}, Session: ${sessionId}, Error: ${error}`);
  res.json({ status: 'ok' });
});

// API endpoint for getting active players
app.get('/api/players', (req, res) => {
  const players = Array.from(activePlayers.values()).map(player => ({
    ...player,
    connectedAt: player.connectedAt.toISOString(),
    lastSeen: player.lastSeen.toISOString()
  }));
  res.json(players);
});

// API endpoint for getting logs
app.get('/api/logs', (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  res.json(logs.slice(-limit));
});

// API endpoint for clearing logs
app.delete('/api/logs', (req, res) => {
  logs = [];
  res.json({ status: 'ok' });
});

// API endpoint for clearing players
app.delete('/api/players', (req, res) => {
  activePlayers.clear();
  res.json({ status: 'ok' });
});

// Stats endpoint (JSON)
app.get('/api/stats', (req, res) => {
  const mem = process.memoryUsage();
  const ws = getWebSocketStats();
  const worldMetrics = world.getMetrics();
  res.json({
    uptimeSec: Math.round(process.uptime()),
    node: process.version,
    memory: {
      rss: mem.rss,
      heapUsed: mem.heapUsed,
      heapTotal: mem.heapTotal,
      external: mem.external,
    },
    ws,
    world: worldMetrics,
    activePlayers: activePlayers.size,
  });
});

// Prometheus metrics
app.get('/metrics', (req, res) => {
  const mem = process.memoryUsage();
  const ws = getWebSocketStats();
  const worldMetrics = world.getMetrics();
  const lines = [];
  lines.push(`# HELP runeskibidi_ws_clients Number of active WebSocket clients`);
  lines.push(`# TYPE runeskibidi_ws_clients gauge`);
  lines.push(`runeskibidi_ws_clients ${ws.clientCount}`);
  lines.push(`# HELP runeskibidi_active_players Players reported active via admin tracking`);
  lines.push(`# TYPE runeskibidi_active_players gauge`);
  lines.push(`runeskibidi_active_players ${activePlayers.size}`);
  lines.push(`# HELP runeskibidi_world_players Players in world authoritative state`);
  lines.push(`# TYPE runeskibidi_world_players gauge`);
  lines.push(`runeskibidi_world_players ${worldMetrics.players}`);
  lines.push(`# HELP runeskibidi_world_tick_avg_ms Average tick execution time`);
  lines.push(`# TYPE runeskibidi_world_tick_avg_ms gauge`);
  lines.push(`runeskibidi_world_tick_avg_ms ${worldMetrics.avgTickMs.toFixed(3)}`);
  lines.push(`# HELP runeskibidi_world_tick_last_ms Last tick execution time`);
  lines.push(`# TYPE runeskibidi_world_tick_last_ms gauge`);
  lines.push(`runeskibidi_world_tick_last_ms ${worldMetrics.lastTickMs}`);
  lines.push(`# HELP runeskibidi_ws_messages_in_total Total inbound WS messages`);
  lines.push(`# TYPE runeskibidi_ws_messages_in_total counter`);
  lines.push(`runeskibidi_ws_messages_in_total ${ws.counters.messagesIn}`);
  lines.push(`# HELP runeskibidi_ws_messages_dropped_burst_total Dropped due to burst cap`);
  lines.push(`# TYPE runeskibidi_ws_messages_dropped_burst_total counter`);
  lines.push(`runeskibidi_ws_messages_dropped_burst_total ${ws.counters.messagesDroppedBurst}`);
  lines.push(`# HELP runeskibidi_ws_messages_dropped_rate_total Dropped due to sustained rate cap`);
  lines.push(`# TYPE runeskibidi_ws_messages_dropped_rate_total counter`);
  lines.push(`runeskibidi_ws_messages_dropped_rate_total ${ws.counters.messagesDroppedRate}`);
  lines.push(`# HELP runeskibidi_ws_sent_total Total WS messages sent`);
  lines.push(`# TYPE runeskibidi_ws_sent_total counter`);
  lines.push(`runeskibidi_ws_sent_total ${ws.counters.sent}`);
  lines.push(`# HELP runeskibidi_ws_slow_consumer_closed_total Connections closed due to slow consumer`);
  lines.push(`# TYPE runeskibidi_ws_slow_consumer_closed_total counter`);
  lines.push(`runeskibidi_ws_slow_consumer_closed_total ${ws.counters.slowConsumerClosed}`);
  lines.push(`# HELP runeskibidi_ws_total_buffered_bytes Total buffered bytes across all clients`);
  lines.push(`# TYPE runeskibidi_ws_total_buffered_bytes gauge`);
  lines.push(`runeskibidi_ws_total_buffered_bytes ${ws.totalBufferedBytes}`);
  lines.push(`# HELP runeskibidi_process_memory_rss_bytes Resident set size in bytes`);
  lines.push(`# TYPE runeskibidi_process_memory_rss_bytes gauge`);
  lines.push(`runeskibidi_process_memory_rss_bytes ${mem.rss}`);
  res.set('Content-Type', 'text/plain; version=0.0.4');
  res.send(lines.join('\n'));
});

// Admin panel: view connections and logs
app.get('/admin', (req, res) => {
  // Basic token auth if ADMIN_TOKEN is set
  const token = process.env.ADMIN_TOKEN;
  if (token && req.headers['x-admin-token'] !== token) {
    return res.status(401).send('Unauthorized');
  }
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Runeskibidi Admin Panel</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background: #1a1a1a;
                color: #e0e0e0;
                line-height: 1.6;
            }
            
            .header {
                background: #2d2d2d;
                padding: 1rem 2rem;
                border-bottom: 2px solid #7ecfff;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .header h1 {
                color: #7ecfff;
                font-size: 1.8rem;
            }
            
            .stats {
                display: flex;
                gap: 2rem;
                font-size: 1.1rem;
            }
            
            .stat {
                background: #333;
                padding: 0.5rem 1rem;
                border-radius: 8px;
                border: 1px solid #555;
            }
            
            .stat-value {
                color: #7ecfff;
                font-weight: bold;
            }
            
            .container {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 2rem;
                padding: 2rem;
                height: calc(100vh - 100px);
            }
            
            .panel {
                background: #2d2d2d;
                border-radius: 12px;
                padding: 1.5rem;
                border: 1px solid #555;
                overflow: hidden;
                display: flex;
                flex-direction: column;
            }
            
            .panel h2 {
                color: #7ecfff;
                margin-bottom: 1rem;
                font-size: 1.4rem;
                border-bottom: 1px solid #555;
                padding-bottom: 0.5rem;
            }
            
            .player-list {
                flex: 1;
                overflow-y: auto;
                background: #1a1a1a;
                border-radius: 8px;
                padding: 1rem;
            }
            
            .player-item {
                background: #333;
                margin-bottom: 0.5rem;
                padding: 0.75rem;
                border-radius: 6px;
                border-left: 3px solid #7ecfff;
            }
            
            .player-name {
                font-weight: bold;
                color: #7ecfff;
            }
            
            .player-info {
                font-size: 0.9rem;
                color: #aaa;
                margin-top: 0.25rem;
            }
            
            .log-list {
                flex: 1;
                overflow-y: auto;
                background: #1a1a1a;
                border-radius: 8px;
                padding: 1rem;
                font-family: 'Courier New', monospace;
                font-size: 0.85rem;
                line-height: 1.4;
            }
            
            .log-entry {
                margin-bottom: 0.25rem;
                padding: 0.25rem 0;
                border-bottom: 1px solid #333;
            }
            
            .log-entry.error {
                color: #ff6b6b;
            }
            
            .log-entry.info {
                color: #7ecfff;
            }
            
            .controls {
                display: flex;
                gap: 1rem;
                margin-bottom: 1rem;
            }
            
            .btn {
                background: #7ecfff;
                color: #1a1a1a;
                border: none;
                padding: 0.5rem 1rem;
                border-radius: 6px;
                cursor: pointer;
                font-weight: bold;
                transition: background 0.2s;
            }
            
            .btn:hover {
                background: #5bb8ff;
            }
            
            .btn.danger {
                background: #ff6b6b;
            }
            
            .btn.danger:hover {
                background: #ff5252;
            }
            
            .refresh-indicator {
                color: #7ecfff;
                font-size: 0.9rem;
            }
            
            @media (max-width: 768px) {
                .container {
                    grid-template-columns: 1fr;
                    height: auto;
                }
                
                .stats {
                    flex-direction: column;
                    gap: 0.5rem;
                }
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>🎮 Runeskibidi Admin Panel</h1>
            <div class="stats">
                <div class="stat">
                    Active Players: <span class="stat-value" id="playerCount">0</span>
                </div>
                <div class="stat">
                    Total Logs: <span class="stat-value" id="logCount">0</span>
                </div>
                <div class="stat">
                    Last Update: <span class="stat-value" id="lastUpdate">-</span>
                </div>
            </div>
        </div>
        
        <div class="container">
            <div class="panel">
                <h2>👥 Active Players</h2>
                <div class="controls">
                    <button class="btn" onclick="refreshPlayers()">Refresh</button>
                    <button class="btn danger" onclick="clearPlayers()">Clear All</button>
                </div>
                <div class="player-list" id="playerList">
                    <div style="text-align: center; color: #666; padding: 2rem;">
                        No active players
                    </div>
                </div>
            </div>
            
            <div class="panel">
                <h2>📋 Server Logs</h2>
                <div class="controls">
                    <button class="btn" onclick="refreshLogs()">Refresh</button>
                    <button class="btn danger" onclick="clearLogs()">Clear All</button>
                    <span class="refresh-indicator" id="autoRefresh">Auto-refresh: ON</span>
                </div>
                <div class="log-list" id="logList">
                    <div style="text-align: center; color: #666; padding: 2rem;">
                        No logs available
                    </div>
                </div>
            </div>
        </div>
        
        <script>
            let autoRefresh = true;
            let refreshInterval;
            
            function updateLastUpdate() {
                document.getElementById('lastUpdate').textContent = new Date().toLocaleTimeString();
            }
            
            async function refreshPlayers() {
                try {
                    const response = await fetch('/api/players');
                    const players = await response.json();
                    
                    const playerList = document.getElementById('playerList');
                    const playerCount = document.getElementById('playerCount');
                    
                    playerCount.textContent = players.length;
                    
                    if (players.length === 0) {
                        playerList.innerHTML = '<div style="text-align: center; color: #666; padding: 2rem;">No active players</div>';
                        return;
                    }
                    
                    playerList.innerHTML = players.map(player => \`
                        <div class=\"player-item\">
                            <div class=\"player-name\">\\${player.playerId}</div>
                            <div class=\"player-info\">
                                Session: \\${player.sessionId}<br>
                                Connected: \\${new Date(player.connectedAt).toLocaleString()}<br>
                                Last Seen: \\${new Date(player.lastSeen).toLocaleString()}
                            </div>
                        </div>
                    \`).join('');
                    
                    updateLastUpdate();
                } catch (error) {
                    console.error('Failed to refresh players:', error);
                }
            }
            
            async function refreshLogs() {
                try {
                    const response = await fetch('/api/logs?limit=200');
                    const logs = await response.json();
                    
                    const logList = document.getElementById('logList');
                    const logCount = document.getElementById('logCount');
                    
                    logCount.textContent = logs.length;
                    
                    if (logs.length === 0) {
                        logList.innerHTML = '<div style="text-align: center; color: #666; padding: 2rem;">No logs available</div>';
                        return;
                    }
                    
                    logList.innerHTML = logs.map(log => {
                        const isError = log.includes('ERROR');
                        const isInfo = log.includes('connected') || log.includes('disconnected');
                        return \`<div class=\"log-entry \\${isError ? 'error' : isInfo ? 'info' : ''}\">\\${log}</div>\`;
                    }).join('');
                    
                    // Auto-scroll to bottom
                    logList.scrollTop = logList.scrollHeight;
                    updateLastUpdate();
                } catch (error) {
                    console.error('Failed to refresh logs:', error);
                }
            }
            
            function clearPlayers() {
                if (confirm('Are you sure you want to clear all player data?')) {
                    fetch('/api/players', { method: 'DELETE' }).then(() => {
                        refreshPlayers();
                    });
                }
            }
            
            function clearLogs() {
                if (confirm('Are you sure you want to clear all logs?')) {
                    fetch('/api/logs', { method: 'DELETE' }).then(() => {
                        refreshLogs();
                    });
                }
            }
            
            function toggleAutoRefresh() {
                autoRefresh = !autoRefresh;
                const indicator = document.getElementById('autoRefresh');
                indicator.textContent = \`Auto-refresh: \\${autoRefresh ? 'ON' : 'OFF'}\`;
                
                if (autoRefresh) {
                    refreshInterval = setInterval(() => {
                        refreshPlayers();
                        refreshLogs();
                    }, 5000);
                } else {
                    clearInterval(refreshInterval);
                }
            }
            
            // Initial load
            refreshPlayers();
            refreshLogs();
            
            // Set up auto-refresh
            refreshInterval = setInterval(() => {
                if (autoRefresh) {
                    refreshPlayers();
                    refreshLogs();
                }
            }, 5000);
            
            // Click indicator to toggle auto-refresh
            document.getElementById('autoRefresh').addEventListener('click', toggleAutoRefresh);
        </script>
    </body>
    </html>
  `);
});

// Health checks
app.get('/healthz', (_req, res) => res.status(200).json({ ok: true }));
app.get('/readyz', (_req, res) => res.status(200).json({ ok: true }));

const server = http.createServer(app);
// Reduce Nagle latency
server.on('connection', (socket) => socket.setNoDelay(true));

// Tune HTTP timeouts for keep-alive
server.keepAliveTimeout = 60_000; // 60s
server.headersTimeout = 65_000; // keepAliveTimeout + buffer
// Create world simulation and attach to WS
const world = new World({
  tickRate: Number(process.env.TICK_RATE || 20),
  visibilityRadius: Number(process.env.VISIBILITY_RADIUS || 250),
  zoneSize: Number(process.env.ZONE_SIZE || 1000),
  shardId: Number(process.env.SHARD_ID || 0),
  shardCount: Number(process.env.SHARD_COUNT || 1),
});
setupWebSocketServer(server, world, {
  requireAuth: process.env.REQUIRE_AUTH === 'true',
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  onPlayerConnect: ({ playerId, sessionId, timestamp }) => {
    connections.push({ playerId, sessionId, event: 'connected', timestamp });
    activePlayers.set(playerId, { playerId, sessionId, connectedAt: new Date(timestamp), lastSeen: new Date(timestamp) });
    const line = `[${new Date(timestamp).toISOString()}] connected - Player: ${playerId}, Session: ${sessionId}`;
    logs.push(line);
    console.log(line);
    upsertPresence({ playerId, sessionId, status: 'online' });
  },
  onPlayerDisconnect: ({ playerId, sessionId, timestamp }) => {
    connections.push({ playerId, sessionId, event: 'disconnected', timestamp });
    activePlayers.delete(playerId);
    const line = `[${new Date(timestamp).toISOString()}] disconnected - Player: ${playerId}, Session: ${sessionId}`;
    logs.push(line);
    console.log(line);
    upsertPresence({ playerId, sessionId, status: 'offline' });
  }
});

// Start the authoritative world loop
world.start();

// Periodic persistence of positions (best-effort)
setInterval(() => {
  try {
    for (const [playerId, s] of world.players.entries()) {
      savePosition({ playerId, x: s.x, y: s.y });
    }
  } catch {}
}, 5000);

server.listen(PORT, () => {
  console.log(`Admin server and WebSocket running on http://localhost:${PORT}/admin`);
});

// Graceful shutdown
function shutdown(signal) {
  try {
    console.log(`[${new Date().toISOString()}] Received ${signal}. Shutting down...`);
    world.stop();
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
    // Force exit if not closing in time
    setTimeout(() => process.exit(0), 5000).unref();
  } catch {
    process.exit(1);
  }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
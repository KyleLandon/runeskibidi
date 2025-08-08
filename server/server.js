// server.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const app = express();
const PORT = process.env.PORT || 4000;
const http = require('http');
const { setupWebSocketServer } = require('./ws');

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

// In-memory store for demo (replace with DB or Supabase integration as needed)
let connections = [];
let logs = [];
let activePlayers = new Map(); // playerId -> { playerId, sessionId, connectedAt, lastSeen }

// Endpoint for client to report connection events
app.post('/api/connection', (req, res) => {
  const { playerId, sessionId, event, timestamp } = req.body;
  connections.push({ playerId, sessionId, event, timestamp });
  
  if (event === 'connected') {
    activePlayers.set(playerId, { 
      playerId, 
      sessionId, 
      connectedAt: new Date(timestamp),
      lastSeen: new Date(timestamp)
    });
  } else if (event === 'disconnected') {
    activePlayers.delete(playerId);
  } else if (event === 'presence') {
    const rec = activePlayers.get(playerId);
    if (rec) {
      rec.lastSeen = new Date(timestamp);
      activePlayers.set(playerId, rec);
    }
  }
  
  logs.push(`[${new Date(timestamp).toISOString()}] ${event} - Player: ${playerId}, Session: ${sessionId}`);
  res.json({ status: 'ok' });
});

// Endpoint for client to report errors
app.post('/api/error', (req, res) => {
  const { playerId, sessionId, error, timestamp } = req.body;
  logs.push(`[${new Date(timestamp).toISOString()}] ERROR - Player: ${playerId}, Session: ${sessionId}, Error: ${error}`);
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
                        <div class="player-item">
                            <div class="player-name">\${player.playerId}</div>
                            <div class="player-info">
                                Session: \${player.sessionId}<br>
                                Connected: \${new Date(player.connectedAt).toLocaleString()}<br>
                                Last Seen: \${new Date(player.lastSeen).toLocaleString()}
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
                        return \`<div class="log-entry \${isError ? 'error' : isInfo ? 'info' : ''}">\${log}</div>\`;
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
                indicator.textContent = \`Auto-refresh: \${autoRefresh ? 'ON' : 'OFF'}\`;
                
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
setupWebSocketServer(server);

// TODO: Add game tick/loop logic here for authoritative world state

server.listen(PORT, () => {
  console.log(`Admin server and WebSocket running on http://localhost:${PORT}/admin`);
});
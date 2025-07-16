// server.js
const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 4000;
const http = require('http');
const { setupWebSocketServer } = require('./ws');

app.use(cors());
app.use(express.json());

// In-memory store for demo (replace with DB or Supabase integration as needed)
let connections = [];
let logs = [];

// Endpoint for client to report connection events
app.post('/api/connection', (req, res) => {
  const { playerId, sessionId, event, timestamp } = req.body;
  connections.push({ playerId, sessionId, event, timestamp });
  logs.push(`[${new Date(timestamp).toISOString()}] ${event} - Player: ${playerId}, Session: ${sessionId}`);
  res.json({ status: 'ok' });
});

// Endpoint for client to report errors
app.post('/api/error', (req, res) => {
  const { playerId, sessionId, error, timestamp } = req.body;
  logs.push(`[${new Date(timestamp).toISOString()}] ERROR - Player: ${playerId}, Session: ${sessionId}, Error: ${error}`);
  res.json({ status: 'ok' });
});

// Admin panel: view connections and logs
app.get('/admin', (req, res) => {
  res.send(`
    <h1>Runeskibidi Admin Panel</h1>
    <h2>Active Connections</h2>
    <pre>${JSON.stringify(connections, null, 2)}</pre>
    <h2>Logs</h2>
    <pre>${logs.slice(-100).join('\n')}</pre>
  `);
});

const server = http.createServer(app);
setupWebSocketServer(server);

// TODO: Add game tick/loop logic here for authoritative world state

server.listen(PORT, () => {
  console.log(`Admin server and WebSocket running on http://localhost:${PORT}/admin`);
}); 
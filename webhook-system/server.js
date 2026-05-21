// server.js
const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const socketManager = require('./socket/socketManager');
socketManager.init(server);

// Capture original console log functions for streaming to dashboard
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

let isBroadcasting = false;

console.log = (...args) => {
  originalLog.apply(console, args);
  if (!isBroadcasting) {
    isBroadcasting = true;
    try {
      const msg = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
      socketManager.broadcastSystemLog(msg, 'info');
    } catch (err) {}
    isBroadcasting = false;
  }
};

console.error = (...args) => {
  originalError.apply(console, args);
  if (!isBroadcasting) {
    isBroadcasting = true;
    try {
      const msg = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
      socketManager.broadcastSystemLog(msg, 'error');
    } catch (err) {}
    isBroadcasting = false;
  }
};

console.warn = (...args) => {
  originalWarn.apply(console, args);
  if (!isBroadcasting) {
    isBroadcasting = true;
    try {
      const msg = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
      socketManager.broadcastSystemLog(msg, 'warning');
    } catch (err) {}
    isBroadcasting = false;
  }
};

// Apply core middlewares
app.use(cors());

// Serve the admin dashboard files from the public folder
app.use(express.static(path.join(__dirname, 'public')));

// Mount API webhook routes
const webhookRouter = require('./routes/webhook');
app.use('/api/webhooks', webhookRouter);

// Fallback for SPA Routing in dashboard
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Configure port
const PORT = process.env.WEBHOOK_PORT || 3001;

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Webhook ingestion server is running on http://localhost:${PORT}`);
  console.log(`📡 Ingestion route active at: POST http://localhost:${PORT}/api/webhooks/payment`);
  console.log(`🖥️  Admin monitor active at: http://localhost:${PORT}`);
});

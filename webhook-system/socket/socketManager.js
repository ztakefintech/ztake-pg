// socket/socketManager.js
const { Server } = require('socket.io');

let io = null;
let activeConnectionsCount = 0;

/**
 * Initialize Socket.io server.
 */
function init(server) {
  io = new Server(server, {
    cors: {
      origin: '*', // Allow all origins for debugging and flexible deployments
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    activeConnectionsCount++;
    console.log(`🔌 Client connected [ID: ${socket.id}] | Active Connections: ${activeConnectionsCount}`);
    
    // Send initial status check
    socket.emit('status_update', {
      connections: activeConnectionsCount,
      database: 'connected' // We assume connected, or will verify on status requests
    });

    // Broadcast current connections to everyone
    io.emit('connections_count', activeConnectionsCount);

    socket.on('disconnect', () => {
      activeConnectionsCount = Math.max(0, activeConnectionsCount - 1);
      console.log(`🔌 Client disconnected [ID: ${socket.id}] | Active Connections: ${activeConnectionsCount}`);
      io.emit('connections_count', activeConnectionsCount);
    });
  });

  console.log('⚡ Socket.io system initialized.');
  return io;
}

/**
 * Get Socket.io instance.
 */
function getIO() {
  return io;
}

/**
 * Get current active client connections.
 */
function getConnectionsCount() {
  return activeConnectionsCount;
}

/**
 * Broadcast an incoming parsed webhook event to all dashboards.
 */
function broadcastWebhook(webhookEvent) {
  if (io) {
    io.emit('webhook_received', webhookEvent);
  }
}

/**
 * Broadcast system activity/debug logs to the dashboard.
 */
function broadcastSystemLog(message, type = 'info') {
  if (io) {
    io.emit('system_log', {
      timestamp: new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }),
      message,
      type // 'info', 'success', 'warning', 'error'
    });
  }
}

module.exports = {
  init,
  getIO,
  getConnectionsCount,
  broadcastWebhook,
  broadcastSystemLog
};

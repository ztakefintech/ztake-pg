// Simple in-memory WebSocket connection store
class WebSocketManager {
  private static instance: WebSocketManager;
  private connections: Map<string, WebSocket> = new Map();
  private adminConnections: Set<string> = new Set();

  static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  addConnection(id: string, ws: WebSocket, isAdmin: boolean = false) {
    this.connections.set(id, ws);
    if (isAdmin) {
      this.adminConnections.add(id);
    }
    console.log(`WebSocket connection added: ${id} (admin: ${isAdmin})`);
  }

  removeConnection(id: string) {
    this.connections.delete(id);
    this.adminConnections.delete(id);
    console.log(`WebSocket connection removed: ${id}`);
  }

  broadcastToAdmins(message: any) {
    const messageStr = JSON.stringify(message);
    this.adminConnections.forEach(adminId => {
      const ws = this.connections.get(adminId);
      if (ws && ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(messageStr);
        } catch (error) {
          console.error(`Error sending message to admin ${adminId}:`, error);
          this.removeConnection(adminId);
        }
      }
    });
  }

  broadcastToAll(message: any) {
    const messageStr = JSON.stringify(message);
    this.connections.forEach((ws, id) => {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(messageStr);
        } catch (error) {
          console.error(`Error sending message to ${id}:`, error);
          this.removeConnection(id);
        }
      }
    });
  }

  getConnectionCount(): number {
    return this.connections.size;
  }

  getAdminConnectionCount(): number {
    return this.adminConnections.size;
  }
}

export const wsManager = WebSocketManager.getInstance();

// Simple in-memory callback store for demo purposes
// Not for production use; will reset on server restart/redeploy

type CallbackEvent = {
  receivedAt: string;
  payload: any;
};

class DemoCallbackStore {
  private tokenToEvents: Map<string, CallbackEvent[]> = new Map();

  append(token: string, payload: any) {
    const events = this.tokenToEvents.get(token) || [];
    events.unshift({ receivedAt: new Date().toISOString(), payload });
    // Keep only recent 50
    this.tokenToEvents.set(token, events.slice(0, 50));
  }

  list(token: string): CallbackEvent[] {
    return this.tokenToEvents.get(token) || [];
  }
}

// Singleton instance
export const demoCallbackStore = new DemoCallbackStore();



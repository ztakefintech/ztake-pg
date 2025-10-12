// Simple in-memory event store
interface StoredEvent {
  id: string;
  type: string;
  payload: any;
  timestamp: Date;
}

class EventStore {
  private static instance: EventStore;
  private events: StoredEvent[] = [];
  private subscribers: Map<string, Set<(event: StoredEvent) => void>> = new Map();
  private maxEvents = 1000;

  static getInstance(): EventStore {
    if (!EventStore.instance) {
      EventStore.instance = new EventStore();
    }
    return EventStore.instance;
  }

  emit(event: StoredEvent): void {
    this.events.push(event);
    
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    const subscribers = this.subscribers.get(event.type) || new Set();
    subscribers.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in event subscriber:', error);
      }
    });

    console.log(`Event emitted: ${event.type}`, event.payload);
  }

  subscribe(eventType: string, callback: (event: StoredEvent) => void): () => void {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, new Set());
    }
    
    this.subscribers.get(eventType)!.add(callback);
    
    return () => {
      const subscribers = this.subscribers.get(eventType);
      if (subscribers) {
        subscribers.delete(callback);
      }
    };
  }

  getEventsAfter(eventId: string | null, limit: number = 50): StoredEvent[] {
    if (!eventId) {
      return this.events.slice(-limit);
    }
    
    const eventIndex = this.events.findIndex(e => e.id === eventId);
    if (eventIndex === -1) {
      return this.events.slice(-limit);
    }
    
    return this.events.slice(eventIndex + 1, eventIndex + 1 + limit);
  }

  getRecentEvents(eventType?: string, limit: number = 50): StoredEvent[] {
    let filteredEvents = this.events;
    
    if (eventType) {
      filteredEvents = this.events.filter(event => event.type === eventType);
    }
    
    return filteredEvents.slice(-limit);
  }
}

export const eventStore = EventStore.getInstance();
export type { StoredEvent };

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-middleware';
import { eventStore } from '@/lib/event-store';

// Polling endpoint for WebSocket-like behavior
export const POST = requireAdmin(async (request: NextRequest) => {
  try {
    const body = await request.json().catch(() => ({}));
    const { lastEventId } = body;
    
    // Get events after the last event ID
    const events = eventStore.getEventsAfter(lastEventId);
    
    return NextResponse.json({
      success: true,
      events,
      connectionCount: 1, // Simulate connection count
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error polling events:', error);
    return NextResponse.json({ success: false, error: 'Failed to poll events' }, { status: 500 });
  }
});

// Get recent events endpoint
export const GET = requireAdmin(async (request: NextRequest) => {
  try {
    const url = new URL(request.url);
    const eventType = url.searchParams.get('type');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    
    const events = eventStore.getRecentEvents(eventType || undefined, limit);
    
    return NextResponse.json({
      success: true,
      events,
      total: events.length
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch events' }, { status: 500 });
  }
});

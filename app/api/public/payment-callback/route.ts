import { NextRequest, NextResponse } from 'next/server';
import { demoCallbackStore } from '@/lib/callback-store';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token') || 'default';
    const body = await req.json().catch(() => ({}));
    demoCallbackStore.append(token, body);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token') || 'default';
  const type = searchParams.get('type'); // 'payout' or 'payment'
  
  let events = demoCallbackStore.list(token);
  
  // Filter events by type if specified
  if (type) {
    events = events.filter(event => {
      // Check if the event payload contains payout-related data
      if (type === 'payout') {
        return event.payload?.type === 'payout_status_changed' || 
               event.payload?.payoutId || 
               event.payload?.reference_id ||
               event.payload?.beneficiary_name;
      }
      // For payment events, include all other events
      if (type === 'payment') {
        return event.payload?.type === 'payment_status_changed' ||
               event.payload?.orderId ||
               event.payload?.merchantOrderId ||
               event.payload?.ztakeOrderId;
      }
      return true;
    });
  }
  
  return NextResponse.json({ success: true, data: { events } });
}



import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { requirePermission } from '@/lib/admin-middleware';

export const dynamic = 'force-dynamic';

export const GET = requirePermission('view_payments')(
  async (req: NextRequest, { params }: { params: { id: string } }) => {
    try {
      const id = parseInt(params.id);
      
      if (isNaN(id)) {
        return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
      }

      const event = await db.get(
        `SELECT * FROM webhook_events WHERE id = ?`,
        [id]
      );

      if (!event) {
        return NextResponse.json({ error: 'Webhook event not found' }, { status: 404 });
      }

      return NextResponse.json({ event });
    } catch (error) {
      console.error('Get webhook event detail error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch webhook event detail' },
        { status: 500 }
      );
    }
  }
);

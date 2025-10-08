import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { db } from '@/lib/database';

export const POST = withAuth(async (req: NextRequest) => {
  try {
    const { amount } = await req.json();
    const vendor = (req as any).vendor;

    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 401 });
    }

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Valid amount is required' }, { status: 400 });
    }

    // Check if vendor has sufficient total received amount
    // Get total amount from succeeded orders
    const ordersData = await db.all(
      'SELECT SUM(amount) as total_received FROM orders WHERE vendor_id = ? AND status = ?',
      [vendor.id, 'Succeeded']
    );
    
    const totalReceived = parseFloat(ordersData[0]?.total_received || 0);
    
    // Get existing pending settlements to calculate available amount
    const pendingSettlements = await db.all(
      'SELECT SUM(amount) as pending_amount FROM settlements WHERE vendor_id = ? AND status = ?',
      [vendor.id, 'pending']
    );
    
    const pendingAmount = parseFloat(pendingSettlements[0]?.pending_amount || 0);
    const availableAmount = totalReceived - pendingAmount;
    
    if (amount > availableAmount) {
      return NextResponse.json({ 
        error: `Insufficient available amount for settlement. Available: ₹${availableAmount.toFixed(2)}, Requested: ₹${amount.toFixed(2)}` 
      }, { status: 400 });
    }

    // Check if there's already a pending settlement (redundant check, but keeping for clarity)
    if (pendingSettlements.length > 0 && pendingAmount > 0) {
      return NextResponse.json({ error: 'You already have a pending settlement request' }, { status: 400 });
    }

    // Create settlement request
    const result = await db.run(
      'INSERT INTO settlements (vendor_id, amount, status) VALUES (?, ?, ?)',
      [vendor.id, amount, 'pending']
    );

    return NextResponse.json({
      success: true,
      settlement: { id: result.lastID, vendor_id: vendor.id, amount, status: 'pending' }
    });

  } catch (error) {
    console.error('Settlement creation error:', error);
    return NextResponse.json({ error: 'Failed to create settlement request' }, { status: 500 });
  }
});

export const GET = withAuth(async (req: NextRequest) => {
  try {
    const vendor = (req as any).vendor;

    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 401 });
    }

    const result = await db.all(
      'SELECT * FROM settlements WHERE vendor_id = ? ORDER BY created_at DESC',
      [vendor.id]
    );

    return NextResponse.json({
      settlements: result
    });

  } catch (error) {
    console.error('Settlement fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch settlements' }, { status: 500 });
  }
});

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 });
    }
    const token = authHeader.substring(7);
    // Support both JWT vendor token and secret_key
    let vendor = await db.get('SELECT id FROM vendors WHERE secret_key = $1', [token]);
    if (!vendor) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const config = await db.get(
      'SELECT system_prompt, bot_name, is_active FROM zibot_configs WHERE vendor_id = $1',
      [vendor.id]
    );

    return NextResponse.json({
      success: true,
      config: config || {
        system_prompt: 'You are a helpful payment support assistant.',
        bot_name: 'ZiBot',
        is_active: true
      }
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch config' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 });
    }
    const token = authHeader.substring(7);
    const vendor = await db.get('SELECT id FROM vendors WHERE secret_key = $1', [token]);
    if (!vendor) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const body = await req.json();
    const { system_prompt, bot_name, is_active } = body;

    await db.run(`
      INSERT INTO zibot_configs (vendor_id, system_prompt, bot_name, is_active)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (vendor_id) DO UPDATE SET
        system_prompt = EXCLUDED.system_prompt,
        bot_name = EXCLUDED.bot_name,
        is_active = EXCLUDED.is_active,
        updated_at = CURRENT_TIMESTAMP
    `, [
      vendor.id,
      system_prompt || 'You are a helpful payment support assistant.',
      bot_name || 'ZiBot',
      is_active !== undefined ? is_active : true
    ]);

    return NextResponse.json({ success: true, message: 'ZiBot config updated' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update config' }, { status: 500 });
  }
}

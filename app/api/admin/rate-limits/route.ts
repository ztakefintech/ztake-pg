import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-middleware';
import { unblockIP, resetIP, getBlockedIPs, getAllIPs } from '@/lib/rate-limit';

// Ensure dynamic rendering due to cookie-based admin auth
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET - List all blocked IPs or all IPs with rate limit data
export const GET = requireAdmin(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'blocked'; // 'blocked' or 'all'
    
    if (type === 'all') {
      const allIPs = getAllIPs();
      return NextResponse.json({ 
        ips: allIPs,
        total: allIPs.length,
        blocked: allIPs.filter(ip => ip.blockedUntil).length
      });
    } else {
      const blockedIPs = getBlockedIPs();
      return NextResponse.json({ 
        blocked: blockedIPs,
        total: blockedIPs.length
      });
    }
  } catch (error) {
    console.error('Get rate limits error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch rate limit data' },
      { status: error instanceof Error && error.message.includes('Admin authentication') ? 401 : 500 }
    );
  }
});

// POST - Unblock a specific IP address
export const POST = requireAdmin(async (request: NextRequest) => {
  try {
    const body = await request.json().catch(() => ({}));
    const { ip, action = 'unblock' } = body;
    
    if (!ip) {
      return NextResponse.json(
        { error: 'IP address is required' },
        { status: 400 }
      );
    }
    
    let success = false;
    let message = '';
    
    if (action === 'unblock') {
      success = unblockIP(ip);
      message = success 
        ? `IP ${ip} has been unblocked and violations reset` 
        : `IP ${ip} is not currently blocked or does not exist in rate limit store`;
    } else if (action === 'reset') {
      success = resetIP(ip);
      message = success 
        ? `IP ${ip} has been completely reset from rate limit store` 
        : `IP ${ip} does not exist in rate limit store`;
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "unblock" or "reset"' },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ 
      success,
      message,
      ip 
    });
  } catch (error) {
    console.error('Unblock IP error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to unblock IP' },
      { status: error instanceof Error && error.message.includes('Admin authentication') ? 401 : 500 }
    );
  }
});

// DELETE - Reset/remove an IP from rate limit store
export const DELETE = requireAdmin(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const ip = searchParams.get('ip');
    
    if (!ip) {
      return NextResponse.json(
        { error: 'IP address is required' },
        { status: 400 }
      );
    }
    
    const success = resetIP(ip);
    
    return NextResponse.json({ 
      success,
      message: success 
        ? `IP ${ip} has been completely removed from rate limit store` 
        : `IP ${ip} does not exist in rate limit store`,
      ip 
    });
  } catch (error) {
    console.error('Reset IP error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to reset IP' },
      { status: error instanceof Error && error.message.includes('Admin authentication') ? 401 : 500 }
    );
  }
});

import { withAuth, createApiResponse, createErrorResponse, AuthenticatedRequest } from '@/lib/middleware';
import { db } from '@/lib/database';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const GET = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const rows = await db.all('SELECT id, ip, enabled FROM vendor_ips WHERE vendor_id = ? ORDER BY id', [req.vendor!.id]);
    return createApiResponse({ ips: rows });
  } catch (e) {
    return createErrorResponse('Failed to load IPs', 500);
  }
});

export const POST = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const body = await req.json();
    const ip = (body?.ip || '').toString().trim();
    const ipv4 = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;
    if (!ipv4.test(ip)) return createErrorResponse('Invalid IP', 400);
    const res = await db.run('INSERT INTO vendor_ips (vendor_id, ip, enabled) VALUES (?, ?, ?)', [req.vendor!.id, ip, true]);
    return createApiResponse({ id: res.lastID, ip, enabled: true });
  } catch (e) {
    return createErrorResponse('Failed to add IP', 500);
  }
});

export const PUT = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const body = await req.json();
    const id = Number(body?.id);
    const enabled = !!body?.enabled;
    if (!id) return createErrorResponse('id required', 400);
    await db.run('UPDATE vendor_ips SET enabled = ? WHERE id = ? AND vendor_id = ?', [enabled, id, req.vendor!.id]);
    return createApiResponse({ id, enabled });
  } catch (e) {
    return createErrorResponse('Failed to update IP', 500);
  }
});

export const DELETE = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get('id'));
    const ip = searchParams.get('ip');
    if (!id && !ip) return createErrorResponse('id or ip required', 400);
    if (id) {
      await db.run('DELETE FROM vendor_ips WHERE id = ? AND vendor_id = ?', [id, req.vendor!.id]);
    } else if (ip) {
      await db.run('DELETE FROM vendor_ips WHERE ip = ? AND vendor_id = ?', [ip, req.vendor!.id]);
    }
    return createApiResponse({ success: true });
  } catch (e) {
    return createErrorResponse('Failed to delete IP', 500);
  }
});



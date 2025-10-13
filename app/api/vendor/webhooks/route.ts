import { withAuth, createApiResponse, createErrorResponse, AuthenticatedRequest } from '@/lib/middleware';
import { db } from '@/lib/database';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const GET = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const row = await db.get(
      'SELECT payin_webhook_url, payout_webhook_url FROM vendors WHERE id = ?',
      [req.vendor!.id]
    );
    return createApiResponse({
      payin_url: row?.payin_webhook_url || '',
      payout_url: row?.payout_webhook_url || ''
    });
  } catch (e) {
    return createErrorResponse('Failed to load webhooks', 500);
  }
});

export const PUT = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const body = await req.json().catch(() => ({}));
    const payin = (body?.payin_url || '').toString().trim();
    const payout = (body?.payout_url || '').toString().trim();

    // Basic validation
    const isUrl = (u: string) => !u || /^https?:\/\//i.test(u);
    if (!isUrl(payin) || !isUrl(payout)) {
      return createErrorResponse('Invalid URL format', 400);
    }

    await db.run(
      'UPDATE vendors SET payin_webhook_url = ?, payout_webhook_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [payin || null, payout || null, req.vendor!.id]
    );
    return createApiResponse({ message: 'Saved' });
  } catch (e) {
    return createErrorResponse('Failed to save webhooks', 500);
  }
});



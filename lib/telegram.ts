import { db } from '@/lib/database'

type BasicVendor = { id: number; business_name?: string | null; bot_token?: string | null; chat_id?: string | null } | null

function getEnv(name: string): string | undefined {
  try {
    return process.env[name];
  } catch {
    return undefined;
  }
}

export async function sendTelegramAdminAlert(message: string, vendorId?: number): Promise<void> {
  try {
    // Skip sending in test mode if configured
    const disableSends = getEnv('TELEGRAM_DISABLE_SENDING');
    if (disableSends && disableSends.toLowerCase() === 'true') {
      return;
    }

    // Prefer global admin bot credentials from env
    const adminBotToken = getEnv('TELEGRAM_ADMIN_BOT_TOKEN');
    const adminChatId = getEnv('TELEGRAM_ADMIN_CHAT_ID');

    let botToken = adminBotToken;
    let chatId = adminChatId;

    // If no global creds, try vendor-specific
    if ((!botToken || !chatId) && vendorId) {
      const vendor: BasicVendor = await db.get(
        'SELECT id, business_name, bot_token, chat_id FROM vendors WHERE id = ? LIMIT 1',
        [vendorId]
      );
      if (vendor?.bot_token && vendor?.chat_id) {
        botToken = vendor.bot_token;
        chatId = vendor.chat_id;
      }
    }

    if (!botToken || !chatId) {
      // Nothing to do silently; avoid throwing in critical paths
      return;
    }

    // Use Telegram HTTP API directly to avoid extra deps
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML', disable_web_page_preview: true })
    }).catch(() => {});
  } catch {
    // Swallow errors to avoid breaking main flows
  }
}



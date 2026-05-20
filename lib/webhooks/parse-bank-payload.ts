// lib/webhooks/parse-bank-payload.ts

export interface ParsedPayment {
  utr: string | null;
  google_txn_id: string | null;
  amount: number | null;
  paid_at: Date | null;
  source: string | null;
  raw_amount_string: string;
  payment_type: string; // 'credit' | 'debit' | 'unknown'
  sender_name: string | null;
  payment_method: string | null;
  payment_app: string | null;
  customer_paid: number | null;
  mdr_gst: number | null;
  amount_received: number | null;
}

/**
 * Normalize Unicode whitespace characters that Tasker/GPay inject:
 *   \u202f = narrow no-break space (seen in timestamps like "4:14\u202fam")
 *   \u00a0 = non-breaking space
 *   \u200b = zero-width space
 */
function normalizeUnicode(str: string): string {
  return str
    .replace(/\u202f/g, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/\u200b/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
}

export function parseBankWebhookPayload(payload: {
  amount?: string;
  time?: string;
  raw_screen?: string;
  source?: string;
  timestamp?: string;
}): ParsedPayment {
  const parseNumber = (val: string): number | null => {
    const clean = val.replace(/[+\-\s₹,]/g, '').trim();
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? null : parsed;
  };

  // 1. Parse amount
  const rawAmount = payload.amount || '';
  let amount = parseNumber(rawAmount);

  // 2. Parse debit/credit type from amount prefix
  let payment_type = 'unknown';
  if (rawAmount.includes('+')) {
    payment_type = 'credit';
  } else if (rawAmount.includes('-')) {
    payment_type = 'debit';
  }

  // 3. Parse fields from raw_screen — normalize Unicode FIRST
  const rawScreen = normalizeUnicode(payload.raw_screen || '');
  const lines = rawScreen
    .replace(/\|/g, '\n')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);

  let utr: string | null = null;
  let google_txn_id: string | null = null;
  let sender_name: string | null = null;
  let payment_method: string | null = null;
  let payment_app: string | null = null;
  let customer_paid: number | null = null;
  let mdr_gst: number | null = null;
  let amount_received: number | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check credit/debit in text if not set by amount prefix
    if (payment_type === 'unknown') {
      if (line.toLowerCase().includes('credited')) {
        payment_type = 'credit';
      } else if (line.toLowerCase().includes('debited')) {
        payment_type = 'debit';
      }
    }

    // Sender Name
    if (line.startsWith('Received from')) {
      sender_name = line.replace(/^Received from\s+/i, '').trim();
    }

    // Payment App
    if (line.startsWith('Payment from')) {
      payment_app = line.replace(/^Payment from\s+/i, '').trim();
    }

    // Payment method
    if (line === 'Payment method' && lines[i + 1]) {
      payment_method = lines[i + 1].trim();
    }

    // UPI Transaction ID (UTR)
    if (line === 'UPI Transaction ID' && lines[i + 1]) {
      utr = lines[i + 1].trim();
    }

    // Google Transaction ID
    if (line === 'Google Transaction ID' && lines[i + 1]) {
      google_txn_id = lines[i + 1].trim();
    }

    // Customer paid
    if (line === 'Customer paid' && lines[i + 1]) {
      customer_paid = parseNumber(lines[i + 1]);
    }

    // MDR + GST
    if (line === 'MDR + GST' && lines[i + 1]) {
      mdr_gst = parseNumber(lines[i + 1]);
    }

    // Amount you get
    if (line === 'Amount you get' && lines[i + 1]) {
      amount_received = parseNumber(lines[i + 1]);
    }
  }

  // Fallback UTR extraction: scan raw_screen for a 9-16 digit number pattern
  // UPI Transaction IDs are typically 12-digit numbers
  if (!utr && rawScreen) {
    const utrRegex = /\b(\d{9,16})\b/g;
    const matches: string[] = [];
    let m;
    while ((m = utrRegex.exec(rawScreen)) !== null) {
      // Skip timestamps (10-digit Unix epochs starting with 17...)
      if (m[1].length === 10 && m[1].startsWith('17')) continue;
      matches.push(m[1]);
    }
    // Pick the first match that's 9+ digits (most likely UTR)
    if (matches.length > 0) {
      utr = matches[0];
    }
  }

  // Fallback Google Transaction ID: scan for CIC pattern
  if (!google_txn_id && rawScreen) {
    const googleTxnRegex = /\b(CIC[A-Za-z0-9_-]{8,})\b/;
    const gMatch = googleTxnRegex.exec(rawScreen);
    if (gMatch) {
      google_txn_id = gMatch[1];
    }
  }

  // Fallback for amount if not parsed earlier
  if (amount === null && customer_paid !== null) {
    amount = customer_paid;
  }

  // 4. Parse timestamp
  const paid_at = payload.timestamp
    ? new Date(parseInt(payload.timestamp) * 1000)
    : null;

  return {
    utr,
    google_txn_id,
    amount,
    paid_at,
    source: payload.source || null,
    raw_amount_string: rawAmount,
    payment_type,
    sender_name,
    payment_method,
    payment_app,
    customer_paid,
    mdr_gst,
    amount_received,
  };
}

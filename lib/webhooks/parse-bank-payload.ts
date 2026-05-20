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
    const lowerLine = line.toLowerCase();

    // Check credit/debit in text if not set by amount prefix
    if (payment_type === 'unknown') {
      if (lowerLine.includes('credited')) {
        payment_type = 'credit';
      } else if (lowerLine.includes('debited')) {
        payment_type = 'debit';
      }
    }

    // Sender Name
    if (lowerLine.startsWith('received from')) {
      sender_name = line.substring(13).trim();
    }

    // Payment App
    if (lowerLine.startsWith('payment from')) {
      payment_app = line.substring(12).trim();
    }

    // Payment method
    if (lowerLine === 'payment method' && lines[i + 1]) {
      payment_method = lines[i + 1].trim();
    }
    // Also support same-line payment method check: "Payment method: UPI" or "Payment method - Wallet"
    if (lowerLine.startsWith('payment method')) {
      const match = line.match(/payment method\s*[:\-]?\s*(.+)/i);
      if (match) {
        const val = match[1].trim();
        const valLower = val.toLowerCase();
        if (valLower === 'wallet' || valLower === 'upi' || valLower === 'netbanking') {
          payment_method = val;
        }
      }
    }

    // UPI Transaction ID / UTR (Multi-line)
    const isUtrLabel =
      lowerLine === 'upi transaction id' ||
      lowerLine === 'upi transaction id:' ||
      lowerLine === 'upi transaction_id' ||
      lowerLine === 'upi ref no' ||
      lowerLine === 'upi ref no:' ||
      lowerLine === 'rrn' ||
      lowerLine === 'rrn:' ||
      lowerLine === 'utr' ||
      lowerLine === 'utr:';
    if (isUtrLabel && lines[i + 1]) {
      const nextLineTrimmed = lines[i + 1].trim();
      if (/^\d{9,16}$/.test(nextLineTrimmed)) {
        utr = nextLineTrimmed;
      }
    }

    // Same-line UPI Transaction ID check: "UPI Transaction ID: 652603702065" or "UTR - 652603702065"
    if (
      lowerLine.includes('upi transaction id') ||
      lowerLine.includes('upi transaction_id') ||
      lowerLine.includes('utr') ||
      lowerLine.includes('rrn') ||
      lowerLine.includes('upi ref')
    ) {
      const match = line.match(/(?:upi transaction id|upi transaction_id|utr|rrn|upi ref no|upi ref)\s*[:\-]?\s*(\d{12})/i);
      if (match) {
        utr = match[1];
      }
    }

    // Google Transaction ID (Multi-line)
    const isGoogleTxnLabel =
      lowerLine === 'google transaction id' ||
      lowerLine === 'google transaction id:';
    if (isGoogleTxnLabel && lines[i + 1]) {
      google_txn_id = lines[i + 1].trim();
    }
    // Same-line Google Transaction ID check
    if (lowerLine.includes('google transaction id')) {
      const match = line.match(/google transaction id\s*[:\-]?\s*(CIC[A-Za-z0-9_-]+)/i);
      if (match) {
        google_txn_id = match[1];
      }
    }

    // Customer paid
    if (lowerLine === 'customer paid' && lines[i + 1]) {
      customer_paid = parseNumber(lines[i + 1]);
    }

    // MDR + GST
    if (lowerLine === 'mdr + gst' && lines[i + 1]) {
      mdr_gst = parseNumber(lines[i + 1]);
    }

    // Amount you get
    if (lowerLine === 'amount you get' && lines[i + 1]) {
      amount_received = parseNumber(lines[i + 1]);
    }
  }

  // Fallback UTR extraction: scan raw_screen specifically for a 12-digit number (highly reliable UPI Reference ID / RRN length)
  if (!utr && rawScreen) {
    const rrnRegex = /\b(\d{12})\b/g;
    let m;
    while ((m = rrnRegex.exec(rawScreen)) !== null) {
      utr = m[1];
      break; // found first 12-digit number, highly likely UPI Transaction ID (RRN)
    }
  }

  // Second fallback: standard 9-16 digit number scanning (ignoring Unix epochs)
  if (!utr && rawScreen) {
    const utrRegex = /\b(\d{9,16})\b/g;
    const matches: string[] = [];
    let m;
    while ((m = utrRegex.exec(rawScreen)) !== null) {
      if (m[1].length === 10 && m[1].startsWith('17')) continue;
      matches.push(m[1]);
    }
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
  if (amount === null && amount_received !== null) {
    amount = amount_received;
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

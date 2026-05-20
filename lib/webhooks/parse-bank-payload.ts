// lib/webhooks/parse-bank-payload.ts

export interface ParsedPayment {
  utr: string | null;
  google_txn_id: string | null;
  amount: number | null;
  paid_at: Date | null;
  source: string | null;
  raw_amount_string: string;
}

export function parseBankWebhookPayload(payload: {
  amount?: string;
  time?: string;
  raw_screen?: string;
  source?: string;
  timestamp?: string;
}): ParsedPayment {
  // 1. Parse amount
  const rawAmount = payload.amount || '';
  const cleanAmount = rawAmount.replace(/[+\-\s₹,]/g, '');
  const amount = parseFloat(cleanAmount) || null;

  // 2. Parse UTR from raw_screen
  // raw_screen uses both | and \n as separators
  // Normalize: replace | with \n, then split on \n
  const rawScreen = payload.raw_screen || '';
  const lines = rawScreen
    .replace(/\|/g, '\n')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);

  let utr: string | null = null;
  let google_txn_id: string | null = null;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i] === 'UPI Transaction ID' && lines[i + 1]) {
      utr = lines[i + 1].trim();
    }
    if (lines[i] === 'Google Transaction ID' && lines[i + 1]) {
      google_txn_id = lines[i + 1].trim();
    }
  }

  // 3. Parse timestamp
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
  };
}

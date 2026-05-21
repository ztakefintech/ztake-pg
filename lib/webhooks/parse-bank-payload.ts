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
 * Also normalize literal escaped "\n" strings (from Tasker) into actual newlines.
 */
function normalizeUnicode(str: string): string {
  return str
    .replace(/\\u202f/g, ' ')
    .replace(/\u202f/g, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/\u200b/g, '')
    .replace(/\\r\\n/g, '\n')
    .replace(/\\r/g, '\n')
    .replace(/\\n/g, '\n')       // Convert literal "\n" strings → actual newlines
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
}

/**
 * Extract the best "raw screen" text from any payload format.
 * Tasker might send the notification text under various field names,
 * or the entire body might BE the raw text. This function searches
 * all string values in the payload object to find the richest one.
 */
function extractRawScreen(payload: any): string {
  if (!payload || typeof payload !== 'object') {
    return typeof payload === 'string' ? payload : '';
  }

  // Priority 1: Known field names from Tasker / GPay Business / common integrations
  const knownFields = [
    'raw_screen', 'rawScreen', 'raw_data', 'rawData',
    'screen_text', 'screenText', 'screen',
    'notification_text', 'notificationText', 'notification',
    'body', 'text', 'message', 'msg', 'content', 'data',
    'description', 'details', 'info', 'payload',
    'raw', 'raw_body', 'rawBody', 'raw_text', 'rawText',
    'sms_body', 'sms', 'sms_text',
  ];

  for (const field of knownFields) {
    const val = payload[field];
    if (typeof val === 'string' && val.length > 20) {
      return val;
    }
  }

  // Priority 2: Find the longest string value in the payload 
  // (likely the notification screen dump)
  let longestStr = '';
  for (const key of Object.keys(payload)) {
    const val = payload[key];
    if (typeof val === 'string' && val.length > longestStr.length && val.length > 30) {
      longestStr = val;
    }
  }
  if (longestStr) return longestStr;

  // Priority 3: If there's a nested object, recursively search one level deep
  for (const key of Object.keys(payload)) {
    const val = payload[key];
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      const nested = extractRawScreen(val);
      if (nested.length > 30) return nested;
    }
  }

  return '';
}

/**
 * Extract amount string from payload, searching multiple field names.
 */
function extractAmountString(payload: any): string {
  if (!payload || typeof payload !== 'object') return '';
  
  const amountFields = ['amount', 'amt', 'total', 'txn_amount', 'transaction_amount'];
  for (const field of amountFields) {
    const val = payload[field];
    if (val !== undefined && val !== null) {
      return String(val);
    }
  }
  return '';
}

export function parseBankWebhookPayload(payload: {
  amount?: string;
  time?: string;
  raw_screen?: string;
  source?: string;
  timestamp?: string;
  [key: string]: any;
}): ParsedPayment {
  const parseNumber = (val: string): number | null => {
    const clean = val.replace(/[+\-\s₹,]/g, '').trim();
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? null : parsed;
  };

  // 1. Parse amount from known fields
  const rawAmount = extractAmountString(payload);
  let amount = parseNumber(rawAmount);

  // 2. Parse debit/credit type from amount prefix
  let payment_type = 'unknown';
  if (rawAmount.includes('+')) {
    payment_type = 'credit';
  } else if (rawAmount.includes('-')) {
    payment_type = 'debit';
  }

  // 3. Extract and normalize the raw notification screen text
  const rawScreenRaw = extractRawScreen(payload);
  const rawScreen = normalizeUnicode(rawScreenRaw);
  
  // Split by pipe (|) and newline to get individual lines
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
    // Also handle "Paid by" or "Payment from" as sender for different notification formats
    if (!sender_name && lowerLine.startsWith('paid by')) {
      sender_name = line.substring(7).trim();
    }

    // Payment App
    if (lowerLine.startsWith('payment from')) {
      payment_app = line.substring(12).trim();
    }
    // Handle "via" variants
    if (!payment_app && (lowerLine.startsWith('paid via') || lowerLine.startsWith('payment via'))) {
      const appName = line.replace(/^(?:paid|payment)\s+via\s*/i, '').trim();
      if (appName && appName.toLowerCase() !== 'external app') {
        payment_app = appName;
      }
    }

    // Payment method
    if (lowerLine === 'payment method' && lines[i + 1]) {
      payment_method = lines[i + 1].trim();
    }
    // Same-line payment method check: "Payment method: UPI" or "Payment method - Wallet"
    if (lowerLine.startsWith('payment method')) {
      const match = line.match(/payment method\s*[:\-]?\s*(.+)/i);
      if (match) {
        const val = match[1].trim();
        const valLower = val.toLowerCase();
        if (valLower === 'wallet' || valLower === 'upi' || valLower === 'netbanking' || valLower === 'card') {
          payment_method = val;
        }
      }
    }

    // UPI Transaction ID / UTR (Multi-line label → next line is the value)
    const isUtrLabel =
      lowerLine === 'upi transaction id' ||
      lowerLine === 'upi transaction id:' ||
      lowerLine === 'upi transaction_id' ||
      lowerLine === 'upi ref no' ||
      lowerLine === 'upi ref no:' ||
      lowerLine === 'upi ref no.' ||
      lowerLine === 'upi reference id' ||
      lowerLine === 'upi reference no' ||
      lowerLine === 'transaction id' ||
      lowerLine === 'transaction id:' ||
      lowerLine === 'txn id' ||
      lowerLine === 'txn id:' ||
      lowerLine === 'ref no' ||
      lowerLine === 'ref no:' ||
      lowerLine === 'ref no.' ||
      lowerLine === 'reference no' ||
      lowerLine === 'reference id' ||
      lowerLine === 'rrn' ||
      lowerLine === 'rrn:' ||
      lowerLine === 'utr' ||
      lowerLine === 'utr:' ||
      lowerLine === 'utr no' ||
      lowerLine === 'utr no:';
    if (isUtrLabel && lines[i + 1]) {
      const nextLineTrimmed = lines[i + 1].trim();
      // Accept numeric UTR (9-22 digits) — expanded range for IMPS/NEFT refs
      if (/^\d{9,22}$/.test(nextLineTrimmed)) {
        utr = nextLineTrimmed;
      }
      // Also accept alphanumeric UTR (e.g. IMPS refs like "IMPS/123456789012/...")
      // At minimum 6 chars, must contain at least some digits
      if (!utr && /^[A-Za-z0-9\/\-_]{6,30}$/.test(nextLineTrimmed) && /\d{4,}/.test(nextLineTrimmed)) {
        utr = nextLineTrimmed;
      }
    }

    // Same-line UPI Transaction ID: "UPI Transaction ID: 652603702065" or "UTR: 652603702065"
    if (
      lowerLine.includes('upi transaction id') ||
      lowerLine.includes('upi transaction_id') ||
      lowerLine.includes('transaction id') ||
      lowerLine.includes('utr') ||
      lowerLine.includes('rrn') ||
      lowerLine.includes('upi ref') ||
      lowerLine.includes('ref no') ||
      lowerLine.includes('reference')
    ) {
      // Try 12-digit first (most common UPI RRN)
      const match12 = line.match(/(?:upi transaction id|upi transaction_id|transaction id|txn id|utr|rrn|upi ref(?:erence)?\s*(?:no|id)?|ref(?:erence)?\s*(?:no|id)?)\s*[:\-.]?\s*(\d{12})/i);
      if (match12) {
        utr = match12[1];
      }
      // Broader: 9-22 digit number
      if (!utr) {
        const matchBroad = line.match(/(?:upi transaction id|upi transaction_id|transaction id|txn id|utr|rrn|upi ref(?:erence)?\s*(?:no|id)?|ref(?:erence)?\s*(?:no|id)?)\s*[:\-.]?\s*(\d{9,22})/i);
        if (matchBroad) {
          utr = matchBroad[1];
        }
      }
      // Alphanumeric UTR (e.g. IMPS refs)
      if (!utr) {
        const matchAlpha = line.match(/(?:upi transaction id|upi transaction_id|transaction id|txn id|utr|rrn|upi ref(?:erence)?\s*(?:no|id)?|ref(?:erence)?\s*(?:no|id)?)\s*[:\-.]?\s*([A-Za-z0-9\/\-_]{8,30})/i);
        if (matchAlpha && /\d{4,}/.test(matchAlpha[1])) {
          utr = matchAlpha[1];
        }
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
    if ((lowerLine === 'customer paid' || lowerLine === 'amount paid') && lines[i + 1]) {
      customer_paid = parseNumber(lines[i + 1]);
    }
    // Same-line: "Customer paid: ₹15"
    if (lowerLine.startsWith('customer paid') || lowerLine.startsWith('amount paid')) {
      const match = line.match(/(?:customer paid|amount paid)\s*[:\-]?\s*([\d₹,.+\-\s]+)/i);
      if (match) {
        const parsed = parseNumber(match[1]);
        if (parsed !== null) customer_paid = parsed;
      }
    }

    // MDR + GST
    if ((lowerLine === 'mdr + gst' || lowerLine === 'mdr+gst' || lowerLine === 'fees') && lines[i + 1]) {
      mdr_gst = parseNumber(lines[i + 1]);
    }

    // Amount you get
    if ((lowerLine === 'amount you get' || lowerLine === 'you get' || lowerLine === 'net amount') && lines[i + 1]) {
      amount_received = parseNumber(lines[i + 1]);
    }

    // Extract amount from "₹15 credited" or "₹25.00 received" patterns
    if (amount === null) {
      const creditMatch = line.match(/₹\s*([\d,.]+)\s*(?:credited|received|deposited)/i);
      if (creditMatch) {
        amount = parseNumber(creditMatch[1]);
        if (payment_type === 'unknown') payment_type = 'credit';
      }
      const debitMatch = line.match(/₹\s*([\d,.]+)\s*(?:debited|sent|paid|deducted)/i);
      if (debitMatch) {
        amount = parseNumber(debitMatch[1]);
        if (payment_type === 'unknown') payment_type = 'debit';
      }
    }
  }

  // Fallback UTR extraction: scan raw_screen for a 12-digit number (highly reliable UPI Reference ID / RRN length)
  if (!utr && rawScreen) {
    const rrnRegex = /\b(\d{12})\b/g;
    let m;
    // Find a 12-digit number that isn't a timestamp
    while ((m = rrnRegex.exec(rawScreen)) !== null) {
      // Skip if it looks like a Unix timestamp in milliseconds
      if (m[1].startsWith('17') || m[1].startsWith('16') || m[1].startsWith('18') || m[1].startsWith('19') || m[1].startsWith('20')) {
        // Could still be a UTR - check context: is it near a UTR label?
        const contextBefore = rawScreen.substring(Math.max(0, m.index - 50), m.index).toLowerCase();
        if (contextBefore.includes('transaction') || contextBefore.includes('utr') || contextBefore.includes('rrn') || contextBefore.includes('ref')) {
          utr = m[1];
          break;
        }
        continue;
      }
      utr = m[1];
      break;
    }
  }

  // Second fallback: 9-22 digit number scanning (ignoring Unix epochs and amounts)
  if (!utr && rawScreen) {
    const utrRegex = /\b(\d{9,22})\b/g;
    const matches: string[] = [];
    let m;
    while ((m = utrRegex.exec(rawScreen)) !== null) {
      // Skip Unix timestamps (10-digit starting with 17/18/19/20)
      if (m[1].length === 10 && /^(17|18|19|20)/.test(m[1])) continue;
      // Skip small amounts (< 6 digits that could be currency amounts)
      if (m[1].length <= 6) continue;
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

  // Also try to extract amount from raw_screen if still null
  if (amount === null && rawScreen) {
    // "₹15 credited" or "₹25.00"
    const amountMatch = rawScreen.match(/₹\s*([\d,]+(?:\.\d{1,2})?)/);
    if (amountMatch) {
      amount = parseNumber(amountMatch[1]);
    }
  }

  // 4. Parse timestamp
  const paid_at = payload.timestamp
    ? new Date(parseInt(payload.timestamp) * 1000)
    : null;

  // Detect payment app from raw screen if not found from structured parsing
  if (!payment_app && rawScreen) {
    const appPatterns: [RegExp, string][] = [
      [/phonepe/i, 'PhonePe'],
      [/google pay/i, 'Google Pay'],
      [/gpay/i, 'Google Pay'],
      [/paytm/i, 'Paytm'],
      [/bhim/i, 'BHIM'],
      [/amazon pay/i, 'Amazon Pay'],
      [/cred/i, 'CRED'],
      [/whatsapp/i, 'WhatsApp Pay'],
    ];
    for (const [regex, name] of appPatterns) {
      if (regex.test(rawScreen)) {
        payment_app = name;
        break;
      }
    }
  }

  // Detect payment method from raw screen if not found
  if (!payment_method && rawScreen) {
    if (/\bupi\b/i.test(rawScreen)) payment_method = 'UPI';
    else if (/\bwallet\b/i.test(rawScreen)) payment_method = 'Wallet';
    else if (/\bnetbanking\b/i.test(rawScreen)) payment_method = 'Netbanking';
    else if (/\bcard\b/i.test(rawScreen)) payment_method = 'Card';
  }

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

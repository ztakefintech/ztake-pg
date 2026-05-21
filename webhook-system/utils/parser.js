// utils/parser.js

/**
 * Normalize Unicode whitespace characters that Tasker/GPay inject:
 *   \u202f = narrow no-break space (seen in timestamps like "4:14\u202fam")
 *   \u00a0 = non-breaking space
 *   \u200b = zero-width space
 * Also normalize literal escaped "\n" strings (from Tasker) into actual newlines.
 */
function normalizeUnicode(str) {
  if (!str) return '';
  return str
    .replace(/\\u202f/g, ' ')
    .replace(/\u202f/g, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/\u200b/g, '')
    .replace(/\\r\\n/g, '\n')
    .replace(/\\r/g, '\n')
    .replace(/\\n/g, '\n') // Convert literal "\n" strings → actual newlines
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
}

/**
 * Extract the best "raw screen" text from any payload format.
 * Tasker might send the notification text under various field names,
 * or the entire body might BE the raw text.
 */
function extractRawScreen(payload) {
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
  let longestStr = '';
  for (const key of Object.keys(payload)) {
    const val = payload[key];
    if (typeof val === 'string' && val.length > longestStr.length && val.length > 30) {
      longestStr = val;
    }
  }
  if (longestStr) return longestStr;

  // Priority 3: Nested object search
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
function extractAmountString(payload) {
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

function parsePayload(payload) {
  const parseNumber = (val) => {
    if (!val) return null;
    const clean = val.replace(/[+\-\s₹,]/g, '').trim();
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? null : parsed;
  };

  // 1. Extract raw amount string & parse amount
  let rawAmount = extractAmountString(payload) || payload.amount || '';
  let amountVal = parseNumber(rawAmount);

  // 2. Extract and normalize raw screen text
  const rawScreenRaw = extractRawScreen(payload) || payload.raw_screen || '';
  const rawScreen = normalizeUnicode(rawScreenRaw);

  const lines = rawScreen
    .replace(/\|/g, '\n')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);

  let utr = null;
  let google_txn_id = null;
  let sender_name = null;
  let payment_time = payload.time || null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lowerLine = line.toLowerCase();

    // Sender Name parsing
    if (lowerLine.startsWith('received from')) {
      sender_name = line.substring(13).trim();
    } else if (!sender_name && lowerLine.startsWith('paid by')) {
      sender_name = line.substring(7).trim();
    }

    // Time parsing (if not already extracted)
    if (!payment_time) {
      // Look for line containing timestamp patterns (e.g. "19 May, 9:28 am")
      if (/\b\d{1,2}\s+[A-Za-z]{3,9},?\s+\d{1,2}:\d{2}\s*(?:am|pm)?\b/i.test(line)) {
        payment_time = line;
      }
    }

    // UPI Transaction ID / UTR (Multi-line value retrieval)
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
      if (/^\d{9,22}$/.test(nextLineTrimmed)) {
        utr = nextLineTrimmed;
      }
      if (!utr && /^[A-Za-z0-9\/\-_]{6,30}$/.test(nextLineTrimmed) && /\d{4,}/.test(nextLineTrimmed)) {
        utr = nextLineTrimmed;
      }
    }

    // Same-line UPI Transaction ID
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
      const match12 = line.match(/(?:upi transaction id|upi transaction_id|transaction id|txn id|utr|rrn|upi ref(?:erence)?\s*(?:no|id)?|ref(?:erence)?\s*(?:no|id)?)\s*[:\-.]?\s*(\d{12})/i);
      if (match12) {
        utr = match12[1];
      }
      if (!utr) {
        const matchBroad = line.match(/(?:upi transaction id|upi transaction_id|transaction id|txn id|utr|rrn|upi ref(?:erence)?\s*(?:no|id)?|ref(?:erence)?\s*(?:no|id)?)\s*[:\-.]?\s*(\d{9,22})/i);
        if (matchBroad) {
          utr = matchBroad[1];
        }
      }
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

    // Backup Amount Extraction from text
    if (amountVal === null) {
      const creditMatch = line.match(/₹\s*([\d,.]+)\s*(?:credited|received|deposited)/i);
      if (creditMatch) {
        amountVal = parseNumber(creditMatch[1]);
      }
      const debitMatch = line.match(/₹\s*([\d,.]+)\s*(?:debited|sent|paid|deducted)/i);
      if (debitMatch) {
        amountVal = parseNumber(debitMatch[1]);
      }
    }
  }

  // Fallback UTR scans in entire screen dump if not found in structured parsing
  if (!utr && rawScreen) {
    const rrnRegex = /\b(\d{12})\b/g;
    let m;
    while ((m = rrnRegex.exec(rawScreen)) !== null) {
      if (m[1].startsWith('17') || m[1].startsWith('16') || m[1].startsWith('18') || m[1].startsWith('19') || m[1].startsWith('20')) {
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

  if (!utr && rawScreen) {
    const utrRegex = /\b(\d{9,22})\b/g;
    const matches = [];
    let m;
    while ((m = utrRegex.exec(rawScreen)) !== null) {
      if (m[1].length === 10 && /^(17|18|19|20)/.test(m[1])) continue;
      if (m[1].length <= 6) continue;
      matches.push(m[1]);
    }
    if (matches.length > 0) {
      utr = matches[0];
    }
  }

  // Fallback Google Transaction ID
  if (!google_txn_id && rawScreen) {
    const googleTxnRegex = /\b(CIC[A-Za-z0-9_-]{8,})\b/;
    const gMatch = googleTxnRegex.exec(rawScreen);
    if (gMatch) {
      google_txn_id = gMatch[1];
    }
  }

  // Fallback amount check
  if (amountVal === null && rawScreen) {
    const amountMatch = rawScreen.match(/₹\s*([\d,]+(?:\.\d{1,2})?)/);
    if (amountMatch) {
      amountVal = parseNumber(amountMatch[1]);
    }
  }

  // Direct fallbacks from top-level payload if not extracted from raw screen
  if (!utr && payload.utr) utr = String(payload.utr).trim();
  if (!utr && payload.upi_transaction_id) utr = String(payload.upi_transaction_id).trim();
  if (!google_txn_id && payload.google_txn_id) google_txn_id = String(payload.google_txn_id).trim();
  if (!google_txn_id && payload.google_transaction_id) google_txn_id = String(payload.google_transaction_id).trim();
  if (!sender_name && payload.sender_name) sender_name = String(payload.sender_name).trim();
  if (!sender_name && payload.customer) sender_name = String(payload.customer).trim();

  // Format amount back to visual string or use clean format
  const amountStr = amountVal !== null ? `₹${amountVal}` : (rawAmount || null);

  return {
    amount: amountStr,
    customer: sender_name || 'Anonymous Customer',
    time: payment_time || new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
    raw_screen: rawScreen || rawScreenRaw,
    upi_transaction_id: utr,
    google_transaction_id: google_txn_id,
    source: payload.source || 'gpay_business',
    timestamp: payload.timestamp || Math.floor(Date.now() / 1000).toString(),
  };
}

module.exports = {
  parsePayload
};

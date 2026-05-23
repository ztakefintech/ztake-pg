// lib/webhooks/claude-parser.ts
// Standalone module to parse webhook payloads using Claude AI.
// Fully independent of the ZiBot support chatbot.

export interface ClaudeParsedPayment {
  utr: string | null;
  google_txn_id: string | null;
  amount: number | null;
  paid_at: string | null; // ISO 8601 string
  payment_type: 'credit' | 'debit' | 'unknown';
  sender_name: string | null;
  payment_method: 'UPI' | 'Wallet' | 'Card' | 'Netbanking' | null;
  payment_app: string | null;
}

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

const CLAUDE_SYSTEM_PROMPT = `You are a precise financial data extraction assistant. Your task is to analyze raw webhook payloads (which may include notification text, SMS text, query params, headers, or raw screen dumps) and extract the transaction details.

You must return a valid JSON object matching this schema:
{
  "utr": string | null (UPI transaction ID, usually a 12-digit number, e.g. "652603702065", or IMPS/NEFT/RTGS transaction reference),
  "google_txn_id": string | null (Google Pay transaction ID, usually starts with "CIC", e.g. "CICAAB12345678"),
  "amount": number | null (the transaction amount as a float/number, e.g. 1500.00, do not include currency symbols or commas),
  "paid_at": string | null (ISO 8601 formatted datetime of the transaction in UTC, e.g., "2026-05-23T12:47:07.000Z". If date/time is present, resolve it carefully assuming Indian Standard Time (IST, UTC+05:30) if timezone is ambiguous, and output in ISO 8601 UTC format. For example, "23 May, 12:47 pm" in year 2026 becomes "2026-05-23T07:17:00.000Z"),
  "payment_type": "credit" | "debit" | "unknown" (must be "credit" if money was received/credited/deposited, "debit" if money was sent/paid/debited, or "unknown"),
  "sender_name": string | null (the name of the sender/payer/customer, e.g. "John Doe"),
  "payment_method": "UPI" | "Wallet" | "Card" | "Netbanking" | null (extract payment method, default to "UPI" for GPay/PhonePe/Paytm notifications if not specified),
  "payment_app": string | null (the payment app used, e.g., "Google Pay", "PhonePe", "Paytm", "BHIM", "Amazon Pay", "CRED", etc.)
}

Rules:
1. Return ONLY the raw JSON object. Do not wrap it in markdown code blocks or add any conversational text.
2. If a field cannot be found, set it to null (or "unknown" for payment_type).
3. Do not invent details. Only extract what is present or reasonably inferred.`;

/**
 * Parses any raw webhook payload object or string using Claude AI.
 */
export async function parsePayloadWithClaude(payload: any): Promise<ClaudeParsedPayment> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is not configured');
  }

  // Normalize/stringify the payload for Claude
  let payloadStr = '';
  if (typeof payload === 'string') {
    payloadStr = payload;
  } else if (payload && typeof payload === 'object') {
    // If it has raw_screen, make sure it is prominently displayed
    const rawScreen = payload.raw_screen || payload.rawScreen || '';
    payloadStr = `Structured Fields:\n${JSON.stringify(payload, null, 2)}\n\nRaw Screen Text:\n${rawScreen}`;
  } else {
    payloadStr = String(payload);
  }

  const prompt = `Please parse the following raw webhook payload and extract transaction details:
---
${payloadStr}
---

Remember, output ONLY the JSON object. No conversational text.`;

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1000,
        system: CLAUDE_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Claude API parsing request failed: ${response.status} ${errText}`);
    }

    const data = await response.json();
    let reply = data.content?.[0]?.text || '';
    
    // Clean response if Claude wraps it in markdown code blocks
    reply = reply.trim();
    if (reply.startsWith('```')) {
      const match = reply.match(/^(?:```(?:json)?\n?)([\s\S]*?)(?:\n?```)$/i);
      if (match) {
        reply = match[1].trim();
      }
    }

    const parsed: ClaudeParsedPayment = JSON.parse(reply);

    // Validate structure of parsed output
    return {
      utr: parsed.utr ? String(parsed.utr).trim() : null,
      google_txn_id: parsed.google_txn_id ? String(parsed.google_txn_id).trim() : null,
      amount: typeof parsed.amount === 'number' && !isNaN(parsed.amount) ? parsed.amount : null,
      paid_at: parsed.paid_at ? String(parsed.paid_at).trim() : null,
      payment_type: ['credit', 'debit'].includes(parsed.payment_type) ? parsed.payment_type : 'unknown',
      sender_name: parsed.sender_name ? String(parsed.sender_name).trim() : null,
      payment_method: ['UPI', 'Wallet', 'Card', 'Netbanking'].includes(parsed.payment_method as string) ? parsed.payment_method : null,
      payment_app: parsed.payment_app ? String(parsed.payment_app).trim() : null,
    };
  } catch (error) {
    console.error('[CLAUDE WEBHOOK PARSER] Error parsing payload:', error);
    throw error;
  }
}

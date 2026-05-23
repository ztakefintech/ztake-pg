// lib/zibot.ts
// ZiBot — Claude-powered payment support chatbot for vendor websites

import { db } from './database';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ZiBotConfig {
  system_prompt: string;
  bot_name: string;
  is_active: boolean;
}

export async function getVendorBotConfig(vendorId: number): Promise<ZiBotConfig> {
  const config = await db.get(
    'SELECT system_prompt, bot_name, is_active FROM zibot_configs WHERE vendor_id = $1',
    [vendorId]
  );
  if (!config) {
    return {
      system_prompt: 'You are a helpful payment support assistant. Answer questions about payment status, UTR numbers, and transaction queries. Be concise and helpful.',
      bot_name: 'ZiBot',
      is_active: true
    };
  }
  return config;
}

export async function getVendorContext(vendorId: number): Promise<string> {
  const vendor = await db.get(
    'SELECT business_name, upi_id FROM vendors WHERE id = $1',
    [vendorId]
  );
  if (!vendor) return '';
  return `\n\nVendor context: You are the support bot for ${vendor.business_name}. UPI ID: ${vendor.upi_id}. Only answer questions relevant to payments made to this business.`;
}

export async function sendMessage(
  vendorId: number,
  sessionId: string,
  userMessage: string,
  apiKey: string
): Promise<{ reply: string; sessionId: string }> {
  // Get or create session
  let session = await db.get(
    'SELECT id, messages FROM chat_sessions WHERE session_id = $1 AND vendor_id = $2',
    [sessionId, vendorId]
  );

  let messages: ChatMessage[] = session?.messages || [];

  // Add new user message
  messages.push({ role: 'user', content: userMessage });

  // Get vendor bot config
  const config = await getVendorBotConfig(vendorId);
  const vendorContext = await getVendorContext(vendorId);
  const fullSystemPrompt = config.system_prompt + vendorContext;

  // Keep last 20 messages to stay within context limits
  const recentMessages = messages.slice(-20);

  // Call Claude API
  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: fullSystemPrompt,
      messages: recentMessages
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Claude API error: ${response.status} ${err}`);
  }

  const data = await response.json();
  const reply = data.content?.[0]?.text || 'I could not generate a response. Please try again.';

  // Add assistant reply to history
  messages.push({ role: 'assistant', content: reply });

  // Upsert session
  if (!session) {
    const newId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await db.run(
      'INSERT INTO chat_sessions (session_id, vendor_id, messages) VALUES ($1, $2, $3)',
      [newId, vendorId, JSON.stringify(messages)]
    );
    return { reply, sessionId: newId };
  } else {
    await db.run(
      'UPDATE chat_sessions SET messages = $1, updated_at = CURRENT_TIMESTAMP WHERE session_id = $2',
      [JSON.stringify(messages), sessionId]
    );
    return { reply, sessionId };
  }
}

// controllers/webhook.js
const { parsePayload } = require('../utils/parser');
const queries = require('../queries/webhookQueries');
const socketManager = require('../socket/socketManager');
const pool = require('../config/db');

/**
 * Forward the webhook payload to the main Next.js /api/webhooks/bank endpoint.
 * This bridges the gap between the Express webhook-system and the Next.js admin dashboard.
 * Fire-and-forget — does not block the response to Tasker.
 */
async function forwardToNextJs(rawPayload, headers, method) {
  // Determine the Next.js app URL
  const appUrl = process.env.NEXT_PUBLIC_APP_URL 
    || process.env.NEXTAUTH_URL 
    || 'http://localhost:3000';
  
  const forwardUrl = `${appUrl}/api/webhooks/bank`;
  
  try {
    const response = await fetch(forwardUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-from': 'webhook-system',
        'x-original-method': method || 'POST',
      },
      body: JSON.stringify(rawPayload),
    });
    
    const status = response.status;
    const body = await response.text();
    console.log(`✅ [Forward] Forwarded to ${forwardUrl} — Status: ${status}`);
    socketManager.broadcastSystemLog(`Forwarded to Next.js endpoint: ${forwardUrl} — HTTP ${status}`, 'success');
    return { success: true, status, body };
  } catch (err) {
    console.error(`❌ [Forward] Failed to forward to ${forwardUrl}:`, err.message);
    socketManager.broadcastSystemLog(`Forward to Next.js FAILED: ${err.message}`, 'error');
    return { success: false, error: err.message };
  }
}

/**
 * Ingestion handler for incoming Tasker webhook posts.
 * Accepts ALL methods, ALL formats, ALL content types.
 * POST/GET/PUT/PATCH/DELETE /api/webhooks/payment
 */
async function receiveWebhook(req, res) {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const queryParams = req.query || {};

  // GET Diagnostic Health Check if no parameters are present
  if (method === 'GET' && Object.keys(queryParams).length === 0) {
    return res.status(200).json({
      status: 'ok',
      endpoint: '/api/webhooks/payment',
      method,
      accepts: 'ALL methods, ALL content types, ALL formats',
      description: 'Webhook receiver for GPay Business / Tasker notifications. Also forwards to main app.',
      timestamp: new Date().toISOString(),
    });
  }
  
  socketManager.broadcastSystemLog(`Incoming ${method} request received on /api/webhooks/payment`, 'info');

  const rawPayload = req.rawBody || '';
  const headers = req.headers;

  // 1. Process and parse payload
  let parsedData = null;
  let parseWarning = null;

  try {
    // If parsedBody has keys, use it. Otherwise, parse the raw text body.
    const bodyToParse = (req.parsedBody && Object.keys(req.parsedBody).length > 0) 
      ? req.parsedBody 
      : { raw_screen: rawPayload };
      
    parsedData = parsePayload(bodyToParse);
    
    // Add missing/fallback fields
    if (!parsedData.upi_transaction_id && !parsedData.google_transaction_id) {
      parseWarning = 'Warning: No transaction identifier (UTR or Google Txn ID) could be parsed from raw screen.';
      console.warn(`⚠️  [Webhook Parser] ${parseWarning}`);
      socketManager.broadcastSystemLog(parseWarning, 'warning');
    }
  } catch (parseErr) {
    // Treat parser crash as non-blocking
    console.error('❌ [Webhook Parser] Parsing failed completely:', parseErr.message);
    socketManager.broadcastSystemLog(`Parser error: ${parseErr.message}. Falling back to raw save.`, 'error');
    parsedData = {
      amount: 'Unknown',
      customer: 'Unknown Customer',
      time: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      raw_screen: rawPayload,
      upi_transaction_id: null,
      google_transaction_id: null,
      source: 'malformed_fallback',
      timestamp: Math.floor(Date.now() / 1000).toString()
    };
  }

  // 2. Save webhook event to Neon PostgreSQL (payment_webhooks table)
  socketManager.broadcastSystemLog(`Saving payload to Neon PostgreSQL database...`, 'info');
  const dbSaveResult = await queries.saveWebhook(parsedData, req.parsedBody || {}, headers, method);

  // 3. Forward to Next.js /api/webhooks/bank endpoint (fire-and-forget)
  // This ensures the event also appears in webhook_events table and triggers UTR matching
  const payloadToForward = req.parsedBody && Object.keys(req.parsedBody).length > 0 
    ? req.parsedBody 
    : { raw_screen: rawPayload, source: parsedData.source || 'tasker_forwarded' };
  
  forwardToNextJs(payloadToForward, headers, method).catch((err) => {
    console.error('❌ [Forward] Async forward error:', err.message);
  });

  // 4. Assemble socket event payload
  const dashboardEvent = {
    id: dbSaveResult.success ? dbSaveResult.data.id : Date.now(),
    received_at: dbSaveResult.success ? dbSaveResult.data.received_at : new Date().toISOString(),
    amount: parsedData.amount,
    customer: parsedData.customer,
    time: parsedData.time,
    raw_screen: parsedData.raw_screen,
    upi_transaction_id: parsedData.upi_transaction_id,
    google_transaction_id: parsedData.google_transaction_id,
    source: parsedData.source,
    timestamp: parsedData.timestamp,
    full_payload: req.parsedBody || { raw: rawPayload },
    request_headers: headers,
    request_method: dbSaveResult.success ? dbSaveResult.data.request_method : method,
    db_save_status: dbSaveResult.success ? 'Success' : `Failed (${dbSaveResult.error})`,
    parse_status: parseWarning ? 'Warning' : 'Success'
  };

  // 5. Instant Realtime emit to all connected dashboards
  socketManager.broadcastWebhook(dashboardEvent);
  socketManager.broadcastSystemLog(`Realtime broadcast emitted to dashboard for UTR: ${parsedData.upi_transaction_id || 'N/A'}`, 'success');

  // 6. Response to Webhook sender (Tasker) — ALWAYS 200
  if (dbSaveResult.success) {
    return res.status(200).json({
      status: 'success',
      message: 'Webhook processed, logged, and forwarded to main app successfully',
      id: dbSaveResult.data.id,
      utr: parsedData.upi_transaction_id
    });
  } else {
    // Do not return 500 so Tasker doesn't retry infinitely
    return res.status(200).json({
      status: 'warning',
      message: 'Webhook processed but database insertion failed. Forwarded to main app.',
      error: dbSaveResult.error,
      utr: parsedData.upi_transaction_id
    });
  }
}

/**
 * Diagnostic Health Check.
 * GET /api/webhooks/test
 */
async function testWebhook(req, res) {
  let dbStatus = 'connected';
  try {
    await pool.query('SELECT 1');
  } catch (err) {
    dbStatus = `disconnected (${err.message})`;
  }

  const socketConnections = socketManager.getConnectionsCount();

  res.status(200).json({
    status: 'online',
    webhook: 'working',
    database: dbStatus,
    socket: socketConnections > 0 ? 'active' : 'idle',
    active_socket_connections: socketConnections,
    timestamp: new Date().toISOString()
  });
}

/**
 * Fetch logs for Webhook Dashboard initialization.
 * GET /api/webhooks/logs
 */
async function getWebhookLogs(req, res) {
  const result = await queries.getWebhookLogs();
  if (result.success) {
    res.status(200).json(result.data);
  } else {
    res.status(500).json({ error: 'Failed to retrieve logs', details: result.error });
  }
}

/**
 * Clear all logged webhooks.
 * DELETE /api/webhooks/clear
 */
async function clearWebhookLogs(req, res) {
  const result = await queries.clearWebhookLogs();
  if (result.success) {
    socketManager.broadcastSystemLog('All webhook event logs cleared from database.', 'warning');
    res.status(200).json({ status: 'success', message: 'Logs cleared successfully' });
  } else {
    res.status(500).json({ error: 'Failed to clear logs', details: result.error });
  }
}

module.exports = {
  receiveWebhook,
  testWebhook,
  getWebhookLogs,
  clearWebhookLogs
};

// queries/webhookQueries.js
const pool = require('../config/db');

/**
 * Save webhook payload to Neon PostgreSQL with a retry-once logic in case of DB connection drops.
 */
async function saveWebhook(parsedData, rawPayload, headers, requestMethod = 'POST', attempt = 1) {
  const queryText = `
    INSERT INTO payment_webhooks (
      amount,
      customer,
      time,
      raw_screen,
      upi_transaction_id,
      google_transaction_id,
      source,
      timestamp,
      full_payload,
      request_headers,
      request_method
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *;
  `;

  const values = [
    parsedData.amount,
    parsedData.customer,
    parsedData.time,
    parsedData.raw_screen,
    parsedData.upi_transaction_id,
    parsedData.google_transaction_id,
    parsedData.source,
    parsedData.timestamp,
    JSON.stringify(rawPayload),
    JSON.stringify(headers),
    requestMethod
  ];

  try {
    const res = await pool.query(queryText, values);
    console.log(`💾 Database Save Result: Success (Row ID: ${res.rows[0].id})`);
    return { success: true, data: res.rows[0] };
  } catch (err) {
    console.error(`❌ DB Save Error (Attempt ${attempt}/2):`, err.message);
    
    if (attempt < 2) {
      console.log('🔄 Retrying database save in 500ms...');
      await new Promise((resolve) => setTimeout(resolve, 500));
      return saveWebhook(parsedData, rawPayload, headers, requestMethod, attempt + 1);
    }
    
    // Do not throw to prevent server crash, return status
    return { success: false, error: err.message };
  }
}

/**
 * Fetch latest 100 webhook logs.
 */
async function getWebhookLogs() {
  const queryText = 'SELECT * FROM payment_webhooks ORDER BY received_at DESC LIMIT 100;';
  try {
    const res = await pool.query(queryText);
    return { success: true, data: res.rows };
  } catch (err) {
    console.error('❌ Failed to fetch webhook logs from database:', err.message);
    return { success: false, error: err.message, data: [] };
  }
}

/**
 * Delete all webhook logs.
 */
async function clearWebhookLogs() {
  const queryText = 'DELETE FROM payment_webhooks;';
  try {
    await pool.query(queryText);
    console.log('🗑️ Webhook logs cleared from database.');
    return { success: true };
  } catch (err) {
    console.error('❌ Failed to clear webhook logs from database:', err.message);
    return { success: false, error: err.message };
  }
}

module.exports = {
  saveWebhook,
  getWebhookLogs,
  clearWebhookLogs
};

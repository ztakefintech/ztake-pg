require('dotenv').config();
const { Pool } = require('pg');

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const client = await pool.connect();
    
    console.log("Checking columns of webhook_events table...");
    const colsRes = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'webhook_events'
    `);
    console.log("webhook_events columns:", colsRes.rows.map(r => `${r.column_name} (${r.data_type})`).join(', '));

    console.log("\nChecking counts...");
    const counts = await client.query("SELECT COUNT(*) as total FROM webhook_events");
    console.log("Total webhook events:", counts.rows[0].total);

    const recent = await client.query("SELECT id, received_at, source, utr, amount, signature_valid, matched_txn_id, processed, note FROM webhook_events ORDER BY id DESC LIMIT 5");
    console.log("Recent 5 webhook events:", JSON.stringify(recent.rows, null, 2));

    const ordersCount = await client.query("SELECT COUNT(*) as total FROM orders");
    console.log("Total orders in database:", ordersCount.rows[0].total);

    const recentOrders = await client.query("SELECT id, ztake_order_id, amount, status, utr, webhook_verified FROM orders ORDER BY id DESC LIMIT 5");
    console.log("Recent 5 orders:", JSON.stringify(recentOrders.rows, null, 2));

    client.release();
  } catch (error) {
    console.error("Database query failed:", error);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

main();

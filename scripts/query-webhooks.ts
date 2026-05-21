import { db } from '../lib/database';

async function main() {
  try {
    console.log("Fetching counts...");
    const counts = await db.get("SELECT COUNT(*) as total FROM webhook_events");
    console.log("Total webhook events in database:", counts?.total);

    const recent = await db.all("SELECT id, received_at, source, utr, amount, signature_valid, matched_txn_id, processed, note FROM webhook_events ORDER BY id DESC LIMIT 5");
    console.log("Recent 5 webhook events:", JSON.stringify(recent, null, 2));

    const ordersCount = await db.get("SELECT COUNT(*) as total FROM orders");
    console.log("Total orders in database:", ordersCount?.total);

    const recentOrders = await db.all("SELECT ztake_order_id, amount, status, utr, webhook_verified FROM orders ORDER BY id DESC LIMIT 5");
    console.log("Recent 5 orders:", JSON.stringify(recentOrders, null, 2));

  } catch (error) {
    console.error("Database query failed:", error);
  } finally {
    process.exit(0);
  }
}

main();

import { db } from './lib/database';

async function checkEvents() {
  try {
    const res = await db.all(`
      SELECT * 
      FROM webhook_events 
      ORDER BY received_at DESC 
      LIMIT 5
    `);
    console.log("Recent Webhooks:", JSON.stringify(res, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
checkEvents();

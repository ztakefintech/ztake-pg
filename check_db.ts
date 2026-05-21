import { db } from './lib/database';

async function check() {
  try {
    const res = await db.all(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'webhook_events'
    `);
    console.log("Columns:", res.map((r: any) => r.column_name));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
check();

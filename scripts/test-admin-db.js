require('dotenv').config({ path: '.env' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL });
async function test() {
  const result = await pool.query('SELECT id, source, utr, raw_payload FROM webhook_events ORDER BY id DESC LIMIT 5');
  console.log(JSON.stringify(result.rows, null, 2));
  process.exit(0);
}
test();

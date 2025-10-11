import { Pool, PoolClient } from 'pg';

class Database {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      }
    });
    this.init();
  }

  private async init() {
    try {
      const client = await this.pool.connect();
      
      // Create vendors table
      await client.query(`
        CREATE TABLE IF NOT EXISTS vendors (
          id SERIAL PRIMARY KEY,
          vendor_code VARCHAR(6) UNIQUE NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          business_name VARCHAR(255) NOT NULL,
          contact_name VARCHAR(255) NOT NULL,
          phone VARCHAR(20),
          upi_id VARCHAR(255) NOT NULL,
          cashfree_app_id VARCHAR(255),
          cashfree_secret_key VARCHAR(255),
          cashfree_payout_client_id VARCHAR(255),
          cashfree_payout_client_secret VARCHAR(255),
          cashfree_env VARCHAR(16),
          bank_name VARCHAR(255),
          bank_account_number VARCHAR(64),
          bank_account_holder VARCHAR(255),
          bank_ifsc VARCHAR(20),
          bot_token VARCHAR(255),
          chat_id VARCHAR(64),
          is_approved BOOLEAN DEFAULT FALSE,
          google_id VARCHAR(255) UNIQUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create payments table
      await client.query(`
        CREATE TABLE IF NOT EXISTS payments (
          id SERIAL PRIMARY KEY,
          order_id VARCHAR(255) UNIQUE,
          utr VARCHAR(255) UNIQUE NOT NULL,
          amount DECIMAL(10,2) NOT NULL,
          vendor_id INTEGER NOT NULL,
          status VARCHAR(50) DEFAULT 'pending',
          payment_status VARCHAR(20) DEFAULT 'Pending' CHECK (payment_status IN ('Pending', 'Succeeded', 'Failed')),
          checked_status BOOLEAN DEFAULT FALSE,
          checked_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (vendor_id) REFERENCES vendors (id)
        )
      `);

      // Create orders table
      await client.query(`
        CREATE TABLE IF NOT EXISTS orders (
          id SERIAL PRIMARY KEY,
          ztake_order_id VARCHAR(64),
          merchant_order_id VARCHAR(255),
          amount DECIMAL(12,2),
          currency VARCHAR(10),
          customer_name VARCHAR(255),
          return_url TEXT,
          callback_url TEXT,
          vendor_id INTEGER,
          status VARCHAR(20) DEFAULT 'PENDING',
          utr VARCHAR(64),
          payment_time TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Add vendor_code to vendors table if not exists
      await client.query(`
        ALTER TABLE vendors 
        ADD COLUMN IF NOT EXISTS vendor_code VARCHAR(6)
      `);
      
      // Add approval status and Google ID columns if not exists
      await client.query(`
        ALTER TABLE vendors 
        ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE
      `);
      
      await client.query(`
        ALTER TABLE vendors 
        ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE
      `);
      
      // Generate vendor codes for existing vendors that don't have them
      await client.query(`
        DO $$
        DECLARE
          vendor_record RECORD;
          new_code VARCHAR(6);
          code_exists BOOLEAN;
        BEGIN
          FOR vendor_record IN 
            SELECT id FROM vendors WHERE vendor_code IS NULL OR vendor_code = ''
          LOOP
            LOOP
              -- Generate a random vendor code (2 letters + 4 numbers)
              new_code := chr(65 + floor(random() * 26)::int) || 
                         chr(65 + floor(random() * 26)::int) ||
                         floor(random() * 10)::text ||
                         floor(random() * 10)::text ||
                         floor(random() * 10)::text ||
                         floor(random() * 10)::text;
              
              -- Check if code already exists
              SELECT EXISTS(SELECT 1 FROM vendors WHERE vendor_code = new_code) INTO code_exists;
              
              -- Exit loop if code is unique
              EXIT WHEN NOT code_exists;
            END LOOP;
            
            -- Update vendor with new code
            UPDATE vendors SET vendor_code = new_code WHERE id = vendor_record.id;
          END LOOP;
        END $$;
      `);
      
      // Add vendor_id to orders if not exists and add FK
      await client.query(`
        ALTER TABLE orders 
        ADD COLUMN IF NOT EXISTS vendor_id INTEGER
      `);
      // Ensure vendor_id is nullable to allow public order creation without vendor
      await client.query(`
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name='orders' AND column_name='vendor_id' AND is_nullable='NO'
          ) THEN
            ALTER TABLE orders ALTER COLUMN vendor_id DROP NOT NULL;
          END IF;
        END $$;
      `);
      // Ensure required columns exist for orders table (for existing DBs)
      await client.query(`
        ALTER TABLE orders 
        ADD COLUMN IF NOT EXISTS ztake_order_id VARCHAR(64),
        ADD COLUMN IF NOT EXISTS order_code VARCHAR(64),
        ADD COLUMN IF NOT EXISTS merchant_order_id VARCHAR(255),
        ADD COLUMN IF NOT EXISTS amount DECIMAL(12,2),
        ADD COLUMN IF NOT EXISTS currency VARCHAR(10),
        ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255),
        ADD COLUMN IF NOT EXISTS return_url TEXT,
        ADD COLUMN IF NOT EXISTS callback_url TEXT,
        ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'PENDING',
        ADD COLUMN IF NOT EXISTS utr VARCHAR(64),
        ADD COLUMN IF NOT EXISTS payment_time TIMESTAMP
      `);
      // Create unique index for ztake_order_id
      await client.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS orders_ztake_order_id_key ON orders(ztake_order_id)
      `);

      // Normalize orders.status CHECK constraint to allowed values and make it permissive for our flow
      await client.query(`
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE table_name = 'orders' AND constraint_name = 'orders_status_check'
          ) THEN
            ALTER TABLE orders DROP CONSTRAINT orders_status_check;
          END IF;
        END $$;
      `);
      await client.query(`
        ALTER TABLE orders 
        ADD CONSTRAINT orders_status_check 
        CHECK (status IS NULL OR status IN ('order_created','Pending','Succeeded','Failed'))
      `);

      // Orders checked_status boolean flag (initially false)
      await client.query(`
        ALTER TABLE orders 
        ADD COLUMN IF NOT EXISTS checked_status BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS checked_at TIMESTAMP
      `);
      await client.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'orders_vendor_id_fkey'
          ) THEN
            ALTER TABLE orders
            ADD CONSTRAINT orders_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES vendors(id);
          END IF;
        END $$;
      `);

      // Create API keys table for bot authentication
      await client.query(`
        CREATE TABLE IF NOT EXISTS api_keys (
          id SERIAL PRIMARY KEY,
          key_name VARCHAR(255) NOT NULL,
          key_hash VARCHAR(255) UNIQUE NOT NULL,
          vendor_id INTEGER,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Ensure api_keys.vendor_id exists and has FK
      await client.query(`
        ALTER TABLE api_keys 
        ADD COLUMN IF NOT EXISTS vendor_id INTEGER
      `);
      await client.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'api_keys_vendor_id_fkey'
          ) THEN
            ALTER TABLE api_keys
            ADD CONSTRAINT api_keys_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES vendors(id);
          END IF;
        END $$;
      `);

      // Add checked_status and checked_at columns to existing payments table if they don't exist
      await client.query(`
        ALTER TABLE payments 
        ADD COLUMN IF NOT EXISTS checked_status BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS checked_at TIMESTAMP
      `);

      // Add order_id column and unique index to existing payments table if they don't exist
      await client.query(`
        ALTER TABLE payments 
        ADD COLUMN IF NOT EXISTS order_id VARCHAR(255)
      `);
      await client.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS payments_order_id_key ON payments(order_id)
      `);

      // Add bot_token column to existing vendors table if it doesn't exist
      await client.query(`
        ALTER TABLE vendors 
        ADD COLUMN IF NOT EXISTS bot_token VARCHAR(255)
      `);

      // Add chat_id column to existing vendors table if it doesn't exist
      await client.query(`
        ALTER TABLE vendors 
        ADD COLUMN IF NOT EXISTS chat_id VARCHAR(64)
      `);

      // Add bank detail columns to existing vendors table if they don't exist
      await client.query(`
        ALTER TABLE vendors 
        ADD COLUMN IF NOT EXISTS bank_name VARCHAR(255),
        ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(64),
        ADD COLUMN IF NOT EXISTS bank_account_holder VARCHAR(255),
        ADD COLUMN IF NOT EXISTS bank_ifsc VARCHAR(20)
      `);

      // Add Cashfree credential columns to vendors if they don't exist
      await client.query(`
        ALTER TABLE vendors 
        ADD COLUMN IF NOT EXISTS cashfree_app_id VARCHAR(255),
        ADD COLUMN IF NOT EXISTS cashfree_secret_key VARCHAR(255),
        ADD COLUMN IF NOT EXISTS cashfree_payout_client_id VARCHAR(255),
        ADD COLUMN IF NOT EXISTS cashfree_payout_client_secret VARCHAR(255),
        ADD COLUMN IF NOT EXISTS cashfree_env VARCHAR(16)
      `);

      // Create payouts table
      await client.query(`
        CREATE TABLE IF NOT EXISTS payouts (
          id SERIAL PRIMARY KEY,
          vendor_id INTEGER NOT NULL,
          amount DECIMAL(12,2) NOT NULL,
          currency VARCHAR(10) DEFAULT 'INR',
          beneficiary_name VARCHAR(255),
          beneficiary_account VARCHAR(64),
          beneficiary_ifsc VARCHAR(20),
          beneficiary_upi VARCHAR(255),
          reference_id VARCHAR(64),
          remarks VARCHAR(255),
          status VARCHAR(32) DEFAULT 'created',
          cashfree_payout_id VARCHAR(64),
          held_amount DECIMAL(12,2),
          raw_request JSONB,
          raw_response JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (vendor_id) REFERENCES vendors (id)
        )
      `);
      await client.query(`
        ALTER TABLE payouts 
        ADD COLUMN IF NOT EXISTS held_amount DECIMAL(12,2)
      `);

      // Add payout balance to vendors
      await client.query(`
        ALTER TABLE vendors 
        ADD COLUMN IF NOT EXISTS payout_balance DECIMAL(12,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS payout_recharge_bank_name VARCHAR(255),
        ADD COLUMN IF NOT EXISTS payout_recharge_account_number VARCHAR(64),
        ADD COLUMN IF NOT EXISTS payout_recharge_account_holder VARCHAR(255),
        ADD COLUMN IF NOT EXISTS payout_recharge_ifsc VARCHAR(20)
      `);

      // Create payout_recharges table to track admin-approved recharges
      await client.query(`
        CREATE TABLE IF NOT EXISTS payout_recharges (
          id SERIAL PRIMARY KEY,
          vendor_id INTEGER NOT NULL,
          amount DECIMAL(12,2) NOT NULL,
          utr VARCHAR(64),
          status VARCHAR(20) DEFAULT 'created' CHECK (status IN ('created','approved','rejected','paid')),
          admin_notes VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (vendor_id) REFERENCES vendors (id)
        )
      `);

      // Ensure utr column exists on existing payout_recharges
      await client.query(`
        ALTER TABLE payout_recharges 
        ADD COLUMN IF NOT EXISTS utr VARCHAR(64)
      `);

      // Create settlements table
      await client.query(`
        CREATE TABLE IF NOT EXISTS settlements (
          id SERIAL PRIMARY KEY,
          vendor_id INTEGER NOT NULL,
          amount DECIMAL(12,2) NOT NULL,
          status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
          admin_notes VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (vendor_id) REFERENCES vendors (id)
        )
      `);

      // Create admin_users table for admin role management
      await client.query(`
        CREATE TABLE IF NOT EXISTS admin_users (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          name VARCHAR(255) NOT NULL,
          role VARCHAR(50) DEFAULT 'custom' CHECK (role IN ('superuser', 'view_only', 'manage_users', 'manage_payin', 'manage_payout', 'manage_settlements', 'custom')),
          permissions JSONB DEFAULT '{}',
          is_active BOOLEAN DEFAULT true,
          created_by INTEGER,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (created_by) REFERENCES admin_users (id)
        )
      `);

      // Create admin_sessions table for admin authentication
      await client.query(`
        CREATE TABLE IF NOT EXISTS admin_sessions (
          id SERIAL PRIMARY KEY,
          admin_id INTEGER NOT NULL,
          token_hash VARCHAR(255) UNIQUE NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (admin_id) REFERENCES admin_users (id) ON DELETE CASCADE
        )
      `);

      // Create admin_vendor_assignments table for vendor assignments
      await client.query(`
        CREATE TABLE IF NOT EXISTS admin_vendor_assignments (
          id SERIAL PRIMARY KEY,
          admin_id INTEGER NOT NULL,
          vendor_id INTEGER NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (admin_id) REFERENCES admin_users (id) ON DELETE CASCADE,
          FOREIGN KEY (vendor_id) REFERENCES vendors (id) ON DELETE CASCADE,
          UNIQUE(admin_id, vendor_id)
        )
      `);

      client.release();
    } catch (error) {
      console.error('Error initializing database:', error);
    }
  }

  // Helper method to convert SQLite ? placeholders to PostgreSQL $1, $2, etc.
  private convertQuery(sql: string, params: any[]): { sql: string; params: any[] } {
    let paramIndex = 1;
    const convertedSql = sql.replace(/\?/g, () => `$${paramIndex++}`);
    return { sql: convertedSql, params };
  }

  // Promisified methods
  async run(sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> {
    const client = await this.pool.connect();
    try {
      let { sql: convertedSql, params: convertedParams } = this.convertQuery(sql, params);

      const isInsert = sql.trim().toUpperCase().startsWith('INSERT');
      const hasReturning = /\bRETURNING\b/i.test(convertedSql);

      if (isInsert && !hasReturning) {
        // Assume primary key column is named 'id' across our tables
        convertedSql = `${convertedSql} RETURNING id`;
      }

      const result = await client.query(convertedSql, convertedParams);

      let lastID = 0;
      if (isInsert) {
        lastID = result.rows?.[0]?.id ?? 0;
      }

      return {
        lastID,
        changes: result.rowCount || 0
      };
    } finally {
      client.release();
    }
  }

  async get(sql: string, params: any[] = []): Promise<any> {
    const client = await this.pool.connect();
    try {
      const { sql: convertedSql, params: convertedParams } = this.convertQuery(sql, params);
      const result = await client.query(convertedSql, convertedParams);
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  async all(sql: string, params: any[] = []): Promise<any[]> {
    const client = await this.pool.connect();
    try {
      const { sql: convertedSql, params: convertedParams } = this.convertQuery(sql, params);
      const result = await client.query(convertedSql, convertedParams);
      return result.rows;
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

export const db = new Database();

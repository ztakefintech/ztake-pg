import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db } from './database';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const API_KEY_SECRET = process.env.API_KEY_SECRET || 'your-api-secret-change-in-production';
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'admin-secret-key-change-in-production';

export interface VendorPayload {
  id: number;
  email: string;
  business_name: string;
}

export interface ApiKeyPayload {
  keyId: number;
  keyName: string;
}

export interface AdminPayload {
  username: string;
  role: 'admin';
}

export class AuthService {
  // Vendor authentication
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  static generateVendorToken(payload: VendorPayload): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
  }

  static verifyVendorToken(token: string): VendorPayload | null {
    try {
      return jwt.verify(token, JWT_SECRET) as VendorPayload;
    } catch {
      return null;
    }
  }

  // API Key authentication for bots
  static async hashApiKey(apiKey: string): Promise<string> {
    return bcrypt.hash(apiKey, 12);
  }

  static async verifyApiKey(apiKey: string, hash: string): Promise<boolean> {
    return bcrypt.compare(apiKey, hash);
  }

  static generateApiKeyToken(payload: ApiKeyPayload): string {
    return jwt.sign(payload, API_KEY_SECRET, { expiresIn: '30d' });
  }

  static verifyApiKeyToken(token: string): ApiKeyPayload | null {
    try {
      return jwt.verify(token, API_KEY_SECRET) as ApiKeyPayload;
    } catch {
      return null;
    }
  }

  // Generate a new API key
  static generateApiKey(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = 'pk_';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // Create API key in database
  static async createApiKey(keyName: string, vendorId?: number): Promise<{ apiKey: string; keyId: number }> {
    const apiKey = this.generateApiKey();
    const keyHash = await this.hashApiKey(apiKey);
    
    const result = await db.run(
      'INSERT INTO api_keys (key_name, key_hash, vendor_id) VALUES (?, ?, ?)',
      [keyName, keyHash, vendorId || null]
    );

    return { apiKey, keyId: result.lastID };
  }

  // Verify API key from database
  static async verifyApiKeyFromDb(apiKey: string): Promise<{ keyId: number; keyName: string; vendorId: number | null } | null> {
    const keys = await db.all('SELECT id, key_name, key_hash, vendor_id FROM api_keys WHERE is_active = true');
    
    for (const key of keys) {
      if (await this.verifyApiKey(apiKey, key.key_hash)) {
        return { keyId: key.id, keyName: key.key_name, vendorId: key.vendor_id ?? null };
      }
    }
    
    return null;
  }

  // Admin authentication
  static generateAdminToken(payload: AdminPayload): string {
    return jwt.sign(payload, ADMIN_SECRET, { expiresIn: '24h' });
  }

  static verifyAdminToken(token: string): AdminPayload | null {
    try {
      return jwt.verify(token, ADMIN_SECRET) as AdminPayload;
    } catch {
      return null;
    }
  }

  static async verifyAdminCredentials(username: string, password: string): Promise<boolean> {
    const adminUsername = process.env.ADMIN_USERNAME;
    const adminPassword = process.env.ADMIN_PASSWORD;
    
    if (!adminUsername || !adminPassword) {
      return false;
    }
    
    return username === adminUsername && password === adminPassword;
  }
}

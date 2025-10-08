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
  id: number;
  email: string;
  name: string;
  role: string;
  permissions: Record<string, boolean>;
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

  // Create admin user
  static async createAdminUser(email: string, password: string, name: string, role: string, createdBy?: number): Promise<number> {
    const passwordHash = await this.hashPassword(password);
    const permissions = this.getDefaultPermissions(role);
    
    const result = await db.run(
      'INSERT INTO admin_users (email, password_hash, name, role, permissions, created_by) VALUES (?, ?, ?, ?, ?, ?)',
      [email, passwordHash, name, role, JSON.stringify(permissions), createdBy || null]
    );
    
    return result.lastID;
  }

  // Get admin user by email
  static async getAdminUserByEmail(email: string): Promise<any> {
    return await db.get(
      'SELECT * FROM admin_users WHERE email = ? AND is_active = true',
      [email]
    );
  }

  // Get admin user by ID
  static async getAdminUserById(id: number): Promise<any> {
    return await db.get(
      'SELECT * FROM admin_users WHERE id = ? AND is_active = true',
      [id]
    );
  }

  // Verify admin credentials
  static async verifyAdminCredentials(email: string, password: string): Promise<AdminPayload | null> {
    const admin = await this.getAdminUserByEmail(email);
    
    if (!admin) {
      return null;
    }
    
    const isValid = await this.verifyPassword(password, admin.password_hash);
    
    if (!isValid) {
      return null;
    }
    
    return {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
      permissions: admin.permissions || {}
    };
  }

  // Get all admin users
  static async getAllAdminUsers(): Promise<any[]> {
    return await db.all(
      'SELECT id, email, name, role, permissions, is_active, created_at, created_by FROM admin_users ORDER BY created_at DESC'
    );
  }

  // Update admin user
  static async updateAdminUser(id: number, updates: Partial<{
    name: string;
    role: string;
    permissions: Record<string, boolean>;
    is_active: boolean;
  }>): Promise<void> {
    const fields = [];
    const values = [];
    
    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    
    if (updates.role !== undefined) {
      fields.push('role = ?');
      values.push(updates.role);
      // Update permissions based on role
      const permissions = this.getDefaultPermissions(updates.role);
      fields.push('permissions = ?');
      values.push(JSON.stringify(permissions));
    }
    
    if (updates.permissions !== undefined) {
      fields.push('permissions = ?');
      values.push(JSON.stringify(updates.permissions));
    }
    
    if (updates.is_active !== undefined) {
      fields.push('is_active = ?');
      values.push(updates.is_active);
    }
    
    if (fields.length === 0) {
      return;
    }
    
    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);
    
    await db.run(
      `UPDATE admin_users SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  }

  // Delete admin user
  static async deleteAdminUser(id: number): Promise<void> {
    await db.run('DELETE FROM admin_users WHERE id = ?', [id]);
  }

  // Get default permissions for a role
  static getDefaultPermissions(role: string): Record<string, boolean> {
    const permissions: Record<string, boolean> = {
      view_overview: false,
      view_users: false,
      view_payments: false,
      view_payouts: false,
      view_settlements: false,
      manage_users: false,
      manage_payin: false,
      manage_payout: false,
      manage_settlements: false,
      manage_admins: false
    };

    switch (role) {
      case 'superuser':
        Object.keys(permissions).forEach(key => permissions[key] = true);
        break;
      case 'view_only':
        permissions.view_overview = true;
        permissions.view_users = true;
        permissions.view_payments = true;
        permissions.view_payouts = true;
        permissions.view_settlements = true;
        break;
      case 'manage_users':
        permissions.view_overview = true;
        permissions.view_users = true;
        permissions.manage_users = true;
        break;
      case 'manage_payin':
        permissions.view_overview = true;
        permissions.view_payments = true;
        permissions.manage_payin = true;
        break;
      case 'manage_payout':
        permissions.view_overview = true;
        permissions.view_payouts = true;
        permissions.manage_payout = true;
        break;
      case 'manage_settlements':
        permissions.view_overview = true;
        permissions.view_settlements = true;
        permissions.manage_settlements = true;
        break;
      case 'custom':
        // Custom role starts with no permissions - admin can set them manually
        break;
    }

    return permissions;
  }

  // Get all available permissions
  static getAllPermissions(): Record<string, { name: string; description: string; category: string }> {
    return {
      view_overview: {
        name: 'View Overview',
        description: 'Access to the main dashboard and statistics',
        category: 'View'
      },
      view_users: {
        name: 'View Users',
        description: 'View user data and information',
        category: 'View'
      },
      view_payments: {
        name: 'View Payments',
        description: 'View payment transactions and data',
        category: 'View'
      },
      view_payouts: {
        name: 'View Payouts',
        description: 'View payout requests and data',
        category: 'View'
      },
      view_settlements: {
        name: 'View Settlements',
        description: 'View settlement requests and data',
        category: 'View'
      },
      manage_users: {
        name: 'Manage Users',
        description: 'Create, update, and delete user accounts',
        category: 'Manage'
      },
      manage_payin: {
        name: 'Manage Payin',
        description: 'Manage payment processing and UTR submissions',
        category: 'Manage'
      },
      manage_payout: {
        name: 'Manage Payout',
        description: 'Approve, reject, and manage payout requests',
        category: 'Manage'
      },
      manage_settlements: {
        name: 'Manage Settlements',
        description: 'Approve, reject, and manage settlement requests',
        category: 'Manage'
      },
      manage_admins: {
        name: 'Manage Admins',
        description: 'Create, update, and delete admin users',
        category: 'Manage'
      }
    };
  }

  // Check if admin has permission
  static hasPermission(admin: AdminPayload, permission: string): boolean {
    if (admin.role === 'superuser') {
      return true;
    }
    
    return admin.permissions[permission] === true;
  }

  // Legacy admin credentials (for backward compatibility)
  static async verifyLegacyAdminCredentials(username: string, password: string): Promise<boolean> {
    const adminUsername = process.env.ADMIN_USERNAME;
    const adminPassword = process.env.ADMIN_PASSWORD;
    
    if (!adminUsername || !adminPassword) {
      return false;
    }
    
    return username === adminUsername && password === adminPassword;
  }
}

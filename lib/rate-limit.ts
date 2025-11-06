import { NextRequest } from 'next/server';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
    blockedUntil?: number;
    violations: number;
  };
}

const store: RateLimitStore = {};

// Utility functions for manual IP management
export function unblockIP(ip: string): boolean {
  if (store[ip]) {
    delete store[ip].blockedUntil;
    store[ip].violations = 0; // Reset violations count
    return true;
  }
  return false;
}

export function resetIP(ip: string): boolean {
  if (store[ip]) {
    delete store[ip];
    return true;
  }
  return false;
}

export function getBlockedIPs(): Array<{ ip: string; blockedUntil: number; violations: number; resetTime: number }> {
  const now = Date.now();
  const blocked: Array<{ ip: string; blockedUntil: number; violations: number; resetTime: number }> = [];
  
  Object.keys(store).forEach(ip => {
    if (store[ip].blockedUntil && store[ip].blockedUntil > now) {
      blocked.push({
        ip,
        blockedUntil: store[ip].blockedUntil!,
        violations: store[ip].violations,
        resetTime: store[ip].resetTime
      });
    }
  });
  
  return blocked.sort((a, b) => a.blockedUntil - b.blockedUntil);
}

export function getAllIPs(): Array<{ ip: string; count: number; violations: number; resetTime: number; blockedUntil?: number }> {
  const now = Date.now();
  const ips: Array<{ ip: string; count: number; violations: number; resetTime: number; blockedUntil?: number }> = [];
  
  Object.keys(store).forEach(ip => {
    ips.push({
      ip,
      count: store[ip].count,
      violations: store[ip].violations,
      resetTime: store[ip].resetTime,
      blockedUntil: store[ip].blockedUntil && store[ip].blockedUntil > now ? store[ip].blockedUntil : undefined
    });
  });
  
  return ips.sort((a, b) => (b.violations || 0) - (a.violations || 0));
}

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
  blockDurationMs?: number; // How long to block after violations
  maxViolations?: number; // Max violations before blocking
}

export function rateLimit(options: RateLimitOptions) {
  const { 
    windowMs, 
    max, 
    message = 'Too many requests',
    blockDurationMs = 5 * 60 * 1000, // 5 minutes default block
    maxViolations = 3 // 3 violations before blocking
  } = options;

  return (req: NextRequest): { success: boolean; message?: string; resetTime?: number; blockedUntil?: number } => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean up expired entries
    Object.keys(store).forEach(k => {
      if (store[k].resetTime < now && (!store[k].blockedUntil || store[k].blockedUntil < now)) {
        delete store[k];
      }
    });

    // Check if IP is currently blocked
    if (store[key]?.blockedUntil && store[key].blockedUntil > now) {
      return {
        success: false,
        message: 'IP temporarily blocked due to repeated violations',
        blockedUntil: store[key].blockedUntil
      };
    }

    // Get or create entry for this IP
    if (!store[key]) {
      store[key] = {
        count: 1,
        resetTime: now + windowMs,
        violations: 0
      };
      return { success: true };
    }

    // Check if window has expired
    if (store[key].resetTime < now) {
      store[key] = {
        count: 1,
        resetTime: now + windowMs,
        violations: store[key].violations // Keep violation count
      };
      return { success: true };
    }

    // Check if limit exceeded
    if (store[key].count >= max) {
      store[key].violations++;
      
      // Block IP if too many violations
      if (store[key].violations >= maxViolations) {
        store[key].blockedUntil = now + blockDurationMs;
        return {
          success: false,
          message: 'IP blocked due to repeated rate limit violations',
          blockedUntil: store[key].blockedUntil
        };
      }
      
      return {
        success: false,
        message: `${message}. Violations: ${store[key].violations}/${maxViolations}`,
        resetTime: store[key].resetTime
      };
    }

    // Increment count
    store[key].count++;
    return { success: true };
  };
}

// Predefined rate limiters with enhanced security - Optimized for gaming platform with high traffic
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 attempts per window (increased from 5 for gaming platform)
  message: 'Too many authentication attempts',
  blockDurationMs: 30 * 60 * 1000, // 30 minutes block
  maxViolations: 3 // Block after 3 violations (increased from 2)
});

export const apiRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 1000, // 1000 requests per minute (increased from 100 for gaming platform)
  message: 'Too many API requests',
  blockDurationMs: 10 * 60 * 1000, // 10 minutes block
  maxViolations: 5 // Block after 5 violations
});

export const paymentUpdateRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 payment updates per minute (increased from 10 for gaming platform)
  message: 'Too many payment update requests',
  blockDurationMs: 15 * 60 * 1000, // 15 minutes block
  maxViolations: 5 // Block after 5 violations (increased from 3)
});

export const orderCreationRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 200, // 200 orders per minute (increased from 20 for gaming platform)
  message: 'Too many order creation requests',
  blockDurationMs: 10 * 60 * 1000, // 10 minutes block
  maxViolations: 5 // Block after 5 violations (increased from 3)
});

export const payoutCreationRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 payouts per minute (increased from 30 for gaming platform)
  message: 'Too many payout creation requests',
  blockDurationMs: 20 * 60 * 1000, // 20 minutes block
  maxViolations: 3 // Block after 3 violations (increased from 2)
});

export const adminActionRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 200, // 200 admin actions per minute (increased from 30 for gaming platform)
  message: 'Too many admin action requests',
  blockDurationMs: 15 * 60 * 1000, // 15 minutes block
  maxViolations: 5 // Block after 5 violations (increased from 3)
});

export const sensitiveOperationRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // 10 sensitive operations per 5 minutes (increased from 3 for gaming platform)
  message: 'Too many sensitive operation requests',
  blockDurationMs: 30 * 60 * 1000, // 30 minutes block
  maxViolations: 3 // Block after 3 violations (increased from 2)
});

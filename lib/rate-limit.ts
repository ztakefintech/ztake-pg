import { NextRequest } from 'next/server';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
}

export function rateLimit(options: RateLimitOptions) {
  const { windowMs, max, message = 'Too many requests' } = options;

  return (req: NextRequest): { success: boolean; message?: string; resetTime?: number } => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean up expired entries
    Object.keys(store).forEach(k => {
      if (store[k].resetTime < now) {
        delete store[k];
      }
    });

    // Get or create entry for this IP
    if (!store[key]) {
      store[key] = {
        count: 1,
        resetTime: now + windowMs
      };
      return { success: true };
    }

    // Check if window has expired
    if (store[key].resetTime < now) {
      store[key] = {
        count: 1,
        resetTime: now + windowMs
      };
      return { success: true };
    }

    // Check if limit exceeded
    if (store[key].count >= max) {
      return {
        success: false,
        message,
        resetTime: store[key].resetTime
      };
    }

    // Increment count
    store[key].count++;
    return { success: true };
  };
}

// Predefined rate limiters
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: 'Too many authentication attempts'
});

export const apiRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: 'Too many API requests'
});

export const paymentUpdateRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 payment updates per minute
  message: 'Too many payment update requests'
});

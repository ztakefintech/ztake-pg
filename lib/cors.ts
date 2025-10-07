import { NextRequest, NextResponse } from 'next/server';

export interface CorsOptions {
  origin?: string | string[] | boolean;
  methods?: string[];
  allowedHeaders?: string[];
  credentials?: boolean;
  maxAge?: number;
}

const defaultOptions: CorsOptions = {
  origin: '*', // Allow all origins by default
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: false,
  maxAge: 86400, // 24 hours
};

export function withCors(options: CorsOptions = {}) {
  const corsOptions = { ...defaultOptions, ...options };

  return (handler: (req: NextRequest) => Promise<NextResponse>) => {
    return async (req: NextRequest): Promise<NextResponse> => {
      // Handle preflight OPTIONS request
      if (req.method === 'OPTIONS') {
        return new NextResponse(null, {
          status: 200,
          headers: getCorsHeaders(corsOptions, req),
        });
      }

      // Process the actual request
      const response = await handler(req);

      // Add CORS headers to the response
      const corsHeaders = getCorsHeaders(corsOptions, req);
      Object.entries(corsHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
      });

      return response;
    };
  };
}

function getCorsHeaders(options: CorsOptions, req: NextRequest): Record<string, string> {
  const headers: Record<string, string> = {};

  // Handle origin
  if (options.origin === true) {
    // Allow the requesting origin
    const origin = req.headers.get('origin');
    if (origin) {
      headers['Access-Control-Allow-Origin'] = origin;
    }
  } else if (Array.isArray(options.origin)) {
    // Check if the requesting origin is in the allowed list
    const origin = req.headers.get('origin');
    if (origin && options.origin.includes(origin)) {
      headers['Access-Control-Allow-Origin'] = origin;
    }
  } else if (typeof options.origin === 'string') {
    headers['Access-Control-Allow-Origin'] = options.origin;
  } else {
    headers['Access-Control-Allow-Origin'] = '*';
  }

  // Handle methods
  if (options.methods && options.methods.length > 0) {
    headers['Access-Control-Allow-Methods'] = options.methods.join(', ');
  }

  // Handle allowed headers
  if (options.allowedHeaders && options.allowedHeaders.length > 0) {
    headers['Access-Control-Allow-Headers'] = options.allowedHeaders.join(', ');
  }

  // Handle credentials
  if (options.credentials) {
    headers['Access-Control-Allow-Credentials'] = 'true';
  }

  // Handle max age
  if (options.maxAge) {
    headers['Access-Control-Max-Age'] = options.maxAge.toString();
  }

  return headers;
}

// Pre-configured CORS for different use cases
export const publicCors = withCors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});

export const apiCors = withCors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
});

export const secureCors = withCors({
  origin: [
    'ztake-phi.vercel.app',
    'http://localhost:3000',
    'http://localhost:3001',
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
});

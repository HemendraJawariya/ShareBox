import { NextRequest, NextResponse } from 'next/server';

// CORS configuration
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGINS || '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

// Security headers
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:",
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
};

// Rate limit configuration
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100;
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function getRateLimitKey(request: NextRequest): string {
  return request.headers.get('x-forwarded-for') || request.headers.get('cf-connecting-ip') || 'unknown';
}

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const limit = rateLimitStore.get(key);

  if (!limit || now > limit.resetTime) {
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
    });
    return true;
  }

  limit.count++;
  return limit.count <= RATE_LIMIT_MAX_REQUESTS;
}

export function proxy(request: NextRequest) {
  const response = NextResponse.next();

  // Add security headers (except for upload endpoint)
  const isUploadEndpoint = request.nextUrl.pathname === '/api/upload';
  
  // Always set CORS headers
  Object.entries(CORS_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // Set security headers (except Content-Length restrictions for uploads)
  if (!isUploadEndpoint) {
    Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
  }

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: { ...CORS_HEADERS, ...SECURITY_HEADERS },
    });
  }

  // Skip rate limiting for upload endpoint (allow large transfers)
  if (!isUploadEndpoint) {
    const rateLimitKey = getRateLimitKey(request);
    if (!checkRateLimit(rateLimitKey)) {
      return new NextResponse('Too Many Requests', {
        status: 429,
        headers: {
          'Retry-After': '60',
        },
      });
    }
  }

  // Log requests in production
  if (process.env.NODE_ENV === 'production') {
    console.log(`[${new Date().toISOString()}] ${request.method} ${request.nextUrl.pathname}`);
  }

  return response;
}

// Configure which routes use the proxy
export const proxyConfig = {
  matcher: [
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};

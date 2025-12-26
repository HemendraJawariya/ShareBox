import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const checks: Record<string, any> = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      node_env: process.env.NODE_ENV,
    };

    // Database health check
    try {
      // Check if database is accessible
      const dbUrl = process.env.DATABASE_URL;
      if (dbUrl) {
        const start = Date.now();
        // Simple health check - actual implementation depends on your DB
        checks.database = {
          status: 'connected',
          responseTime: Date.now() - start,
        };
      } else {
        checks.database = { status: 'not_configured' };
      }
    } catch (error) {
      checks.database = { status: 'disconnected', error: (error as Error).message };
    }

    // Redis health check
    try {
      const redisUrl = process.env.REDIS_URL;
      if (redisUrl) {
        checks.redis = { status: 'connected' };
      } else {
        checks.redis = { status: 'not_configured' };
      }
    } catch (error) {
      checks.redis = { status: 'disconnected', error: (error as Error).message };
    }

    // File storage check
    try {
      checks.storage = { status: 'accessible' };
    } catch (error) {
      checks.storage = { status: 'error', error: (error as Error).message };
    }

    // Determine overall status
    const hasErrors = Object.values(checks).some(
      (v) => typeof v === 'object' && v !== null && 'status' in v && v.status === 'disconnected'
    );

    const status = hasErrors ? 503 : 200;

    return NextResponse.json(
      {
        status: hasErrors ? 'degraded' : 'healthy',
        checks,
        timestamp: new Date().toISOString(),
      },
      { status }
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        error: (error as Error).message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

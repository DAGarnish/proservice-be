import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: any;
};

// Ensure Neon PgBouncer connection string includes pgbouncer=true and sensible timeouts
function getOptimizedDatabaseUrl(): string | undefined {
  let url = process.env.DATABASE_URL;
  if (!url) return undefined;
  if (url.includes('neon.tech') || url.includes('-pooler')) {
    if (!url.includes('pgbouncer=true')) {
      url += (url.includes('?') ? '&' : '?') + 'pgbouncer=true&connect_timeout=15';
    }
  }
  return url;
}

const dbUrl = getOptimizedDatabaseUrl();

export const prisma: any =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: dbUrl ? { db: { url: dbUrl } } : undefined,
    log: process.env.NODE_ENV === 'development' ? ['query', 'warn'] : ['warn'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

/**
 * Executes a Prisma query with automatic retry and reconnection on closed/dropped PostgreSQL connections.
 * Essential for serverless databases (Neon, Supabase, Vercel Postgres) that suspend idle connections.
 */
export async function withPrismaRetry<T = any>(fn: () => Promise<T>, retries = 3): Promise<T> {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      const msg = error?.message || '';
      const isConnectionError =
        msg.includes('Closed') ||
        msg.includes('closed') ||
        msg.includes('Connection') ||
        msg.includes('connect') ||
        msg.includes('timeout') ||
        msg.includes('pool') ||
        msg.includes('reach database') ||
        msg.includes('57P01') || // postgres admin shutdown / restart
        msg.includes('08006') || // connection failure
        msg.includes('08001'); // client unable to establish connection

      if (isConnectionError && i < retries) {
        // Quietly reconnect without polluting error logs with red stacktraces
        if (process.env.NODE_ENV === 'development') {
          console.warn(`[PRISMA] Database connection sleeping (${msg}). Reconnecting & retrying (${i + 1}/${retries})...`);
        }
        try {
          await prisma.$disconnect();
        } catch (e) {
          // ignore disconnect error
        }
        await new Promise((res) => setTimeout(res, 600 * (i + 1)));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Prisma retry failed');
}


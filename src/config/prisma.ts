import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: any;
};

export const prisma: any =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
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
        console.warn(`[PRISMA] Database connection dropped or sleeping (${msg}). Reconnecting & retrying (${i + 1}/${retries})...`);
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

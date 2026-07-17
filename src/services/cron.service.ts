// src/services/cron.service.ts
// Automated 10-minute recovery cron job to scan the database for any verified user accounts
// whose website generation failed, timed out, or was left incomplete. Pushes them cleanly into the queue.

import cron from 'node-cron';
import { prisma, withPrismaRetry } from '../config/prisma';
import { queueService } from './queue.service';

export function startRecoveryCronJob(): void {
  console.log('[CRON] Initializing 10-minute auto-recovery cron job for website generation...');

  // Run every 10 minutes: */10 * * * *
  cron.schedule('*/10 * * * *', async () => {
    console.log('[CRON] Ticking: Scanning for unbuilt or failed verified website submissions...');
    await runRecoveryScanNow();
  });
}

/**
 * Manually or automatically runs the check to find unbuilt sites and pushes them into the queue.
 */
export async function runRecoveryScanNow(): Promise<number> {
  try {
    const unbuiltSubmissions: any[] = await withPrismaRetry(() =>
      prisma.websiteSubmission.findMany({
        where: {
          user: {
            isEmailVerified: true,
          },
          OR: [
            { generatedHtml: null },
            { generatedHtml: '' },
            { status: 'pending' },
            { status: 'failed' },
          ],
          generationAttempts: {
            lt: 10, // Prevent infinite retries on permanently malformed submissions
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
        take: 50, // Batch limit per cron tick
      })
    );

    if (unbuiltSubmissions.length === 0) {
      console.log('[CRON] All verified user submissions have completed websites (`generatedHtml` present & `status: completed`). No tasks to queue.');
      return 0;
    }

    console.log(`[CRON] Found ${unbuiltSubmissions.length} unbuilt or failed verified submissions. Pushing to queue...`);

    let addedCount = 0;
    for (const sub of unbuiltSubmissions) {
      // Push each submission into the queue
      const added = await queueService.push(sub.id);
      if (added) addedCount++;
    }

    console.log(`[CRON] Successfully queued ${addedCount} jobs for background recovery & email dispatch.`);
    return addedCount;
  } catch (err: any) {
    console.error('[CRON] Error running recovery scan:', err?.message || err);
    return 0;
  }
}

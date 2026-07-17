// src/controllers/submission.controller.ts
import { Request, Response } from 'express';
import { queueService } from '../services/queue.service';
import { runRecoveryScanNow } from '../services/cron.service';
import { prisma, withPrismaRetry } from '../config/prisma';

/**
 * Trigger AI generation by queuing a specific website submission ID.
 * Next.js frontend calls this immediately upon user email verification click!
 */
export const queueGeneration = async (req: Request, res: Response): Promise<void> => {
  try {
    const { submissionId, previewId, userId } = req.body;

    let targetSubmissionId = submissionId;

    // If only previewId or userId is passed, resolve submissionId from DB
    if (!targetSubmissionId && previewId) {
      const sub = await withPrismaRetry(() =>
        prisma.websiteSubmission.findFirst({
          where: { previewId },
          select: { id: true },
        })
      );
      if (sub) targetSubmissionId = sub.id;
    }

    if (!targetSubmissionId && userId) {
      const sub = await withPrismaRetry(() =>
        prisma.websiteSubmission.findFirst({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          select: { id: true },
        })
      );
      if (sub) targetSubmissionId = sub.id;
    }

    if (!targetSubmissionId) {
      res.status(400).json({
        success: false,
        error: 'Missing `submissionId`, `previewId`, or `userId` in request payload.',
      });
      return;
    }

    const queued = await queueService.push(targetSubmissionId);

    res.status(200).json({
      success: true,
      message: queued
        ? `Submission ${targetSubmissionId} added to the background generation queue.`
        : `Submission ${targetSubmissionId} is already processing or queued.`,
      queueStats: queueService.getStats(),
    });
  } catch (err: any) {
    console.error('[CONTROLLER] Error in queueGeneration:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to queue website generation task.',
    });
  }
};

/**
 * Get current queue health and processing status
 */
export const getQueueStatus = async (req: Request, res: Response): Promise<void> => {
  res.status(200).json({
    success: true,
    stats: queueService.getStats(),
  });
};

/**
 * Manually trigger the 10-minute cron recovery scan on demand
 */
export const triggerCronRecovery = async (req: Request, res: Response): Promise<void> => {
  try {
    const queuedCount = await runRecoveryScanNow();
    res.status(200).json({
      success: true,
      message: `Manual recovery scan executed. Queued ${queuedCount} unbuilt/failed submissions.`,
      stats: queueService.getStats(),
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: 'Error executing recovery scan.',
    });
  }
};

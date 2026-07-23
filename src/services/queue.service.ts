// src/services/queue.service.ts
// Robust in-memory FIFO queue with concurrency control and automatic retries for AI website generation.
// Prevents server crashes under heavy traffic and enforces the strict rule:
// ONLY send the welcome preview email AFTER successful AI generation completes (no fallback templates).

import { prisma, withPrismaRetry } from '../config/prisma';
import { buildWebsiteBrief } from './prompt.service';
import { generateWebsiteWithClaude, generateLogoWithClaude } from './claude.service';
import { enhanceGeneratedHtml } from './htmlSafeguard.service';
import { sendWelcomePreviewEmail } from './email.service';

class GenerationQueue {
  private queue: string[] = [];
  private activeSet: Set<string> = new Set();
  private concurrency: number = 1; // Process 1 site at a time to prevent Claude API 429 rate limit or server overload
  private maxTaskRetries: number = 3;

  /**
   * Pushes a submissionId into the generation queue if not already queued or processing.
   */
  public async push(submissionId: string): Promise<boolean> {
    if (this.activeSet.has(submissionId) || this.queue.includes(submissionId)) {
      console.log(`[QUEUE] Submission ${submissionId} is already in the queue or actively processing.`);
      return false;
    }

    // Ensure status is marked pending if not already processing
    try {
      await withPrismaRetry(() =>
        prisma.websiteSubmission.update({
          where: { id: submissionId },
          data: { status: 'pending' },
        })
      );
    } catch (e) {
      console.warn(`[QUEUE] Could not update status to pending for ${submissionId}:`, e);
    }

    this.queue.push(submissionId);
    console.log(`[QUEUE] Added ${submissionId} to queue. Current queue length: ${this.queue.length}`);
    this.next();
    return true;
  }

  /**
   * Returns current queue stats.
   */
  public getStats() {
    return {
      queueLength: this.queue.length,
      activeProcessing: this.activeSet.size,
      activeSubmissionIds: Array.from(this.activeSet),
    };
  }

  private async next(): Promise<void> {
    if (this.activeSet.size >= this.concurrency || this.queue.length === 0) {
      return;
    }

    const submissionId = this.queue.shift();
    if (!submissionId) return;

    this.activeSet.add(submissionId);
    console.log(`[QUEUE] Starting processing for ${submissionId}. Active: ${this.activeSet.size}, Remaining in queue: ${this.queue.length}`);

    try {
      await this.processSubmission(submissionId);
    } catch (err: any) {
      console.error(`[QUEUE] Uncaught error processing submission ${submissionId}:`, err);
      try {
        await withPrismaRetry(() =>
          prisma.websiteSubmission.update({
            where: { id: submissionId },
            data: {
              status: 'failed',
              errorMessage: err?.message || 'Uncaught processing error',
              lastAttemptAt: new Date(),
            },
          })
        );
      } catch (dbErr) {
        console.error(`[QUEUE] Failed to update error state in DB for ${submissionId}:`, dbErr);
      }
    } finally {
      this.activeSet.delete(submissionId);
      // Trigger next task in queue
      setTimeout(() => this.next(), 1000); // 1s cooldown between items for API safety
    }
  }

  private async processSubmission(submissionId: string): Promise<void> {
    const submission: any = await withPrismaRetry(() =>
      prisma.websiteSubmission.findUnique({
        where: { id: submissionId },
        include: { user: true },
      })
    );

    if (!submission) {
      console.warn(`[QUEUE] Submission ${submissionId} not found in database.`);
      return;
    }

    // Check if HTML is already generated and valid
    if (submission.generatedHtml && typeof submission.generatedHtml === 'string' && submission.generatedHtml.trim().startsWith('<')) {
      console.log(`[QUEUE] Submission ${submissionId} already has valid generated HTML.`);
      if (submission.status !== 'completed') {
        await withPrismaRetry(() =>
          prisma.websiteSubmission.update({
            where: { id: submissionId },
            data: { status: 'completed', errorMessage: '' },
          })
        );
      }
      return;
    }

    // Mark as processing
    await withPrismaRetry(() =>
      prisma.websiteSubmission.update({
        where: { id: submissionId },
        data: {
          status: 'processing',
          generationAttempts: { increment: 1 },
          lastAttemptAt: new Date(),
        },
      })
    );

    let isGenerationSuccess = false;
    let generatedHtml = '';
    let finalLogoUrl = submission.logo_data_url;

    // Step 1: Generate Logo if needed
    if (submission.logo_prompt && !finalLogoUrl) {
      console.log(`[QUEUE] Generating logo for ${submission.business_name}...`);
      finalLogoUrl = await generateLogoWithClaude(submission.business_name, submission.occupation, submission.logo_prompt);
      if (finalLogoUrl) {
        await withPrismaRetry(() =>
          prisma.websiteSubmission.update({
            where: { id: submissionId },
            data: { logo_data_url: finalLogoUrl, logo_uploaded: true },
          })
        );
      }
    }

    // Step 2: Build Brief
    const { naturalLanguage } = buildWebsiteBrief(submission);

    // Step 3: Retry Loop with Backoff for Claude API
    for (let attempt = 1; attempt <= this.maxTaskRetries; attempt++) {
      try {
        console.log(`[QUEUE] AI Website generation attempt ${attempt}/${this.maxTaskRetries} for ${submission.business_name || submissionId}...`);
        generatedHtml = await generateWebsiteWithClaude(naturalLanguage);

        if (generatedHtml && generatedHtml.trim().startsWith('<')) {
          isGenerationSuccess = true;
          break; // Success! Exit retry loop
        } else {
          console.warn(`[QUEUE] Attempt ${attempt} returned invalid output not starting with '<'.`);
        }
      } catch (attemptErr: any) {
        console.warn(`[QUEUE] Attempt ${attempt} failed: ${attemptErr?.message || attemptErr}`);
        if (attempt < this.maxTaskRetries) {
          const backoffMs = 3000 * Math.pow(2, attempt - 1); // Exponential backoff: 3s, 6s, 12s
          console.log(`[QUEUE] Waiting ${backoffMs}ms before retry...`);
          await new Promise(r => setTimeout(r, backoffMs));
        }
      }
    }

    // Step 4: Handle Outcome (No fallback templates! Only send email on real success)
    if (isGenerationSuccess && generatedHtml) {
      // Enhance HTML (responsive header, anti-crop photo framing, interactive maps)
      generatedHtml = enhanceGeneratedHtml(
        generatedHtml,
        finalLogoUrl,
        submission.business_name,
        Array.isArray(submission.uploaded_photos_urls) ? submission.uploaded_photos_urls : [],
        submission.business_address || submission.main_city || submission.service_area || 'USA'
      );

      await withPrismaRetry(() =>
        prisma.websiteSubmission.update({
          where: { id: submissionId },
          data: {
            generatedHtml,
            status: 'completed',
            errorMessage: '',
            lastAttemptAt: new Date(),
          },
        })
      );
      console.log(`[QUEUE] Successfully generated and saved AI HTML for ${submission.business_name || submissionId}`);

      // SEND WELCOME PREVIEW EMAIL ONLY AFTER WEBSITE IS GENERATED AND SAVED
      if (submission.user && submission.user.email && submission.user.isEmailVerified) {
        try {
          console.log(`[QUEUE] Sending welcome preview email to ${submission.user.email}...`);
          await sendWelcomePreviewEmail(
            submission.user.email,
            submission.user.name || 'Client',
            submission.business_name || submission.user.businessName || 'Your Business',
            submission.previewId || submission.id
          );
        } catch (emailErr) {
          console.error(`[QUEUE] Failed to send welcome email to ${submission.user.email}:`, emailErr);
        }
      } else {
        console.log(`[QUEUE] User email verified check is false or missing email. Will not send notification until verified.`);
      }
    } else {
      console.error(`[QUEUE] All ${this.maxTaskRetries} attempts failed for ${submissionId}. Marking as FAILED.`);
      // Do NOT set fallback template (`generatedHtml` stays empty/null so cron job can recover later)
      await withPrismaRetry(() =>
        prisma.websiteSubmission.update({
          where: { id: submissionId },
          data: {
            status: 'failed',
            errorMessage: 'All generation attempts failed or rate limited by Claude API',
            lastAttemptAt: new Date(),
          },
        })
      );
    }
  }
}

export const queueService = new GenerationQueue();

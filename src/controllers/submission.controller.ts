// src/controllers/submission.controller.ts
import { Request, Response } from 'express';
import crypto from 'crypto';
import { queueService } from '../services/queue.service';
import { runRecoveryScanNow } from '../services/cron.service';
import { prisma, withPrismaRetry } from '../config/prisma';
import { sendSubmissionEmail, sendUserVerificationEmail } from '../services/email.service';

// Emails exempt from the per-email website generation limit.
const UNLIMITED_GENERATION_EMAILS = new Set(
  (process.env.UNLIMITED_GENERATION_EMAILS || 'garnish.ecom@gmail.com,abhisespoudyal@gmail.com')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
);

// Max number of websites a single (non-exempt) email may generate.
const MAX_GENERATIONS_PER_EMAIL = parseInt(process.env.MAX_GENERATIONS_PER_EMAIL || '2', 10);

function validateSubmissionPayload(body: any): string | null {
  if (!body.email_address || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email_address)) {
    return 'A valid email address is required';
  }
  if (!body.business_name?.trim()) {
    return 'Business name is required';
  }
  if (!body.occupation?.trim()) {
    return 'Business type is required';
  }
  return null;
}

/**
 * Create a new website intake submission — the single owner of the
 * `User` + `WebsiteSubmission` DB writes for the get-started form.
 * Actual AI generation is deferred until the user verifies their email
 * (see queueGeneration below), same as before.
 */
export const createSubmission = async (req: Request, res: Response): Promise<void> => {
  const body = req.body || {};
  const email = (body.email_address || '').toLowerCase().trim();
  const businessName = (body.business_name || '').trim();

  try {
    const validationError = validateSubmissionPayload(body);
    if (validationError) {
      res.status(400).json({ success: false, error: validationError });
      return;
    }

    // Enforce a per-email lifetime cap on website generations. A small
    // allowlist of internal/testing emails is exempt from the cap.
    if (!UNLIMITED_GENERATION_EMAILS.has(email)) {
      const existingCount = await withPrismaRetry(() =>
        prisma.websiteSubmission.count({ where: { email_address: { equals: email, mode: 'insensitive' } } })
      );
      if (existingCount >= MAX_GENERATIONS_PER_EMAIL) {
        res.status(403).json({
          success: false,
          error: `This email address has reached the maximum of ${MAX_GENERATIONS_PER_EMAIL} website generations.`,
        });
        return;
      }
    }

    const previewId = crypto.randomUUID();
    let verificationToken = crypto.randomUUID();
    let userId: string | undefined;

    // Reuse an existing pending verification token instead of minting a new one,
    // so a previously-sent verification email link doesn't get silently invalidated.
    const existingUser: any = await withPrismaRetry(() =>
      prisma.user.findUnique({ where: { email } })
    );

    if (existingUser && !existingUser.isEmailVerified && existingUser.verificationToken) {
      verificationToken = existingUser.verificationToken;
    }

    const userRecord: any = await withPrismaRetry(() => prisma.user.upsert({
      where: { email },
      update: {
        name: body.contact_name || '',
        phone: body.phone_number || '',
        address: body.business_address || '',
        businessName: body.business_name || '',
        occupation: body.occupation || '',
        ...(existingUser?.isEmailVerified
          ? {}
          : { verificationToken, verificationSentAt: new Date() }),
      },
      create: {
        name: body.contact_name || '',
        email,
        phone: body.phone_number || '',
        address: body.business_address || '',
        businessName: body.business_name || '',
        occupation: body.occupation || '',
        verificationToken,
        verificationSentAt: new Date(),
        isEmailVerified: false,
      },
    }));
    userId = userRecord?.id;

    const submissionData: any = {
      userId: userId || null,
      business_name: body.business_name || '',
      contact_name: body.contact_name || '',
      phone_number: body.phone_number || '',
      email_address: body.email_address || '',
      business_address: body.business_address || '',
      service_area: body.service_area || '',
      occupation: body.occupation || '',
      years_in_business: body.years_in_business || '',
      main_services: body.main_services || '',
      business_description: body.business_description || '',
      specialities: body.specialities || '',
      price_list: body.price_list || '',
      top_services_to_promote: body.top_services_to_promote || '',
      emergency_service: Boolean(body.emergency_service),
      main_cta: body.main_cta || 'call',
      differentiator: body.differentiator || '',
      qualifications: body.qualifications || '',
      insurance: Boolean(body.insurance),
      memberships: body.memberships || '',
      specialist_tools: body.specialist_tools || '',
      testimonials: body.testimonials || '',
      notable_work: body.notable_work || '',
      guarantees: body.guarantees || '',
      style_preference: Array.isArray(body.style_preference) ? body.style_preference : [],
      preferred_colours: body.preferred_colours || '',
      selected_website_look: body.selected_website_look || 'professional-blue',
      match_logo_colours: Boolean(body.match_logo_colours),
      logo_uploaded: Boolean(body.logo_uploaded),
      logo_data_url: body.logo_data_url || '',
      logo_prompt: body.logo_prompt || '',
      photos_uploaded: Boolean(
        body.photos_uploaded ||
        (body.uploaded_photos_urls && body.uploaded_photos_urls.length > 0) ||
        (body.secondary_photos_urls && body.secondary_photos_urls.length > 0)
      ),
      uploaded_photos_urls: [
        ...(Array.isArray(body.uploaded_photos_urls) ? body.uploaded_photos_urls : []),
        ...(Array.isArray(body.secondary_photos_urls) ? body.secondary_photos_urls : []),
      ].filter((url, index, self) => url && self.indexOf(url) === index),
      example_websites: body.example_websites || '',
      avoid_on_site: body.avoid_on_site || '',
      main_city: body.main_city || '',
      full_service_area: body.full_service_area || '',
      priority_locations: body.priority_locations || '',
      seo_keywords: body.seo_keywords || '',
      service_pages: body.service_pages !== undefined ? Boolean(body.service_pages) : true,
      location_pages: body.location_pages !== undefined ? Boolean(body.location_pages) : true,
      contact_number_to_show: body.contact_number_to_show || '',
      contact_email_to_show: body.contact_email_to_show || '',
      contact_form: body.contact_form !== undefined ? Boolean(body.contact_form) : true,
      google_maps: body.google_maps !== undefined ? Boolean(body.google_maps) : true,
      testimonials_on_site: body.testimonials_on_site !== undefined ? Boolean(body.testimonials_on_site) : true,
      quote_request_form: body.quote_request_form !== undefined ? Boolean(body.quote_request_form) : true,
      booking_or_whatsapp: body.booking_or_whatsapp || 'none',
      google_listing_option: Boolean(body.google_listing_option),
      branded_domain_option: Boolean(body.branded_domain_option),
      additional_notes: body.additional_notes || '',
      seasonal_offers: body.seasonal_offers || '',
      competitors: body.competitors || '',
      avoid_wording: body.avoid_wording || '',
      previewId,
      generatedHtml: '',
    };

    // Real failure here now surfaces to the client instead of being swallowed —
    // if the DB write fails, the caller gets success:false and a real error.
    await withPrismaRetry(() => prisma.websiteSubmission.create({ data: submissionData }));

    // Email sends are best-effort — a failed notification shouldn't fail the
    // submission itself, but we log loudly so it's diagnosable.
    try {
      await sendSubmissionEmail(body, previewId);
    } catch (emailError) {
      console.error('[PROSERVICE-BE] Failed to send admin notification email:', emailError);
    }
    try {
      await sendUserVerificationEmail(body, previewId, verificationToken);
    } catch (userEmailError) {
      console.error('[PROSERVICE-BE] Failed to send user verification email:', userEmailError);
    }

    res.status(200).json({ success: true, previewId, userId, verificationToken });
  } catch (err: any) {
    console.error('[PROSERVICE-BE] Failed to create website submission:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to save your submission. Please try again.' });
  }
};

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

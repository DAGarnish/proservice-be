// src/controllers/contact.controller.ts
import { Request, Response } from 'express';
import { prisma, withPrismaRetry } from '../config/prisma';
import { sendContactFormEmail } from '../services/email.service';

/**
 * Create a new contact form submission — the single owner of the
 * `ContactSubmission` DB write for the homepage contact form.
 */
export const createContactSubmission = async (req: Request, res: Response): Promise<void> => {
  try {
    const { first_name, last_name, email_address, phone_number, message } = req.body || {};

    if (!first_name || !last_name || !email_address || !message) {
      res.status(400).json({ success: false, error: 'Missing required fields' });
      return;
    }

    // Real failure here now surfaces to the client instead of being swallowed.
    await withPrismaRetry(() => prisma.contactSubmission.create({
      data: {
        firstName: first_name,
        lastName: last_name,
        email: email_address,
        phone: phone_number || null,
        message,
      },
    }));

    // Respond immediately — don't make the caller wait on the SMTP round-trip.
    res.status(200).json({ success: true });

    sendContactFormEmail(first_name, last_name, email_address, phone_number || '', message).catch((emailError) => {
      console.error('[PROSERVICE-BE] Failed to send contact notification email:', emailError);
    });
  } catch (err: any) {
    console.error('[PROSERVICE-BE] Failed to create contact submission:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to save your message. Please try again.' });
  }
};

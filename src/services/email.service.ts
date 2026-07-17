// src/services/email.service.ts
import nodemailer from 'nodemailer';

function getAppUrl(): string {
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production') {
    if (process.env.CLIENT_URL && process.env.CLIENT_URL !== 'http://localhost:3000') {
      return process.env.CLIENT_URL.replace(/\/$/, '');
    }
    if (process.env.NEXT_PUBLIC_APP_URL && process.env.NEXT_PUBLIC_APP_URL !== 'http://localhost:3000') {
      return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
    }
    return 'https://webpro50.com';
  }
  return (process.env.CLIENT_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
}

function getEmailCredentials() {
  const user = process.env.EMAIL_ADMIN || process.env.EMAIL_USER || process.env.GMAIL_USER;
  const pass = process.env.EMAIL_PASSWORD || process.env.GMAIL_APP_PASSWORD;
  return { user, pass };
}

function createMailTransporter(user: string, pass: string) {
  if (process.env.SMTP_HOST) {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const secure = process.env.SMTP_SECURE === 'true' || port === 465;
    console.log(`[PROSERVICE-BE] Using SMTP Transporter -> Host: ${host}, Port: ${port}, Secure: ${secure}, User: ${user}`);
    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
    });
  }
  console.log(`[PROSERVICE-BE] Using Default Gmail/Service Transporter -> Service: ${process.env.SMTP_SERVICE || 'gmail'}, User: ${user}`);
  return nodemailer.createTransport({
    service: process.env.SMTP_SERVICE || 'gmail',
    auth: { user, pass },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
  });
}

/**
 * Sends the welcome & preview email ONLY after website generation succeeds!
 */
export async function sendWelcomePreviewEmail(
  userEmail: string,
  userName: string,
  businessName: string,
  previewId?: string
): Promise<boolean> {
  const { user: gmailUser, pass: gmailPass } = getEmailCredentials();

  if (!gmailUser || !gmailPass || !userEmail) {
    console.warn('[PROSERVICE-BE] Email credentials not configured (`EMAIL_ADMIN`, `EMAIL_PASSWORD`). Skipping welcome preview email.');
    return false;
  }

  const transporter = createMailTransporter(gmailUser, gmailPass);
  const appUrl = getAppUrl();
  const previewUrl = previewId ? `${appUrl}/preview/${previewId}` : appUrl;

  const subject = `🎉 Website Built & Ready! View Your AI Website Preview — ${businessName}`;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Website Ready - WEBPRO50</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f3f4f6; color: #1f2937; -webkit-font-smoothing: antialiased;">
  <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 620px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.08); border: 1px solid #e5e7eb;">
          
          <!-- Header -->
          <tr>
            <td style="background-color: #111827; padding: 36px 40px; text-align: center; border-bottom: 4px solid #10b981;">
              <div style="font-family: 'Outfit', 'Inter', sans-serif; font-size: 28px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">
                WEB<span style="color: #10b981;">PRO50</span>
              </div>
              <div style="color: #d1fae5; font-size: 14px; font-weight: 600; margin-top: 6px; text-transform: uppercase; letter-spacing: 1.5px;">
                AI Website Built &amp; Ready
              </div>
            </td>
          </tr>

          <!-- Hero Section -->
          <tr>
            <td style="padding: 40px 40px 28px 40px;">
              <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 800; color: #111827;">
                Congratulations, ${userName || 'Valued Partner'}! 🎉
              </h1>
              <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #4b5563;">
                Our backend AI studio has successfully generated and built your custom website for <strong style="color: #1a56db;">${businessName}</strong>! It is now fully interactive and ready for your review right now.
              </p>
              
              <!-- Primary Preview CTA Button -->
              <table border="0" cellpadding="0" cellspacing="0" style="margin: 32px 0 28px 0; width: 100%;">
                <tr>
                  <td align="center">
                    <a href="${previewUrl}" target="_blank" style="display: inline-block; padding: 18px 40px; font-size: 17px; font-weight: 700; color: #ffffff; background-color: #1a56db; text-decoration: none; border-radius: 12px; box-shadow: 0 8px 16px rgba(26, 86, 219, 0.35);">
                      👀 View Your Website Preview Directly &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 12px; margin-bottom: 24px;">
                <h3 style="margin: 0 0 8px 0; font-size: 16px; color: #1e293b;">Unlocked Capabilities:</h3>
                <ul style="margin: 0; padding-left: 20px; color: #4b5563; font-size: 14px; line-height: 1.6;">
                  <li><strong>Live Site Review:</strong> Inspect every page, service card, and interactive element.</li>
                  <li><strong>AI Customization:</strong> Adjust colors, fonts, or update text seamlessly.</li>
                  <li><strong>Custom Domain &amp; Publishing:</strong> Connect your domain name and publish to the world.</li>
                </ul>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #1f2937; padding: 24px 40px; text-align: center; color: #9ca3af; font-size: 13px; line-height: 1.6;">
              <div style="color: #ffffff; font-weight: 700; font-size: 15px; margin-bottom: 6px;">
                WEBPRO50 AI Studio
              </div>
              <div>
                You received this email because your custom AI website for <strong>${businessName}</strong> has completed generation.
              </div>
              <div style="margin-top: 12px; font-size: 11px; color: #6b7280;">
                &copy; ${new Date().getFullYear()} WEBPRO50. All rights reserved.
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  try {
    await transporter.sendMail({
      from: `"WEBPRO50 AI Studio" <${gmailUser}>`,
      to: userEmail,
      subject,
      html: htmlContent,
    });
    console.log('[PROSERVICE-BE] Welcome preview email sent successfully to:', userEmail);
    return true;
  } catch (error) {
    console.error('[PROSERVICE-BE] Error sending welcome preview email:', error);
    throw error;
  }
}

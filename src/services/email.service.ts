// src/services/email.service.ts
import nodemailer from 'nodemailer';

function getAppUrl(): string {
  const rawUrl = process.env.CLIENT_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://www.webpro50.com';
  const firstUrl = rawUrl.split(',')[0].trim();
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production') {
    if (firstUrl && firstUrl !== 'http://localhost:3000') {
      return firstUrl.replace(/\/$/, '');
    }
    return 'https://www.webpro50.com';
  }
  return firstUrl.replace(/\/$/, '');
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
 * Sends the admin notification email when a new intake form is submitted.
 */
export async function sendSubmissionEmail(data: any, previewId?: string): Promise<void> {
  const { user: gmailUser, pass: gmailPass } = getEmailCredentials();
  const receiverEmail = process.env.RECEIVER_EMAIL || gmailUser;

  if (!gmailUser || !gmailPass || !receiverEmail) {
    console.warn('[PROSERVICE-BE] Email credentials not fully configured in .env. Skipping email notification.');
    return;
  }

  const transporter = createMailTransporter(gmailUser, gmailPass);

  const appUrl = getAppUrl();
  const previewUrl = previewId ? `${appUrl}/preview/${previewId}` : appUrl;

  const subject = `🚀 New Website Preview & Intake: ${data.business_name || 'New Client'}`;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Website Submission</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f3f4f6; color: #1f2937; -webkit-font-smoothing: antialiased;">
  <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 640px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.08); border: 1px solid #e5e7eb;">
          <tr>
            <td style="background-color: #111827; padding: 32px 40px; text-align: center; border-bottom: 4px solid #1a56db;">
              <div style="font-family: 'Outfit', 'Inter', sans-serif; font-size: 28px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">
                WEB<span style="color: #1a56db;">PRO50</span>
              </div>
              <div style="color: #9ca3af; font-size: 14px; font-weight: 500; margin-top: 6px; text-transform: uppercase; letter-spacing: 1px;">
                New Intake & Preview Generated
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 40px 24px 40px;">
              <h1 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 700; color: #111827;">
                Hello Admin, 🎉
              </h1>
              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #4b5563;">
                A new small business website intake form has just been submitted by <strong style="color: #1a56db;">${data.contact_name || 'a potential client'}</strong> for <strong style="color: #111827;">${data.business_name || 'their business'}</strong>.
              </p>
              <table border="0" cellpadding="0" cellspacing="0" style="margin: 28px 0 32px 0;">
                <tr>
                  <td align="center" style="background-color: #1a56db; border-radius: 8px; box-shadow: 0 4px 6px rgba(26, 86, 219, 0.25);">
                    <a href="${previewUrl}" target="_blank" style="display: inline-block; padding: 14px 28px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 8px;">
                      View Live Website Preview &rarr;
                    </a>
                  </td>
                </tr>
              </table>
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px 0; font-size: 14px; color: #6b7280; border-bottom: 1px solid #f1f5f9;">Business Name:</td>
                  <td style="padding: 10px 0; font-size: 14px; font-weight: 600; color: #111827; border-bottom: 1px solid #f1f5f9;">${data.business_name || 'N/A'}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; font-size: 14px; color: #6b7280; border-bottom: 1px solid #f1f5f9;">Contact Name:</td>
                  <td style="padding: 10px 0; font-size: 14px; font-weight: 600; color: #111827; border-bottom: 1px solid #f1f5f9;">${data.contact_name || 'N/A'}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; font-size: 14px; color: #6b7280; border-bottom: 1px solid #f1f5f9;">Phone Number:</td>
                  <td style="padding: 10px 0; font-size: 14px; font-weight: 600; color: #111827; border-bottom: 1px solid #f1f5f9;">
                    <a href="tel:${data.phone_number}" style="color: #1a56db; text-decoration: none;">${data.phone_number || 'N/A'}</a>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; font-size: 14px; color: #6b7280; border-bottom: 1px solid #f1f5f9;">Email Address:</td>
                  <td style="padding: 10px 0; font-size: 14px; font-weight: 600; color: #111827; border-bottom: 1px solid #f1f5f9;">
                    <a href="mailto:${data.email_address}" style="color: #1a56db; text-decoration: none;">${data.email_address || 'N/A'}</a>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; font-size: 14px; color: #6b7280;">Occupation / Type:</td>
                  <td style="padding: 10px 0; font-size: 14px; font-weight: 600; color: #111827;">${data.occupation || 'N/A'}</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color: #1f2937; padding: 24px 40px; text-align: center; color: #9ca3af; font-size: 13px; line-height: 1.6;">
              <div style="color: #ffffff; font-weight: 700; font-size: 15px; margin-bottom: 6px;">
                WEBPRO50 Automated Notifications
              </div>
              <div>
                This alert was automatically generated when <strong style="color: #e8f0fe;">${data.contact_name || 'a client'}</strong> submitted their website intake form on your platform.
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

  await transporter.sendMail({
    from: `"WEBPRO50 Notifications" <${gmailUser}>`,
    to: receiverEmail,
    subject,
    html: htmlContent,
  });
}

/**
 * Sends the verification email to the user upon form submission.
 */
export async function sendUserVerificationEmail(
  data: any,
  previewId: string,
  verificationToken: string
): Promise<void> {
  const { user: gmailUser, pass: gmailPass } = getEmailCredentials();
  const userEmail = data.email_address;

  if (!gmailUser || !gmailPass || !userEmail) {
    console.warn('[PROSERVICE-BE] Email credentials not configured or no user email provided. Skipping verification email.');
    return;
  }

  const transporter = createMailTransporter(gmailUser, gmailPass);

  const appUrl = getAppUrl();
  const verifyUrl = `${appUrl}/verify-email?token=${verificationToken}&previewId=${previewId}&email=${encodeURIComponent(userEmail)}`;

  const subject = `✨ Verify Your Email & Access Your Website Preview — ${data.business_name}`;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email - WEBPRO50</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f3f4f6; color: #1f2937; -webkit-font-smoothing: antialiased;">
  <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 620px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.08); border: 1px solid #e5e7eb;">
          <tr>
            <td style="background-color: #111827; padding: 36px 40px; text-align: center; border-bottom: 4px solid #1a56db;">
              <div style="font-family: 'Outfit', 'Inter', sans-serif; font-size: 28px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">
                WEB<span style="color: #1a56db;">PRO50</span>
              </div>
              <div style="color: #bfdbfe; font-size: 14px; font-weight: 600; margin-top: 6px; text-transform: uppercase; letter-spacing: 1.5px;">
                Account Verification
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 40px 28px 40px;">
              <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 800; color: #111827;">
                Welcome, ${data.contact_name || 'Valued Client'}! 🎉
              </h1>
              <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #4b5563;">
                We have generated your first draft, using AI for <strong style="color: #1a56db;">${data.business_name}</strong>! Before you can connect custom domains or launch live to the public, please verify your email address below.
              </p>
              <table border="0" cellpadding="0" cellspacing="0" style="margin: 32px 0 20px 0; width: 100%;">
                <tr>
                  <td align="center">
                    <a href="${verifyUrl}" target="_blank" style="display: inline-block; padding: 16px 36px; font-size: 16px; font-weight: 700; color: #ffffff; background-color: #1a56db; text-decoration: none; border-radius: 10px; box-shadow: 0 6px 12px rgba(26, 86, 219, 0.3);">
                      ✅ Verify My Email Address &rarr;
                    </a>
                  </td>
                </tr>
              </table>
              <div style="background-color: #f8fafc; border-left: 4px solid #1a56db; padding: 16px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
                <p style="margin: 0; font-size: 14px; color: #374151; line-height: 1.5;">
                  <strong>Why verify?</strong> Verifying your email confirms ownership of your account, which tells us you're real and stops bots from taking up our time and energy.
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color: #1f2937; padding: 24px 40px; text-align: center; color: #9ca3af; font-size: 13px; line-height: 1.6;">
              <div style="color: #ffffff; font-weight: 700; font-size: 15px; margin-bottom: 6px;">
                WEBPRO50 Studio
              </div>
              <div>
                You received this verification email because you submitted an intake form for <strong>${data.business_name}</strong>.
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

  await transporter.sendMail({
    from: `"WEBPRO50 Account Verification" <${gmailUser}>`,
    to: userEmail,
    subject,
    html: htmlContent,
  });
}

/**
 * Sends the contact form notification email to the business admin.
 */
export async function sendContactFormEmail(
  firstName: string,
  lastName: string,
  email: string,
  phone: string,
  message: string
): Promise<void> {
  const { user: gmailUser, pass: gmailPass } = getEmailCredentials();
  const receiverEmail = process.env.RECEIVER_EMAIL || gmailUser;

  if (!gmailUser || !gmailPass || !receiverEmail) {
    console.warn('[PROSERVICE-BE] Email credentials not configured. Skipping contact email.');
    return;
  }

  const transporter = createMailTransporter(gmailUser, gmailPass);

  const subject = `📩 New Contact Form Submission from ${firstName} ${lastName}`;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>New Contact Submission</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', sans-serif; background-color: #f3f4f6; color: #1f2937;">
  <table width="100%" border="0" cellpadding="0" cellspacing="0" style="padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
          <tr>
            <td style="background-color: #111827; padding: 32px 40px; text-align: center; border-bottom: 4px solid #1a56db;">
              <div style="font-family: 'Outfit', 'Inter', sans-serif; font-size: 28px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">
                WEB<span style="color: #1a56db;">PRO50</span>
              </div>
              <div style="color: #9ca3af; font-size: 14px; font-weight: 500; margin-top: 6px; text-transform: uppercase; letter-spacing: 1px;">
                New Contact Message
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px;">
              <p style="margin: 0 0 20px 0; font-size: 16px;">You have received a new message from your website contact form:</p>
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 20px; border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; width: 120px; font-weight: bold; color: #4b5563;">Name:</td>
                  <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${firstName} ${lastName}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #4b5563;">Email:</td>
                  <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;"><a href="mailto:${email}" style="color: #2563eb;">${email}</a></td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #4b5563;">Phone:</td>
                  <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${phone || 'Not provided'}</td>
                </tr>
              </table>
              <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb;">
                <h3 style="margin: 0 0 10px 0; font-size: 14px; text-transform: uppercase; color: #6b7280;">Message</h3>
                <p style="margin: 0; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">${message}</p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color: #1f2937; padding: 24px 40px; text-align: center; color: #9ca3af; font-size: 13px; line-height: 1.6;">
              <div style="color: #ffffff; font-weight: 700; font-size: 15px; margin-bottom: 6px;">
                WEBPRO50 Automated Notifications
              </div>
              <div>
                This alert was automatically generated when <strong style="color: #e8f0fe;">${firstName} ${lastName}</strong> submitted a contact form on your website.
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

  await transporter.sendMail({
    from: `"Website Contact" <${gmailUser}>`,
    to: receiverEmail,
    replyTo: email,
    subject,
    html: htmlContent,
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

  const subject = `🎉 Website Built & Ready! View Your Website First Draft — ${businessName}`;

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
                Our backend AI studio has successfully generated and built your custom website for <strong style="color: #1a56db;">${businessName}</strong>! It is now fully interactive and ready for your review right now. REMEMBER, some things may look out of place or a bit weird. This is why our hybrid system is best—us humans take over from here to iron these things out if you move forward with us.
              </p>
              
              <!-- Primary Preview CTA Button -->
              <table border="0" cellpadding="0" cellspacing="0" style="margin: 32px 0 28px 0; width: 100%;">
                <tr>
                  <td align="center">
                    <a href="${previewUrl}" target="_blank" style="display: inline-block; padding: 18px 40px; font-size: 17px; font-weight: 700; color: #ffffff; background-color: #1a56db; text-decoration: none; border-radius: 12px; box-shadow: 0 8px 16px rgba(26, 86, 219, 0.35);">
                      👀 View Your Website First Draft Here &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 12px; margin-bottom: 24px;">
                <h3 style="margin: 0 0 8px 0; font-size: 16px; color: #1e293b;">Next Steps:</h3>
                <ul style="margin: 0; padding-left: 20px; color: #4b5563; font-size: 14px; line-height: 1.6;">
                  <li><strong>Site Review:</strong> Inspect and make notes</li>
                  <li><strong>Customization:</strong> Adjust colors, fonts, or update text.</li>
                  <li><strong>Custom Domain &amp; Publishing:</strong> Connect your domain name and publish to the world.</li>
                </ul>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #1f2937; padding: 24px 40px; text-align: center; color: #9ca3af; font-size: 13px; line-height: 1.6;">
              <div style="color: #ffffff; font-weight: 700; font-size: 15px; margin-bottom: 6px;">
                WEBPRO50 Studio
              </div>
              <div>
                You received this email because your custom website first draft for <strong>${businessName}</strong> has completed generation.
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
      from: `"WEBPRO50 Studio" <${gmailUser}>`,
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

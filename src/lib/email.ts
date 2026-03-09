import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = process.env.EMAIL_FROM || "RehearSync <noreply@rehearsync.com>";
const APP_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";

// ─── Welcome Email ──────────────────────────────────────────────

export async function sendWelcomeEmail(to: string, name: string) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: "Welcome to RehearSync!",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="font-size: 24px; font-weight: 700; color: #1a202c; margin-bottom: 8px;">Welcome to RehearSync!</h1>
        <p style="font-size: 16px; color: #4a5568; line-height: 1.6;">
          Hey ${name}, thanks for signing up. You're all set to organize your rehearsals.
        </p>
        <p style="font-size: 16px; color: #4a5568; line-height: 1.6;">Here's how to get started:</p>
        <ol style="font-size: 15px; color: #4a5568; line-height: 1.8; padding-left: 20px;">
          <li><strong>Create a band</strong> from your dashboard</li>
          <li><strong>Add songs</strong> and upload sheet music or audio</li>
          <li><strong>Invite your band members</strong> with a shareable link</li>
          <li><strong>Start a rehearsal session</strong> with synchronized playback</li>
        </ol>
        <a href="${APP_URL}/dashboard" style="display: inline-block; background: #3182CE; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px; margin-top: 16px;">
          Go to Dashboard
        </a>
        <p style="font-size: 13px; color: #a0aec0; margin-top: 32px;">
          If you didn't create this account, you can safely ignore this email.
        </p>
      </div>
    `,
  });
}

// ─── Password Reset Email ───────────────────────────────────────

export async function sendPasswordResetEmail(to: string, token: string) {
  const resetUrl = `${APP_URL}/reset-password?token=${encodeURIComponent(token)}`;

  await resend.emails.send({
    from: FROM,
    to,
    subject: "Reset your RehearSync password",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="font-size: 24px; font-weight: 700; color: #1a202c; margin-bottom: 8px;">Reset your password</h1>
        <p style="font-size: 16px; color: #4a5568; line-height: 1.6;">
          We received a request to reset your password. Click the button below to choose a new one.
        </p>
        <a href="${resetUrl}" style="display: inline-block; background: #3182CE; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px; margin-top: 16px;">
          Reset Password
        </a>
        <p style="font-size: 14px; color: #718096; margin-top: 24px; line-height: 1.6;">
          This link expires in 1 hour. If you didn't request a reset, you can safely ignore this email.
        </p>
        <p style="font-size: 12px; color: #a0aec0; margin-top: 32px; word-break: break-all;">
          Or copy this link: ${resetUrl}
        </p>
      </div>
    `,
  });
}

// ─── Band Invite Email ──────────────────────────────────────────

export async function sendBandInviteEmail(
  to: string,
  bandName: string,
  inviterName: string,
  joinUrl: string
) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: `You're invited to join ${bandName} on RehearSync`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="font-size: 24px; font-weight: 700; color: #1a202c; margin-bottom: 8px;">You're invited!</h1>
        <p style="font-size: 16px; color: #4a5568; line-height: 1.6;">
          <strong>${inviterName}</strong> has invited you to join <strong>${bandName}</strong> on RehearSync — the rehearsal management platform for bands.
        </p>
        <p style="font-size: 16px; color: #4a5568; line-height: 1.6;">
          Access shared sheet music, audio tracks, and real-time rehearsal sessions — all in one place.
        </p>
        <a href="${joinUrl}" style="display: inline-block; background: #3182CE; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px; margin-top: 16px;">
          Join ${bandName}
        </a>
        <p style="font-size: 13px; color: #a0aec0; margin-top: 32px;">
          If you don't have an account yet, you'll be able to create one when you click the link.
        </p>
      </div>
    `,
  });
}

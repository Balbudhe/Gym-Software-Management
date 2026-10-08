const nodemailer = require('nodemailer');

const isSmtpConfigured = () =>
  Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

const createTransport = () => {
  if (!isSmtpConfigured()) {
    const error = new Error(
      'Email is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and SMTP_FROM in .env'
    );
    error.status = 503;
    throw error;
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || 'false') === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

const sendMail = async ({ to, subject, html, text }) => {
  const transporter = createTransport();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  await transporter.sendMail({ from, to, subject, html, text });
};

const sendPasswordResetEmail = async ({ to, name, resetUrl }) => {
  const subject = 'Reset your Gym Management password';
  const text = `Hi ${name || 'there'},\n\nReset your password using this link (valid for 1 hour):\n${resetUrl}\n\nIf you did not request this, ignore this email.`;
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #0f172a;">
      <p>Hi ${name || 'there'},</p>
      <p>We received a request to reset your Gym Management password.</p>
      <p>
        <a href="${resetUrl}" style="display:inline-block;background:#0f172a;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;">
          Reset password
        </a>
      </p>
      <p>Or copy this link:</p>
      <p style="word-break:break-all;">${resetUrl}</p>
      <p>This link expires in 1 hour. If you did not request a reset, you can ignore this email.</p>
    </div>
  `;
  await sendMail({ to, subject, html, text });
};

const sendOwnerAlertEmail = async ({ to, subject, html, text }) => {
  if (!to) return;
  if (!isSmtpConfigured()) {
    console.warn(`Owner alert skipped (SMTP not configured): ${subject}`);
    return;
  }
  await sendMail({ to, subject, html, text });
};

const sendMembershipReminderEmail = async ({ to, subject, html, text }) => {
  if (!to) return false;
  if (!isSmtpConfigured()) {
    console.warn(`Membership reminder email skipped (SMTP not configured): ${subject}`);
    return false;
  }
  await sendMail({ to, subject, html, text });
  return true;
};

const safeSendMembershipReminderEmail = async (payload) => {
  try {
    return await sendMembershipReminderEmail(payload);
  } catch (error) {
    console.error('Membership reminder email failed:', error.message);
    return false;
  }
};

module.exports = {
  isSmtpConfigured,
  sendMail,
  sendPasswordResetEmail,
  sendOwnerAlertEmail,
  sendMembershipReminderEmail,
  safeSendMembershipReminderEmail,
};

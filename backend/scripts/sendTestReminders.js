require('dotenv').config();
const mongoose = require('mongoose');
const { connectPlatform } = require('../config/platformDatabase');
const Gym = require('../models/platform/Gym');
const { addDays, startOfDay } = require('../utils/dates');
const { toLocalMobile } = require('../services/smsService');
const { isTextbeeConfigured, sendTextbeeSms } = require('../services/textbeeService');
const { isSmtpConfigured, sendMembershipReminderEmail } = require('../services/emailService');
const {
  REMINDER_KINDS,
  buildReminderContent,
  wrapHtml,
} = require('../services/membershipReminderMessages');

// Usage:
//   node scripts/sendTestReminders.js <phone> --email=you@gym.com
//   node scripts/sendTestReminders.js <phone> [kinds] [name] [--channel=email|sms|both] [--email=you@gym.com]
const DEFAULT_KINDS = ['before_3', 'before_2', 'on_expiry'];
const GAP_MS = Number(process.env.TEST_REMINDER_GAP_MS || 5000);
const CHANNELS = ['email', 'sms', 'both'];

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const parseArgs = (argv) => {
  const flags = Object.fromEntries(
    argv
      .filter((arg) => arg.startsWith('--'))
      .map((arg) => {
        const [key, value = 'true'] = arg.slice(2).split('=');
        return [key, value];
      })
  );
  const [phone, kinds, name] = argv.filter((arg) => !arg.startsWith('--'));
  return { phone, kinds, name, email: flags.email || '', channel: flags.channel || '' };
};

const run = async () => {
  const args = parseArgs(process.argv.slice(2));
  const phone = toLocalMobile(args.phone);
  const email = args.email.trim();
  const channel = args.channel || (email && phone.length === 10 ? 'both' : email ? 'email' : 'sms');
  if (!CHANNELS.includes(channel)) throw new Error(`--channel must be one of: ${CHANNELS.join(', ')}`);

  const kinds = args.kinds ? args.kinds.split(',').map((k) => k.trim()) : DEFAULT_KINDS;
  const unknown = kinds.filter((k) => !(k in REMINDER_KINDS));
  if (unknown.length) throw new Error(`Unknown reminder kinds: ${unknown.join(', ')}`);

  const useEmail = channel === 'email' || channel === 'both';
  const useSms = channel === 'sms' || channel === 'both';
  if (useEmail && !email) throw new Error('Pass --email=you@gym.com for the email reminder');
  if (useSms && phone.length !== 10) throw new Error('Pass a valid 10-digit mobile number for SMS');
  if (useEmail && !isSmtpConfigured()) {
    throw new Error('Email is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS in backend/.env');
  }
  if (useSms && !isTextbeeConfigured()) {
    throw new Error('TextBee is not configured. Set TEXTBEE_API_KEY in backend/.env');
  }

  await connectPlatform();
  const gym = await Gym().findOne({ status: 'active' }).lean();
  const gymName = gym?.name || 'Your Gym';
  const memberName = args.name || 'Test Member';

  for (const [index, kind] of kinds.entries()) {
    const expiryDate = startOfDay(addDays(new Date(), REMINDER_KINDS[kind]));
    const content = buildReminderContent(kind, { name: memberName, gymName, expiryDate });
    const label = `[${index + 1}/${kinds.length}] ${kind}`;

    if (useEmail) {
      await sendMembershipReminderEmail({
        to: email,
        subject: content.subject,
        text: content.text,
        html: wrapHtml(content.text),
      });
      console.log(`${label} email sent to ${email}`);
    }
    if (useSms) {
      await sendTextbeeSms({ to: phone, message: content.text });
      console.log(`${label} SMS sent to ${phone}`);
    }
    if (index < kinds.length - 1) await wait(GAP_MS);
  }
};

run()
  .catch((error) => {
    console.error('Test reminders failed:', error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect().catch(() => {}));

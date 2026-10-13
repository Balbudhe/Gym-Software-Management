require('dotenv').config();
const mongoose = require('mongoose');
const { connectPlatform } = require('../config/platformDatabase');
const Gym = require('../models/platform/Gym');
const { addDays, startOfDay } = require('../utils/dates');
const { isSmsConfigured, sendSms, toLocalMobile } = require('../services/smsService');
const { isWhatsAppConfigured, sendWhatsAppReminder } = require('../services/whatsappService');
const {
  REMINDER_KINDS,
  buildReminderContent,
  formatExpiry,
} = require('../services/membershipReminderMessages');

// Usage: node scripts/sendTestReminders.js <phone> [kinds] [name] [--channel=sms|whatsapp|both]
// kinds is a comma list from: before_3, before_2, on_expiry, after_1, after_2
const DEFAULT_KINDS = ['before_3', 'before_2', 'on_expiry'];
const GAP_MS = Number(process.env.TEST_REMINDER_GAP_MS || 5000);
const CHANNELS = ['sms', 'whatsapp', 'both'];

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
  return { phone, kinds, name, channel: flags.channel || 'whatsapp' };
};

const run = async () => {
  const args = parseArgs(process.argv.slice(2));
  const phone = toLocalMobile(args.phone);
  if (phone.length !== 10) throw new Error('Pass a valid 10-digit mobile number');

  const kinds = args.kinds ? args.kinds.split(',').map((k) => k.trim()) : DEFAULT_KINDS;
  const unknown = kinds.filter((k) => !(k in REMINDER_KINDS));
  if (unknown.length) throw new Error(`Unknown reminder kinds: ${unknown.join(', ')}`);

  if (!CHANNELS.includes(args.channel)) throw new Error(`--channel must be one of: ${CHANNELS.join(', ')}`);
  const useSms = args.channel === 'sms' || args.channel === 'both';
  const useWhatsApp = args.channel === 'whatsapp' || args.channel === 'both';

  if (useSms && !isSmsConfigured()) {
    throw new Error('No SMS provider configured. Set FAST2SMS_API_KEY or TWILIO_* in backend/.env');
  }
  if (useWhatsApp && !isWhatsAppConfigured()) {
    throw new Error('WhatsApp is not configured. Set WHATSAPP_TOKEN and WHATSAPP_PHONE_NUMBER_ID in backend/.env');
  }

  await connectPlatform();
  const gym = await Gym().findOne({ status: 'active' }).lean();
  const gymName = gym?.name || 'Your Gym';
  const memberName = args.name || 'Test Member';

  for (const [index, kind] of kinds.entries()) {
    const expiryDate = startOfDay(addDays(new Date(), REMINDER_KINDS[kind]));
    const { text } = buildReminderContent(kind, { name: memberName, gymName, expiryDate });
    const label = `[${index + 1}/${kinds.length}] ${kind}`;

    if (useWhatsApp) {
      await sendWhatsAppReminder({
        to: phone,
        kind,
        params: [memberName, gymName, formatExpiry(expiryDate)],
      });
      console.log(`${label} WhatsApp sent to ${phone}`);
    }
    if (useSms) {
      await sendSms({ to: phone, message: text });
      console.log(`${label} SMS sent to ${phone}: ${text}`);
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

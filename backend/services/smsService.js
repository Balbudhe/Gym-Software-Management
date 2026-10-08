const isSmsConfigured = () =>
  Boolean(
    process.env.FAST2SMS_API_KEY ||
      (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM)
  );

const digitsOnly = (value) => String(value || '').replace(/\D/g, '');

const toLocalMobile = (phone) => {
  const digits = digitsOnly(phone);
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  return digits;
};

const toE164 = (phone) => {
  const local = toLocalMobile(phone);
  if (local.length === 10) return `+91${local}`;
  if (String(phone).startsWith('+')) return String(phone).trim();
  return local ? `+${local}` : '';
};

const sendFast2Sms = async (phone, message) => {
  const numbers = toLocalMobile(phone);
  if (numbers.length !== 10) {
    throw new Error('SMS needs a valid 10-digit mobile number');
  }
  const url = new URL('https://www.fast2sms.com/dev/bulkV2');
  url.searchParams.set('authorization', process.env.FAST2SMS_API_KEY);
  url.searchParams.set('route', 'q');
  url.searchParams.set('message', message);
  url.searchParams.set('language', 'english');
  url.searchParams.set('flash', '0');
  url.searchParams.set('numbers', numbers);
  const response = await fetch(url, { method: 'GET' });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.return === false) {
    throw new Error(data.message || 'Fast2SMS could not send the message');
  }
};

const sendTwilioSms = async (phone, message) => {
  const to = toE164(phone);
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM;
  const body = new URLSearchParams({ To: to, From: from, Body: message });
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'Twilio could not send the message');
  }
};

const sendSms = async ({ to, message }) => {
  if (!to || !message) return false;
  if (!isSmsConfigured()) {
    console.warn('SMS skipped (FAST2SMS_API_KEY or Twilio is not configured)');
    return false;
  }
  if (process.env.FAST2SMS_API_KEY) {
    await sendFast2Sms(to, message);
    return true;
  }
  await sendTwilioSms(to, message);
  return true;
};

const safeSendSms = async ({ to, message }) => {
  try {
    return await sendSms({ to, message });
  } catch (error) {
    console.error('SMS failed:', error.message);
    return false;
  }
};

module.exports = { isSmsConfigured, sendSms, safeSendSms, toLocalMobile };

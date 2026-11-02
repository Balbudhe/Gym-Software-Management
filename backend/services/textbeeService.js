const { toLocalMobile, toE164 } = require('./smsService');

const TEXTBEE_BASE_URL = (process.env.TEXTBEE_BASE_URL || 'https://api.textbee.dev/api/v1').replace(/\/$/, '');

const isTextbeeConfigured = () => Boolean(String(process.env.TEXTBEE_API_KEY || '').trim());

const sendTextbeeSms = async ({ to, message }) => {
  const apiKey = String(process.env.TEXTBEE_API_KEY || '').trim();
  if (!apiKey) {
    throw new Error('TextBee is not configured (set TEXTBEE_API_KEY in backend/.env)');
  }
  if (!message) throw new Error('SMS message is required');

  const local = toLocalMobile(to);
  if (local.length !== 10) {
    throw new Error('SMS needs a valid 10-digit mobile number');
  }
  const recipient = toE164(to);
  const body = {
    recipients: [recipient],
    message: String(message),
  };
  // Optional. If wrong/stale, TextBee returns "Device not found".
  // Prefer omitting it so TextBee uses the default / most recently online phone.
  const deviceId = String(process.env.TEXTBEE_DEVICE_ID || '').trim();
  if (deviceId) body.deviceId = deviceId;

  const postSend = async (payload) => {
    const response = await fetch(`${TEXTBEE_BASE_URL}/gateway/send-sms`, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    return { response, data };
  };

  let { response, data } = await postSend(body);
  const firstError =
    data?.message || data?.error || data?.data?.message || `TextBee could not send the SMS (HTTP ${response.status})`;
  const firstErrorText = typeof firstError === 'string' ? firstError : JSON.stringify(firstError);

  if (
    body.deviceId &&
    (!response.ok || data?.data?.success === false) &&
    /device not found/i.test(firstErrorText)
  ) {
    console.warn(`TextBee deviceId "${body.deviceId}" was rejected; retrying with default device`);
    delete body.deviceId;
    ({ response, data } = await postSend(body));
  }

  if (!response.ok || data?.data?.success === false) {
    const detail =
      data?.message ||
      data?.error ||
      data?.data?.message ||
      `TextBee could not send the SMS (HTTP ${response.status})`;
    throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail));
  }

  const batchId = data?.data?.smsBatchId || data?.smsBatchId || null;
  console.log(`TextBee SMS accepted for ${recipient}${batchId ? ` batch=${batchId}` : ''}`);
  return { sent: true, to: recipient, batchId };
};

const safeSendTextbeeSms = async (args) => {
  if (!isTextbeeConfigured()) return { sent: false, reason: 'not_configured' };
  try {
    return await sendTextbeeSms(args);
  } catch (error) {
    console.error('TextBee SMS failed:', error.message);
    return { sent: false, reason: error.message };
  }
};

module.exports = {
  isTextbeeConfigured,
  sendTextbeeSms,
  safeSendTextbeeSms,
};

const { toLocalMobile } = require('./smsService');

const GRAPH_VERSION = process.env.WHATSAPP_GRAPH_VERSION || 'v21.0';

const TEMPLATES = {
  before_3: process.env.WHATSAPP_TEMPLATE_BEFORE_3 || 'membership_expiry_3_days',
  before_2: process.env.WHATSAPP_TEMPLATE_BEFORE_2 || 'membership_expiry_2_days',
  on_expiry: process.env.WHATSAPP_TEMPLATE_ON_EXPIRY || 'membership_expiry_today',
  after_1: process.env.WHATSAPP_TEMPLATE_EXPIRED || 'membership_expired',
  after_2: process.env.WHATSAPP_TEMPLATE_EXPIRED || 'membership_expired',
};

const isWhatsAppConfigured = () =>
  Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);

const sendWhatsAppReminder = async ({ to, kind, params = [] }) => {
  if (!isWhatsAppConfigured()) {
    throw new Error('WhatsApp is not configured (set WHATSAPP_TOKEN and WHATSAPP_PHONE_NUMBER_ID)');
  }
  const template = TEMPLATES[kind];
  if (!template) throw new Error(`No WhatsApp template for reminder "${kind}"`);
  const local = toLocalMobile(to);
  if (local.length !== 10) throw new Error('WhatsApp needs a valid 10-digit mobile number');

  const response = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: `91${local}`,
        type: 'template',
        template: {
          name: template,
          language: { code: process.env.WHATSAPP_TEMPLATE_LANG || 'en' },
          components: [
            {
              type: 'body',
              parameters: params.map((text) => ({ type: 'text', text: String(text ?? '') })),
            },
          ],
        },
      }),
    }
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error?.message || 'WhatsApp could not send the message');
  }
  return true;
};

const safeSendWhatsAppReminder = async (args) => {
  if (!isWhatsAppConfigured()) return false;
  try {
    return await sendWhatsAppReminder(args);
  } catch (error) {
    console.error('WhatsApp failed:', error.message);
    return false;
  }
};

module.exports = {
  WHATSAPP_TEMPLATES: TEMPLATES,
  isWhatsAppConfigured,
  sendWhatsAppReminder,
  safeSendWhatsAppReminder,
};

const { startOfDay } = require('../utils/dates');

const REMINDER_KINDS = {
  before_3: 3,
  before_2: 2,
  on_expiry: 0,
  after_1: -1,
  after_2: -2,
};

const formatExpiry = (value) =>
  value
    ? new Date(value).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '—';

const expiryKey = (expiryDate) => startOfDay(expiryDate).toISOString();

const buildReminderContent = (kind, { name, gymName, expiryDate }) => {
  const memberName = name || 'Member';
  const gym = gymName || 'the gym';
  const date = formatExpiry(expiryDate);

  if (kind === 'before_3') {
    const text = `Hi ${memberName}, your ${gym} membership expires in 3 days on ${date}. Please renew in time so your workouts are not interrupted.`;
    return { subject: `Your ${gym} membership expires in 3 days`, text };
  }
  if (kind === 'before_2') {
    const text = `Hi ${memberName}, your ${gym} membership expires in 2 days on ${date}. Kindly renew soon to continue using the gym without a break.`;
    return { subject: `Your ${gym} membership expires in 2 days`, text };
  }
  if (kind === 'on_expiry') {
    const text = `Hi ${memberName}, your ${gym} membership expires today (${date}). Please renew today to keep your gym access.`;
    return { subject: `Your ${gym} membership expires today`, text };
  }

  const text = `Firstly pay the fees else you don't allowed in gym. Hi ${memberName}, your ${gym} membership expired on ${date}. Renew immediately. Gym entry is not allowed until fees are paid.`;
  return { subject: `Pay fees now — gym entry is not allowed`, text };
};

const wrapHtml = (text) => `
  <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #0f172a;">
    ${text
      .split('\n')
      .map((line) => `<p>${line}</p>`)
      .join('')}
  </div>
`;

module.exports = {
  REMINDER_KINDS,
  expiryKey,
  buildReminderContent,
  wrapHtml,
};

const Gym = require('../models/platform/Gym');
const { getGymConnection } = require('../config/databaseManager');
const { registerGymModels } = require('../models/gym');
const { startOfDay, addDays } = require('../utils/dates');
const { daysUntilExpiry } = require('../services/membershipService');
const {
  REMINDER_KINDS,
} = require('../services/membershipReminderMessages');
const { sendMembershipReminder } = require('../services/membershipReminderService');

const kindForOffset = Object.fromEntries(
  Object.entries(REMINDER_KINDS).map(([kind, offset]) => [String(offset), kind])
);

const processGym = async (gym) => {
  const connection = await getGymConnection(gym._id);
  const models = registerGymModels(connection);
  const today = startOfDay();
  const from = startOfDay(addDays(today, -2));
  const to = startOfDay(addDays(today, 3));

  const members = await models.Member.find({
    status: { $ne: 'inactive' },
    expiryDate: { $gte: from, $lte: to },
  });

  let sent = 0;
  for (const member of members) {
    if (member.status === 'inactive') continue;
    const offset = daysUntilExpiry(member.expiryDate);
    const kind = kindForOffset[String(offset)];
    if (!kind) continue;
    if (!member.email && !member.phone) continue;

    try {
      const result = await sendMembershipReminder({
        member,
        gymName: gym.name,
        force: false,
        source: 'auto',
      });
      if (result.skipped) continue;
      sent += 1;
      console.log(
        `Membership reminder ${result.kind} sent to ${member.name} (${gym.slug}) email=${result.emailSent} sms=${result.smsSent}`
      );
    } catch (error) {
      console.error(`Membership reminder failed for ${member.name} (${gym.slug}):`, error.message);
    }
  }
  return sent;
};

const runMembershipReminders = async () => {
  const GymModel = Gym();
  const gyms = await GymModel.find({ status: 'active' });
  let total = 0;
  for (const gym of gyms) {
    try {
      total += await processGym(gym);
    } catch (error) {
      console.error(`Membership reminders failed for ${gym.slug}:`, error.message);
    }
  }
  console.log(`Membership reminders finished. Notices stored: ${total}`);
  return total;
};

const istNow = () => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const pick = (type) => parts.find((part) => part.type === type)?.value;
  return {
    hour: Number(pick('hour')),
    key: `${pick('year')}-${pick('month')}-${pick('day')}`,
  };
};

const startMembershipReminderJob = () => {
  const runHour = Number(process.env.REMINDER_HOUR_IST || 9);
  let lastRunKey = '';

  const maybeRun = async (force = false) => {
    const { hour, key } = istNow();
    if (!force && (hour < runHour || lastRunKey === key)) return;
    lastRunKey = key;
    try {
      await runMembershipReminders();
    } catch (error) {
      console.error('Membership reminder job failed:', error.message);
    }
  };

  setTimeout(() => maybeRun(true), 8000);
  setInterval(() => maybeRun(false), 15 * 60 * 1000);
  console.log(`Membership reminder job scheduled (daily from ${runHour}:00 IST, plus a startup run)`);
};

module.exports = { runMembershipReminders, startMembershipReminderJob };

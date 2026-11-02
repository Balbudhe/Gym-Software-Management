const { daysUntilExpiry } = require('./membershipService');
const { isSmtpConfigured, safeSendMembershipReminderEmail } = require('./emailService');
const { isTextbeeConfigured, safeSendTextbeeSms } = require('./textbeeService');
const {
  REMINDER_KINDS,
  expiryKey,
  buildReminderContent,
  wrapHtml,
} = require('./membershipReminderMessages');

const kindForOffset = Object.fromEntries(
  Object.entries(REMINDER_KINDS).map(([kind, offset]) => [String(offset), kind])
);

const resolveReminderKind = (expiryDate) => {
  const offset = daysUntilExpiry(expiryDate);
  if (offset == null) return null;
  if (kindForOffset[String(offset)]) return kindForOffset[String(offset)];
  if (offset < -2) return 'after_2';
  if (offset > 3) return 'before_3';
  return null;
};

const alreadySent = (member, kind, key) =>
  (member.reminderLog || []).some((entry) => entry.kind === kind && entry.expiryKey === key);

const sendMembershipReminder = async ({
  member,
  gymName,
  force = false,
  source = 'auto',
  triggeredByUserId = null,
}) => {
  if (!member) {
    const error = new Error('Member not found');
    error.status = 404;
    throw error;
  }
  if (member.status === 'inactive') {
    const error = new Error('Reminders are stopped for inactive members');
    error.status = 400;
    throw error;
  }
  if (!member.email && !member.phone) {
    const error = new Error('This member has no email or phone number');
    error.status = 400;
    throw error;
  }

  const kind = resolveReminderKind(member.expiryDate);
  if (!kind) {
    const error = new Error('Membership is not due for a reminder yet');
    error.status = 400;
    throw error;
  }

  const key = expiryKey(member.expiryDate);
  if (!force && alreadySent(member, kind, key)) {
    return { skipped: true, kind, emailSent: false, smsSent: false };
  }

  const content = buildReminderContent(kind, {
    name: member.name,
    gymName,
    expiryDate: member.expiryDate,
  });

  const problems = [];
  const details = [];
  let emailSent = false;
  let smsSent = false;
  let emailTo = null;
  let smsTo = null;

  if (member.email) {
    if (!isSmtpConfigured()) {
      problems.push('Email is not configured (set SMTP_HOST, SMTP_USER, and SMTP_PASS in backend/.env)');
    } else {
      const emailResult = await safeSendMembershipReminderEmail({
        to: member.email,
        subject: content.subject,
        text: content.text,
        html: wrapHtml(content.text),
      });
      emailSent = !!emailResult?.sent;
      emailTo = member.email;
      if (emailSent) details.push(`Email accepted for ${member.email}`);
      else problems.push(`Email failed: ${emailResult?.reason || 'unknown error'}`);
    }
  } else {
    problems.push('Member has no email');
  }

  if (member.phone) {
    if (!isTextbeeConfigured()) {
      problems.push('SMS is not configured (set TEXTBEE_API_KEY in backend/.env)');
    } else {
      const smsResult = await safeSendTextbeeSms({
        to: member.phone,
        message: content.text,
      });
      smsSent = !!smsResult?.sent;
      smsTo = smsResult?.to || null;
      if (smsSent) {
        details.push(`SMS accepted for ${smsTo} via TextBee`);
      } else {
        problems.push(
          `SMS failed: ${smsResult?.reason || 'unknown error'}. Keep the TextBee Android phone online with SMS permission.`
        );
      }
    }
  } else {
    problems.push('Member has no phone');
  }

  if (force && !emailSent && !smsSent) {
    const error = new Error(problems.join(' · ') || 'Could not send reminder');
    error.status = 503;
    throw error;
  }

  member.reminderLog = member.reminderLog || [];
  member.reminderLog.push({
    kind,
    expiryKey: key,
    sentAt: new Date(),
    emailSent,
    smsSent,
    whatsappSent: false,
    source,
    triggeredByUserId: triggeredByUserId || undefined,
  });
  await member.save();

  const hints = [];
  if (emailSent) hints.push('Check the member inbox and Spam/Promotions folders');
  if (smsSent) {
    hints.push('Keep the TextBee phone online until the SMS shows as sent in TextBee History');
  }

  return {
    skipped: false,
    kind,
    emailSent,
    smsSent,
    emailTo,
    smsTo,
    details,
    problems,
    hints,
  };
};

module.exports = {
  resolveReminderKind,
  alreadySent,
  sendMembershipReminder,
  expiryKey,
};

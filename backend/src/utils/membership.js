const { daysBetween, startOfDay } = require('./dates');

function computeStatus(expiryDate, expiringSoonDays = 7, inactive = false) {
  if (inactive) return 'inactive';
  const remaining = daysBetween(new Date(), expiryDate);
  if (remaining < 0) return 'expired';
  if (remaining <= expiringSoonDays) return 'expiring';
  return 'active';
}

function membershipWindow(status, expiringSoonDays = 7, customDays) {
  const today = startOfDay(new Date());
  if (status === 'expired') {
    return { expiryDate: { $lt: today } };
  }
  if (status === 'expiring') {
    const until = new Date(today);
    until.setDate(until.getDate() + (customDays || expiringSoonDays));
    return { expiryDate: { $gte: today, $lte: until } };
  }
  if (status === 'active') {
    const until = new Date(today);
    until.setDate(until.getDate() + expiringSoonDays);
    return { expiryDate: { $gt: until } };
  }
  return {};
}

module.exports = { computeStatus, membershipWindow };

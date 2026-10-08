const { startOfDay, addDays, addDuration } = require('../utils/dates');

const computeMembershipStatus = (expiryDate) => {
  if (!expiryDate) return 'inactive';
  const today = startOfDay(new Date());
  const expiry = startOfDay(expiryDate);
  if (expiry < today) return 'expired';
  return 'active';
};

const isExpiringSoon = (expiryDate, days = 7) => {
  if (!expiryDate) return false;
  const today = startOfDay(new Date());
  const expiry = startOfDay(expiryDate);
  if (expiry < today) return false;
  return expiry <= startOfDay(addDays(today, Number(days) || 7));
};

const expiryFilter = (status, expiringDays) => {
  const today = startOfDay(new Date());
  if (status === 'expired') {
    return { expiryDate: { $lt: today } };
  }
  if (status === 'expiring') {
    const days = Number(expiringDays) || 7;
    return {
      expiryDate: {
        $gte: today,
        $lte: startOfDay(addDays(today, days)),
      },
    };
  }
  if (status === 'active') {
    return { expiryDate: { $gte: today }, status: { $ne: 'inactive' } };
  }
  return {};
};

const calculateExpiry = (startDate, plan) => {
  const start = startDate ? new Date(startDate) : new Date();
  let unit = plan.durationUnit || 'month';
  if (unit === 'days') unit = 'day';
  if (unit === 'weeks') unit = 'week';
  if (unit === 'months') unit = 'month';
  if (unit === 'years') unit = 'year';
  return addDuration(start, plan.durationValue, unit);
};

const daysExpired = (expiryDate) => {
  if (!expiryDate) return 0;
  const today = startOfDay(new Date());
  const expiry = startOfDay(expiryDate);
  if (expiry >= today) return 0;
  return Math.floor((today - expiry) / 86400000);
};

const daysUntilExpiry = (expiryDate) => {
  if (!expiryDate) return null;
  const today = startOfDay(new Date());
  const expiry = startOfDay(expiryDate);
  return Math.ceil((expiry - today) / 86400000);
};

module.exports = {
  computeMembershipStatus,
  isExpiringSoon,
  expiryFilter,
  calculateExpiry,
  daysExpired,
  daysUntilExpiry,
};

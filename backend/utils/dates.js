const IST = 'Asia/Kolkata';

const startOfDay = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const endOfDay = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

const addDuration = (date, value, unit) => {
  const d = new Date(date);
  const amount = Number(value) || 0;
  if (unit === 'year' || unit === 'years') d.setFullYear(d.getFullYear() + amount);
  else if (unit === 'week' || unit === 'weeks') d.setDate(d.getDate() + amount * 7);
  else d.setMonth(d.getMonth() + amount);
  return d;
};

const formatTime = (date) => {
  if (!date) return null;
  return new Date(date).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

const workingHours = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return null;
  const ms = new Date(checkOut) - new Date(checkIn);
  if (ms < 0) return null;
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  return `${hours}h ${minutes}m`;
};

const workingHoursDecimal = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return 0;
  const ms = new Date(checkOut) - new Date(checkIn);
  return ms > 0 ? Number((ms / 3600000).toFixed(2)) : 0;
};

const ymdIst = (date = new Date()) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: IST,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);

const startOfIstDay = (date = new Date()) => new Date(`${ymdIst(date)}T00:00:00+05:30`);

const endOfIstDay = (date = new Date()) => new Date(startOfIstDay(date).getTime() + 86400000 - 1);

const parseYmdIst = (value) => {
  const ymd = String(value || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  const parsed = new Date(`${ymd}T00:00:00+05:30`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const monthKeyIst = (date = new Date()) => ymdIst(date).slice(0, 7);

const parseMonthIst = (value) => {
  const key = String(value || '').slice(0, 7);
  return /^\d{4}-\d{2}$/.test(key) ? key : null;
};

const monthRangeIst = (monthKey) => {
  const key = parseMonthIst(monthKey) || monthKeyIst();
  const [year, month] = key.split('-').map(Number);
  const start = new Date(`${key}-01T00:00:00+05:30`);
  const nextKey =
    month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, '0')}`;
  const endExclusive = new Date(`${nextKey}-01T00:00:00+05:30`);
  const days = Math.round((endExclusive.getTime() - start.getTime()) / 86400000);
  return { key, start, endExclusive, days };
};

module.exports = {
  IST,
  startOfDay,
  endOfDay,
  addDays,
  addDuration,
  formatTime,
  workingHours,
  workingHoursDecimal,
  ymdIst,
  startOfIstDay,
  endOfIstDay,
  parseYmdIst,
  monthKeyIst,
  parseMonthIst,
  monthRangeIst,
};

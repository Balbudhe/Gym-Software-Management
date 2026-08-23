function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function addDuration(startDate, value, unit) {
  const result = new Date(startDate);
  if (unit === 'day') result.setDate(result.getDate() + value);
  else if (unit === 'year') result.setFullYear(result.getFullYear() + value);
  else result.setMonth(result.getMonth() + value);
  return result;
}

function daysBetween(from, to) {
  const a = startOfDay(from).getTime();
  const b = startOfDay(to).getTime();
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

function startOfWeek(date = new Date()) {
  const d = startOfDay(date);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  return d;
}

function startOfMonth(date = new Date()) {
  const d = startOfDay(date);
  d.setDate(1);
  return d;
}

function parseDateRange({ datePreset, startDate, endDate }) {
  const now = new Date();
  if (datePreset === 'today') {
    return { start: startOfDay(now), end: endOfDay(now) };
  }
  if (datePreset === 'week') {
    return { start: startOfWeek(now), end: endOfDay(now) };
  }
  if (datePreset === 'month') {
    return { start: startOfMonth(now), end: endOfDay(now) };
  }
  if (startDate || endDate) {
    return {
      start: startDate ? startOfDay(startDate) : null,
      end: endDate ? endOfDay(endDate) : null,
    };
  }
  return { start: null, end: null };
}

function formatWorkingHours(checkInTime, checkOutTime) {
  if (!checkInTime || !checkOutTime) return null;
  const ms = new Date(checkOutTime) - new Date(checkInTime);
  if (ms < 0) return null;
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  return {
    hours,
    minutes,
    label: `${hours}h ${String(minutes).padStart(2, '0')}m`,
    totalMinutes: hours * 60 + minutes,
  };
}

function isLate(checkInTime, lateAfterTime = '09:00') {
  const [hh, mm] = String(lateAfterTime).split(':').map(Number);
  const threshold = new Date(checkInTime);
  threshold.setHours(hh || 9, mm || 0, 0, 0);
  return new Date(checkInTime) > threshold;
}

module.exports = {
  startOfDay,
  endOfDay,
  addDuration,
  daysBetween,
  startOfWeek,
  startOfMonth,
  parseDateRange,
  formatWorkingHours,
  isLate,
};

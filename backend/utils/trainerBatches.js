const BATCH_NAMES = ['morning', 'afternoon', 'evening'];
const BATCH_LABELS = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
};
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const GYM_TIMEZONE = process.env.GYM_TIMEZONE || 'Asia/Kolkata';
const LATE_GRACE_MINUTES = 15;
const HOURS_ALLOWANCE_MINUTES = 60;

const parseRawBatches = (raw) => {
  if (!raw) return [];
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return Array.isArray(raw) ? raw : [];
};

const normalizeBatches = (raw) => {
  const parsed = parseRawBatches(raw);
  const seen = new Set();
  const batches = [];

  for (const item of parsed) {
    const name = String(item?.name || item?.type || '').toLowerCase();
    if (!BATCH_NAMES.includes(name) || seen.has(name)) continue;

    const startTime = String(item.startTime || '').slice(0, 5);
    const endTime = String(item.endTime || '').slice(0, 5);
    if (!TIME_RE.test(startTime) || !TIME_RE.test(endTime)) {
      const error = new Error(`Valid start and end time are required for ${name} batch`);
      error.statusCode = 400;
      throw error;
    }
    if (startTime >= endTime) {
      const error = new Error(`${name} batch end time must be after start time`);
      error.statusCode = 400;
      throw error;
    }

    seen.add(name);
    batches.push({ name, startTime, endTime });
  }

  return batches.sort((a, b) => BATCH_NAMES.indexOf(a.name) - BATCH_NAMES.indexOf(b.name));
};

const pad = (value) => String(value).padStart(2, '0');

const timeToMinutes = (hhmm) => {
  const [hour, minute] = String(hhmm || '').slice(0, 5).split(':').map(Number);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
  return hour * 60 + minute;
};

const formatTime12 = (hhmm) => {
  if (!hhmm) return '';
  const [hourPart, minutePart] = String(hhmm).slice(0, 5).split(':');
  const hour = Number(hourPart);
  const minute = Number(minutePart);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return hhmm;
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = ((hour + 11) % 12) + 1;
  return `${hour12}:${pad(minute)} ${period}`;
};

const dateToHhmm = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: GYM_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const hour = parts.find((part) => part.type === 'hour')?.value || '00';
  const minute = parts.find((part) => part.type === 'minute')?.value || '00';
  return `${pad(hour)}:${pad(minute)}`;
};

const formatBatchRange = (batch) => {
  if (!batch) return '';
  const label = BATCH_LABELS[batch.name] || batch.name;
  return `${label} ${formatTime12(batch.startTime)} – ${formatTime12(batch.endTime)}`;
};

const formatAssignedHours = (batches = []) =>
  (batches || []).map(formatBatchRange).filter(Boolean).join(', ');

const findActiveBatch = (batches = [], date = new Date()) => {
  const now = dateToHhmm(date);
  return (batches || []).find((batch) => batch.startTime <= now && now <= batch.endTime) || null;
};

const batchDurationMinutes = (batch) => {
  const start = timeToMinutes(batch?.startTime);
  const end = timeToMinutes(batch?.endTime);
  if (start == null || end == null || end <= start) return 0;
  return end - start;
};

const requiredMinutesForBatch = (batch) =>
  Math.max(0, batchDurationMinutes(batch) - HOURS_ALLOWANCE_MINUTES);

const isSunday = (date = new Date()) =>
  new Intl.DateTimeFormat('en-US', { timeZone: GYM_TIMEZONE, weekday: 'short' }).format(date) === 'Sun';

const formatMinutes = (minutes) => {
  const total = Math.max(0, Math.round(Number(minutes) || 0));
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  if (!hours) return `${mins}m`;
  return mins ? `${hours}h ${mins}m` : `${hours}h`;
};

const attendanceStatusForBatch = (date, batch) => {
  if (!date || !batch) return 'absent';
  const nowMins = timeToMinutes(dateToHhmm(date));
  const startMins = timeToMinutes(batch.startTime);
  if (nowMins == null || startMins == null) return 'present';
  return nowMins > startMins + LATE_GRACE_MINUTES ? 'late' : 'present';
};

const assertWithinAssignedHours = (batches, date = new Date(), action = 'Attendance') => {
  if (isSunday(date)) {
    const error = new Error('Sunday is a holiday. Check-in is not required today.');
    error.statusCode = 400;
    throw error;
  }
  if (!batches?.length) {
    const error = new Error('Batch timing is not assigned. Ask the gym owner to set your batch hours.');
    error.statusCode = 400;
    throw error;
  }
  const active = findActiveBatch(batches, date);
  if (!active) {
    const error = new Error(
      `${action} is only allowed during your assigned batch time (${formatAssignedHours(batches)}).`
    );
    error.statusCode = 400;
    throw error;
  }
  return active;
};

const attendanceWindow = (batches = [], item = null, date = new Date()) => {
  const hasBatches = !!(batches && batches.length);
  const holiday = isSunday(date);
  const activeBatch = holiday ? null : findActiveBatch(batches, date);
  const withinWindow = !!activeBatch;
  const checkedIn = !!item?.checkInTime;
  const checkedOut = !!item?.checkOutTime;
  const requiredMinutes = item?.requiredMinutes ?? (activeBatch ? requiredMinutesForBatch(activeBatch) : null);
  return {
    hasBatches,
    isHoliday: holiday,
    withinWindow,
    activeBatch,
    allowedHoursLabel: formatAssignedHours(batches),
    requiredMinutes,
    requiredLabel: requiredMinutes != null ? formatMinutes(requiredMinutes) : null,
    canCheckIn: !holiday && hasBatches && withinWindow && !checkedIn,
    canCheckOut: checkedIn && !checkedOut,
  };
};

module.exports = {
  BATCH_NAMES,
  HOURS_ALLOWANCE_MINUTES,
  normalizeBatches,
  dateToHhmm,
  findActiveBatch,
  formatAssignedHours,
  attendanceStatusForBatch,
  assertWithinAssignedHours,
  attendanceWindow,
  batchDurationMinutes,
  requiredMinutesForBatch,
  isSunday,
  formatMinutes,
};

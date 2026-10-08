const { startOfDay } = require('../utils/dates');
const { attendanceStatusForBatch } = require('../utils/trainerBatches');

const LATE_HOUR = 10;

const attendanceStatusForCheckIn = (checkInTime, batch) => {
  if (!checkInTime) return 'absent';
  if (batch) return attendanceStatusForBatch(checkInTime, batch);
  const hour = new Date(checkInTime).getHours();
  return hour >= LATE_HOUR ? 'late' : 'present';
};

const attendanceDateKey = (date = new Date()) => startOfDay(date);

module.exports = { attendanceStatusForCheckIn, attendanceDateKey, LATE_HOUR };

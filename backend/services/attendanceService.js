const { startOfDay, addDays } = require('../utils/dates');
const {
  attendanceStatusForBatch,
  findActiveBatch,
  requiredMinutesForBatch,
  isSunday,
} = require('../utils/trainerBatches');

const LATE_HOUR = 10;
const PRESENT_STATUSES = ['present', 'late', 'in_progress'];

const attendanceStatusForCheckIn = (checkInTime, batch) => {
  if (!checkInTime) return 'absent';
  if (batch) return attendanceStatusForBatch(checkInTime, batch);
  const hour = new Date(checkInTime).getHours();
  return hour >= LATE_HOUR ? 'late' : 'present';
};

const attendanceDateKey = (date = new Date()) => startOfDay(date);

const workedMinutesBetween = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return 0;
  const ms = new Date(checkOut) - new Date(checkIn);
  return ms > 0 ? Math.floor(ms / 60000) : 0;
};

const requiredMinutesForShift = (item, batches = []) => {
  if (item?.requiredMinutes != null) return item.requiredMinutes;
  const batch = findActiveBatch(batches, item?.checkInTime || new Date());
  return batch ? requiredMinutesForBatch(batch) : 0;
};

const statusForCompletedShift = (item, batches = []) => {
  const workedMinutes = workedMinutesBetween(item.checkInTime, item.checkOutTime);
  const requiredMinutes = requiredMinutesForShift(item, batches);
  const complete = workedMinutes >= requiredMinutes;
  return {
    workedMinutes,
    requiredMinutes,
    status: complete ? 'present' : 'absent',
    absentReason: complete ? null : 'short_hours',
  };
};

const closeStaleShifts = (models, filter = {}) =>
  models.TrainerAttendance.updateMany(
    {
      ...filter,
      date: { $lt: attendanceDateKey() },
      checkInTime: { $ne: null },
      checkOutTime: null,
      status: { $ne: 'absent' },
    },
    { $set: { status: 'absent', absentReason: 'no_check_out', outsideGym: false } }
  );

const statusForMissingDay = (date) => (isSunday(date) ? 'holiday' : 'absent');

const markMissedDays = async (models, { days = 14 } = {}) => {
  const today = attendanceDateKey();
  const trainers = await models.Trainer.find({ status: 'active' }).select('_id branchId createdAt joiningDate').lean();
  if (!trainers.length) return 0;

  const ops = [];
  for (let offset = days; offset >= 1; offset -= 1) {
    const date = attendanceDateKey(addDays(today, -offset));
    const status = statusForMissingDay(date);
    for (const trainer of trainers) {
      const createdDay = startOfDay(trainer.createdAt || date);
      const joinedDay = trainer.joiningDate ? startOfDay(trainer.joiningDate) : createdDay;
      if (date <= createdDay || date < joinedDay) continue;
      ops.push({
        updateOne: {
          filter: { trainerId: trainer._id, date },
          update: {
            $setOnInsert: {
              trainerId: trainer._id,
              branchId: trainer.branchId,
              date,
              status,
              absentReason: status === 'absent' ? 'no_check_in' : null,
            },
          },
          upsert: true,
        },
      });
    }
  }
  if (!ops.length) return 0;
  const result = await models.TrainerAttendance.bulkWrite(ops, { ordered: false });
  return result.upsertedCount || 0;
};

module.exports = {
  LATE_HOUR,
  PRESENT_STATUSES,
  attendanceStatusForCheckIn,
  attendanceDateKey,
  workedMinutesBetween,
  statusForCompletedShift,
  closeStaleShifts,
  statusForMissingDay,
  markMissedDays,
};

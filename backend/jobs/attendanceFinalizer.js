const Gym = require('../models/platform/Gym');
const { getGymConnection } = require('../config/databaseManager');
const { registerGymModels } = require('../models/gym');
const { closeStaleShifts, markMissedDays } = require('../services/attendanceService');
const { ymdIst } = require('../utils/dates');

const LOOKBACK_DAYS = Number(process.env.ATTENDANCE_LOOKBACK_DAYS || 14);

const finalizeGym = async (gym) => {
  const connection = await getGymConnection(gym._id);
  const models = registerGymModels(connection);
  const closed = await closeStaleShifts(models);
  const created = await markMissedDays(models, { days: LOOKBACK_DAYS });
  return { closed: closed.modifiedCount || 0, created };
};

const runAttendanceFinalizer = async () => {
  const gyms = await Gym().find({ status: 'active' });
  let closed = 0;
  let created = 0;
  for (const gym of gyms) {
    try {
      const result = await finalizeGym(gym);
      closed += result.closed;
      created += result.created;
    } catch (error) {
      console.error(`Attendance finalizer failed for ${gym.slug}:`, error.message);
    }
  }
  console.log(
    `Attendance finalizer finished. Missed check-outs marked absent: ${closed}. Missed days recorded: ${created}`
  );
};

const startAttendanceFinalizerJob = () => {
  let lastRunKey = '';
  const maybeRun = async (force = false) => {
    const key = ymdIst();
    if (!force && lastRunKey === key) return;
    lastRunKey = key;
    try {
      await runAttendanceFinalizer();
    } catch (error) {
      console.error('Attendance finalizer job failed:', error.message);
    }
  };

  setTimeout(() => maybeRun(true), 10000);
  setInterval(() => maybeRun(false), 15 * 60 * 1000);
  console.log('Attendance finalizer scheduled (after midnight IST daily, plus a startup run)');
};

module.exports = { runAttendanceFinalizer, startAttendanceFinalizerJob };

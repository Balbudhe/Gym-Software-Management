const Member = require('../models/Member');
const Trainer = require('../models/Trainer');
const TrainerAttendance = require('../models/TrainerAttendance');
const { ok } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { startOfDay, endOfDay, startOfMonth, daysBetween } = require('../utils/dates');
const { computeStatus } = require('../utils/membership');

exports.ownerDashboard = asyncHandler(async (req, res) => {
  const gymId = req.user.gymId;
  const expiringDays = req.gym.settings?.expiringSoonDays || 7;
  const todayStart = startOfDay();
  const todayEnd = endOfDay();
  const monthStart = startOfMonth();
  const expiringUntil = new Date(todayStart);
  expiringUntil.setDate(expiringUntil.getDate() + expiringDays);

  const members = await Member.find({ gymId });
  const live = members.filter((m) => m.status !== 'inactive');
  const withStatus = live.map((m) => ({
    ...m.toObject(),
    status: computeStatus(m.expiryDate, expiringDays),
  }));

  const totalMembers = members.length;
  const activeMembers = withStatus.filter((m) => m.status === 'active').length;
  const expiringSoon = withStatus.filter((m) => m.status === 'expiring').length;
  const expiredMembers = withStatus.filter((m) => m.status === 'expired').length;

  const [totalTrainers, presentToday, newToday] = await Promise.all([
    Trainer.countDocuments({ gymId, status: 'active' }),
    TrainerAttendance.countDocuments({
      gymId,
      date: todayStart,
      checkInTime: { $ne: null },
    }),
    Member.countDocuments({ gymId, createdAt: { $gte: todayStart, $lte: todayEnd } }),
  ]);

  const recentAdmissions = await Member.find({ gymId })
    .populate('createdByTrainerId', 'name')
    .populate('assignedTrainerId', 'name')
    .populate({ path: 'membershipId', populate: { path: 'membershipPlanId', select: 'name' } })
    .sort({ createdAt: -1 })
    .limit(8);

  const attendanceToday = await TrainerAttendance.find({ gymId, date: todayStart }).populate(
    'trainerId',
    'name profilePhoto'
  );

  const expiring = await Member.find({
    gymId,
    status: { $ne: 'inactive' },
    expiryDate: { $gte: todayStart, $lte: expiringUntil },
  })
    .populate('createdByTrainerId', 'name')
    .populate('assignedTrainerId', 'name')
    .populate({ path: 'membershipId', populate: { path: 'membershipPlanId', select: 'name' } })
    .sort({ expiryDate: 1 })
    .limit(6);

  const expired = await Member.find({ gymId, expiryDate: { $lt: todayStart } })
    .populate('createdByTrainerId', 'name')
    .populate('assignedTrainerId', 'name')
    .populate({ path: 'membershipId', populate: { path: 'membershipPlanId', select: 'name' } })
    .sort({ expiryDate: -1 })
    .limit(6);

  const trainers = await Trainer.find({ gymId }).select('name');
  const admissionsByTrainer = await Promise.all(
    trainers.map(async (t) => ({
      name: t.name,
      value: await Member.countDocuments({ gymId, createdByTrainerId: t._id }),
    }))
  );

  const growth = [];
  for (let i = 5; i >= 0; i -= 1) {
    const cursor = new Date();
    cursor.setMonth(cursor.getMonth() - i, 1);
    cursor.setHours(0, 0, 0, 0);
    const next = new Date(cursor);
    next.setMonth(next.getMonth() + 1);
    const count = await Member.countDocuments({ gymId, createdAt: { $gte: cursor, $lt: next } });
    growth.push({
      month: cursor.toLocaleString('en-IN', { month: 'short' }),
      members: count,
    });
  }

  ok(res, {
    stats: {
      totalMembers,
      activeMembers,
      expiringSoon,
      expiredMembers,
      totalTrainers,
      trainersPresentToday: presentToday,
      newAdmissionsToday: newToday,
    },
    recentAdmissions: recentAdmissions.map((m) => ({
      ...m.toObject(),
      status: computeStatus(m.expiryDate, expiringDays, m.status === 'inactive'),
    })),
    attendanceToday,
    expiring: expiring.map((m) => ({
      ...m.toObject(),
      status: 'expiring',
      daysRemaining: daysBetween(new Date(), m.expiryDate),
    })),
    expired: expired.map((m) => ({
      ...m.toObject(),
      status: 'expired',
      daysExpired: Math.abs(daysBetween(new Date(), m.expiryDate)),
    })),
    charts: {
      memberGrowth: growth,
      admissionsByTrainer,
      membershipStatus: [
        { name: 'Active', value: activeMembers },
        { name: 'Expiring', value: expiringSoon },
        { name: 'Expired', value: expiredMembers },
      ],
    },
  });
});

exports.trainerDashboard = asyncHandler(async (req, res) => {
  const gymId = req.user.gymId;
  const trainerId = req.user.trainerId;
  const expiringDays = req.gym.settings?.expiringSoonDays || 7;
  const todayStart = startOfDay();
  const expiringUntil = new Date(todayStart);
  expiringUntil.setDate(expiringUntil.getDate() + expiringDays);

  const myAdmissions = await Member.countDocuments({ gymId, createdByTrainerId: trainerId });
  const assigned = await Member.find({ gymId, assignedTrainerId: trainerId });
  const withStatus = assigned.map((m) => computeStatus(m.expiryDate, expiringDays, m.status === 'inactive'));

  const attendance = await TrainerAttendance.findOne({ gymId, trainerId, date: todayStart });

  const expiring = await Member.find({
    gymId,
    assignedTrainerId: trainerId,
    status: { $ne: 'inactive' },
    expiryDate: { $gte: todayStart, $lte: expiringUntil },
  })
    .sort({ expiryDate: 1 })
    .limit(5);

  ok(res, {
    stats: {
      myAdmissions,
      myActiveMembers: withStatus.filter((s) => s === 'active').length,
      expiringMembers: withStatus.filter((s) => s === 'expiring').length,
      expiredMembers: withStatus.filter((s) => s === 'expired').length,
    },
    attendance,
    expiring,
  });
});

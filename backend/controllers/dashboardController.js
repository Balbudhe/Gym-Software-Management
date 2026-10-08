const asyncHandler = require('../utils/asyncHandler');
const { expiryFilter } = require('../services/membershipService');
const { addDays, IST, ymdIst, startOfIstDay } = require('../utils/dates');
const { attendanceDateKey } = require('../services/attendanceService');

const ADMISSION_DAYS = 14;

const fillAdmissionDays = (rows, from, days = ADMISSION_DAYS) => {
  const counts = new Map((rows || []).map((row) => [row._id, row.count]));
  return Array.from({ length: days }, (_, index) => {
    const day = new Date(from.getTime() + index * 86400000);
    const key = ymdIst(day);
    return { _id: key, count: counts.get(key) || 0 };
  });
};

exports.overview = asyncHandler(async (req, res) => {
  const memberMatch = { ...req.branchFilter, status: { $ne: 'inactive' } };
  const trainerMatch = { ...req.branchFilter, status: 'active' };
  const today = attendanceDateKey();
  const from = startOfIstDay(addDays(new Date(), -(ADMISSION_DAYS - 1)));

  const [
    totalMembers,
    totalTrainers,
    activeMembers,
    expiringSoon,
    expired,
    presentToday,
    recentAdmissions,
    recentAttendance,
  ] = await Promise.all([
    req.models.Member.countDocuments(memberMatch),
    req.models.Trainer.countDocuments(trainerMatch),
    req.models.Member.countDocuments({ ...req.branchFilter, ...expiryFilter('active') }),
    req.models.Member.countDocuments({ ...req.branchFilter, ...expiryFilter('expiring', 7) }),
    req.models.Member.countDocuments({ ...req.branchFilter, ...expiryFilter('expired') }),
    req.models.TrainerAttendance.countDocuments({
      ...req.branchFilter,
      date: today,
      status: { $in: ['present', 'late'] },
    }),
    req.models.Member.find(req.branchFilter)
      .sort({ createdAt: -1 })
      .limit(8)
      .populate('branchId', 'name')
      .populate('createdByTrainerId', 'name')
      .populate('assignedTrainerId', 'name')
      .lean(),
    req.models.TrainerAttendance.find({ ...req.branchFilter, date: today })
      .populate('branchId', 'name')
      .populate('trainerId', 'name')
      .lean(),
  ]);

  const admissionsByDayRaw = await req.models.Member.aggregate([
    { $match: { ...req.branchFilter, createdAt: { $gte: from } } },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: IST },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);
  const admissionsByDay = fillAdmissionDays(admissionsByDayRaw, from);

  let myStats = null;
  if (req.user.role === 'TRAINER') {
    const trainerId = req.user.trainerId;
    const [myAdmissions, myMembers, myExpiring, myExpired, todayAttendance] = await Promise.all([
      req.models.Member.countDocuments({ createdByTrainerId: trainerId }),
      req.models.Member.countDocuments({ assignedTrainerId: trainerId, status: { $ne: 'inactive' } }),
      req.models.Member.countDocuments({ assignedTrainerId: trainerId, ...expiryFilter('expiring', 7) }),
      req.models.Member.countDocuments({ assignedTrainerId: trainerId, ...expiryFilter('expired') }),
      req.models.TrainerAttendance.findOne({ trainerId, date: today }),
    ]);
    myStats = {
      myAdmissions,
      myMembers,
      myExpiring,
      myExpired,
      todayAttendance,
    };
  }

  res.json({
    stats: {
      totalMembers,
      totalTrainers,
      activeMembers,
      expiringSoon,
      expired,
      presentToday,
    },
    recentAdmissions,
    recentAttendance,
    admissionsByDay,
    myStats,
  });
});

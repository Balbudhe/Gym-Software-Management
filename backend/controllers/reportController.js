const asyncHandler = require('../utils/asyncHandler');
const { expiryFilter } = require('../services/membershipService');
const { startOfDay, addDays, workingHoursDecimal } = require('../utils/dates');
const { attendanceDateKey } = require('../services/attendanceService');

exports.memberReport = asyncHandler(async (req, res) => {
  const branches = req.branchId
    ? await req.models.Branch.find({ _id: req.branchId })
    : await req.models.Branch.find();

  const items = await Promise.all(
    branches.map(async (branch) => {
      const branchId = branch._id;
      const [total, active, expiring, expired] = await Promise.all([
        req.models.Member.countDocuments({ branchId, status: { $ne: 'inactive' } }),
        req.models.Member.countDocuments({ branchId, ...expiryFilter('active') }),
        req.models.Member.countDocuments({ branchId, ...expiryFilter('expiring', req.query.expiringDays || 7) }),
        req.models.Member.countDocuments({ branchId, ...expiryFilter('expired') }),
      ]);
      return {
        branchId,
        branch: branch.name,
        totalMembers: total,
        active,
        expiring,
        expired,
      };
    })
  );

  res.json({ items });
});

exports.admissionReport = asyncHandler(async (req, res) => {
  const match = { ...req.branchFilter };
  if (req.query.from || req.query.to) {
    match.createdAt = {};
    if (req.query.from) match.createdAt.$gte = new Date(req.query.from);
    if (req.query.to) match.createdAt.$lte = new Date(req.query.to);
  }

  const rows = await req.models.Member.aggregate([
    { $match: match },
    {
      $group: {
        _id: { branchId: '$branchId', trainerId: '$createdByTrainerId' },
        admissions: { $sum: 1 },
      },
    },
  ]);

  const items = await Promise.all(
    rows.map(async (row) => {
      const branch = await req.models.Branch.findById(row._id.branchId).select('name');
      const trainer = row._id.trainerId
        ? await req.models.Trainer.findById(row._id.trainerId).select('name')
        : null;
      return {
        branchId: row._id.branchId,
        branch: branch?.name || 'Unknown',
        trainerId: row._id.trainerId,
        trainer: trainer?.name || 'Owner',
        admissions: row.admissions,
      };
    })
  );

  items.sort((a, b) => b.admissions - a.admissions);
  res.json({ items });
});

exports.trainerReport = asyncHandler(async (req, res) => {
  const trainers = await req.models.Trainer.find({ ...req.branchFilter })
    .populate('branchId', 'name')
    .lean();

  const items = await Promise.all(
    trainers.map(async (trainer) => {
      const [admissions, assigned, active] = await Promise.all([
        req.models.Member.countDocuments({ createdByTrainerId: trainer._id }),
        req.models.Member.countDocuments({ assignedTrainerId: trainer._id }),
        req.models.Member.countDocuments({ assignedTrainerId: trainer._id, ...expiryFilter('active') }),
      ]);
      return {
        trainerId: trainer._id,
        trainer: trainer.name,
        branch: trainer.branchId?.name,
        branchId: trainer.branchId?._id,
        admissions,
        assigned,
        active,
      };
    })
  );

  res.json({ items });
});

exports.attendanceReport = asyncHandler(async (req, res) => {
  const from = req.query.from ? startOfDay(new Date(req.query.from)) : startOfDay(addDays(new Date(), -30));
  const to = req.query.to ? startOfDay(new Date(req.query.to)) : attendanceDateKey();
  const dayCount = Math.max(1, Math.round((to - from) / 86400000) + 1);

  const trainers = await req.models.Trainer.find({ ...req.branchFilter, status: 'active' })
    .populate('branchId', 'name')
    .lean();

  const items = await Promise.all(
    trainers.map(async (trainer) => {
      const records = await req.models.TrainerAttendance.find({
        trainerId: trainer._id,
        date: { $gte: from, $lte: to },
      }).lean();

      let present = 0;
      let late = 0;
      let hours = 0;
      records.forEach((r) => {
        if (r.status === 'late') late += 1;
        if (r.status === 'present' || r.status === 'late') present += 1;
        hours += workingHoursDecimal(r.checkInTime, r.checkOutTime);
      });
      const absent = Math.max(0, dayCount - present);
      const percent = Math.round((present / dayCount) * 100);

      return {
        trainerId: trainer._id,
        trainer: trainer.name,
        branch: trainer.branchId?.name,
        branchId: trainer.branchId?._id,
        present,
        late,
        absent,
        attendancePercent: percent,
        workingHours: Number(hours.toFixed(1)),
      };
    })
  );

  res.json({ items, range: { from, to, dayCount } });
});

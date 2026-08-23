const mongoose = require('mongoose');
const Member = require('../models/Member');
const Trainer = require('../models/Trainer');
const { ok, paginate, paginationMeta } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { parseDateRange, startOfDay, startOfWeek, startOfMonth, endOfDay } = require('../utils/dates');
const { computeStatus } = require('../utils/membership');

exports.listAdmissions = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const query = { gymId: req.user.gymId };

  if (req.user.role === 'TRAINER') {
    query.createdByTrainerId = req.user.trainerId;
  }
  if (req.query.createdByTrainerId && mongoose.isValidObjectId(req.query.createdByTrainerId)) {
    query.createdByTrainerId = req.query.createdByTrainerId;
  }
  if (req.query.assignedTrainerId && mongoose.isValidObjectId(req.query.assignedTrainerId)) {
    query.assignedTrainerId = req.query.assignedTrainerId;
  }
  if (req.query.membershipPlanId && mongoose.isValidObjectId(req.query.membershipPlanId)) {
    const Membership = require('../models/Membership');
    const memberships = await Membership.find({
      gymId: req.user.gymId,
      membershipPlanId: req.query.membershipPlanId,
    }).select('memberId');
    query._id = { $in: memberships.map((m) => m.memberId) };
  }
  if (req.query.search) {
    const regex = new RegExp(req.query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    query.$or = [{ name: regex }, { phone: regex }, { memberCode: regex }];
  }

  const range = parseDateRange(req.query);
  if (range.start || range.end) {
    query.createdAt = {};
    if (range.start) query.createdAt.$gte = range.start;
    if (range.end) query.createdAt.$lte = range.end;
  }

  let rows = await Member.find(query)
    .populate('createdByTrainerId', 'name')
    .populate('assignedTrainerId', 'name')
    .populate({ path: 'membershipId', populate: { path: 'membershipPlanId', select: 'name price durationValue durationUnit' } })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const expiringDays = req.gym.settings?.expiringSoonDays || 7;
  if (req.query.status && req.query.status !== 'all') {
    rows = rows.filter((m) => computeStatus(m.expiryDate, expiringDays, m.status === 'inactive') === req.query.status);
  }

  const total = await Member.countDocuments(query);
  ok(res, {
    admissions: rows.map((m) => ({
      ...m.toObject(),
      status: computeStatus(m.expiryDate, expiringDays, m.status === 'inactive'),
    })),
    pagination: paginationMeta(total, page, limit),
  });
});

exports.admissionStats = asyncHandler(async (req, res) => {
  const gymId = req.user.gymId;
  const trainerFilter =
    req.user.role === 'TRAINER' ? { createdByTrainerId: req.user.trainerId } : {};
  const base = { gymId, ...trainerFilter };
  const now = new Date();

  const [today, week, month] = await Promise.all([
    Member.countDocuments({ ...base, createdAt: { $gte: startOfDay(now), $lte: endOfDay(now) } }),
    Member.countDocuments({ ...base, createdAt: { $gte: startOfWeek(now), $lte: endOfDay(now) } }),
    Member.countDocuments({ ...base, createdAt: { $gte: startOfMonth(now), $lte: endOfDay(now) } }),
  ]);

  const trainers = await Trainer.find({ gymId }).select('name');
  const trainerCounts = await Promise.all(
    trainers.map(async (trainer) => ({
      trainerId: trainer._id,
      name: trainer.name,
      admissions: await Member.countDocuments({ gymId, createdByTrainerId: trainer._id }),
    }))
  );

  ok(res, {
    stats: { today, week, month },
    trainerCounts: trainerCounts.sort((a, b) => b.admissions - a.admissions),
  });
});

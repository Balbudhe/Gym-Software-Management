const mongoose = require('mongoose');
const Member = require('../models/Member');
const Membership = require('../models/Membership');
const MembershipPlan = require('../models/MembershipPlan');
const { ok, paginate, paginationMeta } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { addDuration, daysBetween, startOfDay } = require('../utils/dates');
const { computeStatus } = require('../utils/membership');
const { writeAudit } = require('../utils/audit');

function trainerMemberQuery(req) {
  if (req.user.role !== 'TRAINER') return {};
  return {
    $or: [{ createdByTrainerId: req.user.trainerId }, { assignedTrainerId: req.user.trainerId }],
  };
}

exports.listExpiring = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const days = Number(req.query.days) || req.gym.settings?.expiringSoonDays || 7;
  const today = startOfDay();
  const until = new Date(today);
  until.setDate(until.getDate() + days);

  const query = {
    gymId: req.user.gymId,
    status: { $ne: 'inactive' },
    expiryDate: { $gte: today, $lte: until },
    ...trainerMemberQuery(req),
  };
  if (req.query.createdByTrainerId && mongoose.isValidObjectId(req.query.createdByTrainerId)) {
    query.createdByTrainerId = req.query.createdByTrainerId;
  }
  if (req.query.assignedTrainerId && mongoose.isValidObjectId(req.query.assignedTrainerId)) {
    query.assignedTrainerId = req.query.assignedTrainerId;
  }
  if (req.query.search) {
    const regex = new RegExp(req.query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    query.$and = [{ $or: [{ name: regex }, { phone: regex }, { memberCode: regex }] }];
  }

  const [rows, total] = await Promise.all([
    Member.find(query)
      .populate('createdByTrainerId', 'name')
      .populate('assignedTrainerId', 'name')
      .populate({ path: 'membershipId', populate: { path: 'membershipPlanId', select: 'name price' } })
      .sort({ expiryDate: 1 })
      .skip(skip)
      .limit(limit),
    Member.countDocuments(query),
  ]);

  ok(res, {
    members: rows.map((m) => ({
      ...m.toObject(),
      status: 'expiring',
      daysRemaining: daysBetween(new Date(), m.expiryDate),
    })),
    pagination: paginationMeta(total, page, limit),
  });
});

exports.listExpired = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const today = startOfDay();
  const query = {
    gymId: req.user.gymId,
    expiryDate: { $lt: today },
    ...trainerMemberQuery(req),
  };
  if (req.query.createdByTrainerId && mongoose.isValidObjectId(req.query.createdByTrainerId)) {
    query.createdByTrainerId = req.query.createdByTrainerId;
  }
  if (req.query.assignedTrainerId && mongoose.isValidObjectId(req.query.assignedTrainerId)) {
    query.assignedTrainerId = req.query.assignedTrainerId;
  }
  if (req.query.expiredSince) {
    const since = startOfDay(req.query.expiredSince);
    query.expiryDate = { ...query.expiryDate, $gte: since };
  }
  if (req.query.search) {
    const regex = new RegExp(req.query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    query.$and = [{ $or: [{ name: regex }, { phone: regex }, { memberCode: regex }] }];
  }

  const [rows, total] = await Promise.all([
    Member.find(query)
      .populate('createdByTrainerId', 'name')
      .populate('assignedTrainerId', 'name')
      .populate({ path: 'membershipId', populate: { path: 'membershipPlanId', select: 'name price' } })
      .sort({ expiryDate: -1 })
      .skip(skip)
      .limit(limit),
    Member.countDocuments(query),
  ]);

  ok(res, {
    members: rows.map((m) => ({
      ...m.toObject(),
      status: 'expired',
      daysExpired: Math.abs(daysBetween(new Date(), m.expiryDate)),
    })),
    pagination: paginationMeta(total, page, limit),
  });
});

exports.renewMembership = asyncHandler(async (req, res) => {
  const member = await Member.findOne({ _id: req.params.memberId, gymId: req.user.gymId });
  if (!member) throw new AppError('Member not found', 404);
  const plan = await MembershipPlan.findOne({
    _id: req.body.membershipPlanId,
    gymId: req.user.gymId,
    status: 'active',
  });
  if (!plan) throw new AppError('Membership plan not found or inactive', 400);

  const startDate = req.body.startDate ? new Date(req.body.startDate) : new Date();
  const expiryDate = addDuration(startDate, plan.durationValue, plan.durationUnit);
  const status = computeStatus(expiryDate, req.gym.settings?.expiringSoonDays || 7);
  const createdByTrainerId = req.user.role === 'TRAINER' ? req.user.trainerId : member.createdByTrainerId;

  const membership = await Membership.create({
    gymId: req.user.gymId,
    memberId: member._id,
    membershipPlanId: plan._id,
    startDate,
    expiryDate,
    status,
    createdByTrainerId,
  });

  member.membershipId = membership._id;
  member.joiningDate = member.joiningDate || startDate;
  member.expiryDate = expiryDate;
  member.status = status;
  await member.save();

  await writeAudit({
    gymId: req.user.gymId,
    userId: req.user.userId,
    action: 'Membership Updated',
    entityType: 'Membership',
    entityId: membership._id,
    description: `Renewed ${plan.name} for ${member.name}`,
  });

  ok(res, { membership, member }, 201);
});

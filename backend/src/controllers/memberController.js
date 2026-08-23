const mongoose = require('mongoose');
const { body } = require('express-validator');
const Member = require('../models/Member');
const Membership = require('../models/Membership');
const MembershipPlan = require('../models/MembershipPlan');
const Trainer = require('../models/Trainer');
const { ok, paginate, paginationMeta } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { generateMemberCode } = require('../utils/memberCode');
const { addDuration, parseDateRange, daysBetween } = require('../utils/dates');
const { computeStatus, membershipWindow } = require('../utils/membership');
const { writeAudit } = require('../utils/audit');
const { uploadImage } = require('../services/storageService');

const POPULATE = [
  { path: 'createdByTrainerId', select: 'name email specialization status' },
  { path: 'assignedTrainerId', select: 'name email specialization status' },
  { path: 'membershipId', populate: { path: 'membershipPlanId', select: 'name durationValue durationUnit price' } },
];

function gymScope(req) {
  return { gymId: req.user.gymId };
}

function trainerVisibility(req, query) {
  if (req.user.role === 'TRAINER') {
    if (req.query.scope === 'assigned') {
      query.assignedTrainerId = req.user.trainerId;
    } else if (req.query.scope === 'created') {
      query.createdByTrainerId = req.user.trainerId;
    } else {
      query.$or = [
        { createdByTrainerId: req.user.trainerId },
        { assignedTrainerId: req.user.trainerId },
      ];
    }
  }
  return query;
}

function applyMemberFilters(req, query) {
  const { search, createdByTrainerId, assignedTrainerId, status, datePreset, startDate, endDate, dateField } = req.query;

  if (search) {
    const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    query.$and = query.$and || [];
    query.$and.push({
      $or: [{ name: regex }, { phone: regex }, { memberCode: regex }, { email: regex }],
    });
  }

  if (createdByTrainerId && createdByTrainerId !== 'all' && mongoose.isValidObjectId(createdByTrainerId)) {
    query.createdByTrainerId = createdByTrainerId;
  }
  if (assignedTrainerId && assignedTrainerId !== 'all' && mongoose.isValidObjectId(assignedTrainerId)) {
    query.assignedTrainerId = assignedTrainerId;
  }

  const expiringDays = req.gym?.settings?.expiringSoonDays || 7;
  if (status && status !== 'all') {
    if (status === 'inactive') query.status = 'inactive';
    else Object.assign(query, membershipWindow(status, expiringDays, Number(req.query.expiringDays) || undefined));
  }

  const range = parseDateRange({ datePreset, startDate, endDate });
  const field = dateField === 'expiryDate' ? 'expiryDate' : 'joiningDate';
  if (range.start || range.end) {
    query[field] = {};
    if (range.start) query[field].$gte = range.start;
    if (range.end) query[field].$lte = range.end;
  }
  return query;
}

function decorateMember(member, expiringDays = 7) {
  const obj = member.toObject ? member.toObject() : member;
  const computed = obj.status === 'inactive' ? 'inactive' : computeStatus(obj.expiryDate, expiringDays);
  obj.status = computed;
  obj.daysRemaining = daysBetween(new Date(), obj.expiryDate);
  obj.daysExpired = obj.daysRemaining < 0 ? Math.abs(obj.daysRemaining) : 0;
  return obj;
}

exports.createValidators = [
  body('name').trim().notEmpty().withMessage('Member name is required'),
  body('phone').trim().notEmpty().withMessage('Phone is required'),
  body('membershipPlanId').notEmpty().withMessage('Membership plan is required'),
  body('startDate').notEmpty().withMessage('Start date is required'),
];

exports.listMembers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const sortField = ['name', 'joiningDate', 'expiryDate', 'memberCode', 'createdAt'].includes(req.query.sort)
    ? req.query.sort
    : 'createdAt';
  const sortDir = req.query.order === 'asc' ? 1 : -1;

  const query = trainerVisibility(req, applyMemberFilters(req, gymScope(req)));
  const [rows, total] = await Promise.all([
    Member.find(query).populate(POPULATE).sort({ [sortField]: sortDir }).skip(skip).limit(limit),
    Member.countDocuments(query),
  ]);

  const expiringDays = req.gym.settings?.expiringSoonDays || 7;
  ok(res, {
    members: rows.map((m) => decorateMember(m, expiringDays)),
    pagination: paginationMeta(total, page, limit),
  });
});

exports.getMember = asyncHandler(async (req, res) => {
  const query = trainerVisibility(req, { ...gymScope(req), _id: req.params.id });
  const member = await Member.findOne(query).populate(POPULATE);
  if (!member) throw new AppError('Member not found', 404);
  const memberships = await Membership.find({ gymId: req.user.gymId, memberId: member._id })
    .populate('membershipPlanId', 'name durationValue durationUnit price')
    .populate('createdByTrainerId', 'name')
    .sort({ createdAt: -1 });
  ok(res, {
    member: decorateMember(member, req.gym.settings?.expiringSoonDays || 7),
    memberships,
  });
});

exports.createMember = asyncHandler(async (req, res) => {
  const gymId = req.user.gymId;
  const plan = await MembershipPlan.findOne({ _id: req.body.membershipPlanId, gymId, status: 'active' });
  if (!plan) throw new AppError('Membership plan not found or inactive', 400);

  let assignedTrainerId = req.body.assignedTrainerId || null;
  if (assignedTrainerId) {
    const assigned = await Trainer.findOne({ _id: assignedTrainerId, gymId, status: 'active' });
    if (!assigned) throw new AppError('Assigned trainer is not active in this gym', 400);
  }

  let createdByTrainerId = null;
  if (req.user.role === 'TRAINER') {
    createdByTrainerId = req.user.trainerId;
  } else if (req.body.createdByTrainerId) {
    const creator = await Trainer.findOne({ _id: req.body.createdByTrainerId, gymId });
    if (!creator) throw new AppError('Creator trainer not found in this gym', 400);
    createdByTrainerId = creator._id;
  }

  const startDate = new Date(req.body.startDate);
  const expiryDate = addDuration(startDate, plan.durationValue, plan.durationUnit);
  const expiringDays = req.gym.settings?.expiringSoonDays || 7;
  const status = computeStatus(expiryDate, expiringDays);

  let profilePhoto = '';
  if (req.file) profilePhoto = await uploadImage(req.file, 'members');

  const memberCode = await generateMemberCode(gymId);
  const member = await Member.create({
    gymId,
    memberCode,
    name: req.body.name,
    phone: req.body.phone,
    email: req.body.email || '',
    dateOfBirth: req.body.dateOfBirth || null,
    gender: req.body.gender || '',
    address: req.body.address || '',
    emergencyContact: req.body.emergencyContact || '',
    profilePhoto,
    createdByTrainerId,
    assignedTrainerId,
    joiningDate: startDate,
    expiryDate,
    status,
    height: req.body.height || null,
    weight: req.body.weight || null,
    fitnessGoal: req.body.fitnessGoal || '',
    remarks: req.body.remarks || '',
  });

  const membership = await Membership.create({
    gymId,
    memberId: member._id,
    membershipPlanId: plan._id,
    startDate,
    expiryDate,
    status,
    createdByTrainerId,
  });

  member.membershipId = membership._id;
  await member.save();

  await writeAudit({
    gymId,
    userId: req.user.userId,
    action: 'Member Created',
    entityType: 'Member',
    entityId: member._id,
    description: `Admission created for ${member.name} (${member.memberCode})`,
  });
  await writeAudit({
    gymId,
    userId: req.user.userId,
    action: 'Membership Created',
    entityType: 'Membership',
    entityId: membership._id,
    description: `${plan.name} membership started for ${member.name}`,
  });

  const populated = await Member.findById(member._id).populate(POPULATE);
  ok(res, { member: decorateMember(populated, expiringDays) }, 201);
});

exports.updateMember = asyncHandler(async (req, res) => {
  if (req.user.role !== 'OWNER') {
    throw new AppError('Only the gym owner can edit member details', 403);
  }

  const member = await Member.findOne({ _id: req.params.id, gymId: req.user.gymId });
  if (!member) throw new AppError('Member not found', 404);

  const originalCreatedBy = member.createdByTrainerId;
  const allowed = [
    'name',
    'phone',
    'email',
    'dateOfBirth',
    'gender',
    'address',
    'emergencyContact',
    'height',
    'weight',
    'fitnessGoal',
    'remarks',
  ];
  allowed.forEach((key) => {
    if (req.body[key] !== undefined) member[key] = req.body[key];
  });

  if (req.body.assignedTrainerId !== undefined) {
    if (req.body.assignedTrainerId) {
      const assigned = await Trainer.findOne({
        _id: req.body.assignedTrainerId,
        gymId: req.user.gymId,
        status: 'active',
      });
      if (!assigned) throw new AppError('Assigned trainer is not active in this gym', 400);
      member.assignedTrainerId = assigned._id;
    } else {
      member.assignedTrainerId = null;
    }
  }

  if (req.body.status === 'inactive') member.status = 'inactive';
  if (req.body.status === 'active' && member.status === 'inactive') {
    member.status = computeStatus(member.expiryDate, req.gym.settings?.expiringSoonDays || 7);
  }

  if (req.file) member.profilePhoto = await uploadImage(req.file, 'members');

  member.createdByTrainerId = originalCreatedBy;
  await member.save();

  await writeAudit({
    gymId: req.user.gymId,
    userId: req.user.userId,
    action: 'Member Updated',
    entityType: 'Member',
    entityId: member._id,
    description: `${member.name} was updated`,
  });

  const populated = await Member.findById(member._id).populate(POPULATE);
  ok(res, { member: decorateMember(populated, req.gym.settings?.expiringSoonDays || 7) });
});

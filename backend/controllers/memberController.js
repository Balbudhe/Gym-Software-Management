const asyncHandler = require('../utils/asyncHandler');
const { parsePagination, paginated } = require('../utils/pagination');
const { nextMemberCode } = require('../utils/codes');
const { startOfDay, addDays } = require('../utils/dates');
const { expiryFilter, calculateExpiry, computeMembershipStatus, daysExpired, daysUntilExpiry } = require('../services/membershipService');
const { toPublicPath } = require('../config/cloudStorage');
const { createMembershipPayment } = require('../services/paymentService');

const populateMember = [
  { path: 'branchId', select: 'name branchCode city' },
  { path: 'createdByTrainerId', select: 'name branchId' },
  { path: 'assignedTrainerId', select: 'name branchId' },
  { path: 'membershipId', populate: { path: 'membershipPlanId', select: 'name durationValue durationUnit price' } },
];

const buildMemberQuery = (req) => {
  const q = { ...req.branchFilter };
  if (req.query.createdByTrainerId) q.createdByTrainerId = req.query.createdByTrainerId;
  if (req.query.assignedTrainerId) q.assignedTrainerId = req.query.assignedTrainerId;
  if (req.query.status === 'inactive') q.status = 'inactive';
  else if (req.query.status) {
    Object.assign(q, expiryFilter(req.query.status, req.query.expiringDays));
    q.status = q.status ? { ...q.status, $ne: 'inactive' } : { $ne: 'inactive' };
  }
  if (req.query.expiredSince) {
    const days = Number(req.query.expiredSince) || 0;
    const cutoff = startOfDay(addDays(new Date(), -days));
    q.expiryDate = { ...(q.expiryDate || {}), $lte: cutoff, $lt: startOfDay() };
  }
  if (req.query.from || req.query.to) {
    q.joiningDate = {};
    if (req.query.from) q.joiningDate.$gte = new Date(req.query.from);
    if (req.query.to) q.joiningDate.$lte = new Date(req.query.to);
  }
  if (req.query.search) {
    const regex = new RegExp(String(req.query.search).trim(), 'i');
    q.$or = [{ name: regex }, { phone: regex }, { email: regex }, { memberCode: regex }];
  }
  if (req.query.healthIssue) {
    if (req.query.healthIssue === 'has') {
      q.healthIssue = { $exists: true, $nin: ['', null] };
    } else if (req.query.healthIssue === 'none') {
      q.healthIssue = { $in: ['', null] };
    } else {
      q.healthIssue = new RegExp(String(req.query.healthIssue).trim(), 'i');
    }
  }
  return q;
};

const resolveAdmissionBranch = async (req) => {
  if (req.user.role === 'TRAINER') {
    return req.user.branchId;
  }
  const branchId = req.body.branchId || req.branchId;
  if (!branchId) {
    const error = new Error('Select a branch for this admission');
    error.status = 400;
    throw error;
  }
  const branch = await req.models.Branch.findById(branchId);
  if (!branch) {
    const error = new Error('Branch does not belong to this gym');
    error.status = 400;
    throw error;
  }
  return branch._id;
};

const assertSameBranchTrainer = async (req, trainerId, branchId) => {
  if (!trainerId) return null;
  const trainer = await req.models.Trainer.findById(trainerId);
  if (!trainer || String(trainer.branchId) !== String(branchId)) {
    const error = new Error('Assigned trainer must belong to the same branch');
    error.status = 400;
    throw error;
  }
  return trainer;
};

const createAdmission = async (req) => {
  const branchId = await resolveAdmissionBranch(req);
  const createdByTrainerId =
    req.user.role === 'TRAINER' ? req.user.trainerId : req.body.createdByTrainerId || null;

  if (createdByTrainerId) {
    await assertSameBranchTrainer(req, createdByTrainerId, branchId);
  }

  const assignedTrainerId = req.body.assignedTrainerId || createdByTrainerId || null;
  if (assignedTrainerId) {
    await assertSameBranchTrainer(req, assignedTrainerId, branchId);
  }

  if (
    !req.body.name ||
    !req.body.phone ||
    !req.body.membershipPlanId ||
    !req.body.startDate ||
    !req.body.healthIssue
  ) {
    const error = new Error('Name, phone, membership plan, start date and health issue are required');
    error.status = 400;
    throw error;
  }

  const plan = await req.models.MembershipPlan.findById(req.body.membershipPlanId);
  if (!plan || plan.status !== 'active') {
    const error = new Error('Membership plan not found');
    error.status = 400;
    throw error;
  }

  const startDate = new Date(req.body.startDate);
  const expiryDate = req.body.expiryDate ? new Date(req.body.expiryDate) : calculateExpiry(startDate, plan);
  const memberCode = await nextMemberCode(req.models.Member);
  const status = computeMembershipStatus(expiryDate);

  const member = await req.models.Member.create({
    memberCode,
    branchId,
    name: req.body.name,
    phone: req.body.phone,
    email: req.body.email,
    dateOfBirth: req.body.dateOfBirth || null,
    gender: req.body.gender || '',
    address: req.body.address,
    emergencyContact: req.body.emergencyContact,
    profilePhoto: req.file ? toPublicPath('members', req.file.filename) : req.body.profilePhoto || null,
    createdByTrainerId,
    assignedTrainerId,
    joiningDate: startDate,
    expiryDate,
    status,
    height: req.body.height,
    weight: req.body.weight,
    fitnessGoal: req.body.fitnessGoal,
    healthIssue: req.body.healthIssue,
    remarks: req.body.remarks,
  });

  const membership = await req.models.Membership.create({
    memberId: member._id,
    branchId,
    membershipPlanId: plan._id,
    startDate,
    expiryDate,
    status: status === 'expired' ? 'expired' : 'active',
    createdByTrainerId,
  });

  member.membershipId = membership._id;
  await member.save();
  await createMembershipPayment(req, { member, membership, plan });

  await req.models.AuditLog.create({
    actorUserId: req.user.userId,
    actorRole: req.user.role,
    branchId,
    action: 'ADMISSION_CREATE',
    entity: 'Member',
    entityId: member._id,
  });

  return req.models.Member.findById(member._id).populate(populateMember);
};

exports.listMembers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req);
  const query = buildMemberQuery(req);
  const [items, total] = await Promise.all([
    req.models.Member.find(query)
      .populate(populateMember)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    req.models.Member.countDocuments(query),
  ]);

  const enriched = items.map((item) => ({
    ...item,
    membershipStatus:
      item.status === 'inactive' ? 'inactive' : computeMembershipStatus(item.expiryDate),
    daysExpired: daysExpired(item.expiryDate),
    daysUntilExpiry: daysUntilExpiry(item.expiryDate),
  }));

  res.json(paginated({ items: enriched, total, page, limit }));
});

exports.getMember = asyncHandler(async (req, res) => {
  const member = await req.models.Member.findOne({
    _id: req.params.id,
    ...req.branchFilter,
  }).populate(populateMember);
  if (!member) return res.status(404).json({ message: 'Member not found' });
  res.json({ item: member });
});

exports.createMember = asyncHandler(async (req, res) => {
  const item = await createAdmission(req);
  res.status(201).json({ item });
});

exports.updateMember = asyncHandler(async (req, res) => {
  const member = await req.models.Member.findOne({
    _id: req.params.id,
    ...req.branchFilter,
  });
  if (!member) return res.status(404).json({ message: 'Member not found' });

  if (req.user.role === 'TRAINER') {
    delete req.body.branchId;
    delete req.body.createdByTrainerId;
  }

  if (req.body.assignedTrainerId) {
    await assertSameBranchTrainer(req, req.body.assignedTrainerId, member.branchId);
    member.assignedTrainerId = req.body.assignedTrainerId;
  }

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
    'healthIssue',
    'remarks',
    'status',
  ];
  allowed.forEach((field) => {
    if (req.body[field] !== undefined) member[field] = req.body[field];
  });
  if (req.body.status === 'active') {
    member.status = computeMembershipStatus(member.expiryDate);
  }
  if (req.file) member.profilePhoto = toPublicPath('members', req.file.filename);

  await member.save();
  const item = await req.models.Member.findById(member._id).populate(populateMember);
  res.json({ item });
});

exports.assignTrainer = asyncHandler(async (req, res) => {
  const member = await req.models.Member.findOne({
    _id: req.params.id,
    ...req.branchFilter,
  });
  if (!member) return res.status(404).json({ message: 'Member not found' });
  await assertSameBranchTrainer(req, req.body.assignedTrainerId, member.branchId);
  member.assignedTrainerId = req.body.assignedTrainerId;
  await member.save();
  const item = await req.models.Member.findById(member._id).populate(populateMember);
  res.json({ item });
});

exports.createAdmission = createAdmission;

module.exports.buildMemberQuery = buildMemberQuery;
module.exports.populateMember = populateMember;

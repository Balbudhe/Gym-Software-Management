const asyncHandler = require('../utils/asyncHandler');
const { parsePagination, paginated } = require('../utils/pagination');
const { calculateExpiry, computeMembershipStatus } = require('../services/membershipService');
const { createMembershipPayment } = require('../services/paymentService');

exports.listPlans = asyncHandler(async (req, res) => {
  const items = await req.models.MembershipPlan.find().sort({ price: 1 });
  res.json({ items });
});

exports.createPlan = asyncHandler(async (req, res) => {
  const { name, durationValue, durationUnit, price, description } = req.body;
  if (!name || !durationValue || price === undefined) {
    return res.status(400).json({ message: 'Name, duration and price are required' });
  }
  const item = await req.models.MembershipPlan.create({
    name,
    durationValue,
    durationUnit: durationUnit || 'month',
    price,
    description,
    status: 'active',
  });
  res.status(201).json({ item });
});

exports.updatePlan = asyncHandler(async (req, res) => {
  const item = await req.models.MembershipPlan.findById(req.params.id);
  if (!item) return res.status(404).json({ message: 'Plan not found' });
  ['name', 'durationValue', 'durationUnit', 'price', 'description', 'status'].forEach((field) => {
    if (req.body[field] !== undefined) item[field] = req.body[field];
  });
  await item.save();
  res.json({ item });
});

exports.listMemberships = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req);
  const query = { ...req.branchFilter };
  if (req.query.memberId) query.memberId = req.query.memberId;
  if (req.query.status) query.status = req.query.status;

  const [items, total] = await Promise.all([
    req.models.Membership.find(query)
      .populate('memberId', 'name memberCode phone')
      .populate('branchId', 'name')
      .populate('membershipPlanId', 'name price durationValue durationUnit')
      .populate('createdByTrainerId', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    req.models.Membership.countDocuments(query),
  ]);
  res.json(paginated({ items, total, page, limit }));
});

exports.createMembership = asyncHandler(async (req, res) => {
  const member = await req.models.Member.findOne({
    _id: req.body.memberId,
    ...req.branchFilter,
  });
  if (!member) return res.status(404).json({ message: 'Member not found' });

  const plan = await req.models.MembershipPlan.findById(req.body.membershipPlanId);
  if (!plan) return res.status(400).json({ message: 'Plan not found' });

  const startDate = new Date(req.body.startDate || Date.now());
  const expiryDate = req.body.expiryDate ? new Date(req.body.expiryDate) : calculateExpiry(startDate, plan);
  const status = computeMembershipStatus(expiryDate) === 'expired' ? 'expired' : 'active';
  const createdByTrainerId =
    req.user.role === 'TRAINER' ? req.user.trainerId : req.body.createdByTrainerId || null;

  const item = await req.models.Membership.create({
    memberId: member._id,
    branchId: member.branchId,
    membershipPlanId: plan._id,
    startDate,
    expiryDate,
    status,
    createdByTrainerId,
  });

  member.membershipId = item._id;
  member.joiningDate = startDate;
  member.expiryDate = expiryDate;
  member.status = status === 'expired' ? 'expired' : 'active';
  await member.save();
  await createMembershipPayment(req, { member, membership: item, plan });

  res.status(201).json({ item });
});

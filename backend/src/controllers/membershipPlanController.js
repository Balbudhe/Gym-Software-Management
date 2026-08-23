const { body } = require('express-validator');
const MembershipPlan = require('../models/MembershipPlan');
const { ok } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { writeAudit } = require('../utils/audit');

exports.createValidators = [
  body('name').trim().notEmpty().withMessage('Plan name is required'),
  body('durationValue').isInt({ min: 1 }).withMessage('Duration is required'),
  body('price').isFloat({ min: 0 }).withMessage('Price is required'),
];

exports.listPlans = asyncHandler(async (req, res) => {
  const query = { gymId: req.user.gymId };
  if (req.query.status) query.status = req.query.status;
  if (req.user.role === 'TRAINER') query.status = 'active';
  const plans = await MembershipPlan.find(query).sort({ durationValue: 1, price: 1 });
  ok(res, { plans });
});

exports.createPlan = asyncHandler(async (req, res) => {
  const plan = await MembershipPlan.create({
    gymId: req.user.gymId,
    name: req.body.name,
    durationValue: req.body.durationValue,
    durationUnit: req.body.durationUnit || 'month',
    price: req.body.price,
    description: req.body.description || '',
    status: 'active',
  });
  await writeAudit({
    gymId: req.user.gymId,
    userId: req.user.userId,
    action: 'Membership Plan Updated',
    entityType: 'MembershipPlan',
    entityId: plan._id,
    description: `Created plan ${plan.name}`,
  });
  ok(res, { plan }, 201);
});

exports.updatePlan = asyncHandler(async (req, res) => {
  const plan = await MembershipPlan.findOne({ _id: req.params.id, gymId: req.user.gymId });
  if (!plan) throw new AppError('Plan not found', 404);

  ['name', 'durationValue', 'durationUnit', 'price', 'description'].forEach((key) => {
    if (req.body[key] !== undefined) plan[key] = req.body[key];
  });
  if (req.body.status) plan.status = req.body.status === 'inactive' ? 'inactive' : 'active';
  await plan.save();

  await writeAudit({
    gymId: req.user.gymId,
    userId: req.user.userId,
    action: 'Membership Plan Updated',
    entityType: 'MembershipPlan',
    entityId: plan._id,
    description: `Updated plan ${plan.name}`,
  });
  ok(res, { plan });
});

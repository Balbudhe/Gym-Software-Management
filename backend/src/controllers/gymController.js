const { body } = require('express-validator');
const Gym = require('../models/Gym');
const { ok } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { uploadImage } = require('../services/storageService');
const { writeAudit } = require('../utils/audit');

exports.updateGymValidators = [
  body('name').optional().trim().notEmpty(),
  body('email').optional().isEmail().normalizeEmail(),
  body('phone').optional().trim().notEmpty(),
];

exports.getMyGym = asyncHandler(async (req, res) => {
  const gym = await Gym.findById(req.user.gymId);
  ok(res, { gym });
});

exports.updateMyGym = asyncHandler(async (req, res) => {
  const allowed = ['name', 'email', 'phone', 'address', 'city', 'state', 'pincode'];
  const updates = {};
  allowed.forEach((key) => {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  });

  if (req.file) {
    updates.logo = await uploadImage(req.file, 'logos');
  }

  const gym = await Gym.findByIdAndUpdate(req.user.gymId, updates, {
    new: true,
    runValidators: true,
  });

  await writeAudit({
    gymId: req.user.gymId,
    userId: req.user.userId,
    action: 'Gym Updated',
    entityType: 'Gym',
    entityId: gym._id,
    description: `${req.user.name} updated gym profile`,
  });

  ok(res, { gym });
});

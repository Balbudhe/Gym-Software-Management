const Gym = require('../models/Gym');
const User = require('../models/User');
const { ok } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { writeAudit } = require('../utils/audit');

exports.getSettings = asyncHandler(async (req, res) => {
  const gym = await Gym.findById(req.user.gymId);
  ok(res, { settings: gym.settings, gym });
});

exports.updateSettings = asyncHandler(async (req, res) => {
  const gym = await Gym.findById(req.user.gymId);
  if (req.body.expiringSoonDays !== undefined) {
    gym.settings.expiringSoonDays = Math.max(1, Number(req.body.expiringSoonDays) || 7);
  }
  if (req.body.lateAfterTime) {
    gym.settings.lateAfterTime = req.body.lateAfterTime;
  }
  await gym.save();
  await writeAudit({
    gymId: req.user.gymId,
    userId: req.user.userId,
    action: 'Gym Updated',
    entityType: 'Gym',
    entityId: gym._id,
    description: 'Updated gym settings',
  });
  ok(res, { settings: gym.settings, gym });
});

exports.updateAccount = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.userId).select('+password');
  if (req.body.name) user.name = req.body.name;
  if (req.body.password) {
    if (!req.body.currentPassword) throw new AppError('Current password is required', 400);
    const match = await user.comparePassword(req.body.currentPassword);
    if (!match) throw new AppError('Current password is incorrect', 400);
    if (req.body.password.length < 8) throw new AppError('New password must be at least 8 characters', 400);
    user.password = req.body.password;
  }
  await user.save();
  ok(res, { user: user.toSafeObject() });
});

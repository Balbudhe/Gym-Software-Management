const asyncHandler = require('../utils/asyncHandler');
const Gym = require('../models/platform/Gym');

const publicGym = (gym) => ({
  id: gym._id,
  name: gym.name,
  slug: gym.slug,
  ownerName: gym.ownerName,
  email: gym.email,
  phone: gym.phone,
  status: gym.status,
  paymentsEnabled: Boolean(gym.paymentsEnabled),
});

exports.getSettings = asyncHandler(async (req, res) => {
  res.json({ gym: publicGym(req.gym) });
});

exports.updateSettings = asyncHandler(async (req, res) => {
  const GymModel = Gym();
  const gym = await GymModel.findById(req.gym._id);
  if (req.body.name) gym.name = req.body.name;
  if (req.body.ownerName) gym.ownerName = req.body.ownerName;
  if (req.body.phone) gym.phone = req.body.phone;
  if (req.body.paymentsEnabled !== undefined) {
    gym.paymentsEnabled = req.body.paymentsEnabled === true || req.body.paymentsEnabled === 'true';
  }
  await gym.save();

  if (req.body.ownerName) {
    await req.models.User.findByIdAndUpdate(req.user.userId, { name: req.body.ownerName });
  }

  res.json({ gym: publicGym(gym) });
});

exports.updateProfile = asyncHandler(async (req, res) => {
  const user = await req.models.User.findById(req.user.userId);
  if (req.body.name) user.name = req.body.name;
  await user.save();

  if (req.user.role === 'TRAINER' && req.user.trainerId) {
    const trainer = await req.models.Trainer.findById(req.user.trainerId).populate('branchId', 'name');
    if (req.body.name) trainer.name = req.body.name;
    if (req.body.phone) trainer.phone = req.body.phone;
    if (req.body.specialization) trainer.specialization = req.body.specialization;
    await trainer.save();
    return res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        branchId: user.branchId,
        trainerId: user.trainerId,
      },
      trainer,
    });
  }

  res.json({
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
});

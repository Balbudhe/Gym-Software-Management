const { body } = require('express-validator');
const User = require('../models/User');
const Gym = require('../models/Gym');
const Trainer = require('../models/Trainer');
const { signToken, cookieOptions } = require('../utils/jwt');
const { ok } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

function buildTokenPayload(user) {
  return {
    userId: user._id,
    gymId: user.gymId,
    role: user.role,
    trainerId: user.trainerId,
  };
}

exports.loginValidators = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

exports.registerValidators = [
  body('gymName').trim().notEmpty().withMessage('Gym name is required'),
  body('ownerName').trim().notEmpty().withMessage('Owner name is required'),
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('phone').trim().notEmpty().withMessage('Phone is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
];

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    throw new AppError('Invalid email or password', 401);
  }
  if (!user.isActive) throw new AppError('This account has been deactivated', 403);

  const gym = await Gym.findById(user.gymId);
  if (!gym || gym.status !== 'active') throw new AppError('Gym account is inactive', 403);

  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  const token = signToken(buildTokenPayload(user));
  res.cookie('token', token, cookieOptions());

  ok(res, {
    token,
    user: user.toSafeObject(),
    gym: {
      id: gym._id,
      name: gym.name,
      logo: gym.logo,
      code: gym.code,
    },
  });
});

exports.logout = asyncHandler(async (req, res) => {
  res.clearCookie('token', { ...cookieOptions(), maxAge: 0 });
  ok(res, { message: 'Logged out' });
});

exports.me = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.userId);
  const gym = await Gym.findById(req.user.gymId);
  let trainer = null;
  if (user.trainerId) {
    trainer = await Trainer.findOne({ _id: user.trainerId, gymId: req.user.gymId });
  }
  ok(res, {
    user: user.toSafeObject(),
    gym: gym
      ? {
          id: gym._id,
          name: gym.name,
          logo: gym.logo,
          code: gym.code,
          email: gym.email,
          phone: gym.phone,
          settings: gym.settings,
        }
      : null,
    trainer,
  });
});

exports.register = asyncHandler(async (req, res) => {
  const { gymName, ownerName, email, phone, password, address, city, state, pincode } = req.body;
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) throw new AppError('An account with this email already exists', 409);

  const code = gymName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase() || 'GYM';
  const gym = await Gym.create({
    name: gymName,
    code,
    email: email.toLowerCase(),
    phone,
    address: address || '',
    city: city || '',
    state: state || '',
    pincode: pincode || '',
    status: 'active',
  });

  const user = await User.create({
    name: ownerName,
    email: email.toLowerCase(),
    password,
    role: 'OWNER',
    gymId: gym._id,
    trainerId: null,
  });

  const token = signToken(buildTokenPayload(user));
  res.cookie('token', token, cookieOptions());
  ok(
    res,
    {
      token,
      user: user.toSafeObject(),
      gym: { id: gym._id, name: gym.name, logo: gym.logo, code: gym.code },
    },
    201
  );
});

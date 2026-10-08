const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { URL } = require('url');
const asyncHandler = require('../utils/asyncHandler');
const { uniqueSlug } = require('../utils/slug');
const { withDatabase } = require('../utils/mongoUri');
const { encrypt } = require('../services/encryptionService');
const { sendPasswordResetEmail } = require('../services/emailService');
const { attendanceDateKey } = require('../services/attendanceService');
const { testConnectionUri, createAndCacheGymConnection, getGymConnection } = require('../config/databaseManager');
const { registerGymModels } = require('../models/gym');
const Gym = require('../models/platform/Gym');
const GymDatabaseConnection = require('../models/platform/GymDatabaseConnection');

const signToken = (user, gymId) =>
  jwt.sign(
    {
      userId: String(user._id),
      gymId: String(gymId),
      role: user.role,
      branchId: user.branchId ? String(user.branchId) : null,
      trainerId: user.trainerId ? String(user.trainerId) : null,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

const publicUser = (user, gym, extra = {}) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  branchId: user.branchId || null,
  trainerId: user.trainerId || null,
  gymId: gym._id,
  gymName: gym.name,
  gymSlug: gym.slug,
  paymentsEnabled: Boolean(gym.paymentsEnabled),
  ...extra,
});

const parseDatabaseName = (uri, fallback) => {
  try {
    const parsed = new URL(uri.replace('mongodb+srv://', 'https://').replace('mongodb://', 'http://'));
    const name = parsed.pathname.replace(/^\//, '').split('?')[0];
    return name || fallback;
  } catch {
    return fallback;
  }
};

const buildTenantUri = (slug) => {
  const base =
    process.env.MONGODB_TENANT_BASE_URI ||
    process.env.MONGO_URI ||
    'mongodb://127.0.0.1:27017';
  return withDatabase(base, `gym_${slug}`);
};

exports.signup = asyncHandler(async (req, res) => {
  const { name, ownerName, email, phone, password, mongoUri } = req.body;
  if (!name || !ownerName || !email || !password) {
    return res.status(400).json({ message: 'Gym name, owner name, email and password are required' });
  }
  if (password.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters' });
  }

  const GymModel = Gym();
  const ConnectionModel = GymDatabaseConnection();

  const existing = await GymModel.findOne({ email: String(email).toLowerCase() });
  if (existing) {
    return res.status(409).json({ message: 'A gym with this email already exists' });
  }

  const slug = await uniqueSlug(name, async (candidate) => GymModel.exists({ slug: candidate }));
  const databaseName = mongoUri ? parseDatabaseName(mongoUri, `gym_${slug}`) : `gym_${slug}`;
  const connectionString = mongoUri || buildTenantUri(slug);

  if (!/^mongodb(\+srv)?:\/\//.test(connectionString)) {
    return res.status(400).json({ message: 'MongoDB URL must start with mongodb:// or mongodb+srv://' });
  }

  try {
    await testConnectionUri(connectionString);
  } catch (error) {
    return res.status(400).json({ message: 'Could not connect to the provided MongoDB URL' });
  }

  const encryptedConnectionString = encrypt(connectionString);

  const gym = await GymModel.create({
    name,
    slug,
    ownerName,
    email: String(email).toLowerCase(),
    phone,
    status: 'active',
  });

  const connectionRecord = await ConnectionModel.create({
    gymId: gym._id,
    encryptedConnectionString,
    databaseName,
    status: 'active',
  });

  gym.databaseConnectionId = connectionRecord._id;
  await gym.save();

  const connection = await createAndCacheGymConnection(gym._id, connectionString);
  const models = registerGymModels(connection);

  const mainBranch = await models.Branch.create({
    name: 'Main Branch',
    branchCode: 'BR001',
    status: 'active',
  });

  const hashed = await bcrypt.hash(password, 10);
  const owner = await models.User.create({
    name: ownerName,
    email: String(email).toLowerCase(),
    password: hashed,
    role: 'OWNER',
    branchId: null,
    trainerId: null,
    isActive: true,
  });

  await models.MembershipPlan.create([
    { name: 'Monthly', durationValue: 1, durationUnit: 'month', price: 1500, description: '1 month access', status: 'active' },
    { name: 'Quarterly', durationValue: 3, durationUnit: 'month', price: 4000, description: '3 months access', status: 'active' },
    { name: 'Yearly', durationValue: 1, durationUnit: 'year', price: 14000, description: '12 months access', status: 'active' },
  ]);

  await models.AuditLog.create({
    actorUserId: owner._id,
    actorRole: 'OWNER',
    action: 'GYM_SIGNUP',
    entity: 'Gym',
    entityId: gym._id,
    meta: { branchId: mainBranch._id },
  });

  const token = signToken(owner, gym._id);
  res.status(201).json({
    token,
    user: publicUser(owner, gym, { defaultBranchId: mainBranch._id }),
  });
});

exports.login = asyncHandler(async (req, res) => {
  const { slug, email, password } = req.body;
  if (!slug || !email || !password) {
    return res.status(400).json({ message: 'Gym code, email and password are required' });
  }

  const GymModel = Gym();
  const gym = await GymModel.findOne({ slug: String(slug).toLowerCase().trim() });
  if (!gym || gym.status !== 'active') {
    return res.status(401).json({ message: 'Invalid gym code or credentials' });
  }

  const connection = await getGymConnection(gym._id);
  const models = registerGymModels(connection);

  const user = await models.User.findOne({ email: String(email).toLowerCase() }).select('+password');
  if (!user || !user.isActive) {
    return res.status(401).json({ message: 'Invalid gym code or credentials' });
  }

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) {
    return res.status(401).json({ message: 'Invalid gym code or credentials' });
  }

  user.lastLogin = new Date();
  await user.save();

  let branchName = null;
  if (user.branchId) {
    const branch = await models.Branch.findById(user.branchId);
    branchName = branch?.name || null;
  }

  const token = signToken(user, gym._id);
  res.json({
    token,
    user: publicUser(user, gym, { branchName }),
  });
});

exports.logout = asyncHandler(async (req, res) => {
  if (req.user.role === 'TRAINER' && req.user.trainerId) {
    const openShift = await req.models.TrainerAttendance.findOne({
      trainerId: req.user.trainerId,
      date: attendanceDateKey(),
      checkInTime: { $ne: null },
      checkOutTime: null,
    });
    if (openShift) {
      return res.status(409).json({
        message: 'Check out before logging out. Location tracking stays on until you check out.',
        onShift: true,
      });
    }
  }
  res.json({ ok: true });
});

exports.me = asyncHandler(async (req, res) => {
  const user = await req.models.User.findById(req.user.userId);
  if (!user) return res.status(404).json({ message: 'User not found' });

  let branchName = null;
  if (user.branchId) {
    const branch = await req.models.Branch.findById(user.branchId);
    branchName = branch?.name || null;
  }

  res.json({ user: publicUser(user, req.gym, { branchName }) });
});

exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword || newPassword.length < 8) {
    return res.status(400).json({ message: 'Current password and a new password (8+ characters) are required' });
  }

  const user = await req.models.User.findById(req.user.userId).select('+password');
  const ok = await bcrypt.compare(currentPassword, user.password);
  if (!ok) return res.status(400).json({ message: 'Current password is incorrect' });

  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();
  res.json({ message: 'Password updated' });
});

exports.forgotPassword = asyncHandler(async (req, res) => {
  const { slug, email } = req.body;
  if (!slug || !email) {
    return res.status(400).json({ message: 'Gym code and email are required' });
  }

  const genericMessage =
    'If an account exists for that gym code and email, a password reset link has been sent.';

  const GymModel = Gym();
  const gym = await GymModel.findOne({ slug: String(slug).toLowerCase().trim() });
  if (!gym || gym.status !== 'active') {
    return res.json({ message: genericMessage });
  }

  const connection = await getGymConnection(gym._id);
  const models = registerGymModels(connection);
  const user = await models.User.findOne({ email: String(email).toLowerCase().trim() });

  if (!user || !user.isActive) {
    return res.json({ message: genericMessage });
  }

  const resetToken = jwt.sign(
    {
      purpose: 'password_reset',
      userId: String(user._id),
      gymId: String(gym._id),
      email: user.email,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.RESET_TOKEN_EXPIRES_IN || '1h' }
  );

  const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
  const resetUrl = `${frontendUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;

  await sendPasswordResetEmail({
    to: user.email,
    name: user.name,
    resetUrl,
  });

  res.json({ message: genericMessage });
});

exports.resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) {
    return res.status(400).json({ message: 'Reset token and new password are required' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters' });
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(400).json({ message: 'Reset link is invalid or has expired' });
  }

  if (payload.purpose !== 'password_reset' || !payload.userId || !payload.gymId) {
    return res.status(400).json({ message: 'Reset link is invalid or has expired' });
  }

  const GymModel = Gym();
  const gym = await GymModel.findById(payload.gymId);
  if (!gym || gym.status !== 'active') {
    return res.status(400).json({ message: 'Reset link is invalid or has expired' });
  }

  const connection = await getGymConnection(gym._id);
  const models = registerGymModels(connection);
  const user = await models.User.findById(payload.userId).select('+password');
  if (!user || !user.isActive) {
    return res.status(400).json({ message: 'Reset link is invalid or has expired' });
  }

  if (payload.email && String(payload.email).toLowerCase() !== String(user.email).toLowerCase()) {
    return res.status(400).json({ message: 'Reset link is invalid or has expired' });
  }

  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();

  await models.AuditLog.create({
    actorUserId: user._id,
    actorRole: user.role,
    action: 'PASSWORD_RESET',
    entity: 'User',
    entityId: user._id,
  });

  res.json({ message: 'Password updated successfully. You can sign in now.' });
});

const { body } = require('express-validator');
const Trainer = require('../models/Trainer');
const User = require('../models/User');
const Member = require('../models/Member');
const TrainerAttendance = require('../models/TrainerAttendance');
const { ok, paginate, paginationMeta } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { writeAudit } = require('../utils/audit');
const { uploadImage } = require('../services/storageService');
const { startOfDay, startOfMonth, formatWorkingHours } = require('../utils/dates');
const { computeStatus } = require('../utils/membership');

async function trainerStats(gymId, trainerId, expiringDays) {
  const membersCreated = await Member.find({ gymId, createdByTrainerId: trainerId });
  const assigned = await Member.find({ gymId, assignedTrainerId: trainerId });
  const attendance = await TrainerAttendance.find({ gymId, trainerId });

  const countByStatus = (list, status) =>
    list.filter((m) => computeStatus(m.expiryDate, expiringDays, m.status === 'inactive') === status).length;

  const present = attendance.filter((a) => a.status === 'present' || a.status === 'late').length;
  const absent = attendance.filter((a) => a.status === 'absent').length;
  const late = attendance.filter((a) => a.status === 'late').length;
  const percentage = attendance.length ? Math.round((present / attendance.length) * 100) : 0;

  return {
    totalAdmissions: membersCreated.length,
    assignedMembers: assigned.length,
    activeMembers: countByStatus(assigned, 'active'),
    expiringMembers: countByStatus(assigned, 'expiring'),
    expiredMembers: countByStatus(assigned, 'expired'),
    attendance: { present, absent, late, percentage, records: attendance.length },
  };
}

exports.createValidators = [
  body('name').trim().notEmpty().withMessage('Trainer name is required'),
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('phone').trim().notEmpty().withMessage('Phone is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
];

exports.listTrainers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const query = { gymId: req.user.gymId };
  if (req.query.status && req.query.status !== 'all') query.status = req.query.status;
  if (req.query.search) {
    const regex = new RegExp(req.query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    query.$or = [{ name: regex }, { email: regex }, { phone: regex }, { specialization: regex }];
  }

  const [rows, total] = await Promise.all([
    Trainer.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Trainer.countDocuments(query),
  ]);

  const expiringDays = req.gym.settings?.expiringSoonDays || 7;
  const trainers = await Promise.all(
    rows.map(async (trainer) => ({
      ...trainer.toObject(),
      stats: await trainerStats(req.user.gymId, trainer._id, expiringDays),
    }))
  );

  ok(res, { trainers, pagination: paginationMeta(total, page, limit) });
});

exports.getTrainer = asyncHandler(async (req, res) => {
  const trainer = await Trainer.findOne({ _id: req.params.id, gymId: req.user.gymId });
  if (!trainer) throw new AppError('Trainer not found', 404);

  const expiringDays = req.gym.settings?.expiringSoonDays || 7;
  const stats = await trainerStats(req.user.gymId, trainer._id, expiringDays);

  const admissions = await Member.find({ gymId: req.user.gymId, createdByTrainerId: trainer._id })
    .populate('assignedTrainerId', 'name')
    .populate({ path: 'membershipId', populate: { path: 'membershipPlanId', select: 'name' } })
    .sort({ createdAt: -1 })
    .limit(50);

  const attendance = await TrainerAttendance.find({ gymId: req.user.gymId, trainerId: trainer._id })
    .sort({ date: -1 })
    .limit(60);

  ok(res, {
    trainer: { ...trainer.toObject(), stats },
    admissions: admissions.map((m) => ({
      ...m.toObject(),
      status: computeStatus(m.expiryDate, expiringDays, m.status === 'inactive'),
    })),
    attendance: attendance.map((row) => ({
      ...row.toObject(),
      workingHours: formatWorkingHours(row.checkInTime, row.checkOutTime),
    })),
  });
});

exports.createTrainer = asyncHandler(async (req, res) => {
  const gymId = req.user.gymId;
  const email = req.body.email.toLowerCase();
  const exists = await User.findOne({ email });
  if (exists) throw new AppError('An account with this email already exists', 409);

  const user = await User.create({
    name: req.body.name,
    email,
    password: req.body.password,
    role: 'TRAINER',
    gymId,
    trainerId: null,
  });

  let profilePhoto = '';
  if (req.file) profilePhoto = await uploadImage(req.file, 'trainers');

  const trainer = await Trainer.create({
    gymId,
    userId: user._id,
    name: req.body.name,
    email,
    phone: req.body.phone,
    profilePhoto,
    specialization: req.body.specialization || '',
    experience: Number(req.body.experience) || 0,
    joiningDate: req.body.joiningDate ? new Date(req.body.joiningDate) : new Date(),
    status: 'active',
  });

  user.trainerId = trainer._id;
  await user.save({ validateBeforeSave: false });

  await writeAudit({
    gymId,
    userId: req.user.userId,
    action: 'Trainer Created',
    entityType: 'Trainer',
    entityId: trainer._id,
    description: `${trainer.name} was added as a trainer`,
  });

  ok(res, { trainer }, 201);
});

exports.updateTrainer = asyncHandler(async (req, res) => {
  const trainer = await Trainer.findOne({ _id: req.params.id, gymId: req.user.gymId });
  if (!trainer) throw new AppError('Trainer not found', 404);

  const allowed = ['name', 'phone', 'specialization', 'experience', 'joiningDate'];
  allowed.forEach((key) => {
    if (req.body[key] !== undefined) trainer[key] = req.body[key];
  });

  if (req.file) trainer.profilePhoto = await uploadImage(req.file, 'trainers');
  await trainer.save();

  await User.findByIdAndUpdate(trainer.userId, { name: trainer.name });

  await writeAudit({
    gymId: req.user.gymId,
    userId: req.user.userId,
    action: 'Trainer Updated',
    entityType: 'Trainer',
    entityId: trainer._id,
    description: `${trainer.name} profile was updated`,
  });

  ok(res, { trainer });
});

exports.setTrainerStatus = asyncHandler(async (req, res) => {
  const trainer = await Trainer.findOne({ _id: req.params.id, gymId: req.user.gymId });
  if (!trainer) throw new AppError('Trainer not found', 404);

  const status = req.body.status === 'inactive' ? 'inactive' : 'active';
  trainer.status = status;
  await trainer.save();

  await User.findByIdAndUpdate(trainer.userId, { isActive: status === 'active' });

  await writeAudit({
    gymId: req.user.gymId,
    userId: req.user.userId,
    action: 'Trainer Updated',
    entityType: 'Trainer',
    entityId: trainer._id,
    description: `${trainer.name} was ${status === 'active' ? 'activated' : 'deactivated'}`,
  });

  ok(res, { trainer });
});

exports.listActiveTrainers = asyncHandler(async (req, res) => {
  const trainers = await Trainer.find({ gymId: req.user.gymId, status: 'active' }).sort({ name: 1 });
  ok(res, { trainers });
});

exports.performance = asyncHandler(async (req, res) => {
  const trainers = await Trainer.find({ gymId: req.user.gymId }).sort({ name: 1 });
  const expiringDays = req.gym.settings?.expiringSoonDays || 7;
  const monthStart = startOfMonth();
  const today = startOfDay();

  const rows = await Promise.all(
    trainers.map(async (trainer) => {
      const stats = await trainerStats(req.user.gymId, trainer._id, expiringDays);
      const monthAdmissions = await Member.countDocuments({
        gymId: req.user.gymId,
        createdByTrainerId: trainer._id,
        createdAt: { $gte: monthStart },
      });
      const todayAttendance = await TrainerAttendance.findOne({
        gymId: req.user.gymId,
        trainerId: trainer._id,
        date: today,
      });
      return {
        ...trainer.toObject(),
        stats: { ...stats, monthAdmissions },
        todayStatus: todayAttendance?.status || 'absent',
      };
    })
  );

  ok(res, { trainers: rows });
});

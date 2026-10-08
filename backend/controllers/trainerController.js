const bcrypt = require('bcryptjs');
const asyncHandler = require('../utils/asyncHandler');
const { parsePagination, paginated } = require('../utils/pagination');
const { startOfDay, addDays, workingHours } = require('../utils/dates');
const { expiryFilter } = require('../services/membershipService');
const { toPublicPath } = require('../config/cloudStorage');
const { normalizeBatches } = require('../utils/trainerBatches');
const { attendanceDateKey } = require('../services/attendanceService');

const trainerQuery = (req) => {
  const q = { ...req.branchFilter };
  if (req.query.status) q.status = req.query.status;
  if (req.query.search) {
    const regex = new RegExp(req.query.search, 'i');
    q.$or = [{ name: regex }, { email: regex }, { phone: regex }, { specialization: regex }];
  }
  return q;
};

exports.listTrainers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req);
  const query = trainerQuery(req);
  const [items, total] = await Promise.all([
    req.models.Trainer.find(query)
      .populate('branchId', 'name branchCode city')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    req.models.Trainer.countDocuments(query),
  ]);
  res.json(paginated({ items, total, page, limit }));
});

exports.getTrainer = asyncHandler(async (req, res) => {
  const trainer = await req.models.Trainer.findOne({
    _id: req.params.id,
    ...req.branchFilter,
  }).populate('branchId', 'name branchCode city');
  if (!trainer) return res.status(404).json({ message: 'Trainer not found' });
  res.json({ item: trainer });
});

exports.createTrainer = asyncHandler(async (req, res) => {
  const { name, email, phone, password, branchId, specialization, experience, joiningDate } = req.body;
  if (!name || !email || !password || !branchId) {
    return res.status(400).json({ message: 'Name, email, password and branch are required' });
  }

  const batches = normalizeBatches(req.body.batches);
  if (!batches.length) {
    return res.status(400).json({ message: 'Select at least one trainer batch with timing' });
  }

  const branch = await req.models.Branch.findById(branchId);
  if (!branch) return res.status(400).json({ message: 'Branch does not belong to this gym' });

  const existingUser = await req.models.User.findOne({ email: String(email).toLowerCase() });
  if (existingUser) return res.status(409).json({ message: 'A user with this email already exists' });

  const hashed = await bcrypt.hash(password, 10);
  const user = await req.models.User.create({
    name,
    email: String(email).toLowerCase(),
    password: hashed,
    role: 'TRAINER',
    branchId: branch._id,
    isActive: true,
  });

  const trainer = await req.models.Trainer.create({
    userId: user._id,
    branchId: branch._id,
    name,
    email: String(email).toLowerCase(),
    phone,
    specialization,
    experience,
    joiningDate: joiningDate || new Date(),
    status: 'active',
    batches,
    profilePhoto: req.file ? toPublicPath('trainers', req.file.filename) : null,
  });

  user.trainerId = trainer._id;
  await user.save();

  await req.models.AuditLog.create({
    actorUserId: req.user.userId,
    actorRole: req.user.role,
    branchId: branch._id,
    action: 'TRAINER_CREATE',
    entity: 'Trainer',
    entityId: trainer._id,
  });

  res.status(201).json({ item: trainer });
});

exports.updateTrainer = asyncHandler(async (req, res) => {
  const trainer = await req.models.Trainer.findById(req.params.id);
  if (!trainer) return res.status(404).json({ message: 'Trainer not found' });

  if (req.body.branchId && String(req.body.branchId) !== String(trainer.branchId)) {
    const branch = await req.models.Branch.findById(req.body.branchId);
    if (!branch) return res.status(400).json({ message: 'Branch does not belong to this gym' });
    trainer.branchId = branch._id;
    await req.models.User.findByIdAndUpdate(trainer.userId, { branchId: branch._id });
  }

  ['name', 'phone', 'specialization', 'experience', 'joiningDate', 'status'].forEach((field) => {
    if (req.body[field] !== undefined) trainer[field] = req.body[field];
  });
  if (req.body.batches !== undefined) {
    const batches = normalizeBatches(req.body.batches);
    if (!batches.length) {
      return res.status(400).json({ message: 'Select at least one trainer batch with timing' });
    }
    trainer.batches = batches;
  }
  if (req.file) trainer.profilePhoto = toPublicPath('trainers', req.file.filename);

  await trainer.save();

  if (req.body.name || req.body.status === 'inactive' || req.body.status === 'active') {
    const user = await req.models.User.findById(trainer.userId);
    if (user) {
      if (req.body.name) user.name = req.body.name;
      if (req.body.status === 'inactive') user.isActive = false;
      if (req.body.status === 'active') user.isActive = true;
      await user.save();
    }
  }

  res.json({ item: trainer });
});

exports.removeTrainer = asyncHandler(async (req, res) => {
  const trainer = await req.models.Trainer.findOne({
    _id: req.params.id,
    ...req.branchFilter,
  });
  if (!trainer) return res.status(404).json({ message: 'Trainer not found' });
  if (trainer.status === 'inactive') {
    return res.status(400).json({ message: 'Trainer is already removed' });
  }

  const today = attendanceDateKey();
  const openShift = await req.models.TrainerAttendance.findOne({
    trainerId: trainer._id,
    date: today,
    checkInTime: { $ne: null },
    checkOutTime: null,
  });
  if (openShift) {
    openShift.checkOutTime = new Date();
    await openShift.save();
  }

  trainer.status = 'inactive';
  await trainer.save();
  await req.models.User.findByIdAndUpdate(trainer.userId, { isActive: false });
  await req.models.Member.updateMany(
    { assignedTrainerId: trainer._id },
    { $set: { assignedTrainerId: null } }
  );

  await req.models.AuditLog.create({
    actorUserId: req.user.userId,
    actorRole: req.user.role,
    branchId: trainer.branchId,
    action: 'TRAINER_REMOVE',
    entity: 'Trainer',
    entityId: trainer._id,
  });

  res.json({ item: trainer, message: 'Trainer removed' });
});

exports.trainerStats = asyncHandler(async (req, res) => {
  const trainer = await req.models.Trainer.findOne({
    _id: req.params.id,
    ...req.branchFilter,
  }).populate('branchId', 'name branchCode');
  if (!trainer) return res.status(404).json({ message: 'Trainer not found' });

  const trainerId = trainer._id;
  const today = startOfDay();
  const monthAgo = addDays(today, -30);

  const [admissions, assigned, active, expiring, expired, attendanceDocs] = await Promise.all([
    req.models.Member.countDocuments({ createdByTrainerId: trainerId }),
    req.models.Member.countDocuments({ assignedTrainerId: trainerId, status: { $ne: 'inactive' } }),
    req.models.Member.countDocuments({ assignedTrainerId: trainerId, ...expiryFilter('active') }),
    req.models.Member.countDocuments({ assignedTrainerId: trainerId, ...expiryFilter('expiring', 7) }),
    req.models.Member.countDocuments({ assignedTrainerId: trainerId, ...expiryFilter('expired') }),
    req.models.TrainerAttendance.find({
      trainerId,
      date: { $gte: monthAgo, $lte: today },
    }).lean(),
  ]);

  const present = attendanceDocs.filter((a) => a.status === 'present' || a.status === 'late').length;
  const attendancePercent = attendanceDocs.length
    ? Math.round((present / 30) * 100)
    : 0;

  const admissionHistory = await req.models.Member.find({ createdByTrainerId: trainerId })
    .sort({ createdAt: -1 })
    .limit(20)
    .populate('branchId', 'name')
    .populate('assignedTrainerId', 'name')
    .populate('membershipId')
    .lean();

  const attendanceHistory = (
    await req.models.TrainerAttendance.find({ trainerId })
      .sort({ date: -1 })
      .limit(30)
      .populate('branchId', 'name')
      .lean()
  ).map((row) => ({ ...row, workingHours: workingHours(row.checkInTime, row.checkOutTime) }));

  res.json({
    item: trainer,
    stats: {
      admissions,
      assignedMembers: assigned,
      activeMembers: active,
      expiringMembers: expiring,
      expiredMembers: expired,
      attendancePercent,
    },
    admissionHistory,
    attendanceHistory,
  });
});

exports.performance = asyncHandler(async (req, res) => {
  const trainers = await req.models.Trainer.find({ ...req.branchFilter, status: 'active' })
    .populate('branchId', 'name')
    .lean();

  const items = await Promise.all(
    trainers.map(async (trainer) => {
      const trainerId = trainer._id;
      const [admissions, assigned, active] = await Promise.all([
        req.models.Member.countDocuments({ createdByTrainerId: trainerId }),
        req.models.Member.countDocuments({ assignedTrainerId: trainerId }),
        req.models.Member.countDocuments({ assignedTrainerId: trainerId, ...expiryFilter('active') }),
      ]);
      return { ...trainer, stats: { admissions, assigned, active } };
    })
  );

  res.json({ items });
});

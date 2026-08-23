const mongoose = require('mongoose');
const TrainerAttendance = require('../models/TrainerAttendance');
const Trainer = require('../models/Trainer');
const { ok, paginate, paginationMeta } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { startOfDay, endOfDay, isLate, formatWorkingHours, parseDateRange } = require('../utils/dates');
const { writeAudit } = require('../utils/audit');
const { uploadImage } = require('../services/storageService');

function requireTrainerId(req) {
  if (req.user.role === 'TRAINER') {
    if (!req.user.trainerId) throw new AppError('Trainer profile is missing', 400);
    return req.user.trainerId;
  }
  throw new AppError('Only trainers can mark their own attendance', 403);
}

exports.checkIn = asyncHandler(async (req, res) => {
  const trainerId = requireTrainerId(req);
  const gymId = req.user.gymId;
  const today = startOfDay();

  const existing = await TrainerAttendance.findOne({ gymId, trainerId, date: today });
  if (existing?.checkInTime) throw new AppError('You have already checked in today', 409);
  if (!req.file) throw new AppError('Attendance photo is required', 400);

  const photo = await uploadImage(req.file, 'attendance');
  const checkInTime = new Date();
  const late = isLate(checkInTime, req.gym.settings?.lateAfterTime || '09:00');

  const record = existing
    ? Object.assign(existing, {
        checkInTime,
        checkInPhoto: photo,
        status: late ? 'late' : 'present',
      })
    : await TrainerAttendance.create({
        gymId,
        trainerId,
        date: today,
        checkInTime,
        checkInPhoto: photo,
        status: late ? 'late' : 'present',
      });

  if (existing) await record.save();

  await writeAudit({
    gymId,
    userId: req.user.userId,
    action: 'Attendance Marked',
    entityType: 'TrainerAttendance',
    entityId: record._id,
    description: `Check-in at ${checkInTime.toLocaleTimeString()}`,
  });

  ok(res, { attendance: record });
});

exports.checkOut = asyncHandler(async (req, res) => {
  const trainerId = requireTrainerId(req);
  const gymId = req.user.gymId;
  const today = startOfDay();

  const record = await TrainerAttendance.findOne({ gymId, trainerId, date: today });
  if (!record?.checkInTime) throw new AppError('Check in before checking out', 400);
  if (record.checkOutTime) throw new AppError('You have already checked out today', 409);
  if (!req.file) throw new AppError('Attendance photo is required', 400);

  record.checkOutTime = new Date();
  record.checkOutPhoto = await uploadImage(req.file, 'attendance');
  await record.save();

  await writeAudit({
    gymId,
    userId: req.user.userId,
    action: 'Attendance Marked',
    entityType: 'TrainerAttendance',
    entityId: record._id,
    description: `Check-out at ${record.checkOutTime.toLocaleTimeString()}`,
  });

  ok(res, {
    attendance: {
      ...record.toObject(),
      workingHours: formatWorkingHours(record.checkInTime, record.checkOutTime),
    },
  });
});

exports.todayMine = asyncHandler(async (req, res) => {
  const trainerId = req.user.role === 'TRAINER' ? req.user.trainerId : req.query.trainerId;
  if (!trainerId) throw new AppError('Trainer context required', 400);
  const record = await TrainerAttendance.findOne({
    gymId: req.user.gymId,
    trainerId,
    date: startOfDay(),
  });
  ok(res, {
    attendance: record
      ? { ...record.toObject(), workingHours: formatWorkingHours(record.checkInTime, record.checkOutTime) }
      : null,
  });
});

exports.listAttendance = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const query = { gymId: req.user.gymId };

  if (req.user.role === 'TRAINER') query.trainerId = req.user.trainerId;
  if (req.query.trainerId && mongoose.isValidObjectId(req.query.trainerId)) {
    query.trainerId = req.query.trainerId;
  }
  if (req.query.status && req.query.status !== 'all') query.status = req.query.status;

  const range = parseDateRange({
    datePreset: req.query.datePreset,
    startDate: req.query.startDate || req.query.date,
    endDate: req.query.endDate || req.query.date,
  });
  if (range.start || range.end) {
    query.date = {};
    if (range.start) query.date.$gte = range.start;
    if (range.end) query.date.$lte = range.end;
  } else if (req.query.date) {
    query.date = startOfDay(req.query.date);
  }

  const [rows, total] = await Promise.all([
    TrainerAttendance.find(query)
      .populate('trainerId', 'name phone profilePhoto specialization')
      .sort({ date: -1, checkInTime: -1 })
      .skip(skip)
      .limit(limit),
    TrainerAttendance.countDocuments(query),
  ]);

  ok(res, {
    attendance: rows.map((row) => ({
      ...row.toObject(),
      workingHours: formatWorkingHours(row.checkInTime, row.checkOutTime),
    })),
    pagination: paginationMeta(total, page, limit),
  });
});

exports.todayAll = asyncHandler(async (req, res) => {
  const trainers = await Trainer.find({ gymId: req.user.gymId, status: 'active' }).sort({ name: 1 });
  const records = await TrainerAttendance.find({
    gymId: req.user.gymId,
    date: startOfDay(),
  }).populate('trainerId', 'name profilePhoto');

  const byTrainer = new Map(records.map((r) => [String(r.trainerId._id || r.trainerId), r]));
  const rows = trainers.map((trainer) => {
    const record = byTrainer.get(String(trainer._id));
    return {
      trainer,
      attendance: record
        ? { ...record.toObject(), workingHours: formatWorkingHours(record.checkInTime, record.checkOutTime) }
        : null,
      status: record?.status || 'absent',
    };
  });

  ok(res, { rows });
});

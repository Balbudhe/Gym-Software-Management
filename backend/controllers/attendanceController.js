const asyncHandler = require('../utils/asyncHandler');
const { parsePagination, paginated } = require('../utils/pagination');
const { startOfDay, endOfDay, workingHours, workingHoursDecimal, formatTime } = require('../utils/dates');
const { attendanceStatusForCheckIn, attendanceDateKey } = require('../services/attendanceService');
const { toPublicPath } = require('../config/cloudStorage');
const { assertWithinAssignedHours, attendanceWindow } = require('../utils/trainerBatches');
const {
  requireAttendanceLocation,
  parseAttendanceLocation,
  withAddress,
  isOutsideCheckInArea,
  GEOFENCE_METERS,
} = require('../utils/geoLocation');
const {
  notifyTrainerLeftGym,
  notifyTrainerLoggedOutDuringShift,
  safeNotify,
} = require('../services/trainerAlertService');

const findOpenShift = (req, trainerId = req.user.trainerId) =>
  req.models.TrainerAttendance.findOne({
    trainerId,
    date: attendanceDateKey(),
    checkInTime: { $ne: null },
    checkOutTime: null,
  });

const decorate = (doc) => {
  const item = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  item.workingHours = workingHours(item.checkInTime, item.checkOutTime);
  item.checkInLabel = formatTime(item.checkInTime);
  item.checkOutLabel = formatTime(item.checkOutTime);
  return item;
};

exports.listAttendance = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req);
  const query = { ...req.branchFilter };
  if (req.query.trainerId) query.trainerId = req.query.trainerId;
  if (req.query.status) query.status = req.query.status;
  if (req.query.date) {
    const day = new Date(req.query.date);
    query.date = attendanceDateKey(day);
  } else if (req.query.from || req.query.to) {
    query.date = {};
    if (req.query.from) query.date.$gte = startOfDay(new Date(req.query.from));
    if (req.query.to) query.date.$lte = startOfDay(new Date(req.query.to));
  }

  const includeAbsent = req.query.includeAbsent === 'true';
  const date = req.query.date ? attendanceDateKey(new Date(req.query.date)) : attendanceDateKey();

  if (includeAbsent) {
    const trainers = await req.models.Trainer.find({
      ...req.branchFilter,
      status: 'active',
      ...(req.query.trainerId ? { _id: req.query.trainerId } : {}),
    })
      .populate('branchId', 'name')
      .lean();

    const records = await req.models.TrainerAttendance.find({
      ...req.branchFilter,
      date,
      ...(req.query.trainerId ? { trainerId: req.query.trainerId } : {}),
    }).lean();

    const byTrainer = new Map(records.map((r) => [String(r.trainerId), r]));
    let items = trainers.map((trainer) => {
      const record = byTrainer.get(String(trainer._id));
      if (record) {
        return decorate({
          ...record,
          trainerId: trainer,
          branchId: trainer.branchId,
        });
      }
      return {
        _id: `absent-${trainer._id}`,
        trainerId: trainer,
        branchId: trainer.branchId,
        date,
        checkInTime: null,
        checkOutTime: null,
        checkInLocation: null,
        checkOutLocation: null,
        lastKnownLocation: null,
        outsideGym: false,
        status: 'absent',
        workingHours: null,
        checkInLabel: null,
        checkOutLabel: null,
      };
    });

    if (req.query.status) {
      items = items.filter((i) => i.status === req.query.status);
    }

    const total = items.length;
    const paged = items.slice(skip, skip + limit);
    return res.json(paginated({ items: paged, total, page, limit }));
  }

  const [rows, total] = await Promise.all([
    req.models.TrainerAttendance.find(query)
      .populate('trainerId', 'name phone specialization')
      .populate('branchId', 'name branchCode')
      .sort({ date: -1, checkInTime: 1 })
      .skip(skip)
      .limit(limit),
    req.models.TrainerAttendance.countDocuments(query),
  ]);

  res.json(paginated({ items: rows.map(decorate), total, page, limit }));
});

exports.today = asyncHandler(async (req, res) => {
  const trainerId = req.user.role === 'TRAINER' ? req.user.trainerId : req.query.trainerId;
  if (!trainerId) return res.status(400).json({ message: 'Trainer not specified' });
  const [item, trainer] = await Promise.all([
    req.models.TrainerAttendance.findOne({
      trainerId,
      date: attendanceDateKey(),
      ...req.branchFilter,
    })
      .populate('branchId', 'name')
      .populate('trainerId', 'name'),
    req.models.Trainer.findById(trainerId).lean(),
  ]);
  const decorated = item ? decorate(item) : null;
  const onShift = !!(decorated?.checkInTime && !decorated?.checkOutTime);
  res.json({
    item: decorated,
    batches: trainer?.batches || [],
    attendanceWindow: attendanceWindow(trainer?.batches || [], decorated),
    onShift,
    geofenceMeters: GEOFENCE_METERS,
  });
});

exports.checkIn = asyncHandler(async (req, res) => {
  if (req.user.role !== 'TRAINER') {
    return res.status(403).json({ message: 'Only trainers can check in' });
  }
  const trainer = await req.models.Trainer.findById(req.user.trainerId);
  if (!trainer) return res.status(404).json({ message: 'Trainer not found' });
  const now = new Date();
  const activeBatch = assertWithinAssignedHours(trainer.batches, now, 'Check-in');

  const date = attendanceDateKey();
  const existing = await req.models.TrainerAttendance.findOne({
    trainerId: req.user.trainerId,
    date,
  });
  if (existing?.checkInTime) {
    return res.status(400).json({ message: 'Already checked in today' });
  }

  const photo = req.file ? toPublicPath('attendance', req.file.filename) : null;
  const status = attendanceStatusForCheckIn(now, activeBatch);
  const checkInLocation = await requireAttendanceLocation(req.body);

  const tracking = {
    lastKnownLocation: checkInLocation,
    lastLocationAt: now,
    outsideGym: false,
    outsideAlertSentAt: null,
    logoutAlertSentAt: null,
  };

  const item = existing
    ? Object.assign(existing, {
        checkInTime: now,
        checkInPhoto: photo,
        checkInLocation,
        status,
        branchId: req.user.branchId,
        ...tracking,
      })
    : await req.models.TrainerAttendance.create({
        branchId: req.user.branchId,
        trainerId: req.user.trainerId,
        date,
        checkInTime: now,
        checkInPhoto: photo,
        checkInLocation,
        status,
        ...tracking,
      });

  if (existing) await item.save();
  res.status(201).json({ item: decorate(item) });
});

exports.checkOut = asyncHandler(async (req, res) => {
  if (req.user.role !== 'TRAINER') {
    return res.status(403).json({ message: 'Only trainers can check out' });
  }
  const item = await req.models.TrainerAttendance.findOne({
    trainerId: req.user.trainerId,
    date: attendanceDateKey(),
  });
  if (!item?.checkInTime) {
    return res.status(400).json({ message: 'Check in first' });
  }
  if (item.checkOutTime) {
    return res.status(400).json({ message: 'Already checked out today' });
  }
  const trainer = await req.models.Trainer.findById(req.user.trainerId);
  if (!trainer) return res.status(404).json({ message: 'Trainer not found' });
  assertWithinAssignedHours(trainer.batches, new Date(), 'Check-out');
  item.checkOutTime = new Date();
  item.checkOutPhoto = req.file ? toPublicPath('attendance', req.file.filename) : null;
  item.checkOutLocation = await requireAttendanceLocation(req.body);
  item.lastKnownLocation = item.checkOutLocation;
  item.lastLocationAt = item.checkOutTime;
  item.outsideGym = false;
  await item.save();
  res.json({ item: decorate(item) });
});

exports.locationPing = asyncHandler(async (req, res) => {
  if (req.user.role !== 'TRAINER') {
    return res.status(403).json({ message: 'Only trainers can send location updates' });
  }
  const item = await findOpenShift(req);
  if (!item) {
    return res.status(400).json({ message: 'No open check-in. Location tracking is only active during a shift.' });
  }

  const parsed = parseAttendanceLocation(req.body);
  if (!parsed) {
    return res.status(400).json({ message: 'Location is required' });
  }

  const now = new Date();
  item.lastKnownLocation = parsed;
  item.lastLocationAt = now;

  const { outside, distance, radius } = isOutsideCheckInArea(item.checkInLocation, parsed);
  const wasOutside = !!item.outsideGym;
  item.outsideGym = outside;

  let alertSent = false;
  if (outside && item.checkInLocation) {
    const cooldownMs = 20 * 60 * 1000;
    const lastAlert = item.outsideAlertSentAt ? new Date(item.outsideAlertSentAt).getTime() : 0;
    const shouldAlert = !wasOutside || Date.now() - lastAlert > cooldownMs;
    if (shouldAlert) {
      const currentLocation = await withAddress(parsed);
      item.lastKnownLocation = currentLocation;
      const trainer = await req.models.Trainer.findById(req.user.trainerId).lean();
      await safeNotify(() =>
        notifyTrainerLeftGym({
          gym: req.gym,
          trainer,
          attendance: item,
          currentLocation,
          distance,
        })
      );
      item.outsideAlertSentAt = now;
      alertSent = true;
    }
  }

  await item.save();
  res.json({
    item: decorate(item),
    onShift: true,
    outsideGym: item.outsideGym,
    distanceMeters: distance,
    geofenceMeters: radius || GEOFENCE_METERS,
    alertSent,
  });
});

exports.unexpectedLogout = asyncHandler(async (req, res) => {
  if (req.user.role !== 'TRAINER' || !req.user.trainerId) {
    return res.json({ ok: true, notified: false });
  }
  const item = await findOpenShift(req);
  if (!item) return res.json({ ok: true, notified: false });
  if (item.logoutAlertSentAt) return res.json({ ok: true, notified: false });

  const trainer = await req.models.Trainer.findById(req.user.trainerId).lean();
  await safeNotify(() =>
    notifyTrainerLoggedOutDuringShift({
      gym: req.gym,
      trainer,
      attendance: item,
      reason: req.body?.reason || 'logged-out',
    })
  );
  item.logoutAlertSentAt = new Date();
  await item.save();
  res.json({ ok: true, notified: true });
});

exports.hoursHelper = workingHoursDecimal;

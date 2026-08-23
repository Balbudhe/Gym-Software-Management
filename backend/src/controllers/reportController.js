const mongoose = require('mongoose');
const Member = require('../models/Member');
const Trainer = require('../models/Trainer');
const TrainerAttendance = require('../models/TrainerAttendance');
const { ok } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { startOfDay, startOfWeek, startOfMonth, endOfDay, formatWorkingHours, parseDateRange } = require('../utils/dates');
const { computeStatus } = require('../utils/membership');

exports.memberReport = asyncHandler(async (req, res) => {
  const gymId = req.user.gymId;
  const expiringDays = req.gym.settings?.expiringSoonDays || 7;
  const members = await Member.find({ gymId });
  const live = members.filter((m) => m.status !== 'inactive');
  const statuses = live.map((m) => computeStatus(m.expiryDate, expiringDays));
  const now = new Date();

  ok(res, {
    report: {
      totalMembers: members.length,
      active: statuses.filter((s) => s === 'active').length,
      expiring: statuses.filter((s) => s === 'expiring').length,
      expired: statuses.filter((s) => s === 'expired').length,
      newAdmissions: {
        today: await Member.countDocuments({ gymId, createdAt: { $gte: startOfDay(now), $lte: endOfDay(now) } }),
        week: await Member.countDocuments({ gymId, createdAt: { $gte: startOfWeek(now), $lte: endOfDay(now) } }),
        month: await Member.countDocuments({ gymId, createdAt: { $gte: startOfMonth(now), $lte: endOfDay(now) } }),
      },
    },
  });
});

exports.trainerReport = asyncHandler(async (req, res) => {
  const gymId = req.user.gymId;
  const trainers = await Trainer.find({ gymId }).sort({ name: 1 });
  const rows = await Promise.all(
    trainers.map(async (trainer) => {
      const attendance = await TrainerAttendance.find({ gymId, trainerId: trainer._id });
      const present = attendance.filter((a) => a.status === 'present').length;
      const late = attendance.filter((a) => a.status === 'late').length;
      const absent = attendance.filter((a) => a.status === 'absent').length;
      return {
        trainerId: trainer._id,
        name: trainer.name,
        admissions: await Member.countDocuments({ gymId, createdByTrainerId: trainer._id }),
        assignedMembers: await Member.countDocuments({ gymId, assignedTrainerId: trainer._id }),
        present: present + late,
        absent,
        late,
        attendancePercentage: attendance.length ? Math.round(((present + late) / attendance.length) * 100) : 0,
      };
    })
  );
  ok(res, { report: rows });
});

exports.admissionReport = asyncHandler(async (req, res) => {
  const gymId = req.user.gymId;
  const now = new Date();
  const trainerQuery = { gymId };
  if (req.query.trainerId && mongoose.isValidObjectId(req.query.trainerId)) {
    trainerQuery._id = req.query.trainerId;
  }
  const trainers = await Trainer.find(trainerQuery).sort({ name: 1 });
  const rows = await Promise.all(
    trainers.map(async (trainer) => ({
      trainerId: trainer._id,
      name: trainer.name,
      totalAdmissions: await Member.countDocuments({ gymId, createdByTrainerId: trainer._id }),
      thisWeek: await Member.countDocuments({
        gymId,
        createdByTrainerId: trainer._id,
        createdAt: { $gte: startOfWeek(now), $lte: endOfDay(now) },
      }),
      thisMonth: await Member.countDocuments({
        gymId,
        createdByTrainerId: trainer._id,
        createdAt: { $gte: startOfMonth(now), $lte: endOfDay(now) },
      }),
    }))
  );
  ok(res, { report: rows });
});

exports.attendanceReport = asyncHandler(async (req, res) => {
  const gymId = req.user.gymId;
  const trainers = await Trainer.find({ gymId }).sort({ name: 1 });
  const range = parseDateRange(req.query);

  const rows = await Promise.all(
    trainers.map(async (trainer) => {
      const query = { gymId, trainerId: trainer._id };
      if (range.start || range.end) {
        query.date = {};
        if (range.start) query.date.$gte = range.start;
        if (range.end) query.date.$lte = range.end;
      }
      const attendance = await TrainerAttendance.find(query);
      const present = attendance.filter((a) => a.status === 'present').length;
      const late = attendance.filter((a) => a.status === 'late').length;
      const absent = attendance.filter((a) => a.status === 'absent').length;
      const totalMinutes = attendance.reduce((sum, row) => {
        const hours = formatWorkingHours(row.checkInTime, row.checkOutTime);
        return sum + (hours?.totalMinutes || 0);
      }, 0);
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return {
        trainerId: trainer._id,
        name: trainer.name,
        present: present + late,
        absent,
        late,
        attendancePercentage: attendance.length ? Math.round(((present + late) / attendance.length) * 100) : 0,
        totalHours: `${hours}h ${String(minutes).padStart(2, '0')}m`,
        totalMinutes,
      };
    })
  );
  ok(res, { report: rows });
});

const mongoose = require('mongoose');

const trainerAttendanceSchema = new mongoose.Schema(
  {
    gymId: { type: mongoose.Schema.Types.ObjectId, ref: 'Gym', required: true, index: true },
    trainerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trainer', required: true, index: true },
    date: { type: Date, required: true },
    checkInTime: { type: Date, default: null },
    checkInPhoto: { type: String, default: '' },
    checkOutTime: { type: Date, default: null },
    checkOutPhoto: { type: String, default: '' },
    status: { type: String, enum: ['present', 'absent', 'late'], default: 'present' },
  },
  { timestamps: true }
);

trainerAttendanceSchema.index({ gymId: 1, trainerId: 1, date: 1 }, { unique: true });
trainerAttendanceSchema.index({ gymId: 1, date: 1 });

module.exports = mongoose.model('TrainerAttendance', trainerAttendanceSchema);

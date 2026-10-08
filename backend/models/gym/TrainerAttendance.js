const { Schema } = require('mongoose');

const locationSchema = new Schema(
  {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    accuracy: { type: Number, default: null },
    address: { type: String, default: '', trim: true },
  },
  { _id: false }
);

const trainerAttendanceSchema = new Schema(
  {
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    trainerId: { type: Schema.Types.ObjectId, ref: 'Trainer', required: true },
    date: { type: Date, required: true },
    checkInTime: { type: Date, default: null },
    checkInPhoto: { type: String, default: null },
    checkInLocation: { type: locationSchema, default: null },
    checkOutTime: { type: Date, default: null },
    checkOutPhoto: { type: String, default: null },
    checkOutLocation: { type: locationSchema, default: null },
    lastKnownLocation: { type: locationSchema, default: null },
    lastLocationAt: { type: Date, default: null },
    outsideGym: { type: Boolean, default: false },
    outsideAlertSentAt: { type: Date, default: null },
    logoutAlertSentAt: { type: Date, default: null },
    status: {
      type: String,
      enum: ['present', 'absent', 'late'],
      default: 'present',
    },
  },
  { timestamps: true }
);

trainerAttendanceSchema.index({ trainerId: 1, date: 1 }, { unique: true });
trainerAttendanceSchema.index({ branchId: 1, date: 1 });

module.exports = trainerAttendanceSchema;

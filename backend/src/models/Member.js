const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema(
  {
    gymId: { type: mongoose.Schema.Types.ObjectId, ref: 'Gym', required: true, index: true },
    memberCode: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, default: '', lowercase: true, trim: true },
    dateOfBirth: { type: Date, default: null },
    gender: { type: String, enum: ['male', 'female', 'other', ''], default: '' },
    address: { type: String, default: '' },
    emergencyContact: { type: String, default: '' },
    profilePhoto: { type: String, default: '' },
    createdByTrainerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trainer', default: null, index: true },
    assignedTrainerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trainer', default: null, index: true },
    membershipId: { type: mongoose.Schema.Types.ObjectId, ref: 'Membership', default: null },
    joiningDate: { type: Date, required: true },
    expiryDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ['active', 'expiring', 'expired', 'inactive'],
      default: 'active',
      index: true,
    },
    height: { type: Number, default: null },
    weight: { type: Number, default: null },
    fitnessGoal: { type: String, default: '' },
    remarks: { type: String, default: '' },
  },
  { timestamps: true }
);

memberSchema.index({ gymId: 1, memberCode: 1 }, { unique: true });
memberSchema.index({ gymId: 1, phone: 1 });
memberSchema.index({ gymId: 1, name: 1 });
memberSchema.index({ gymId: 1, joiningDate: 1 });
memberSchema.index({ gymId: 1, expiryDate: 1 });
memberSchema.index({ gymId: 1, createdByTrainerId: 1, assignedTrainerId: 1, status: 1 });

module.exports = mongoose.model('Member', memberSchema);

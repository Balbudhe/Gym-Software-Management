const { Schema } = require('mongoose');

const memberSchema = new Schema(
  {
    memberCode: { type: String, required: true, unique: true, trim: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    dateOfBirth: { type: Date },
    gender: { type: String, enum: ['male', 'female', 'other', ''], default: '' },
    address: { type: String, trim: true },
    emergencyContact: { type: String, trim: true },
    profilePhoto: { type: String, default: null },
    createdByTrainerId: { type: Schema.Types.ObjectId, ref: 'Trainer', default: null },
    assignedTrainerId: { type: Schema.Types.ObjectId, ref: 'Trainer', default: null },
    membershipId: { type: Schema.Types.ObjectId, ref: 'Membership', default: null },
    joiningDate: { type: Date, required: true },
    expiryDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ['active', 'expired', 'inactive'],
      default: 'active',
    },
    height: { type: String, trim: true },
    weight: { type: String, trim: true },
    fitnessGoal: { type: String, trim: true },
    healthIssue: { type: String, required: true, trim: true },
    remarks: { type: String, trim: true },
    reminderLog: [
      {
        kind: {
          type: String,
          enum: ['before_3', 'before_2', 'on_expiry', 'after_1', 'after_2'],
          required: true,
        },
        expiryKey: { type: String, required: true, trim: true },
        sentAt: { type: Date, default: Date.now },
        emailSent: { type: Boolean, default: false },
        smsSent: { type: Boolean, default: false },
        _id: false,
      },
    ],
  },
  { timestamps: true }
);

memberSchema.index({ branchId: 1 });
memberSchema.index({ createdByTrainerId: 1 });
memberSchema.index({ assignedTrainerId: 1 });
memberSchema.index({ expiryDate: 1 });
memberSchema.index({ name: 'text', phone: 'text', email: 'text', memberCode: 'text' });

module.exports = memberSchema;

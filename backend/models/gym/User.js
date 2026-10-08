const { Schema } = require('mongoose');

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ['OWNER', 'TRAINER'], required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', default: null },
    trainerId: { type: Schema.Types.ObjectId, ref: 'Trainer', default: null },
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date, default: null },
  },
  { timestamps: true }
);

userSchema.index({ email: 1 }, { unique: true });

module.exports = userSchema;

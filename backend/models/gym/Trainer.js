const { Schema } = require('mongoose');

const trainerSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    profilePhoto: { type: String, default: null },
    specialization: { type: String, trim: true },
    experience: { type: String, trim: true },
    joiningDate: { type: Date, default: Date.now },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    batches: [
      {
        name: {
          type: String,
          enum: ['morning', 'afternoon', 'evening'],
          required: true,
        },
        startTime: { type: String, required: true, trim: true },
        endTime: { type: String, required: true, trim: true },
        _id: false,
      },
    ],
  },
  { timestamps: true }
);

trainerSchema.index({ email: 1 }, { unique: true });
trainerSchema.index({ branchId: 1 });

module.exports = trainerSchema;

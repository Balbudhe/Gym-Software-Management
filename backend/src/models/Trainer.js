const mongoose = require('mongoose');

const trainerSchema = new mongoose.Schema(
  {
    gymId: { type: mongoose.Schema.Types.ObjectId, ref: 'Gym', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    profilePhoto: { type: String, default: '' },
    specialization: { type: String, default: '' },
    experience: { type: Number, default: 0 },
    joiningDate: { type: Date, required: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  { timestamps: true }
);

trainerSchema.index({ gymId: 1, email: 1 }, { unique: true });
trainerSchema.index({ gymId: 1, status: 1 });

module.exports = mongoose.model('Trainer', trainerSchema);

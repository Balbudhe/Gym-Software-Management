const mongoose = require('mongoose');

const gymSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    logo: { type: String, default: '' },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    address: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    pincode: { type: String, default: '' },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    memberSequence: { type: Number, default: 0 },
    settings: {
      expiringSoonDays: { type: Number, default: 7 },
      lateAfterTime: { type: String, default: '09:00' },
    },
  },
  { timestamps: true }
);

gymSchema.index({ email: 1 }, { unique: true });
gymSchema.index({ code: 1 });

module.exports = mongoose.model('Gym', gymSchema);

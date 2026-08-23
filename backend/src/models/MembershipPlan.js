const mongoose = require('mongoose');

const membershipPlanSchema = new mongoose.Schema(
  {
    gymId: { type: mongoose.Schema.Types.ObjectId, ref: 'Gym', required: true, index: true },
    name: { type: String, required: true, trim: true },
    durationValue: { type: Number, required: true, min: 1 },
    durationUnit: { type: String, enum: ['day', 'month', 'year'], default: 'month' },
    price: { type: Number, required: true, min: 0 },
    description: { type: String, default: '' },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  { timestamps: true }
);

membershipPlanSchema.index({ gymId: 1, name: 1 });
membershipPlanSchema.index({ gymId: 1, status: 1 });

module.exports = mongoose.model('MembershipPlan', membershipPlanSchema);

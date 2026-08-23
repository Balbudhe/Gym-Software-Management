const mongoose = require('mongoose');

const membershipSchema = new mongoose.Schema(
  {
    gymId: { type: mongoose.Schema.Types.ObjectId, ref: 'Gym', required: true, index: true },
    memberId: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true, index: true },
    membershipPlanId: { type: mongoose.Schema.Types.ObjectId, ref: 'MembershipPlan', required: true },
    startDate: { type: Date, required: true },
    expiryDate: { type: Date, required: true },
    status: { type: String, enum: ['active', 'expiring', 'expired'], default: 'active', index: true },
    createdByTrainerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trainer', default: null },
  },
  { timestamps: true }
);

membershipSchema.index({ gymId: 1, memberId: 1, createdAt: -1 });
membershipSchema.index({ gymId: 1, expiryDate: 1, status: 1 });

module.exports = mongoose.model('Membership', membershipSchema);

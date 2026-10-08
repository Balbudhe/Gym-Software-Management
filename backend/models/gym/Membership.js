const { Schema } = require('mongoose');

const membershipSchema = new Schema(
  {
    memberId: { type: Schema.Types.ObjectId, ref: 'Member', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    membershipPlanId: { type: Schema.Types.ObjectId, ref: 'MembershipPlan', required: true },
    startDate: { type: Date, required: true },
    expiryDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ['active', 'expired', 'cancelled'],
      default: 'active',
    },
    createdByTrainerId: { type: Schema.Types.ObjectId, ref: 'Trainer', default: null },
  },
  { timestamps: true }
);

membershipSchema.index({ memberId: 1 });
membershipSchema.index({ branchId: 1 });
membershipSchema.index({ expiryDate: 1 });

module.exports = membershipSchema;

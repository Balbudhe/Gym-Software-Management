const { Schema } = require('mongoose');

const membershipPaymentSchema = new Schema(
  {
    memberId: { type: Schema.Types.ObjectId, ref: 'Member', required: true },
    membershipId: { type: Schema.Types.ObjectId, ref: 'Membership', default: null },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    method: { type: String, enum: ['cash', 'online'], required: true },
    amount: { type: Number, required: true, min: 0 },
    reference: { type: String, trim: true, default: '' },
    notes: { type: String, trim: true, default: '' },
    paidAt: { type: Date, default: Date.now },
    recordedByUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    recordedByRole: { type: String, enum: ['OWNER', 'TRAINER'], default: 'OWNER' },
    createdByTrainerId: { type: Schema.Types.ObjectId, ref: 'Trainer', default: null },
  },
  { timestamps: true }
);

membershipPaymentSchema.index({ branchId: 1, paidAt: -1 });
membershipPaymentSchema.index({ memberId: 1, paidAt: -1 });
membershipPaymentSchema.index({ method: 1, paidAt: -1 });

module.exports = membershipPaymentSchema;

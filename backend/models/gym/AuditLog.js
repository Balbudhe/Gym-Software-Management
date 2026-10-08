const { Schema } = require('mongoose');

const auditLogSchema = new Schema(
  {
    actorUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    actorRole: { type: String },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', default: null },
    action: { type: String, required: true },
    entity: { type: String, required: true },
    entityId: { type: Schema.Types.ObjectId },
    meta: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

auditLogSchema.index({ createdAt: -1 });

module.exports = auditLogSchema;

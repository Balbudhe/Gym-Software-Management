const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    gymId: { type: mongoose.Schema.Types.ObjectId, ref: 'Gym', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    action: { type: String, required: true },
    entityType: { type: String, required: true },
    entityId: { type: mongoose.Schema.Types.ObjectId, default: null },
    description: { type: String, default: '' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

auditLogSchema.index({ gymId: 1, createdAt: -1 });
auditLogSchema.index({ gymId: 1, entityType: 1, entityId: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);

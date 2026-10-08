const { Schema } = require('mongoose');
const { getPlatformConnection } = require('../../config/platformDatabase');

const platformAdminSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

platformAdminSchema.index({ email: 1 }, { unique: true });

module.exports = () => {
  const conn = getPlatformConnection();
  return conn.models.PlatformAdmin || conn.model('PlatformAdmin', platformAdminSchema);
};

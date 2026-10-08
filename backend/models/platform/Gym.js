const { Schema } = require('mongoose');
const { getPlatformConnection } = require('../../config/platformDatabase');

const gymSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true, trim: true },
    ownerName: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active',
    },
    databaseConnectionId: { type: Schema.Types.ObjectId, ref: 'GymDatabaseConnection' },
    paymentsEnabled: { type: Boolean, default: false },
  },
  { timestamps: true }
);

gymSchema.index({ slug: 1 }, { unique: true });
gymSchema.index({ email: 1 }, { unique: true });

module.exports = () => {
  const conn = getPlatformConnection();
  return conn.models.Gym || conn.model('Gym', gymSchema);
};

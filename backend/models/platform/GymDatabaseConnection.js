const { Schema } = require('mongoose');
const { getPlatformConnection } = require('../../config/platformDatabase');

const gymDatabaseConnectionSchema = new Schema(
  {
    gymId: { type: Schema.Types.ObjectId, ref: 'Gym', required: true, unique: true },
    encryptedConnectionString: { type: String, required: true, select: false },
    databaseName: { type: String, required: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  { timestamps: true }
);

module.exports = () => {
  const conn = getPlatformConnection();
  return (
    conn.models.GymDatabaseConnection ||
    conn.model('GymDatabaseConnection', gymDatabaseConnectionSchema)
  );
};

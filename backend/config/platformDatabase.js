const mongoose = require('mongoose');
const { withDatabase } = require('../utils/mongoUri');

let platformConnection = null;

const resolvePlatformUri = () => {
  if (process.env.MONGODB_PLATFORM_URI) return process.env.MONGODB_PLATFORM_URI;
  if (process.env.MONGO_URI) return withDatabase(process.env.MONGO_URI, 'gym_platform');
  return null;
};

const connectPlatform = async () => {
  const uri = resolvePlatformUri();
  if (!uri) throw new Error('MONGODB_PLATFORM_URI or MONGO_URI is required');

  if (platformConnection && platformConnection.readyState === 1) {
    return platformConnection;
  }

  platformConnection = mongoose.createConnection(uri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 8000,
  });

  await platformConnection.asPromise();
  return platformConnection;
};

const getPlatformConnection = () => {
  if (!platformConnection || platformConnection.readyState !== 1) {
    throw new Error('Platform database is not connected');
  }
  return platformConnection;
};

module.exports = { connectPlatform, getPlatformConnection };

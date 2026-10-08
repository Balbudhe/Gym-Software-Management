const mongoose = require('mongoose');
const { getPlatformConnection } = require('./platformDatabase');
const { decrypt } = require('../services/encryptionService');
const { registerGymModels } = require('../models/gym');
const GymDatabaseConnection = require('../models/platform/GymDatabaseConnection');

const connections = new Map();

const getGymConnection = async (gymId) => {
  const key = String(gymId);
  const cached = connections.get(key);
  if (cached && cached.readyState === 1) {
    return cached;
  }

  const GymDatabaseConnectionModel = GymDatabaseConnection();
  const record = await GymDatabaseConnectionModel.findOne({ gymId, status: 'active' }).select(
    '+encryptedConnectionString'
  );

  if (!record) {
    const error = new Error('Gym database connection not found');
    error.status = 500;
    throw error;
  }

  const uri = decrypt(record.encryptedConnectionString);
  const connection = mongoose.createConnection(uri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 8000,
  });

  await connection.asPromise();
  registerGymModels(connection);
  connections.set(key, connection);
  return connection;
};

const testConnectionUri = async (uri) => {
  const connection = mongoose.createConnection(uri, {
    maxPoolSize: 1,
    serverSelectionTimeoutMS: 8000,
  });
  try {
    await connection.asPromise();
    return true;
  } finally {
    await connection.close().catch(() => {});
  }
};

const createAndCacheGymConnection = async (gymId, uri) => {
  const key = String(gymId);
  const existing = connections.get(key);
  if (existing) {
    await existing.close().catch(() => {});
    connections.delete(key);
  }
  const connection = mongoose.createConnection(uri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 8000,
  });
  await connection.asPromise();
  registerGymModels(connection);
  connections.set(key, connection);
  return connection;
};

const closeAllGymConnections = async () => {
  await Promise.all(
    [...connections.values()].map((conn) => conn.close().catch(() => {}))
  );
  connections.clear();
};

const getPlatformConn = () => getPlatformConnection();

module.exports = {
  getGymConnection,
  testConnectionUri,
  createAndCacheGymConnection,
  closeAllGymConnections,
  getPlatformConn,
};

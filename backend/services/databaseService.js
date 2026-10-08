const { getGymConnection, createAndCacheGymConnection, testConnectionUri } = require('../config/databaseManager');
const { registerGymModels } = require('../models/gym');

const getModels = async (gymId) => {
  const connection = await getGymConnection(gymId);
  return registerGymModels(connection);
};

module.exports = {
  getModels,
  getGymConnection,
  createAndCacheGymConnection,
  testConnectionUri,
};

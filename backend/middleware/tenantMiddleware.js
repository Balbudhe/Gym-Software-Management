const { getGymConnection } = require('../config/databaseManager');
const { registerGymModels } = require('../models/gym');

const tenant = async (req, res, next) => {
  try {
    if (!req.user?.gymId) {
      return res.status(401).json({ message: 'Gym context missing' });
    }
    const connection = await getGymConnection(req.user.gymId);
    req.gymConnection = connection;
    req.models = registerGymModels(connection);
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { tenant };

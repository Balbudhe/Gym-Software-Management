const Gym = require('../models/Gym');
const AppError = require('../utils/AppError');

async function tenantMiddleware(req, res, next) {
  try {
    if (!req.user?.gymId) throw new AppError('Gym context missing', 401);

    const gym = await Gym.findById(req.user.gymId);
    if (!gym) throw new AppError('Gym not found', 404);
    if (gym.status !== 'active') throw new AppError('This gym account is inactive', 403);

    req.gym = gym;
    req.tenantId = gym._id;
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = tenantMiddleware;

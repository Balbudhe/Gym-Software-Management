const jwt = require('jsonwebtoken');
const Gym = require('../models/platform/Gym');

const readToken = (req) => {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7);
  return req.body?.token || null;
};

const attachUserFromToken = async (req, token, { ignoreExpiration = false } = {}) => {
  if (!token) {
    const error = new Error('Authentication required');
    error.statusCode = 401;
    throw error;
  }
  const payload = jwt.verify(token, process.env.JWT_SECRET, { ignoreExpiration });
  const GymModel = Gym();
  const gym = await GymModel.findById(payload.gymId);
  if (!gym || gym.status !== 'active') {
    const error = new Error('Gym is not active');
    error.statusCode = 401;
    throw error;
  }
  req.user = {
    userId: payload.userId,
    gymId: payload.gymId,
    role: payload.role,
    branchId: payload.branchId || null,
    trainerId: payload.trainerId || null,
  };
  req.gym = gym;
};

const auth = async (req, res, next) => {
  try {
    await attachUserFromToken(req, readToken(req));
    next();
  } catch (error) {
    return res.status(401).json({ message: error.message || 'Invalid or expired token' });
  }
};

const allowExpiredAuth = async (req, res, next) => {
  try {
    await attachUserFromToken(req, readToken(req), { ignoreExpiration: true });
    next();
  } catch (error) {
    return res.status(401).json({ message: error.message || 'Invalid or expired token' });
  }
};

module.exports = { auth, allowExpiredAuth };

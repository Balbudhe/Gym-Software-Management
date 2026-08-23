const User = require('../models/User');
const AppError = require('../utils/AppError');
const { verifyToken } = require('../utils/jwt');

function extractToken(req) {
  if (req.cookies?.token) return req.cookies.token;
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) return header.slice(7);
  return null;
}

async function authMiddleware(req, res, next) {
  try {
    const token = extractToken(req);
    if (!token) throw new AppError('Authentication required', 401);

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch {
      throw new AppError('Invalid or expired session', 401);
    }

    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) throw new AppError('Account is inactive or not found', 401);
    if (String(user.gymId) !== String(decoded.gymId)) {
      throw new AppError('Invalid session tenant', 401);
    }

    req.user = {
      userId: user._id,
      gymId: user.gymId,
      role: user.role,
      trainerId: user.trainerId,
      name: user.name,
      email: user.email,
    };
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = authMiddleware;

const AppError = require('../utils/AppError');

function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  let status = err.statusCode || 500;
  let message = err.message || 'Internal server error';

  if (err.name === 'ValidationError') {
    status = 400;
    message = Object.values(err.errors).map((e) => e.message).join(', ');
  }

  if (err.code === 11000) {
    status = 409;
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    message = `A record with this ${field} already exists`;
  }

  if (err.name === 'CastError') {
    status = 400;
    message = 'Invalid identifier';
  }

  if (err.name === 'MulterError') {
    status = 400;
    message = err.code === 'LIMIT_FILE_SIZE' ? 'File is too large (max 5MB)' : err.message;
  }

  if (process.env.NODE_ENV !== 'production') {
    console.error(err);
  }

  res.status(status).json({
    success: false,
    message,
    ...(process.env.NODE_ENV !== 'production' && !err.isOperational ? { stack: err.stack } : {}),
  });
}

function notFound(req, res, next) {
  next(new AppError(`Route not found: ${req.originalUrl}`, 404));
}

module.exports = { errorHandler, notFound };

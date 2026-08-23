const { validationResult } = require('express-validator');
const AppError = require('../utils/AppError');

function validate(req, res, next) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();
  const details = errors.array().map((e) => ({ field: e.path, message: e.msg }));
  next(new AppError(details[0]?.message || 'Validation failed', 422));
}

module.exports = validate;

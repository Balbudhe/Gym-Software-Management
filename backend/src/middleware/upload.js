const multer = require('multer');
const AppError = require('../utils/AppError');

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED.includes(file.mimetype)) {
      return cb(new AppError('Only JPEG, PNG, and WebP images are allowed', 400));
    }
    cb(null, true);
  },
});

module.exports = upload;

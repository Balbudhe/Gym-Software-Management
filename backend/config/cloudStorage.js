const fs = require('fs');
const path = require('path');
const multer = require('multer');

const uploadRoot = () =>
  path.resolve(process.cwd(), process.env.UPLOAD_DIR || 'uploads');

const ensureDir = (dir) => {
  fs.mkdirSync(dir, { recursive: true });
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folder = req.uploadFolder || 'misc';
    const dest = path.join(uploadRoot(), folder);
    ensureDir(dest);
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase() || '.jpg';
    const gymId = req.user?.gymId || 'gym';
    cb(null, `${gymId}-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (!file.mimetype || !file.mimetype.startsWith('image/')) {
    return cb(new Error('Only image files are allowed'));
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

const setUploadFolder = (folder) => (req, res, next) => {
  req.uploadFolder = folder;
  next();
};

const toPublicPath = (folder, filename) => {
  if (!filename) return null;
  return `/api/files/${folder}/${filename}`;
};

const resolveFile = (folder, filename) => {
  const safeFolder = String(folder).replace(/[^a-z0-9_-]/gi, '');
  const safeName = path.basename(filename);
  return path.join(uploadRoot(), safeFolder, safeName);
};

module.exports = {
  upload,
  setUploadFolder,
  toPublicPath,
  resolveFile,
  uploadRoot,
  ensureDir,
};

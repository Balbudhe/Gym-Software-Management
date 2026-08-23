const path = require('path');
const fs = require('fs');
const { cloudinary, isCloudinaryEnabled, configureCloudinary } = require('../config/cloudinary');

configureCloudinary();

const uploadRoot = path.join(__dirname, '../../uploads');

async function saveLocal(file, folder) {
  const destDir = path.join(uploadRoot, folder);
  fs.mkdirSync(destDir, { recursive: true });
  const ext = path.extname(file.originalname || '') || '.jpg';
  const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
  const dest = path.join(destDir, filename);
  fs.writeFileSync(dest, file.buffer);
  return `/uploads/${folder}/${filename}`;
}

async function uploadImage(file, folder = 'general') {
  if (!file) return '';
  if (isCloudinaryEnabled()) {
    const base64 = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
    const result = await cloudinary.uploader.upload(base64, {
      folder: `${process.env.CLOUDINARY_FOLDER || 'apexfit'}/${folder}`,
      resource_type: 'image',
    });
    return result.secure_url;
  }
  return saveLocal(file, folder);
}

module.exports = { uploadImage };

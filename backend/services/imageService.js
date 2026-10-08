const { toPublicPath } = require('../config/cloudStorage');

const fileUrl = (folder, filename) => {
  if (!filename) return null;
  if (String(filename).startsWith('/api/files/')) return filename;
  return toPublicPath(folder, filename);
};

module.exports = { fileUrl };

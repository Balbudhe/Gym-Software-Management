const express = require('express');
const fs = require('fs');
const { auth } = require('../middleware/authMiddleware');
const { tenant } = require('../middleware/tenantMiddleware');
const { resolveFile } = require('../config/cloudStorage');

const router = express.Router();
router.use(auth, tenant);

router.get('/:folder/:filename', (req, res) => {
  const filePath = resolveFile(req.params.folder, req.params.filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: 'File not found' });
  }
  if (!req.params.filename.startsWith(String(req.user.gymId))) {
    return res.status(403).json({ message: 'Access denied' });
  }
  res.sendFile(filePath);
});

module.exports = router;

const express = require('express');
const { auth } = require('../middleware/authMiddleware');
const { tenant } = require('../middleware/tenantMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const controller = require('../controllers/settingsController');

const router = express.Router();
router.use(auth, tenant);

router.get('/', requireRole('OWNER'), controller.getSettings);
router.put('/', requireRole('OWNER'), controller.updateSettings);
router.put('/profile', controller.updateProfile);

module.exports = router;

const express = require('express');
const settingsController = require('../controllers/settingsController');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();

router.get('/', roleMiddleware('OWNER'), settingsController.getSettings);
router.put('/', roleMiddleware('OWNER'), settingsController.updateSettings);
router.put('/account', settingsController.updateAccount);

module.exports = router;

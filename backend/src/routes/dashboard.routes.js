const express = require('express');
const dashboardController = require('../controllers/dashboardController');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();

router.get('/owner', roleMiddleware('OWNER'), dashboardController.ownerDashboard);
router.get('/trainer', roleMiddleware('TRAINER'), dashboardController.trainerDashboard);

module.exports = router;

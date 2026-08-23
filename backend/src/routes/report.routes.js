const express = require('express');
const reportController = require('../controllers/reportController');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();

router.use(roleMiddleware('OWNER'));
router.get('/members', reportController.memberReport);
router.get('/trainers', reportController.trainerReport);
router.get('/admissions', reportController.admissionReport);
router.get('/attendance', reportController.attendanceReport);

module.exports = router;

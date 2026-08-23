const express = require('express');
const attendanceController = require('../controllers/attendanceController');
const roleMiddleware = require('../middleware/roleMiddleware');
const upload = require('../middleware/upload');

const router = express.Router();

router.post('/check-in', roleMiddleware('TRAINER'), upload.single('photo'), attendanceController.checkIn);
router.post('/check-out', roleMiddleware('TRAINER'), upload.single('photo'), attendanceController.checkOut);
router.get('/today/me', attendanceController.todayMine);
router.get('/today', roleMiddleware('OWNER'), attendanceController.todayAll);
router.get('/', attendanceController.listAttendance);

module.exports = router;

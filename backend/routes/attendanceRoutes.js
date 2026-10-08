const express = require('express');
const { auth, allowExpiredAuth } = require('../middleware/authMiddleware');
const { tenant } = require('../middleware/tenantMiddleware');
const { branchScope } = require('../middleware/branchMiddleware');
const { setUploadFolder, upload } = require('../config/cloudStorage');
const controller = require('../controllers/attendanceController');

const router = express.Router();

router.post('/unexpected-logout', allowExpiredAuth, tenant, controller.unexpectedLogout);

router.use(auth, tenant, branchScope);

router.get('/', controller.listAttendance);
router.get('/today', controller.today);
router.post('/location-ping', controller.locationPing);
router.post('/check-in', setUploadFolder('attendance'), upload.single('photo'), controller.checkIn);
router.post('/check-out', setUploadFolder('attendance'), upload.single('photo'), controller.checkOut);

module.exports = router;

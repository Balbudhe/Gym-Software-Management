const express = require('express');
const { auth } = require('../middleware/authMiddleware');
const { tenant } = require('../middleware/tenantMiddleware');
const { branchScope } = require('../middleware/branchMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const controller = require('../controllers/reportController');
const dashboard = require('../controllers/dashboardController');

const router = express.Router();
router.use(auth, tenant, branchScope);

router.get('/dashboard', dashboard.overview);
router.get('/members', requireRole('OWNER'), controller.memberReport);
router.get('/admissions', requireRole('OWNER'), controller.admissionReport);
router.get('/trainers', requireRole('OWNER'), controller.trainerReport);
router.get('/attendance', requireRole('OWNER'), controller.attendanceReport);

module.exports = router;

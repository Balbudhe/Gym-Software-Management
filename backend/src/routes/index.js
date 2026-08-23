const express = require('express');
const authRoutes = require('./auth.routes');
const gymRoutes = require('./gym.routes');
const memberRoutes = require('./member.routes');
const admissionRoutes = require('./admission.routes');
const trainerRoutes = require('./trainer.routes');
const membershipPlanRoutes = require('./membershipPlan.routes');
const membershipRoutes = require('./membership.routes');
const attendanceRoutes = require('./attendance.routes');
const dashboardRoutes = require('./dashboard.routes');
const reportRoutes = require('./report.routes');
const settingsRoutes = require('./settings.routes');
const authMiddleware = require('../middleware/authMiddleware');
const tenantMiddleware = require('../middleware/tenantMiddleware');

const router = express.Router();

router.use('/auth', authRoutes);

router.use(authMiddleware, tenantMiddleware);
router.use('/gyms', gymRoutes);
router.use('/members', memberRoutes);
router.use('/admissions', admissionRoutes);
router.use('/trainers', trainerRoutes);
router.use('/membership-plans', membershipPlanRoutes);
router.use('/memberships', membershipRoutes);
router.use('/trainer-attendance', attendanceRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/reports', reportRoutes);
router.use('/settings', settingsRoutes);

module.exports = router;

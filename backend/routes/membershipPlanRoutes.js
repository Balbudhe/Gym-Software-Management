const express = require('express');
const { auth } = require('../middleware/authMiddleware');
const { tenant } = require('../middleware/tenantMiddleware');
const { branchScope } = require('../middleware/branchMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const controller = require('../controllers/membershipController');

const router = express.Router();
router.use(auth, tenant, branchScope);

router.get('/', controller.listPlans);
router.post('/', requireRole('OWNER'), controller.createPlan);
router.put('/:id', requireRole('OWNER'), controller.updatePlan);

module.exports = router;

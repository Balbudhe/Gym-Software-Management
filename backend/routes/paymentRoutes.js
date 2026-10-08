const express = require('express');
const { auth } = require('../middleware/authMiddleware');
const { tenant } = require('../middleware/tenantMiddleware');
const { branchScope } = require('../middleware/branchMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const controller = require('../controllers/paymentController');

const router = express.Router();
router.use(auth, tenant, branchScope, requireRole('OWNER'));

router.get('/history', controller.paymentHistory);
router.get('/', controller.listPayments);
router.post('/', controller.createPayment);

module.exports = router;

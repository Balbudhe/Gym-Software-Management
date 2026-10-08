const express = require('express');
const { auth } = require('../middleware/authMiddleware');
const { tenant } = require('../middleware/tenantMiddleware');
const { branchScope } = require('../middleware/branchMiddleware');
const controller = require('../controllers/membershipController');

const router = express.Router();
router.use(auth, tenant, branchScope);

router.get('/', controller.listMemberships);
router.post('/', controller.createMembership);

module.exports = router;

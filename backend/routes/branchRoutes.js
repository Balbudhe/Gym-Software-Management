const express = require('express');
const { auth } = require('../middleware/authMiddleware');
const { tenant } = require('../middleware/tenantMiddleware');
const { branchScope } = require('../middleware/branchMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const controller = require('../controllers/branchController');

const router = express.Router();
router.use(auth, tenant, branchScope, requireRole('OWNER'));

router.get('/', controller.listBranches);
router.post('/', controller.createBranch);
router.get('/:id/overview', controller.branchOverview);
router.get('/:id', controller.getBranch);
router.put('/:id', controller.updateBranch);
router.patch('/:id/status', controller.deactivateBranch);

module.exports = router;

const express = require('express');
const { auth } = require('../middleware/authMiddleware');
const { tenant } = require('../middleware/tenantMiddleware');
const { branchScope } = require('../middleware/branchMiddleware');
const { setUploadFolder, upload } = require('../config/cloudStorage');
const controller = require('../controllers/memberController');

const router = express.Router();
router.use(auth, tenant, branchScope);

router.get('/', controller.listMembers);
router.post('/', setUploadFolder('members'), upload.single('profilePhoto'), controller.createMember);
router.get('/:id', controller.getMember);
router.put('/:id', setUploadFolder('members'), upload.single('profilePhoto'), controller.updateMember);
router.patch('/:id/assign-trainer', controller.assignTrainer);

module.exports = router;

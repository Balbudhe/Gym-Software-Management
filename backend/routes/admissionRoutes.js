const express = require('express');
const { auth } = require('../middleware/authMiddleware');
const { tenant } = require('../middleware/tenantMiddleware');
const { branchScope } = require('../middleware/branchMiddleware');
const { setUploadFolder, upload } = require('../config/cloudStorage');
const controller = require('../controllers/admissionController');

const router = express.Router();
router.use(auth, tenant, branchScope);

router.get('/', controller.listAdmissions);
router.post('/', setUploadFolder('members'), upload.single('profilePhoto'), controller.createAdmission);

module.exports = router;

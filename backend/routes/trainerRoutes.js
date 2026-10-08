const express = require('express');
const { auth } = require('../middleware/authMiddleware');
const { tenant } = require('../middleware/tenantMiddleware');
const { branchScope } = require('../middleware/branchMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const { setUploadFolder, upload } = require('../config/cloudStorage');
const controller = require('../controllers/trainerController');

const router = express.Router();
router.use(auth, tenant, branchScope);

router.get('/', controller.listTrainers);
router.get('/performance', requireRole('OWNER'), controller.performance);
router.get('/:id/stats', controller.trainerStats);
router.get('/:id', controller.getTrainer);
router.post(
  '/',
  requireRole('OWNER'),
  setUploadFolder('trainers'),
  upload.single('profilePhoto'),
  controller.createTrainer
);
router.put(
  '/:id',
  requireRole('OWNER'),
  setUploadFolder('trainers'),
  upload.single('profilePhoto'),
  controller.updateTrainer
);
router.delete('/:id', requireRole('OWNER'), controller.removeTrainer);

module.exports = router;

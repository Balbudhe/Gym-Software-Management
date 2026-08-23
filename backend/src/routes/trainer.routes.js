const express = require('express');
const trainerController = require('../controllers/trainerController');
const roleMiddleware = require('../middleware/roleMiddleware');
const validate = require('../middleware/validate');
const upload = require('../middleware/upload');

const router = express.Router();

router.get('/options', trainerController.listActiveTrainers);
router.get('/', roleMiddleware('OWNER'), trainerController.listTrainers);
router.get('/performance', roleMiddleware('OWNER'), trainerController.performance);
router.get('/:id', roleMiddleware('OWNER'), trainerController.getTrainer);
router.post(
  '/',
  roleMiddleware('OWNER'),
  upload.single('profilePhoto'),
  trainerController.createValidators,
  validate,
  trainerController.createTrainer
);
router.put('/:id', roleMiddleware('OWNER'), upload.single('profilePhoto'), trainerController.updateTrainer);
router.patch('/:id/status', roleMiddleware('OWNER'), trainerController.setTrainerStatus);

module.exports = router;

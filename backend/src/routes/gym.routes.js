const express = require('express');
const gymController = require('../controllers/gymController');
const roleMiddleware = require('../middleware/roleMiddleware');
const validate = require('../middleware/validate');
const upload = require('../middleware/upload');

const router = express.Router();

router.get('/me', gymController.getMyGym);
router.put(
  '/me',
  roleMiddleware('OWNER'),
  upload.single('logo'),
  gymController.updateGymValidators,
  validate,
  gymController.updateMyGym
);

module.exports = router;

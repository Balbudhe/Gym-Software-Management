const express = require('express');
const memberController = require('../controllers/memberController');
const roleMiddleware = require('../middleware/roleMiddleware');
const validate = require('../middleware/validate');
const upload = require('../middleware/upload');

const router = express.Router();

router.get('/', memberController.listMembers);
router.get('/:id', memberController.getMember);
router.post(
  '/',
  roleMiddleware('OWNER', 'TRAINER'),
  upload.single('profilePhoto'),
  memberController.createValidators,
  validate,
  memberController.createMember
);
router.put(
  '/:id',
  roleMiddleware('OWNER'),
  upload.single('profilePhoto'),
  memberController.updateMember
);

module.exports = router;

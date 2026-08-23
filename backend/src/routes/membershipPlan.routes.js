const express = require('express');
const membershipPlanController = require('../controllers/membershipPlanController');
const roleMiddleware = require('../middleware/roleMiddleware');
const validate = require('../middleware/validate');

const router = express.Router();

router.get('/', membershipPlanController.listPlans);
router.post(
  '/',
  roleMiddleware('OWNER'),
  membershipPlanController.createValidators,
  validate,
  membershipPlanController.createPlan
);
router.put('/:id', roleMiddleware('OWNER'), membershipPlanController.updatePlan);

module.exports = router;

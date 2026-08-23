const express = require('express');
const membershipController = require('../controllers/membershipController');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();

router.get('/expiring', membershipController.listExpiring);
router.get('/expired', membershipController.listExpired);
router.post('/:memberId/renew', roleMiddleware('OWNER', 'TRAINER'), membershipController.renewMembership);

module.exports = router;

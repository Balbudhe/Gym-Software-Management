const express = require('express');
const admissionController = require('../controllers/admissionController');

const router = express.Router();

router.get('/', admissionController.listAdmissions);
router.get('/stats', admissionController.admissionStats);

module.exports = router;

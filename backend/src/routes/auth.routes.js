const express = require('express');
const authController = require('../controllers/authController');
const validate = require('../middleware/validate');
const authMiddleware = require('../middleware/authMiddleware');
const tenantMiddleware = require('../middleware/tenantMiddleware');

const router = express.Router();

router.post('/login', authController.loginValidators, validate, authController.login);
router.post('/register', authController.registerValidators, validate, authController.register);
router.post('/logout', authController.logout);
router.get('/me', authMiddleware, tenantMiddleware, authController.me);

module.exports = router;

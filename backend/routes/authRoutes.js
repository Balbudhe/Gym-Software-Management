const express = require('express');
const {
  signup,
  login,
  me,
  logout,
  changePassword,
  forgotPassword,
  resetPassword,
} = require('../controllers/authController');
const { auth } = require('../middleware/authMiddleware');
const { tenant } = require('../middleware/tenantMiddleware');

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/me', auth, tenant, me);
router.post('/logout', auth, tenant, logout);
router.post('/change-password', auth, tenant, changePassword);

module.exports = router;

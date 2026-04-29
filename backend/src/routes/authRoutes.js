const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getMe,
  updateMe,
  changePassword,
  updatePushToken,
  forgotPassword,
  resetPassword,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.patch('/me', protect, updateMe);
router.patch('/change-password', protect, changePassword);
router.patch('/push-token', protect, updatePushToken);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

module.exports = router;

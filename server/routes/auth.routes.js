const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  getMe,
  forgotPassword,
  validateOTP,
  resetPassword,
  googleAuth, // 👈 add this
} = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');

// Auth routes
router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', protect, getMe);
router.post('/forgot-password', forgotPassword);
router.post('/validate-otp', validateOTP);
router.post('/reset-password', resetPassword);

// 👇 Google OAuth route
router.post('/google', googleAuth);

module.exports = router;

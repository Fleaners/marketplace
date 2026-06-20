const express = require('express');
const { body } = require('express-validator');
const upload = require('../utils/multer');
const { register, login, requestLoginOtp, verifyLoginOtp, googleLogin, firebaseLogin } = require('../controllers/authController');
const { runValidation } = require('../middleware/validators');

const router = express.Router();

router.post(
  '/register',
  upload.single('profile_image'),
  [
    body('shop_name').notEmpty().withMessage('Shop name is required'),
    body('phone').notEmpty().withMessage('Phone is required'),
    body('email').optional({ values: 'falsy' }).isEmail().withMessage('Email must be valid'),
    body('gst_number').optional({ values: 'falsy' }),
    body('city').notEmpty().withMessage('City is required'),
    body('password').optional({ values: 'falsy' }).isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  runValidation,
  register
);

router.post(
  '/login/request-otp',
  [
    body('identifier').notEmpty().withMessage('Phone or email is required'),
  ],
  runValidation,
  requestLoginOtp
);

router.post(
  '/login/verify-otp',
  [
    body('identifier').notEmpty().withMessage('Phone or email is required'),
    body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
  ],
  runValidation,
  verifyLoginOtp
);

router.post(
  '/login/google',
  [
    body('credential').notEmpty().withMessage('Google credential is required'),
  ],
  runValidation,
  googleLogin
);

router.post(
  '/login/firebase',
  [
    body('idToken').notEmpty().withMessage('Firebase ID token is required'),
  ],
  runValidation,
  firebaseLogin
);

router.post(
  '/login',
  [
    body('phone').notEmpty().withMessage('Phone is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  runValidation,
  login
);

module.exports = router;

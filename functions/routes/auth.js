import express from 'express';
import { body, validationResult } from 'express-validator';
import { requireRecaptcha } from '../middleware/recaptcha.js';
import {
  accountExists,
  firebaseLogin,
  requestOtp,
  verifyOtp,
  signup,
  login,
  googleLogin,
  refreshSession,
  googleClientConfig,
} from '../controllers/authController.js';

const router = express.Router();

// Validation middleware
const runValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

router.post(
  '/account-exists',
  [
    body('identifier')
      .optional()
      .trim()
      .notEmpty(),
    body('email')
      .optional()
      .isEmail(),
    body('phone')
      .optional()
      .notEmpty(),
    body().custom((value, { req }) => {
      const identifier = req.body.identifier || req.body.email || req.body.phone;
      if (!identifier) {
        throw new Error('Email or phone is required.');
      }
      return true;
    }),
  ],
  runValidation,
  accountExists
);

// Firebase OTP login
router.post(
  '/login/firebase',
  [body('idToken').notEmpty()],
  requireRecaptcha('auth_login_firebase'),
  runValidation,
  firebaseLogin
);

// Request OTP via phone or email
router.post(
  '/login/request-otp',
  [
    body('identifier')
      .trim()
      .notEmpty()
      .withMessage('Phone or email is required to request OTP.'),
  ],
  requireRecaptcha('auth_request_otp'),
  runValidation,
  requestOtp
);

// Verify OTP
router.post(
  '/login/verify-otp',
  [
    body('identifier')
      .trim()
      .notEmpty()
      .withMessage('Phone or email is required to verify OTP.'),
    body('otp').notEmpty().isLength({ min: 4, max: 6 }),
  ],
  requireRecaptcha('auth_verify_otp'),
  runValidation,
  verifyOtp
);

// Email/Password signup
router.post(
  '/signup',
  [
    body('shopName').trim().notEmpty(),
    body('phone').notEmpty().isMobilePhone(),
    body('password')
      .isLength({ min: 12 })
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/)
      .withMessage('Password must be at least 12 characters and include uppercase, lowercase, number, and special character.'),
  ],
  requireRecaptcha('auth_signup'),
  runValidation,
  signup
);

// Email/Password login
router.post(
  '/login',
  [
    body('identifier')
      .optional()
      .trim()
      .notEmpty(),
    body('email')
      .optional()
      .isEmail(),
    body('phone')
      .optional()
      .notEmpty(),
    body('password').notEmpty(),
    body().custom((value, { req }) => {
      const identifier = req.body.identifier || req.body.email || req.body.phone;
      if (!identifier) {
        throw new Error('Email or phone is required.');
      }
      return true;
    }),
  ],
  requireRecaptcha('auth_login_password'),
  runValidation,
  login
);

router.post(
  '/login/google',
  [body('credential').notEmpty()],
  runValidation,
  googleLogin
);

router.post(
  '/refresh',
  [body('refreshToken').notEmpty()],
  runValidation,
  refreshSession
);

router.get('/google/client-id', googleClientConfig);

export default router;

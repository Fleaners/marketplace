import express from 'express';
import { body, validationResult } from 'express-validator';
import {
  firebaseLogin,
  requestOtp,
  verifyOtp,
  signup,
  login,
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

// Firebase OTP login
router.post(
  '/login/firebase',
  [body('idToken').notEmpty()],
  runValidation,
  firebaseLogin
);

// Request OTP via phone
router.post(
  '/login/request-otp',
  [body('phone').notEmpty().isMobilePhone()],
  runValidation,
  requestOtp
);

// Verify OTP
router.post(
  '/login/verify-otp',
  [
    body('phone').notEmpty().isMobilePhone(),
    body('otp').notEmpty().isLength({ min: 4, max: 6 }),
  ],
  runValidation,
  verifyOtp
);

// Email/Password signup
router.post(
  '/signup',
  [
    body('shopName').trim().notEmpty(),
    body('phone').notEmpty().isMobilePhone(),
    body('password').isLength({ min: 6 }),
  ],
  runValidation,
  signup
);

// Email/Password login
router.post(
  '/login',
  [
    body('email').isEmail(),
    body('password').notEmpty(),
  ],
  runValidation,
  login
);

export default router;

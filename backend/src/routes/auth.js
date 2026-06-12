const express = require('express');
const { body } = require('express-validator');
const upload = require('../utils/multer');
const { register, login } = require('../controllers/authController');
const { runValidation } = require('../middleware/validators');

const router = express.Router();

router.post(
  '/register',
  upload.single('profile_image'),
  [
    body('shop_name').notEmpty().withMessage('Shop name is required'),
    body('phone').notEmpty().withMessage('Phone is required'),
    body('gst_number').notEmpty().withMessage('GST number is required'),
    body('city').notEmpty().withMessage('City is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  runValidation,
  register
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

const express = require('express');
const { body } = require('express-validator');
const upload = require('../utils/multer');
const { requireAuth } = require('../middleware/auth');
const { fetchBusiness, modifyBusiness } = require('../controllers/businessController');
const { runValidation } = require('../middleware/validators');

const router = express.Router();

router.get('/:id', fetchBusiness);

router.put(
  '/:id',
  requireAuth,
  upload.single('profile_image'),
  [
    body('shop_name').optional().notEmpty(),
    body('gst_number').optional().notEmpty(),
    body('city').optional().notEmpty(),
    body('latitude').optional().isFloat(),
    body('longitude').optional().isFloat(),
  ],
  runValidation,
  modifyBusiness
);

module.exports = router;

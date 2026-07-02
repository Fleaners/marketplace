const express = require('express');
const { body, param } = require('express-validator');
const upload = require('../utils/multer');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { runValidation } = require('../middleware/validators');
const {
  fetchProducts,
  addProduct,
  modifyProduct,
  removeProduct,
  modifyStock,
  addProductVisit,
  fetchVisitInsights,
} = require('../controllers/productsController');

const router = express.Router();

router.get('/', fetchProducts);

router.get('/visits', requireAuth, fetchVisitInsights);

router.post(
  '/:id/visits',
  optionalAuth,
  [param('id').isInt().withMessage('Product ID must be an integer')],
  runValidation,
  addProductVisit
);

router.post(
  '/',
  requireAuth,
  upload.single('image'),
  [
    body('name').notEmpty().withMessage('Product name is required'),
    body('price').isFloat({ gt: 0 }).withMessage('Price must be positive'),
    body('cost_price').isFloat({ gt: 0 }).withMessage('Cost price must be positive'),
    body('stock').isInt({ min: 0 }).withMessage('Stock must be a non-negative integer'),
  ],
  runValidation,
  addProduct
);

router.put(
  '/:id',
  requireAuth,
  upload.single('image'),
  [
    param('id').isInt().withMessage('Product ID must be an integer'),
    body('price').optional().isFloat({ gt: 0 }),
    body('cost_price').optional().isFloat({ gt: 0 }),
    body('stock').optional().isInt({ min: 0 }),
  ],
  runValidation,
  modifyProduct
);

router.delete('/:id', requireAuth, removeProduct);

router.put(
  '/:id/stock',
  requireAuth,
  [param('id').isInt().withMessage('Product ID must be an integer'), body('stock').isInt({ min: 0 }).withMessage('Stock must be a non-negative integer')],
  runValidation,
  modifyStock
);

module.exports = router;

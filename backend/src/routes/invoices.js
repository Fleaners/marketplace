const express = require('express');
const { body, param } = require('express-validator');
const { requireAuth } = require('../middleware/auth');
const { runValidation } = require('../middleware/validators');
const { createInvoice, fetchInvoice, fetchInvoicePdf } = require('../controllers/invoicesController');

const router = express.Router();

router.post(
  '/',
  requireAuth,
  [
    body('customer_name').notEmpty().withMessage('Customer name is required'),
    body('items').isArray({ min: 1 }).withMessage('At least one invoice item is required'),
  ],
  runValidation,
  createInvoice
);

router.get('/:id', requireAuth, [param('id').isInt().withMessage('Invoice ID must be an integer')], runValidation, fetchInvoice);
router.get('/:id/pdf', requireAuth, [param('id').isInt().withMessage('Invoice ID must be an integer')], runValidation, fetchInvoicePdf);

module.exports = router;

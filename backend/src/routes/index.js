const express = require('express');
const authRoutes = require('./auth');
const businessRoutes = require('./business');
const productRoutes = require('./products');
const postRoutes = require('./posts');
const invoiceRoutes = require('./invoices');
const aiRoutes = require('./ai');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/business', businessRoutes);
router.use('/products', productRoutes);
router.use('/posts', postRoutes);
router.use('/invoices', invoiceRoutes);
router.use('/ai', aiRoutes);

module.exports = router;

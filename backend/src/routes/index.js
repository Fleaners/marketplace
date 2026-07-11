const express = require('express');
const authRoutes = require('./auth');
const businessRoutes = require('./business');
const productRoutes = require('./products');
const postRoutes = require('./posts');
const invoiceRoutes = require('./invoices');
const aiRoutes = require('./ai');
const insightsRoutes = require('./insights');
const messagesRoutes = require('./messages');

const router = express.Router();

router.get('/public/config', (req, res) => {
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.MP_FIREBASE_PROJECT_ID || '';
  const authDomain = process.env.FIREBASE_AUTH_DOMAIN || process.env.MP_FIREBASE_AUTH_DOMAIN || (projectId ? `${projectId}.firebaseapp.com` : '');
  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET || process.env.MP_FIREBASE_STORAGE_BUCKET || (projectId ? `${projectId}.appspot.com` : '');

  res.json({
    firebase: {
      apiKey: process.env.FIREBASE_WEB_API_KEY || process.env.MP_FIREBASE_WEB_API_KEY || '',
      authDomain,
      projectId,
      storageBucket,
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || process.env.MP_FIREBASE_MESSAGING_SENDER_ID || '',
      appId: process.env.FIREBASE_APP_ID || process.env.MP_FIREBASE_APP_ID || '',
    },
    recaptcha: {
      siteKey: process.env.RECAPTCHA_SITE_KEY || process.env.MP_RECAPTCHA_SITE_KEY || '',
      enterprise: true,
    },
  });
});

router.use('/auth', authRoutes);
router.use('/business', businessRoutes);
router.use('/products', productRoutes);
router.use('/posts', postRoutes);
router.use('/invoices', invoiceRoutes);
router.use('/ai', aiRoutes);
router.use('/insights', insightsRoutes);
router.use('/messages', messagesRoutes);

module.exports = router;

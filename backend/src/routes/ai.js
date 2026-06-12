const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { produceInsights } = require('../controllers/aiController');

const router = express.Router();

router.get('/', requireAuth, produceInsights);

module.exports = router;

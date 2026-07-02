const express = require('express');
const { requireAuth } = require('../middleware/auth');
const {
  analyzeWithPerplexity,
  produceInsights,
  suggestWithPerplexity,
} = require('../controllers/aiController');

const router = express.Router();

router.get('/', requireAuth, produceInsights);
router.post('/analyze', requireAuth, analyzeWithPerplexity);
router.get('/suggestions', requireAuth, suggestWithPerplexity);

module.exports = router;

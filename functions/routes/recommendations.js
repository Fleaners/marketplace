import express from 'express';
import { verifyTokenOptional } from '../middleware/auth.js';
import { getBuyerRecommendations } from '../services/recommendationEngine.js';

const router = express.Router();

router.get('/buyer', verifyTokenOptional, async (req, res, next) => {
  try {
    const uid = String(req.user?.uid || req.query.uid || '').trim();
    const city = String(req.query.city || '').trim();
    const category = String(req.query.category || '').trim();
    const limit = Number(req.query.limit || 10);

    const payload = await getBuyerRecommendations({ uid, city, category, limit });
    return res.json(payload);
  } catch (error) {
    next(error);
  }
});

export default router;

import express from 'express';
import { getFirestore } from 'firebase-admin/firestore';
import { verifyToken } from '../middleware/auth.js';
import { askPerplexityAgent } from '../services/perplexityAgent.js';
import { rejectUnknownBodyFields, optionalString } from '../middleware/validation.js';

const router = express.Router();

function getDb() {
  return getFirestore();
}

router.use(verifyToken);

router.post(
  '/analyze',
  rejectUnknownBodyFields(['data', 'prompt']),
  optionalString('prompt', { max: 4000 }),
  async (req, res, next) => {
  try {
    const businessId = req.user?.businessId;
    if (!businessId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data, prompt } = req.body;
    const safeData = data && typeof data === 'object' ? data : {};
    const serialized = JSON.stringify(safeData || {}, null, 2);
    if (serialized.length > 15000) {
      return res.status(400).json({ error: 'Data payload exceeds analysis limits.' });
    }

    const input = prompt || [
      'Analyze this marketplace business data.',
      'Return practical, prioritized insights for the owner.',
      serialized,
    ].join('\n\n');

    const analysis = await askPerplexityAgent(input);
    res.json(analysis);
  } catch (error) {
    next(error);
  }
});

router.get('/suggestions', async (req, res, next) => {
  try {
    const db = getDb();
    const businessId = req.user?.businessId;
    if (!businessId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const [businessDoc, productsSnapshot, invoicesSnapshot] = await Promise.all([
      db.collection('businesses').doc(businessId).get(),
      db.collection('businesses').doc(businessId).collection('products').limit(20).get(),
      db.collection('businesses').doc(businessId).collection('invoices').limit(20).get(),
    ]);

    const business = businessDoc.exists ? businessDoc.data() : {};
    const products = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const invoices = invoicesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const prompt = [
      'You are an AI business advisor for a small marketplace store.',
      'Suggest 5 concrete actions to improve sales, inventory, and customer follow-up.',
      JSON.stringify({ business, products, invoices }, null, 2),
    ].join('\n\n');

    const result = await askPerplexityAgent(prompt);
    res.json({ suggestions: result.answer, ...result });
  } catch (error) {
    next(error);
  }
});

export default router;

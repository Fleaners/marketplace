import express from 'express';
import { getFirestore } from 'firebase-admin/firestore';
import { verifyToken } from '../middleware/auth.js';
import { askGemini } from '../services/geminiAgent.js';
import { rejectUnknownBodyFields, optionalString } from '../middleware/validation.js';

const router = express.Router();

function getDb() {
  return getFirestore();
}

// In-memory cache for repeated AI queries to optimize costs
const aiResponseCache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache TTL

function cleanExpiredCache() {
  const now = Date.now();
  for (const [key, entry] of aiResponseCache.entries()) {
    if (now - entry.timestamp > CACHE_TTL_MS) {
      aiResponseCache.delete(key);
    }
  }
}

const SYSTEM_INSTRUCTION = `You are an AI Retail Business Consultant for marketplace.store.
You function strictly as a specialized Retail Business Assistant. You are NOT a general chatbot.
You must ONLY answer questions related to Indian retail businesses, including:
- Indian GST (GST slabs, CGST/SGST/IGST, compliance, MSME)
- Retail business operations, wholesale, and distribution
- Inventory management (safety stocks, reorder recommendations)
- Product descriptions, titles, specifications, SEO for product listings
- Digital marketing (WhatsApp Business strategies, campaigns)
- Google Analytics and Firebase Analytics interpretation for retail
- Product pricing strategies, category optimization, marketplace growth

STRICT DOMAIN LIMITATION:
You must reject any questions outside the retail domain (e.g., programming help, python code, general jokes, quantum physics, cryptocurrency, politics, medical advice, homework, entertainment, personal questions).
If the question is unrelated to Indian retail, business, commerce, inventory, digital marketing, or GST, you MUST begin your response with "REJECTED:" and explain that you can only help with Indian retail business matters.
Limit your responses to approximately 300–500 words unless explicitly requested. Do not return code or scripts.`;

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
      const serializedData = JSON.stringify(safeData, null, 2);

      if (serializedData.length > 15000) {
        return res.status(400).json({ error: 'Data payload exceeds analysis limits.' });
      }

      // Generate a cache key
      const cacheKey = `${businessId}:${prompt}:${JSON.stringify(safeData)}`;
      cleanExpiredCache();
      if (aiResponseCache.has(cacheKey)) {
        const cached = aiResponseCache.get(cacheKey);
        if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
          return res.json(cached.response);
        }
      }

      // Input validation / prompt injection protection
      const lowerPrompt = (prompt || '').toLowerCase();
      const forbiddenKeywords = ['system instruction', 'ignore previous instructions', 'override', 'jailbreak', 'forget everything'];
      if (forbiddenKeywords.some(keyword => lowerPrompt.includes(keyword))) {
        return res.status(400).json({ error: 'Invalid input parameters detected.' });
      }

      // Assemble final prompt with context
      const finalPrompt = `
Business Context:
${serializedData}

User Question:
${prompt || 'Analyze this marketplace business data and provide growth tips.'}
      `.trim();

      const result = await askGemini(finalPrompt, SYSTEM_INSTRUCTION);

      // Check if response was rejected by domain restriction
      if (result.answer.startsWith('REJECTED:')) {
        const cleanAnswer = result.answer.replace(/^REJECTED:\s*/i, '');
        return res.status(400).json({ error: cleanAnswer, rejected: true });
      }

      const responsePayload = {
        answer: result.answer,
        model: result.model,
        timestamp: new Date().toISOString()
      };

      // Cache the response
      aiResponseCache.set(cacheKey, {
        response: responsePayload,
        timestamp: Date.now()
      });

      res.json(responsePayload);
    } catch (error) {
      next(error);
    }
  }
);

router.get('/suggestions', async (req, res, next) => {
  try {
    const db = getDb();
    const businessId = req.user?.businessId;
    if (!businessId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const cacheKey = `suggestions:${businessId}`;
    cleanExpiredCache();
    if (aiResponseCache.has(cacheKey)) {
      const cached = aiResponseCache.get(cacheKey);
      if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return res.json(cached.response);
      }
    }

    const [businessDoc, productsSnapshot, invoicesSnapshot] = await Promise.all([
      db.collection('businesses').doc(businessId).get(),
      db.collection('businesses').doc(businessId).collection('products').limit(20).get(),
      db.collection('businesses').doc(businessId).collection('invoices').limit(20).get(),
    ]);

    const business = businessDoc.exists ? businessDoc.data() : {};
    const products = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const invoices = invoicesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const businessContext = {
      sellerName: business.shop_name || 'Marketplace Seller',
      location: business.city || 'India',
      productsCount: products.length,
      products: products.map(p => ({ name: p.name, price: p.price, stock: p.stock })).slice(0, 5),
      invoicesCount: invoices.length,
    };

    const finalPrompt = `
Suggest 5 concrete retail growth suggestions, inventory reorder alerts, or SEO improvements based on this business context:
${JSON.stringify(businessContext, null, 2)}
    `.trim();

    const result = await askGemini(finalPrompt, SYSTEM_INSTRUCTION);

    const responsePayload = {
      suggestions: result.answer,
      model: result.model,
      timestamp: new Date().toISOString()
    };

    aiResponseCache.set(cacheKey, {
      response: responsePayload,
      timestamp: Date.now()
    });

    res.json(responsePayload);
  } catch (error) {
    next(error);
  }
});

export default router;

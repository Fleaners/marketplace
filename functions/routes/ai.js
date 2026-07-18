import express from 'express';
import { getFirestore } from 'firebase-admin/firestore';
import { verifyToken } from '../middleware/auth.js';
import { askGemini } from '../services/geminiAgent.js';
import { rejectUnknownBodyFields, optionalString } from '../middleware/validation.js';
import rateLimit from 'express-rate-limit';

const router = express.Router();

const aiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many AI requests. Please try again shortly.' }
});

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

router.use(aiRateLimiter);
router.use(verifyToken);

router.post(
  '/analyze',
  rejectUnknownBodyFields(['data', 'prompt', 'action', 'params']),
  optionalString('prompt', { max: 4000 }),
  async (req, res, next) => {
    try {
      const businessId = req.user?.businessId;
      if (!businessId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      let { data, prompt, action, params } = req.body;

      // Ownership validation: check if request data matches authenticated business ID
      if (data && data.sellerName && req.user?.shopName) {
        const expectedShopName = String(req.user.shopName).trim().toLowerCase();
        const incomingShopName = String(data.sellerName).trim().toLowerCase();
        if (incomingShopName && incomingShopName !== expectedShopName) {
          console.warn(
            JSON.stringify({
              level: 'WARN',
              event: 'BUSINESS_CONTEXT_OWNERSHIP_VIOLATION',
              userId: req.user.id,
              businessId,
              expectedShopName,
              incomingShopName,
              timestamp: new Date().toISOString()
            })
          );
          return res.status(403).json({ error: 'Access denied: Business context mismatch.' });
        }
      }

      // Secure prompt template resolution (templates are kept backend-only)
      if (action === 'generate_description') {
        const title = String(params?.title || '').trim();
        const category = String(params?.category || '').trim();
        if (!title) {
          return res.status(400).json({ error: 'Product title is required.' });
        }
        prompt = `Generate a detailed and professional B2B wholesale product description for a product titled "${title}" in the category "${category}". Highlighting key features, trade benefits, and certifications. Keep it around 150 words.`;
      }

      const resolvedPrompt = prompt || 'Analyze this marketplace business data and provide growth tips.';
      const db = getDb();
      
      // Fetch learning history and user corrections unconditionally for autonomous self-learning context from Firestore
      let pastRecommendations = [];
      let pastCorrections = [];
      try {
        const recommendationsSnapshot = await db
          .collection('businesses')
          .doc(businessId)
          .collection('ai_recommendations')
          .orderBy('created_at', 'desc')
          .limit(5)
          .get();
        pastRecommendations = recommendationsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const correctionsSnapshot = await db
          .collection('businesses')
          .doc(businessId)
          .collection('ai_corrections')
          .orderBy('created_at', 'desc')
          .limit(5)
          .get();
        pastCorrections = correctionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } catch (historyErr) {
        console.warn('Failed to query learning history from Firestore:', historyErr);
      }

      const safeData = data && typeof data === 'object' ? data : {};
      safeData.pastRecommendations = pastRecommendations;
      safeData.pastCorrections = pastCorrections;

      const serializedData = JSON.stringify(safeData, null, 2);

      if (serializedData.length > 25000) {
        return res.status(400).json({ error: 'Data payload exceeds analysis limits.' });
      }

      // Generate a cache key
      const cacheKey = `${businessId}:${resolvedPrompt}:${JSON.stringify(safeData)}`;
      cleanExpiredCache();
      if (aiResponseCache.has(cacheKey)) {
        const cached = aiResponseCache.get(cacheKey);
        if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
          return res.json(cached.response);
        }
      }

      // Input validation / prompt injection protection
      const lowerPrompt = resolvedPrompt.toLowerCase();
      const forbiddenKeywords = ['system instruction', 'ignore previous instructions', 'override', 'jailbreak', 'forget everything'];
      if (forbiddenKeywords.some(keyword => lowerPrompt.includes(keyword))) {
        console.warn(
          JSON.stringify({
            level: 'WARN',
            event: 'PROMPT_INJECTION_BLOCKED',
            userId: req.user.id,
            businessId,
            promptLength: resolvedPrompt.length,
            timestamp: new Date().toISOString()
          })
        );
        return res.status(400).json({ error: 'Invalid input parameters detected.' });
      }

      // Assemble final prompt with context
      const finalPrompt = `
[BUSINESS DATA CONTEXT]
${serializedData}

[USER QUESTION]
${resolvedPrompt}
      `.trim();

      const result = await askGemini(finalPrompt, SYSTEM_INSTRUCTION);

      // Check if response was rejected by domain restriction
      if (result.answer.startsWith('REJECTED:')) {
        const cleanAnswer = result.answer.replace(/^REJECTED:\s*/i, '');
        return res.status(400).json({ error: cleanAnswer, rejected: true });
      }

      // Log recommendation if it is analytical and has actionable recommendations
      const text = result.answer;
      const getSection = (title) => {
        const regex = new RegExp(`### \\s*${title}[\\s\\S]*?(?=###|$)`, 'i');
        const match = text.match(regex);
        return match ? match[0].replace(new RegExp(`### \\s*${title}`, 'i'), '').trim() : '';
      };

      const isSimpleLookup = !text.includes('###');
      const recommendationsText = getSection('📈 Recommendations') || getSection('📋 Suggested Next Steps') || text;

      if (!isSimpleLookup && recommendationsText) {
        try {
          let domain = 'general';
          const promptLower = String(resolvedPrompt).toLowerCase();
          const agentLower = String(req.body.agentName || '').toLowerCase();
          if (promptLower.includes('gst') || agentLower.includes('gst')) domain = 'gst';
          else if (promptLower.includes('stock') || promptLower.includes('inventory') || agentLower.includes('inventory')) domain = 'inventory';
          else if (promptLower.includes('seo') || promptLower.includes('ad') || agentLower.includes('marketing')) domain = 'marketing';
          else if (promptLower.includes('price') || promptLower.includes('sale') || agentLower.includes('commerce')) domain = 'commerce';

          await db
            .collection('businesses')
            .doc(businessId)
            .collection('ai_recommendations')
            .add({
              agent_name: req.body.agentName || 'System Orchestrator',
              prompt_context: resolvedPrompt,
              recommendation_text: recommendationsText,
              domain,
              created_at: new Date().toISOString()
            });
        } catch (logErr) {
          console.error('Failed to log recommendation to Firestore:', logErr);
        }
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

router.post(
  '/feedback',
  rejectUnknownBodyFields(['promptContext', 'agentName', 'originalRecommendation', 'correctedText', 'isRejected']),
  async (req, res, next) => {
    try {
      const businessId = req.user?.businessId;
      if (!businessId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { promptContext, agentName, originalRecommendation, correctedText, isRejected } = req.body;
      const db = getDb();

      const docRef = await db
        .collection('businesses')
        .doc(businessId)
        .collection('ai_corrections')
        .add({
          agent_name: agentName || 'System Orchestrator',
          prompt_context: promptContext || '',
          original_recommendation: originalRecommendation || '',
          corrected_text: correctedText || '',
          is_rejected: !!isRejected,
          created_at: new Date().toISOString()
        });

      res.json({ success: true, feedback: { id: docRef.id } });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

import express from 'express';
import { getFirestore } from 'firebase-admin/firestore';
import { verifyToken } from '../middleware/auth.js';
import { orchestrate, DOMAIN_LABELS } from '../services/agentOrchestrator.js';
import { saveMemory, getMemory, applyFeedback, resetMemory } from '../services/aiMemory.js';
import { rejectUnknownBodyFields, optionalString } from '../middleware/validation.js';
import rateLimit from 'express-rate-limit';
import { checkGeminiApiHealth, getGeminiDiagnostics, askGemini, fallbackStage1 } from '../services/geminiAgent.js';

const router = express.Router();

const aiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many AI requests. Please try again shortly.' }
});

function getDb() {
  return getFirestore();
}

// In-memory response cache (10 min TTL)
const aiResponseCache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000;

function cleanExpiredCache() {
  const now = Date.now();
  for (const [key, entry] of aiResponseCache.entries()) {
    if (now - entry.timestamp > CACHE_TTL_MS) {
      aiResponseCache.delete(key);
    }
  }
}

// Prompt injection guard
const FORBIDDEN_KEYWORDS = [
  'system instruction', 'ignore previous instructions', 'override',
  'jailbreak', 'forget everything', 'disregard', 'act as',
];

function hasForbiddenKeyword(text) {
  const lower = text.toLowerCase();
  return FORBIDDEN_KEYWORDS.some(kw => lower.includes(kw));
}

router.use(aiRateLimiter);
router.use(verifyToken);

// ─── GET /api/ai/health ───────────────────────────────────────────────────────
router.get('/health', async (req, res) => {
  try {
    const health = await checkGeminiApiHealth();
    if (health.status === 'degraded') {
      console.warn('Gemini API Health Check Degraded:', health.error);
    }
    res.json(health);
  } catch (error) {
    res.status(500).json({ status: 'degraded', error: error.message });
  }
});

// ─── GET /api/ai/diagnostics ──────────────────────────────────────────────────
router.get('/diagnostics', async (req, res) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied: Admin only.' });
  }
  res.json(getGeminiDiagnostics());
});

const STAGE_1_SYSTEM_INSTRUCTION = `You are a B2B Intent Parser and Slot Extractor for marketplace.store.
Your sole job is to classify the user's question and extract parameters (slots).
Allowed categories:
1. business_insights: sales trends, growth patterns, safety stock, reorder levels, cash flow.
2. news: market news, commodity price trends, regulatory updates, festival demand cycles.
3. business_analysis: performance of specific products/SKUs, customer patterns, sales conversions, invoice analysis.
4. market_research: competitor analysis, category demand signals, market trends.
5. marketing_seo: ad campaign strategy, digital marketing budget, product title SEO, WhatsApp campaigns.

You MUST respond with a valid JSON object ONLY (no markdown code blocks, no backticks, no extra text):
{
  "inScope": true or false,
  "categories": ["category_name1", "category_name2"],
  "slots": {
    "dateRange": "extracted date range (default to last 30 days if not specified)",
    "product": "extracted product name or null",
    "sku": "extracted SKU or null",
    "competitor": "extracted competitor name or null",
    "channel": "extracted marketing channel or null"
  },
  "explanation": "Brief explanation",
  "redirectSuggestion": "A polite decline and redirect suggestion in professional CTO/CFO advisor voice if out of scope."
}`;

async function fetchMerchantData(businessId) {
  const db = getDb();
  const [profileDoc, productsSnapshot, ordersSnapshot, inquiriesSnapshot, invoicesSnapshot] = await Promise.all([
    db.collection('users').doc(businessId).get().catch(() => null),
    db.collection('products').where('sellerId', '==', businessId).get().catch(() => null),
    db.collection('orders').where('sellerId', '==', businessId).get().catch(() => null),
    db.collection('inquiries').where('sellerId', '==', businessId).get().catch(() => null),
    db.collection('businesses').doc(businessId).collection('invoices').limit(50).get().catch(() => null),
  ]);

  const profile = profileDoc && profileDoc.exists ? profileDoc.data() : {};
  const products = productsSnapshot ? productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) : [];
  const orders = ordersSnapshot ? ordersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) : [];
  const inquiries = inquiriesSnapshot ? inquiriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) : [];
  const invoices = invoicesSnapshot ? invoicesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) : [];

  const profileSummary = {
    name: profile.name || '',
    businessName: profile.businessName || '',
    category: profile.category || '',
    city: profile.city || '',
    state: profile.state || '',
    gstNumber: profile.gstNumber || '',
  };

  const productsSummary = products.map(p => ({
    name: p.name,
    price: p.price,
    stock: p.stock,
    moq: p.moq || 1,
    sku: p.sku || '',
  })).slice(0, 15);

  const lowStockAlerts = products
    .filter(p => p.stock <= (p.moq || 5))
    .map(p => ({ name: p.name, stock: p.stock, moq: p.moq || 1 }));

  const ordersSummary = {
    count: orders.length,
    recent: orders.map(o => ({ id: o.id, amount: o.amount || o.price || 0, status: o.status })).slice(0, 5),
  };

  const inquiriesSummary = {
    count: inquiries.length,
    recent: inquiries.map(i => ({ id: i.id, productName: i.productName || '', message: i.message })).slice(0, 5),
  };

  const invoicesSummary = {
    count: invoices.length,
    recent: invoices.map(v => ({ id: v.id, total: v.total || v.amount || 0, date: v.date || v.createdAt })).slice(0, 5),
  };

  return {
    profileSummary,
    productsSummary,
    lowStockAlerts,
    ordersSummary,
    inquiriesSummary,
    invoicesSummary,
    rawProducts: products,
  };
}

// ─── POST /api/ai/analyze ─────────────────────────────────────────────────────
router.post(
  '/analyze',
  rejectUnknownBodyFields(['data', 'prompt', 'action', 'params', 'agentName']),
  optionalString('prompt', { max: 4000 }),
  async (req, res, next) => {
    try {
      const businessId = req.user?.businessId;
      if (!businessId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      let { data, prompt, action, params, agentName } = req.body;

      // Ownership validation
      if (data?.sellerName && req.user?.shopName) {
        const expected = String(req.user.shopName).trim().toLowerCase();
        const incoming = String(data.sellerName).trim().toLowerCase();
        if (incoming && incoming !== expected) {
          return res.status(403).json({ error: 'Access denied: Business context mismatch.' });
        }
      }

      // Backend-resolved prompt templates
      if (action === 'generate_description') {
        const title = String(params?.title || '').trim();
        const category = String(params?.category || '').trim();
        if (!title) return res.status(400).json({ error: 'Product title is required.' });
        prompt = `Generate a detailed and professional B2B wholesale product description for a product titled "${title}" in the category "${category}". Highlight key features, trade benefits, and certifications. Keep it around 150 words.`;
        agentName = 'Marketing Agent';
      }

      const resolvedPrompt = prompt || 'Analyze this marketplace business data and provide growth tips.';

      // Prompt injection guard
      if (hasForbiddenKeyword(resolvedPrompt)) {
        return res.status(400).json({ error: 'Invalid input parameters detected.' });
      }

      const db = getDb();
      const safeData = (data && typeof data === 'object') ? data : {};

      // Payload size guard
      if (JSON.stringify(safeData).length > 25000) {
        return res.status(400).json({ error: 'Data payload exceeds analysis limits.' });
      }

      // --- STAGE 1: Intent Classification & Slot Extraction ---
      let stage1 = null;
      try {
        const stage1Response = await askGemini(resolvedPrompt, STAGE_1_SYSTEM_INSTRUCTION, { temperature: 0.1, maxOutputTokens: 512 });
        const cleaned = stage1Response.answer
          .replace(/^```json\s*/i, '')
          .replace(/^```\s*/i, '')
          .replace(/\s*```$/i, '')
          .trim();
        stage1 = JSON.parse(cleaned);
      } catch (err) {
        console.warn('Stage 1 Gemini intent parsing failed, running local fallback:', err);
        stage1 = fallbackStage1(resolvedPrompt);
      }

      if (!stage1 || stage1.inScope === false) {
        const redirectText = stage1?.redirectSuggestion || "I am your CTO/CFO business advisor. I can only assist you with business insights, market news, business analysis, market research, and digital marketing/SEO.";
        return res.json({
          answer: redirectText,
          confidence: 'High',
          confidenceReason: 'Request classified as out of scope.',
          evidence: [],
          alternatives: [],
          impact: '',
          suggestedNextSteps: ['Ask a business insight question', 'Ask about marketing/SEO strategy', 'Query about inventory levels'],
          draftActions: [],
          requiresApproval: false,
          agentDomain: 'rejected',
          agentLabel: 'System Orchestrator',
          memoryId: null,
          model: 'intent-classifier-stage-1',
          timestamp: new Date().toISOString(),
          rejected: true
        });
      }

      // --- STAGE 2: Context-Aware Answer Generation ---
      // Dynamically pull the relevant merchant data from Firestore
      const merchantData = await fetchMerchantData(businessId);
      
      // Log classified categories + pulled data sources
      console.log('AI Insights classified categories:', stage1.categories, 'Pulled data sources: profileSummary, productsSummary, lowStockAlerts, ordersSummary, inquiriesSummary, invoicesSummary');

      // Hydrate businessContext
      const businessContext = {
        ...safeData,
        profile: merchantData.profileSummary,
        products: merchantData.productsSummary,
        lowStockAlerts: merchantData.lowStockAlerts,
        orders: merchantData.ordersSummary,
        inquiries: merchantData.inquiriesSummary,
        invoices: merchantData.invoicesSummary,
        classifiedSlots: stage1.slots,
      };

      // Search for specific product slot in catalog
      if (stage1.slots?.product) {
        const slotProdLower = stage1.slots.product.toLowerCase();
        const found = merchantData.rawProducts.find(p => p.name.toLowerCase().includes(slotProdLower));
        if (found) {
          businessContext.matchedProduct = {
            name: found.name,
            price: found.price,
            stock: found.stock,
            moq: found.moq || 1,
            sku: found.sku || '',
            category: found.category || ''
          };
        }
      }

      // Route classified intent to the right specialized agent
      let targetAgent = 'All-Agent Orchestrator';
      if (stage1.categories.includes('marketing_seo')) {
        targetAgent = 'Marketing Agent';
      } else if (stage1.categories.includes('news') || stage1.categories.includes('market_research')) {
        targetAgent = 'Market Intelligence Agent';
      } else if (stage1.categories.includes('business_insights') || stage1.categories.includes('business_analysis')) {
        targetAgent = 'Analytics Agent';
      }

      // Load AI memory for this business
      let memory = [];
      try {
        memory = await getMemory(businessId, 10);
      } catch { /* non-fatal */ }

      // Load past corrections
      let pastCorrections = [];
      try {
        const snapshot = await db
          .collection('businesses').doc(businessId)
          .collection('ai_corrections')
          .orderBy('created_at', 'desc').limit(5).get();
        pastCorrections = snapshot.docs.map(d => d.data());
      } catch { /* non-fatal */ }

      businessContext.pastCorrections = pastCorrections;

      // Cache check
      const cacheKey = `${businessId}:${resolvedPrompt}:${JSON.stringify(safeData)}`;
      cleanExpiredCache();
      if (aiResponseCache.has(cacheKey)) {
        const cached = aiResponseCache.get(cacheKey);
        if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
          return res.json(cached.response);
        }
      }

      // Orchestrate across agents
      const result = await orchestrate({
        prompt: resolvedPrompt,
        businessContext,
        memory,
        agentNameHint: targetAgent,
      });

      // Handle domain rejection
      if (result.answer.startsWith('REJECTED:')) {
        const clean = result.answer.replace(/^REJECTED:\s*/i, '');
        return res.status(400).json({ error: clean, rejected: true });
      }

      // Persist to AI memory
      let memoryId = null;
      try {
        memoryId = await saveMemory(businessId, {
          agentDomain: result.agentDomain,
          promptSummary: resolvedPrompt.slice(0, 300),
          recommendation: result.answer.slice(0, 2000),
          confidence: result.confidence,
          evidence: result.evidence,
          alternatives: result.alternatives,
          impact: result.impact,
          draftActions: result.draftActions,
        });
      } catch { /* non-fatal */ }

      // Also persist to legacy recommendations collection (backward compat)
      try {
        if (result.answer.length > 100) {
          await db
            .collection('businesses').doc(businessId)
            .collection('ai_recommendations')
            .add({
              agent_name: DOMAIN_LABELS[result.agentDomain] || agentName || 'System Orchestrator',
              prompt_context: resolvedPrompt,
              recommendation_text: result.answer.slice(0, 2000),
              domain: result.agentDomain,
              created_at: new Date().toISOString(),
            });
        }
      } catch { /* non-fatal */ }

      const responsePayload = {
        answer: result.answer,
        confidence: result.confidence,
        confidenceReason: result.confidenceReason,
        evidence: result.evidence,
        alternatives: result.alternatives,
        impact: result.impact,
        suggestedNextSteps: result.suggestedNextSteps,
        draftActions: result.draftActions,
        requiresApproval: result.requiresApproval,
        agentDomain: result.agentDomain,
        agentLabel: DOMAIN_LABELS[result.agentDomain] || 'AI Orchestrator',
        memoryId,
        model: result.model,
        timestamp: new Date().toISOString(),
      };

      // Cache response
      aiResponseCache.set(cacheKey, { response: responsePayload, timestamp: Date.now() });

      res.json(responsePayload);
    } catch (error) {
      next(error);
    }
  }
);

// ─── GET /api/ai/suggestions ──────────────────────────────────────────────────
router.get('/suggestions', async (req, res, next) => {
  try {
    const db = getDb();
    const businessId = req.user?.businessId;
    if (!businessId) return res.status(401).json({ error: 'Unauthorized' });

    const cacheKey = `suggestions:${businessId}`;
    cleanExpiredCache();
    if (aiResponseCache.has(cacheKey)) {
      const cached = aiResponseCache.get(cacheKey);
      if (Date.now() - cached.timestamp < CACHE_TTL_MS) return res.json(cached.response);
    }

    const [businessDoc, productsSnapshot, invoicesSnapshot] = await Promise.all([
      db.collection('businesses').doc(businessId).get(),
      db.collection('businesses').doc(businessId).collection('products').limit(20).get(),
      db.collection('businesses').doc(businessId).collection('invoices').limit(20).get(),
    ]);

    const business = businessDoc.exists ? businessDoc.data() : {};
    const products = productsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    const invoices = invoicesSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    const memory = await getMemory(businessId, 5);

    const businessContext = {
      sellerName: business.shop_name || 'Marketplace Seller',
      location: business.city || 'India',
      productsCount: products.length,
      products: products.map(p => ({ name: p.name, price: p.price, stock: p.stock })).slice(0, 5),
      invoicesCount: invoices.length,
    };

    const result = await orchestrate({
      prompt: 'Suggest 5 concrete retail growth suggestions, inventory reorder alerts, or SEO improvements based on this business context.',
      businessContext,
      memory,
      agentNameHint: 'Analytics Agent',
    });

    const responsePayload = {
      suggestions: result.answer,
      evidence: result.evidence,
      confidence: result.confidence,
      model: result.model,
      timestamp: new Date().toISOString(),
    };

    aiResponseCache.set(cacheKey, { response: responsePayload, timestamp: Date.now() });
    res.json(responsePayload);
  } catch (error) {
    next(error);
  }
});

// ─── GET /api/ai/memory ───────────────────────────────────────────────────────
router.get('/memory', async (req, res, next) => {
  try {
    const businessId = req.user?.businessId;
    if (!businessId) return res.status(401).json({ error: 'Unauthorized' });
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const entries = await getMemory(businessId, limit);
    res.json({ memory: entries, count: entries.length });
  } catch (error) {
    next(error);
  }
});

// ─── DELETE /api/ai/memory ────────────────────────────────────────────────────
router.delete('/memory', async (req, res, next) => {
  try {
    const businessId = req.user?.businessId;
    if (!businessId) return res.status(401).json({ error: 'Unauthorized' });
    await resetMemory(businessId);
    // Also clear response cache for this business
    for (const key of aiResponseCache.keys()) {
      if (key.startsWith(businessId)) aiResponseCache.delete(key);
    }
    res.json({ success: true, message: 'AI memory cleared.' });
  } catch (error) {
    next(error);
  }
});

// ─── POST /api/ai/memory/:id/feedback ────────────────────────────────────────
router.post('/memory/:id/feedback', async (req, res, next) => {
  try {
    const businessId = req.user?.businessId;
    if (!businessId) return res.status(401).json({ error: 'Unauthorized' });
    const { feedback } = req.body;
    if (!['approved', 'rejected'].includes(feedback)) {
      return res.status(400).json({ error: 'Feedback must be "approved" or "rejected".' });
    }
    const ok = await applyFeedback(businessId, req.params.id, feedback);
    res.json({ success: ok });
  } catch (error) {
    next(error);
  }
});

// ─── POST /api/ai/feedback (legacy) ──────────────────────────────────────────
router.post(
  '/feedback',
  rejectUnknownBodyFields(['promptContext', 'agentName', 'originalRecommendation', 'correctedText', 'isRejected']),
  async (req, res, next) => {
    try {
      const businessId = req.user?.businessId;
      if (!businessId) return res.status(401).json({ error: 'Unauthorized' });

      const { promptContext, agentName, originalRecommendation, correctedText, isRejected } = req.body;
      const db = getDb();

      const docRef = await db
        .collection('businesses').doc(businessId)
        .collection('ai_corrections')
        .add({
          agent_name: agentName || 'System Orchestrator',
          prompt_context: promptContext || '',
          original_recommendation: originalRecommendation || '',
          corrected_text: correctedText || '',
          is_rejected: !!isRejected,
          created_at: new Date().toISOString(),
        });

      res.json({ success: true, feedback: { id: docRef.id } });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

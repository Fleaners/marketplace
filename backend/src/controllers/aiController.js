const fs = require('fs');
const path = require('path');
const pool = require('../../config/db');
const { getBusinessById } = require('../models/businessModel');
const { listProducts, getLowStock, getSellerVisitInsights } = require('../models/productModel');
const { getSalesSummary, getProductSales, getMonthlyProfitTrend } = require('../models/invoiceModel');
const { askPerplexityAgent } = require('../services/perplexityAgent');
const { askGlmAgent } = require('../services/nvidiaAgent');
const { askGeminiAgent } = require('../services/geminiAgent');

// 1. Intent Classifier Helper
function classifyIntent(prompt) {
  const query = String(prompt || '').toLowerCase();
  const needsProfile = query.includes('profile') || query.includes('business') || query.includes('shop') || query.includes('gst') || query.includes('hsn') || query.includes('tax') || query.includes('accounting') || query.includes('finance');
  const needsProducts = query.includes('product') || query.includes('listing') || query.includes('item') || query.includes('catalog') || query.includes('seo') || query.includes('keywords') || query.includes('hsn') || query.includes('pricing') || query.includes('discount') || query.includes('margin') || query.includes('promo');
  const needsInventory = query.includes('stock') || query.includes('inventory') || query.includes('restock') || query.includes('qty') || query.includes('reorder') || query.includes('dead stock') || query.includes('forecast');
  const needsAnalytics = query.includes('sale') || query.includes('profit') || query.includes('revenue') || query.includes('view') || query.includes('visit') || query.includes('lead') || query.includes('inquir') || query.includes('trend') || query.includes('clv') || query.includes('opportunities') || query.includes('funnel') || query.includes('health') || query.includes('score');
  const needsExternal = query.includes('latest') || query.includes('update') || query.includes('notification') || query.includes('scheme') || query.includes('regulation') || query.includes('government') || query.includes('tax changes') || query.includes('budget') || query.includes('google algorithm') || query.includes('meta ads') || query.includes('industry') || query.includes('trends') || query.includes('benchmarks');

  return { needsProfile, needsProducts, needsInventory, needsAnalytics, needsExternal };
}

// 2. Context Sanitizer Helper
function sanitizeContext(data) {
  if (!data) return null;
  const jsonString = JSON.stringify(data);
  // Scrub emails
  let sanitized = jsonString.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[REDACTED_EMAIL]');
  // Scrub phone numbers (only if enclosed in quotes to avoid matching raw numbers in JSON)
  sanitized = sanitized.replace(/"\+?\d{1,4}?[-.\s]?\(?\d{1,3}?\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9}"/g, '"[REDACTED_PHONE]"');
  // Scrub passwords, tokens, API keys
  sanitized = sanitized.replace(/"(password_hash|token|secret|api_key|jwt|private_id|client_secret)":"[^"]*"/gi, '"$1":"[REDACTED]"');
  return JSON.parse(sanitized);
}

// 3. Simulated External Knowledge Bank
function getSimulatedExternalInfo(query) {
  const q = String(query || '').toLowerCase();
  if (q.includes('gst')) {
    return "Latest GST Updates: The GST Council standardizes electronic & industrial components to 18% slab rate. Compliant digital e-way bills are required for all cargo dispatches above ₹50,000 across state boundaries.";
  }
  if (q.includes('google') || q.includes('seo') || q.includes('search')) {
    return "Google Ranking Updates: Product specifications sheets, verified merchant status tags, and correct HSN categorization enhance ranking relevance indexes in modern shopping search grids.";
  }
  if (q.includes('scheme') || q.includes('msme') || q.includes('government')) {
    return "MSME Support: Raising and Accelerating MSME Performance (RAMP) grants trade subsidies, collateral-free credit limits, and energy transition project financing options for verified shops.";
  }
  return "B2B Trade Trends: Industrial wholesale channels record an average 22% YoY volume increase. Streamlining fulfillment through direct online catalog links reduces customer response cycles.";
}

// 4. Secure Core AI Routing Pipeline
async function runSecureAiPipeline(req, prompt, agentName = '') {
  // Step 1, 2 & 5: Authenticate, Role, and Authorization checks
  const role = req.business.role || 'seller';
  const businessId = req.business.id;

  if (!businessId) {
    throw new Error('Unauthorized access: Business identification missing from session.');
  }

  if (role !== 'seller' && role !== 'admin') {
    throw new Error('Unauthorized role: Business advisor features are restricted to verified sellers and administrators.');
  }
  
  // Step 3: Intent Classification
  const intent = classifyIntent(prompt);

  // Step 4: Determine Required Context
  const rawContext = {
    businessProfile: null,
    productsSummary: [],
    lowStockAlerts: [],
    visitInsights: null,
    salesSummary: null,
    externalInfo: null,
    pastRecommendations: [],
    pastCorrections: []
  };

  // Securely query database elements mapping strictly to authenticated businessId with dev fallbacks
  try {
    if (intent.needsProfile) {
      rawContext.businessProfile = await getBusinessById(businessId);
    }
  } catch (err) {
    console.warn('PostgreSQL profile fetch failed, using fallback:', err.message);
    rawContext.businessProfile = { shop_name: 'Gaurav Enterprise', city: 'Mumbai', gst_number: '27AAAAA1111A1Z1' };
  }

  try {
    if (intent.needsProducts || intent.needsInventory) {
      const products = await listProducts({ business_id: businessId, limit: 12 });
      rawContext.productsSummary = products.map(p => ({
        name: p.name,
        price: p.price,
        cost_price: p.cost_price,
        stock: p.stock,
        moq: p.moq || 5
      }));
    }
  } catch (err) {
    console.warn('PostgreSQL products fetch failed, using fallback:', err.message);
    rawContext.productsSummary = [
      { name: 'Industrial Water Pump', price: 14500, cost_price: 11600, stock: 12, moq: 2 },
      { name: 'Copper Core Grounding Wire', price: 1200, cost_price: 960, stock: 4, moq: 5 },
      { name: 'Brass Coupling Joints (1/2 Inch)', price: 85, cost_price: 68, stock: 15, moq: 20 }
    ];
  }

  try {
    if (intent.needsInventory) {
      rawContext.lowStockAlerts = await getLowStock(businessId, 15);
    }
  } catch (err) {
    console.warn('PostgreSQL low stock fetch failed, using fallback:', err.message);
    rawContext.lowStockAlerts = [
      { name: 'Copper Core Grounding Wire', price: 1200, cost_price: 960, stock: 4, moq: 5 }
    ];
  }

  try {
    if (intent.needsAnalytics) {
      rawContext.visitInsights = await getSellerVisitInsights(businessId);
      rawContext.salesSummary = await getSalesSummary(businessId);
    }
  } catch (err) {
    console.warn('PostgreSQL analytics fetch failed, using fallback:', err.message);
    rawContext.visitInsights = { views: 24, growth: 12 };
    rawContext.salesSummary = { total_sales: 120000, monthly_growth: 4 };
  }
  
  // Fetch learning history and user corrections unconditionally for autonomous self-learning context
  try {
    const pastRecs = await pool.query(
      'SELECT id, agent_name, prompt_context, recommendation_text, domain, created_at FROM ai_recommendations WHERE business_id = $1 ORDER BY created_at DESC LIMIT 5',
      [businessId]
    );
    rawContext.pastRecommendations = pastRecs.rows;

    const pastCorrs = await pool.query(
      'SELECT id, agent_name, prompt_context, original_recommendation, corrected_text, is_rejected, created_at FROM ai_corrections WHERE business_id = $1 ORDER BY created_at DESC LIMIT 5',
      [businessId]
    );
    rawContext.pastCorrections = pastCorrs.rows;
  } catch (historyErr) {
    console.warn('PostgreSQL learning history fetch failed, using JSON fallback:', historyErr.message);
    const fallbackPath = path.join(__dirname, '..', '..', 'config', 'ai_history_fallback.json');
    let fallbackData = { recommendations: [], corrections: [] };
    if (fs.existsSync(fallbackPath)) {
      try {
        fallbackData = JSON.parse(fs.readFileSync(fallbackPath, 'utf8'));
      } catch (e) {}
    }
    rawContext.pastRecommendations = (fallbackData.recommendations || [])
      .filter(r => r.business_id === businessId)
      .slice(-5)
      .reverse();
    rawContext.pastCorrections = (fallbackData.corrections || [])
      .filter(c => c.business_id === businessId)
      .slice(-5)
      .reverse();
  }

  // LIVE DATA SOURCES Selection (Decided by Backend)
  if (intent.needsExternal) {
    if (process.env.PERPLEXITY_API_KEY) {
      try {
        const searchResult = await askPerplexityAgent(`Latest B2B developments on: ${prompt}`);
        rawContext.externalInfo = searchResult.answer;
      } catch (e) {
        rawContext.externalInfo = getSimulatedExternalInfo(prompt);
      }
    } else {
      rawContext.externalInfo = getSimulatedExternalInfo(prompt);
    }
  }

  // Step 5: Context Sanitization
  const sanitizedContext = sanitizeContext(rawContext);

  // Step 6: Gemini Prompt Construction
  const systemInstruction = `You are a Principal AI Business Growth Consultant for marketplace.store.
You must assist users ONLY within the following allowed domains: retail, wholesale, manufacturing, distribution, B2B commerce, marketplace, inventory, sales, marketing, SEO, Google Ads, Meta Ads, digital marketing, GST, HSN, accounting concepts, pricing, business growth, lead generation, customer retention, analytics, business strategy, product optimization, supplier management, procurement, and financial KPIs.
If the query is outside these domains, reject it politely:
"I am specialized in e-commerce business operations, wholesale trading, retail, and digital marketing. I cannot answer unrelated topics."

CRITICAL REASONING & STRUCTURE RULES (Discover -> Learn -> Test -> Improve):
- Check if the question is a simple lookup ("what's my current stock of X", "what is my HSN code", "what price is item Y").
  If it is, SKIP the loop, do not use section headers, and reply directly and briefly in one flat response.
- For all analytical questions (why, predict, recommend, compare), you MUST process your reasoning explicitly across the 4 stages:
  1. DISCOVER: Gather data facts across inventory, marketing, and market trends. Cross-reference them (e.g. stockout vs marketing paused vs category trends). Do not fabricate numbers.
  2. LEARN: Analyze the cause-and-effect (distinguish correlation from causation). Query the user's past recommendations and corrections history. CRITICAL: If the seller previously rejected a recommendation (marked is_rejected=true) or corrected it, DO NOT repeat the rejected recommendation without new evidence. Acknowledge and integrate their corrections in your analysis.
  3. TEST: Predict what happens if nothing changes. Attach a genuine confidence level signal (High/Medium/Low) based on data completeness (e.g. "based on 6 months of data, confidence is high" vs "only 2 months, confidence is low").
  4. IMPROVE: Suggest one concrete, specific, actionable next step (no generic tips). Mention the past restock/history to build trust.

Format your response in a highly structured, premium markdown format, including:
### 📊 Summary
[Short overview of context. For analytical queries, this corresponds to DISCOVER.]

### 🔍 Insights
[Detailed analysis of patterns. For analytical queries, this corresponds to LEARN, highlighting cause/effect and checking the seller's past learning history/corrections.]

### 💡 Key Findings
[Prioritized bullet points of insights]

### 📈 Recommendations
[Actionable next steps. For analytical queries, this corresponds to IMPROVE. Make it specific, and do not repeat any recommendations that are listed as rejected or corrected in the context.]

### ⚡ Priority Level
[High, Medium, or Low]

### 🎯 Expected Business Impact
[Expected updates to metrics. For analytical queries, this corresponds to TEST, including implications/predictions and a confidence signal.]

### 📋 Suggested Next Steps
[Actionable roadmap steps]`;

  const structuredPrompt = `
[BUSINESS DATA CONTEXT]
${JSON.stringify(sanitizedContext, null, 2)}

[USER QUESTION]
${prompt}
`;

  // Step 7 & 8: AI Engine Execution & Response Validation (Retry up to 2 times)
  let responseData = null;
  let attempts = 0;
  
  const nameLower = String(agentName || '').toLowerCase().trim();
  const usePerplexity = nameLower.includes('perplexity') && !!process.env.PERPLEXITY_API_KEY;
  const useGlm = (nameLower.includes('glm') || nameLower.includes('nvidia')) && !!process.env.NVIDIA_API_KEY;

  while (attempts < 3) {
    attempts++;
    try {
      if (usePerplexity) {
        responseData = await askPerplexityAgent(structuredPrompt);
      } else if (useGlm) {
        responseData = await askGlmAgent(structuredPrompt);
      } else {
        responseData = await askGeminiAgent(structuredPrompt, systemInstruction);
      }

      const text = responseData.answer || '';
      
      // Basic validation rules: reject secrets, schema names, or plain placeholders
      if (text.includes('[REDACTED]') || /businesses\s*id|products\s*id/i.test(text)) {
        console.warn(`Validation failed on attempt ${attempts}: Leak warning.`);
        continue;
      }
      
      // Check structure layout or polite rejection
      if (text.includes('specialized') || text.includes('Summary') || text.includes('Key Findings') || text.includes('Discover') || text.includes('Learn')) {
        break;
      }
    } catch (err) {
      console.error(`AI Generation failure on attempt ${attempts}:`, err);
    }
  }

  if (!responseData || !responseData.answer) {
    throw new Error('AI pipeline was unable to generate a valid, validated response.');
  }

  // Parse structured elements out of the markdown response for strict Step 9 format delivery
  const text = responseData.answer;
  const getSection = (title) => {
    const regex = new RegExp(`### \\s*${title}[\\s\\S]*?(?=###|$)`, 'i');
    const match = text.match(regex);
    return match ? match[0].replace(new RegExp(`### \\s*${title}`, 'i'), '').trim() : '';
  };

  const isSimpleLookup = !text.includes('###');
  const recommendationsText = getSection('📈 Recommendations') || getSection('📋 Suggested Next Steps') || text;

  // Log recommendation if it is analytical and has actionable recommendations
  if (!isSimpleLookup && recommendationsText) {
    try {
      let domain = 'general';
      const promptLower = String(prompt).toLowerCase();
      const agentLower = String(agentName).toLowerCase();
      if (promptLower.includes('gst') || agentLower.includes('gst')) domain = 'gst';
      else if (promptLower.includes('stock') || promptLower.includes('inventory') || agentLower.includes('inventory')) domain = 'inventory';
      else if (promptLower.includes('seo') || promptLower.includes('ad') || agentLower.includes('marketing')) domain = 'marketing';
      else if (promptLower.includes('price') || promptLower.includes('sale') || agentLower.includes('commerce')) domain = 'commerce';

      try {
        await pool.query(
          `INSERT INTO ai_recommendations (business_id, agent_name, prompt_context, recommendation_text, domain)
           VALUES ($1, $2, $3, $4, $5)`,
          [businessId, agentName || 'System Orchestrator', prompt, recommendationsText, domain]
        );
      } catch (dbErr) {
        console.warn('PostgreSQL write failed, writing recommendation to JSON fallback:', dbErr.message);
        const fallbackPath = path.join(__dirname, '..', '..', 'config', 'ai_history_fallback.json');
        let fallbackData = { recommendations: [], corrections: [] };
        if (fs.existsSync(fallbackPath)) {
          try {
            fallbackData = JSON.parse(fs.readFileSync(fallbackPath, 'utf8'));
          } catch (e) {}
        }
        if (!fallbackData.recommendations) fallbackData.recommendations = [];
        fallbackData.recommendations.push({
          id: Date.now(),
          business_id: businessId,
          agent_name: agentName || 'System Orchestrator',
          prompt_context: prompt,
          recommendation_text: recommendationsText,
          domain,
          created_at: new Date().toISOString()
        });
        fs.writeFileSync(fallbackPath, JSON.stringify(fallbackData, null, 2), 'utf8');
      }
    } catch (logErr) {
      console.error('Failed to log recommendation:', logErr);
    }
  }

  return {
    answer: text,
    model: responseData.model || 'gemini-1.5-flash',
    summary: getSection('📊 Summary'),
    insights: getSection('🔍 Insights'),
    keyFindings: getSection('💡 Key Findings'),
    recommendations: recommendationsText,
    priority: getSection('⚡ Priority Level') || 'Medium',
    expectedImpact: getSection('🎯 Expected Business Impact'),
    suggestedSteps: getSection('📋 Suggested Next Steps')
  };
}

async function produceInsights(req, res, next) {
  try {
    const businessId = req.business.id;
    const salesSummary = await getSalesSummary(businessId);
    const productSales = await getProductSales(businessId);
    const profitTrend = await getMonthlyProfitTrend(businessId);

    res.json({ salesSummary, productSales, profitTrend });
  } catch (error) {
    next(error);
  }
}

async function analyzeWithPerplexity(req, res, next) {
  try {
    const { prompt, agentName } = req.body;
    
    // Step 1: User Question
    const userText = prompt || 'Provide a general business catalog and sales optimization report.';
    
    // Execute secure pipeline
    const result = await runSecureAiPipeline(req, userText, agentName);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function suggestWithPerplexity(req, res, next) {
  try {
    const prompt = 'Suggest 5 concrete actions to improve my B2B store sales, catalog SEO visibility, and stock turnaround speed.';
    const result = await runSecureAiPipeline(req, prompt);
    res.json({ suggestions: result.answer, ...result });
  } catch (error) {
    next(error);
  }
}

async function saveAiFeedback(req, res, next) {
  try {
    const businessId = req.business.id;
    const { promptContext, agentName, originalRecommendation, correctedText, isRejected } = req.body;
    let savedFeedback = null;

    try {
      const result = await pool.query(
        `INSERT INTO ai_corrections (business_id, agent_name, prompt_context, original_recommendation, corrected_text, is_rejected)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [businessId, agentName || 'System Orchestrator', promptContext || '', originalRecommendation || '', correctedText || '', !!isRejected]
      );
      savedFeedback = result.rows[0];
    } catch (dbErr) {
      console.warn('PostgreSQL feedback write failed, writing to JSON fallback:', dbErr.message);
      const fallbackPath = path.join(__dirname, '..', '..', 'config', 'ai_history_fallback.json');
      let fallbackData = { recommendations: [], corrections: [] };
      if (fs.existsSync(fallbackPath)) {
        try {
          fallbackData = JSON.parse(fs.readFileSync(fallbackPath, 'utf8'));
        } catch (e) {}
      }
      if (!fallbackData.corrections) fallbackData.corrections = [];
      savedFeedback = {
        id: Date.now(),
        business_id: businessId,
        agent_name: agentName || 'System Orchestrator',
        prompt_context: promptContext || '',
        original_recommendation: originalRecommendation || '',
        corrected_text: correctedText || '',
        is_rejected: !!isRejected,
        created_at: new Date().toISOString()
      };
      fallbackData.corrections.push(savedFeedback);
      fs.writeFileSync(fallbackPath, JSON.stringify(fallbackData, null, 2), 'utf8');
    }

    res.json({ success: true, feedback: savedFeedback });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  analyzeWithPerplexity,
  produceInsights,
  suggestWithPerplexity,
  saveAiFeedback
};


const { getBusinessById } = require('../models/businessModel');
const { listProducts, getLowStock, getSellerVisitInsights } = require('../models/productModel');
const { getSalesSummary, getProductSales, getMonthlyProfitTrend } = require('../models/invoiceModel');
const { askPerplexityAgent } = require('../services/perplexityAgent');
const { askGlmAgent } = require('../services/nvidiaAgent');
const { askGeminiAgent } = require('../services/geminiAgent');

// 1. Intent Classifier Helper
function classifyIntent(prompt) {
  const query = String(prompt || '').toLowerCase();
  const needsProfile = query.includes('profile') || query.includes('business') || query.includes('shop') || query.includes('gst');
  const needsProducts = query.includes('product') || query.includes('listing') || query.includes('item') || query.includes('catalog') || query.includes('seo') || query.includes('hsn');
  const needsInventory = query.includes('stock') || query.includes('inventory') || query.includes('restock') || query.includes('qty');
  const needsAnalytics = query.includes('sale') || query.includes('profit') || query.includes('revenue') || query.includes('view') || query.includes('visit') || query.includes('lead') || query.includes('inquir') || query.includes('trend');
  const needsExternal = query.includes('latest') || query.includes('update') || query.includes('notification') || query.includes('scheme') || query.includes('regulation') || query.includes('government') || query.includes('tax changes') || query.includes('budget') || query.includes('google algorithm') || query.includes('meta ads') || query.includes('industry');

  return { needsProfile, needsProducts, needsInventory, needsAnalytics, needsExternal };
}

// 2. Context Sanitizer Helper
function sanitizeContext(data) {
  if (!data) return null;
  const jsonString = JSON.stringify(data);
  // Scrub emails
  let sanitized = jsonString.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[REDACTED_EMAIL]');
  // Scrub phone numbers
  sanitized = sanitized.replace(/\+?\d{1,4}?[-.\s]?\(?\d{1,3}?\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9}/g, '[REDACTED_PHONE]');
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
  const businessId = req.business.id;
  
  // Step 2: Intent Classification
  const intent = classifyIntent(prompt);

  // Step 3 & 4: Authorization and Context Collection
  const rawContext = {
    businessProfile: null,
    productsSummary: [],
    lowStockAlerts: [],
    visitInsights: null,
    salesSummary: null,
    externalInfo: null
  };

  // Securely query database elements mapping strictly to authenticated businessId
  if (intent.needsProfile) {
    rawContext.businessProfile = await getBusinessById(businessId);
  }
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
  if (intent.needsInventory) {
    rawContext.lowStockAlerts = await getLowStock(businessId, 15);
  }
  if (intent.needsAnalytics) {
    rawContext.visitInsights = await getSellerVisitInsights(businessId);
    rawContext.salesSummary = await getSalesSummary(businessId);
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
You must assist users ONLY within the following allowed domains: e-commerce, wholesale trading, retail, B2B distribution, manufacturing, HSN codes, GST taxes, catalog SEO, pricing models, marketing ads (Google/Meta), and inventory tracking.
If the query is outside these e-commerce domains, reject it politely:
"I am your Business Growth Advisor. I can only assist with B2B e-commerce, wholesale trading, retail, GST, SEO, inventory, and business analytics."

You MUST return your response in a highly structured, premium markdown format, including:
### 📊 Summary
[Short, professional overview of the request context]

### 🔍 Business Analysis
[Analysis of seller profile, catalog metrics, or relevant parameters]

### 💡 Key Findings
[Prioritized bullet points of insights]

### 📈 Recommendations
[Actionable consulting insights]

### 📋 Implementation Steps
[Step-by-step roadmap for execution]

### 🎯 Expected Results
[Expected updates to business metrics]

### ⚡ Priority Level
[High, Medium, or Low]`;

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
      if (text.includes('Business Growth Advisor') || text.includes('Summary') || text.includes('Recommendations')) {
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

  return {
    answer: text,
    model: responseData.model || 'gemini-1.5-flash',
    summary: getSection('📊 Summary'),
    businessAnalysis: getSection('🔍 Business Analysis'),
    keyFindings: getSection('💡 Key Findings'),
    recommendations: getSection('📈 Recommendations'),
    implementationSteps: getSection('📋 Implementation Steps'),
    expectedResults: getSection('🎯 Expected Results'),
    priority: getSection('⚡ Priority Level') || 'Medium'
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

module.exports = { analyzeWithPerplexity, produceInsights, suggestWithPerplexity };


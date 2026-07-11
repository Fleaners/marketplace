const { getSalesSummary, getProductSales, getMonthlyProfitTrend } = require('../models/invoiceModel');
const { askPerplexityAgent } = require('../services/perplexityAgent');
const { askGlmAgent } = require('../services/nvidiaAgent');
const { askGeminiAgent } = require('../services/geminiAgent');

// Helper to select the AI agent based on configuration and request parameters
async function runAiAgent(prompt, agentName = '') {
  const hasPerplexity = !!process.env.PERPLEXITY_API_KEY;
  const hasNvidia = !!process.env.NVIDIA_API_KEY;
  const hasGemini = !!(process.env.GEMINI_API_KEY || process.env.MP_GEMINI_API_KEY);

  const nameLower = String(agentName || '').toLowerCase().trim();

  // If user explicitly asks for GLM/Nvidia
  if (nameLower.includes('glm') || nameLower.includes('nvidia')) {
    if (!hasNvidia) {
      throw new Error('NVIDIA_API_KEY is not configured for the GLM-5.2 agent.');
    }
    return await askGlmAgent(prompt);
  }

  // If user explicitly asks for Perplexity
  if (nameLower.includes('perplexity')) {
    if (!hasPerplexity) {
      throw new Error('PERPLEXITY_API_KEY is not configured for Perplexity agent.');
    }
    return await askPerplexityAgent(prompt);
  }

  // If user explicitly asks for Gemini or by default
  const useGemini = nameLower.includes('gemini') || nameLower.includes('google') || 
                    (!hasPerplexity && !hasNvidia) || 
                    (!nameLower);

  if (useGemini) {
    return await askGeminiAgent(prompt);
  }

  // Fallbacks based on available keys
  if (hasPerplexity) {
    return await askPerplexityAgent(prompt);
  }
  if (hasNvidia) {
    return await askGlmAgent(prompt);
  }

  return await askGeminiAgent(prompt);
}

async function produceInsights(req, res, next) {
  try {
    const business_id = req.business.id;
    const salesSummary = await getSalesSummary(business_id);
    const productSales = await getProductSales(business_id);
    const profitTrend = await getMonthlyProfitTrend(business_id);

    res.json({ salesSummary, productSales, profitTrend });
  } catch (error) {
    next(error);
  }
}

async function analyzeWithPerplexity(req, res, next) {
  try {
    const { data, prompt, agentName } = req.body;
    const input = prompt || [
      'Analyze this marketplace business data.',
      'Return practical, prioritized insights for the owner.',
      JSON.stringify(data || {}, null, 2),
    ].join('\n\n');

    const analysis = await runAiAgent(input, agentName);
    res.json(analysis);
  } catch (error) {
    next(error);
  }
}

async function suggestWithPerplexity(req, res, next) {
  try {
    const business_id = req.business.id;
    const salesSummary = await getSalesSummary(business_id);
    const productSales = await getProductSales(business_id);
    const profitTrend = await getMonthlyProfitTrend(business_id);
    const prompt = [
      'You are an AI business advisor for a small marketplace store.',
      'Suggest 5 concrete actions to improve sales, inventory, and customer follow-up.',
      JSON.stringify({ salesSummary, productSales, profitTrend }, null, 2),
    ].join('\n\n');

    const result = await runAiAgent(prompt);
    res.json({ suggestions: result.answer, ...result });
  } catch (error) {
    next(error);
  }
}

module.exports = { analyzeWithPerplexity, produceInsights, suggestWithPerplexity };


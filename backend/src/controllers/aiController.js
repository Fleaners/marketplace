const { getSalesSummary, getProductSales, getMonthlyProfitTrend } = require('../models/invoiceModel');
const { askPerplexityAgent } = require('../services/perplexityAgent');
const { askGlmAgent } = require('../services/nvidiaAgent');

// Helper to select the AI agent based on configuration and request parameters
async function runAiAgent(prompt, agentName = '') {
  const hasPerplexity = !!process.env.PERPLEXITY_API_KEY;
  const hasNvidia = !!process.env.NVIDIA_API_KEY;

  const useGlm = (agentName && agentName.toLowerCase().includes('glm')) || 
                 (agentName && agentName.toLowerCase().includes('nvidia')) ||
                 (!hasPerplexity && hasNvidia);

  if (useGlm) {
    if (!hasNvidia) {
      throw new Error('NVIDIA_API_KEY is not configured for the GLM-5.2 agent.');
    }
    return await askGlmAgent(prompt);
  } else {
    if (!hasPerplexity && !hasNvidia) {
      throw new Error('Neither PERPLEXITY_API_KEY nor NVIDIA_API_KEY is configured.');
    }
    if (!hasPerplexity) {
      // Fallback if user didn't specify GLM but only has NVIDIA key
      return await askGlmAgent(prompt);
    }
    return await askPerplexityAgent(prompt);
  }
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


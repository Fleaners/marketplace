const { getSalesSummary, getProductSales, getMonthlyProfitTrend } = require('../models/invoiceModel');
const { askPerplexityAgent } = require('../services/perplexityAgent');

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
    const { data, prompt } = req.body;
    const input = prompt || [
      'Analyze this marketplace business data.',
      'Return practical, prioritized insights for the owner.',
      JSON.stringify(data || {}, null, 2),
    ].join('\n\n');

    const analysis = await askPerplexityAgent(input);
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

    const result = await askPerplexityAgent(prompt);
    res.json({ suggestions: result.answer, ...result });
  } catch (error) {
    next(error);
  }
}

module.exports = { analyzeWithPerplexity, produceInsights, suggestWithPerplexity };

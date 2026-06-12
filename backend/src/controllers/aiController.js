const { getSalesSummary, getProductSales, getMonthlyProfitTrend } = require('../models/invoiceModel');

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

module.exports = { produceInsights };

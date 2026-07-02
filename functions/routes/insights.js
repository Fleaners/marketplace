import express from 'express';
import { getFirestore } from 'firebase-admin/firestore';
import { verifyToken, requireUserContext } from '../middleware/auth.js';

const router = express.Router();

function getDb() {
  return getFirestore();
}

function dateKeyFromValue(value) {
  if (!value) return null;
  const date = value.toDate ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function getLastNDates(days) {
  const out = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

async function resolveBusinessId(req) {
  const fromToken = req.user?.businessId ? String(req.user.businessId) : '';
  const fromQuery = typeof req.query.business_id === 'string' ? req.query.business_id.trim() : '';
  if (fromToken) return fromToken;
  if (fromQuery) return fromQuery;
  return '';
}

router.get('/summary', verifyToken, requireUserContext, async (req, res, next) => {
  try {
    const db = getDb();
    const businessId = await resolveBusinessId(req);
    if (!businessId) {
      return res.status(404).json({ error: 'No business found for insights' });
    }

    const [businessDoc, productsSnapshot, invoicesSnapshot, messagesSnapshot] = await Promise.all([
      db.collection('businesses').doc(businessId).get(),
      db.collection('businesses').doc(businessId).collection('products').get(),
      db.collection('businesses').doc(businessId).collection('invoices').limit(150).get(),
      db.collection('messages').where('seller_business_id', '==', businessId).orderBy('created_at', 'desc').limit(100).get().catch(() => ({ docs: [] })),
    ]);

    const products = productsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const invoices = invoicesSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const business = businessDoc.exists ? businessDoc.data() : {};

    const visitBatches = await Promise.all(
      productsSnapshot.docs.map(async (productDoc) => {
        const visits = await productDoc.ref.collection('visits').orderBy('visited_at', 'desc').limit(200).get().catch(() => ({ docs: [] }));
        return visits.docs.map((visitDoc) => ({ id: visitDoc.id, product_id: productDoc.id, ...visitDoc.data() }));
      })
    );
    const visits = visitBatches.flat();

    const todayKey = new Date().toISOString().slice(0, 10);
    const visitorsToday = visits.filter((v) => dateKeyFromValue(v.visited_at) === todayKey).length;
    const previousWeek = visits.filter((v) => {
      const key = dateKeyFromValue(v.visited_at);
      if (!key) return false;
      const diff = Math.floor((Date.now() - new Date(key).getTime()) / 86400000);
      return diff >= 7 && diff <= 13;
    }).length;
    const thisWeek = visits.filter((v) => {
      const key = dateKeyFromValue(v.visited_at);
      if (!key) return false;
      const diff = Math.floor((Date.now() - new Date(key).getTime()) / 86400000);
      return diff >= 0 && diff <= 6;
    }).length;
    const weeklyGrowth = previousWeek > 0 ? Math.round(((thisWeek - previousWeek) / previousWeek) * 100) : (thisWeek > 0 ? 100 : 0);

    const visitsByProduct = new Map();
    visits.forEach((visit) => {
      const key = String(visit.product_id || '');
      visitsByProduct.set(key, (visitsByProduct.get(key) || 0) + 1);
    });

    const topProduct = products
      .map((p) => ({ ...p, view_count: visitsByProduct.get(String(p.id)) || Number(p.view_count || 0) }))
      .sort((a, b) => b.view_count - a.view_count)[0] || null;

    const unreadMessages = messagesSnapshot.docs.filter((doc) => !doc.data()?.is_read).length;
    const lowStock = products.filter((p) => Number(p.stock || 0) > 0 && Number(p.stock || 0) <= 10).length;

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonth = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;

    const monthTotals = invoices.reduce((acc, invoice) => {
      const created = invoice.created_at?.toDate ? invoice.created_at.toDate() : new Date(invoice.created_at || Date.now());
      const key = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, '0')}`;
      const amount = Number(invoice.total || 0);
      acc[key] = (acc[key] || 0) + amount;
      return acc;
    }, {});

    const growthValue = monthTotals[previousMonth] > 0
      ? Math.round(((monthTotals[currentMonth] - monthTotals[previousMonth]) / monthTotals[previousMonth]) * 100)
      : (monthTotals[currentMonth] > 0 ? 100 : 0);

    const cityCounter = {};
    visits.forEach((v) => {
      const city = String(v.visitor_city || '').trim();
      if (!city) return;
      cityCounter[city] = (cityCounter[city] || 0) + 1;
    });
    const topCities = Object.entries(cityCounter).sort((a, b) => b[1] - a[1]).slice(0, 3).map((item) => item[0]);

    const categoryCounter = {};
    products.forEach((p) => {
      const category = String(p.category || p.name || 'General').split(' ')[0];
      const views = visitsByProduct.get(String(p.id)) || Number(p.view_count || 0);
      categoryCounter[category] = (categoryCounter[category] || 0) + views;
    });
    const topCategories = Object.entries(categoryCounter).sort((a, b) => b[1] - a[1]).slice(0, 3).map((item) => item[0]);

    const hourly = new Array(24).fill(0);
    visits.forEach((v) => {
      const date = v.visited_at?.toDate ? v.visited_at.toDate() : new Date(v.visited_at || Date.now());
      if (!Number.isNaN(date.getTime())) hourly[date.getHours()] += 1;
    });
    let bestHour = 19;
    let bestCount = -1;
    hourly.forEach((count, idx) => {
      if (count > bestCount) {
        bestCount = count;
        bestHour = idx;
      }
    });

    const fastestGrowing = products
      .map((p) => {
        const total = visitsByProduct.get(String(p.id)) || 0;
        return {
          product: p.name || 'Untitled Product',
          growth: total > 0 ? Math.min(99, Math.round((total / Math.max(1, visits.length)) * 220)) : 0,
        };
      })
      .sort((a, b) => b.growth - a.growth)[0] || { product: 'No data yet', growth: 0 };

    const cardPayload = {
      visitors_today: visitorsToday,
      visitors_growth_week: weeklyGrowth,
      popular_product: {
        name: topProduct?.name || 'No product data',
        views: Number(topProduct?.view_count || 0),
      },
      new_messages: unreadMessages,
      low_stock_count: lowStock,
      business_growth_month: growthValue,
      recommended_action: topProduct
        ? `Add 2 more photos to ${topProduct.name} to improve inquiries.`
        : 'Add your first product photo to attract more buyers.',
    };

    return res.json({
      business_id: businessId,
      business_name: business.shop_name || 'Marketplace seller',
      cards: cardPayload,
      stories: {
        interested_in: topCategories.length ? topCategories : ['Industrial', 'Electrical', 'General'],
        top_cities: topCities.length ? topCities : ['Lucknow', 'Kanpur', 'Delhi'],
        best_time_to_respond: `${String(bestHour).padStart(2, '0')}:00 - ${String((bestHour + 2) % 24).padStart(2, '0')}:00`,
        fastest_growing_product: fastestGrowing,
      },
      ga4_story: {
        views_week: thisWeek,
        top_city: topCities[0] || 'No city data yet',
        top_interest: topCategories[0] || 'No category data yet',
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/charts', verifyToken, requireUserContext, async (req, res, next) => {
  try {
    const db = getDb();
    const businessId = await resolveBusinessId(req);
    if (!businessId) {
      return res.status(404).json({ error: 'No business found for charts' });
    }

    const productsSnapshot = await db.collection('businesses').doc(businessId).collection('products').get();
    const products = productsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    const visitBatches = await Promise.all(
      productsSnapshot.docs.map(async (productDoc) => {
        const visits = await productDoc.ref.collection('visits').orderBy('visited_at', 'desc').limit(300).get().catch(() => ({ docs: [] }));
        return visits.docs.map((visitDoc) => ({ id: visitDoc.id, product_id: productDoc.id, ...visitDoc.data() }));
      })
    );
    const visits = visitBatches.flat();

    const dateKeys = getLastNDates(30);
    const dailyMap = Object.fromEntries(dateKeys.map((k) => [k, 0]));
    visits.forEach((visit) => {
      const key = dateKeyFromValue(visit.visited_at);
      if (key && key in dailyMap) dailyMap[key] += 1;
    });

    const viewsByProduct = new Map();
    visits.forEach((visit) => {
      const key = String(visit.product_id || '');
      viewsByProduct.set(key, (viewsByProduct.get(key) || 0) + 1);
    });

    const topProducts = products
      .map((p) => ({
        name: p.name || 'Untitled Product',
        views: viewsByProduct.get(String(p.id)) || Number(p.view_count || 0),
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 6);

    const categoryCounter = {};
    products.forEach((p) => {
      const category = String(p.category || p.name || 'General').split(' ')[0];
      const views = viewsByProduct.get(String(p.id)) || Number(p.view_count || 0);
      categoryCounter[category] = (categoryCounter[category] || 0) + views;
    });

    const categoryInterest = Object.entries(categoryCounter)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, value]) => ({ name, value }));

    return res.json({
      business_id: businessId,
      visitors_series: dateKeys.map((date) => ({ date, value: dailyMap[date] })),
      top_products: topProducts,
      category_interest: categoryInterest,
    });
  } catch (error) {
    next(error);
  }
});

export default router;

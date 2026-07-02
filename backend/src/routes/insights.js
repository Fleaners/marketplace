const express = require('express');
const { requireAuth } = require('../middleware/auth');
const pool = require('../../config/db');

const router = express.Router();

router.get('/summary', requireAuth, async (req, res, next) => {
  try {
    const businessId = req.business.id;

    const [visitorsTodayRes, weekRes, topProductRes, unreadRes, lowStockRes, growthRes] = await Promise.all([
      pool.query('SELECT COUNT(*)::int AS count FROM listing_visits WHERE seller_business_id = $1 AND visited_at::date = CURRENT_DATE', [businessId]),
      pool.query(
        `SELECT
          COUNT(*) FILTER (WHERE visited_at >= NOW() - INTERVAL '7 day')::int AS this_week,
          COUNT(*) FILTER (WHERE visited_at >= NOW() - INTERVAL '14 day' AND visited_at < NOW() - INTERVAL '7 day')::int AS prev_week
        FROM listing_visits
        WHERE seller_business_id = $1`,
        [businessId]
      ),
      pool.query(
        `SELECT p.name, COUNT(lv.id)::int AS views
         FROM products p
         LEFT JOIN listing_visits lv ON lv.product_id = p.id
         WHERE p.business_id = $1
         GROUP BY p.id, p.name
         ORDER BY views DESC, p.created_at DESC
         LIMIT 1`,
        [businessId]
      ),
      pool.query('SELECT COALESCE(SUM(unread_count), 0)::int AS unread FROM message_threads WHERE seller_business_id = $1', [businessId]),
      pool.query('SELECT COUNT(*)::int AS count FROM products WHERE business_id = $1 AND stock > 0 AND stock <= 10', [businessId]),
      pool.query(
        `WITH monthly AS (
          SELECT
            date_trunc('month', created_at) AS month,
            SUM(total)::numeric AS revenue
          FROM invoices
          WHERE business_id = $1
          GROUP BY 1
        )
        SELECT
          COALESCE((SELECT revenue FROM monthly WHERE month = date_trunc('month', NOW())), 0) AS current_revenue,
          COALESCE((SELECT revenue FROM monthly WHERE month = date_trunc('month', NOW() - INTERVAL '1 month')), 0) AS previous_revenue`,
        [businessId]
      ),
    ]);

    const thisWeek = Number(weekRes.rows[0]?.this_week || 0);
    const prevWeek = Number(weekRes.rows[0]?.prev_week || 0);
    const weeklyGrowth = prevWeek > 0 ? Math.round(((thisWeek - prevWeek) / prevWeek) * 100) : (thisWeek > 0 ? 100 : 0);

    const currentRevenue = Number(growthRes.rows[0]?.current_revenue || 0);
    const previousRevenue = Number(growthRes.rows[0]?.previous_revenue || 0);
    const growthMonth = previousRevenue > 0 ? Math.round(((currentRevenue - previousRevenue) / previousRevenue) * 100) : (currentRevenue > 0 ? 100 : 0);

    const topCitiesRes = await pool.query(
      `SELECT visitor_city AS city, COUNT(*)::int AS views
       FROM listing_visits
       WHERE seller_business_id = $1 AND visitor_city IS NOT NULL AND visitor_city <> ''
       GROUP BY visitor_city
       ORDER BY views DESC
       LIMIT 3`,
      [businessId]
    );

    const topCategoriesRes = await pool.query(
      `SELECT split_part(name, ' ', 1) AS category, COALESCE(SUM(view_count), 0)::int AS views
       FROM products
       WHERE business_id = $1
       GROUP BY category
       ORDER BY views DESC
       LIMIT 3`,
      [businessId]
    );

    const bestHourRes = await pool.query(
      `SELECT EXTRACT(HOUR FROM visited_at)::int AS hour, COUNT(*)::int AS hits
       FROM listing_visits
       WHERE seller_business_id = $1
       GROUP BY 1
       ORDER BY hits DESC
       LIMIT 1`,
      [businessId]
    );

    const fastestRes = await pool.query(
      `SELECT name, COALESCE(view_count, 0)::int AS views
       FROM products
       WHERE business_id = $1
       ORDER BY views DESC
       LIMIT 1`,
      [businessId]
    );

    const bestHour = Number(bestHourRes.rows[0]?.hour ?? 19);

    return res.json({
      cards: {
        visitors_today: Number(visitorsTodayRes.rows[0]?.count || 0),
        visitors_growth_week: weeklyGrowth,
        popular_product: {
          name: topProductRes.rows[0]?.name || 'No product data',
          views: Number(topProductRes.rows[0]?.views || 0),
        },
        new_messages: Number(unreadRes.rows[0]?.unread || 0),
        low_stock_count: Number(lowStockRes.rows[0]?.count || 0),
        business_growth_month: growthMonth,
        recommended_action: topProductRes.rows[0]?.name
          ? `Add more photos to ${topProductRes.rows[0].name}.`
          : 'Add your first product image to improve trust.',
      },
      stories: {
        interested_in: topCategoriesRes.rows.map((r) => r.category).filter(Boolean),
        top_cities: topCitiesRes.rows.map((r) => r.city).filter(Boolean),
        best_time_to_respond: `${String(bestHour).padStart(2, '0')}:00 - ${String((bestHour + 2) % 24).padStart(2, '0')}:00`,
        fastest_growing_product: {
          product: fastestRes.rows[0]?.name || 'No data yet',
          growth: Math.min(99, Number(fastestRes.rows[0]?.views || 0)),
        },
      },
      ga4_story: {
        views_week: thisWeek,
        top_city: topCitiesRes.rows[0]?.city || 'No city data yet',
        top_interest: topCategoriesRes.rows[0]?.category || 'No category data yet',
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/charts', requireAuth, async (req, res, next) => {
  try {
    const businessId = req.business.id;

    const visitorsRes = await pool.query(
      `WITH days AS (
         SELECT generate_series((CURRENT_DATE - INTERVAL '29 day')::date, CURRENT_DATE::date, INTERVAL '1 day')::date AS d
       )
       SELECT days.d::text AS date, COALESCE(COUNT(lv.id), 0)::int AS value
       FROM days
       LEFT JOIN listing_visits lv
         ON lv.seller_business_id = $1
        AND lv.visited_at::date = days.d
       GROUP BY days.d
       ORDER BY days.d`,
      [businessId]
    );

    const topProductsRes = await pool.query(
      `SELECT p.name, COUNT(lv.id)::int AS views
       FROM products p
       LEFT JOIN listing_visits lv ON lv.product_id = p.id
       WHERE p.business_id = $1
       GROUP BY p.id, p.name
       ORDER BY views DESC, p.created_at DESC
       LIMIT 6`,
      [businessId]
    );

    const categoryRes = await pool.query(
      `SELECT split_part(p.name, ' ', 1) AS name, COUNT(lv.id)::int AS value
       FROM products p
       LEFT JOIN listing_visits lv ON lv.product_id = p.id
       WHERE p.business_id = $1
       GROUP BY 1
       ORDER BY value DESC
       LIMIT 5`,
      [businessId]
    );

    return res.json({
      visitors_series: visitorsRes.rows,
      top_products: topProductsRes.rows,
      category_interest: categoryRes.rows,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

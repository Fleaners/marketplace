const pool = require('../../config/db');

async function listProducts({ business_id, search, city, limit = 50, offset = 0 }) {
  const conditions = [];
  const values = [];
  let index = 1;

  if (business_id) {
    conditions.push(`business_id = $${index++}`);
    values.push(business_id);
  }

  if (search) {
    conditions.push(`LOWER(name) LIKE $${index++}`);
    values.push(`%${search.toLowerCase()}%`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const query = `SELECT * FROM products ${whereClause} ORDER BY created_at DESC LIMIT $${index++} OFFSET $${index++}`;
  values.push(limit, offset);

  const result = await pool.query(query, values);
  return result.rows;
}

async function getProductById(id) {
  const result = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
  return result.rows[0];
}

async function createProduct({ business_id, name, price, cost_price, stock, image_url }) {
  const result = await pool.query(
    `INSERT INTO products (business_id, name, price, cost_price, stock, image_url)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [business_id, name, price, cost_price, stock, image_url]
  );
  return result.rows[0];
}

async function updateProduct(id, business_id, fields) {
  const setClauses = [];
  const values = [];
  let index = 1;

  for (const key of Object.keys(fields)) {
    setClauses.push(`${key} = $${index}`);
    values.push(fields[key]);
    index += 1;
  }

  if (!values.length) return null;

  values.push(id, business_id);

  const result = await pool.query(
    `UPDATE products SET ${setClauses.join(', ')} WHERE id = $${index++} AND business_id = $${index} RETURNING *`,
    values
  );
  return result.rows[0];
}

async function deleteProduct(id, business_id) {
  const result = await pool.query('DELETE FROM products WHERE id = $1 AND business_id = $2 RETURNING id', [id, business_id]);
  return result.rows[0];
}

async function updateStock(id, business_id, stock) {
  const result = await pool.query(
    'UPDATE products SET stock = $1 WHERE id = $2 AND business_id = $3 RETURNING *',
    [stock, id, business_id]
  );
  return result.rows[0];
}

async function reduceStock(id, quantity) {
  const result = await pool.query(
    'UPDATE products SET stock = GREATEST(stock - $1, 0) WHERE id = $2 RETURNING *',
    [quantity, id]
  );
  return result.rows[0];
}

async function getLowStock(business_id, threshold = 10) {
  const result = await pool.query(
    'SELECT * FROM products WHERE business_id = $1 AND stock <= $2 ORDER BY stock ASC',
    [business_id, threshold]
  );
  return result.rows;
}

async function recordProductVisit({ product_id, seller_business_id, visitor_business_id, user_agent }) {
  const productResult = await pool.query('SELECT id, business_id FROM products WHERE id = $1 AND business_id = $2', [product_id, seller_business_id]);
  const product = productResult.rows[0];
  if (!product) return null;
  if (visitor_business_id && Number(visitor_business_id) === Number(seller_business_id)) {
    return { recorded: false, reason: 'Own listing view ignored' };
  }

  let visitor = null;
  if (visitor_business_id) {
    const visitorResult = await pool.query('SELECT id, shop_name, phone, email, city FROM businesses WHERE id = $1', [visitor_business_id]);
    visitor = visitorResult.rows[0] || null;
  }

  const result = await pool.query(
    `INSERT INTO listing_visits (
      product_id,
      seller_business_id,
      visitor_business_id,
      visitor_name,
      visitor_phone,
      visitor_email,
      visitor_city,
      user_agent
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING id`,
    [
      product_id,
      seller_business_id,
      visitor?.id || null,
      visitor?.shop_name || 'Guest visitor',
      visitor?.phone || null,
      visitor?.email || null,
      visitor?.city || null,
      user_agent || null,
    ]
  );

  return { recorded: true, id: result.rows[0].id };
}

async function getSellerVisitInsights(seller_business_id) {
  const visitsResult = await pool.query(
    `SELECT
      lv.id,
      lv.product_id,
      p.name AS product_name,
      lv.visitor_business_id,
      COALESCE(lv.visitor_name, 'Guest visitor') AS visitor_name,
      lv.visitor_phone,
      lv.visitor_email,
      lv.visitor_city,
      lv.user_agent,
      lv.visited_at
    FROM listing_visits lv
    JOIN products p ON p.id = lv.product_id
    WHERE lv.seller_business_id = $1
    ORDER BY lv.visited_at DESC
    LIMIT 100`,
    [seller_business_id]
  );

  const summaryResult = await pool.query(
    `SELECT
      p.id AS product_id,
      p.name AS product_name,
      COUNT(lv.id)::int AS view_count,
      MAX(lv.visited_at) AS last_viewed_at
    FROM products p
    LEFT JOIN listing_visits lv ON lv.product_id = p.id
    WHERE p.business_id = $1
    GROUP BY p.id, p.name
    ORDER BY p.created_at DESC`,
    [seller_business_id]
  );

  return {
    visits: visitsResult.rows,
    summary: summaryResult.rows,
  };
}

module.exports = {
  listProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  updateStock,
  reduceStock,
  getLowStock,
  recordProductVisit,
  getSellerVisitInsights,
};

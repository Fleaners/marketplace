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

module.exports = { listProducts, getProductById, createProduct, updateProduct, deleteProduct, updateStock, reduceStock, getLowStock };

const pool = require('../../config/db');

async function listFeed({ city, limit = 50, offset = 0 }) {
  const filters = [];
  const values = [];
  let index = 1;

  if (city) {
    filters.push(`b.city = $${index++}`);
    values.push(city);
  }

  const query = `
    SELECT p.*, b.shop_name, b.city, b.profile_image_url
    FROM posts p
    JOIN businesses b ON b.id = p.business_id
    ${filters.length ? `WHERE ${filters.join(' AND ')}` : ''}
    ORDER BY p.created_at DESC
    LIMIT $${index++}
    OFFSET $${index++}
  `;

  values.push(limit, offset);
  const result = await pool.query(query, values);
  return result.rows;
}

async function createPost({ business_id, content, image_url }) {
  const result = await pool.query(
    `INSERT INTO posts (business_id, content, image_url)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [business_id, content, image_url]
  );
  return result.rows[0];
}

async function deletePost(id, business_id) {
  const result = await pool.query('DELETE FROM posts WHERE id = $1 AND business_id = $2 RETURNING id', [id, business_id]);
  return result.rows[0];
}

module.exports = { listFeed, createPost, deletePost };

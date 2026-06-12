const pool = require('../../config/db');

async function createBusiness({ shop_name, phone, gst_number, city, latitude, longitude, profile_image_url, password_hash, description }) {
  const result = await pool.query(
    `INSERT INTO businesses (shop_name, phone, gst_number, city, latitude, longitude, profile_image_url, password_hash, description)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id, shop_name, phone, gst_number, city, latitude, longitude, profile_image_url, description, created_at`,
    [shop_name, phone, gst_number, city, latitude, longitude, profile_image_url, password_hash, description]
  );
  return result.rows[0];
}

async function getBusinessByPhone(phone) {
  const result = await pool.query('SELECT * FROM businesses WHERE phone = $1', [phone]);
  return result.rows[0];
}

async function getBusinessById(id) {
  const result = await pool.query('SELECT id, shop_name, phone, gst_number, city, latitude, longitude, profile_image_url, description, created_at FROM businesses WHERE id = $1', [id]);
  return result.rows[0];
}

async function updateBusiness(id, fields) {
  const setClauses = [];
  const values = [];
  let index = 1;

  for (const key of Object.keys(fields)) {
    setClauses.push(`${key} = $${index}`);
    values.push(fields[key]);
    index += 1;
  }

  if (!values.length) return null;

  values.push(id);

  const result = await pool.query(
    `UPDATE businesses SET ${setClauses.join(', ')} WHERE id = $${index} RETURNING id, shop_name, phone, gst_number, city, latitude, longitude, profile_image_url, description, created_at`,
    values
  );

  return result.rows[0];
}

module.exports = { createBusiness, getBusinessByPhone, getBusinessById, updateBusiness };

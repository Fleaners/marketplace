const jwt = require('jsonwebtoken');
const pool = require('../../config/db');
const JWT_SECRET = process.env.JWT_SECRET || 'demo-jwt-secret';

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Authentication token missing' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.business = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return next();
  }

  try {
    req.business = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    req.business = null;
  }

  return next();
}

async function findBusinessById(id) {
  const result = await pool.query('SELECT id, shop_name, phone, gst_number, city, latitude, longitude, profile_image_url, description, created_at FROM businesses WHERE id = $1', [id]);
  return result.rows[0];
}

module.exports = { requireAuth, optionalAuth, findBusinessById };

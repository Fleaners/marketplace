const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createBusiness, getBusinessByPhone } = require('../models/businessModel');
const { uploadImage } = require('../utils/cloudinaryUpload');

const JWT_EXPIRES_IN = '30d';

function buildToken(business) {
  return jwt.sign(
    {
      id: business.id,
      shop_name: business.shop_name,
      phone: business.phone,
      gst_number: business.gst_number,
      city: business.city,
    },
    process.env.JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

async function register(req, res, next) {
  try {
    const { shop_name, phone, gst_number, city, latitude, longitude, password, description } = req.body;
    const rawImage = req.file;

    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must contain at least 6 characters.' });
    }

    const existing = await getBusinessByPhone(phone);
    if (existing) {
      return res.status(409).json({ error: 'Phone number already registered' });
    }

    const password_hash = await bcrypt.hash(password, 12);
    const profile_image_url = rawImage ? await uploadImage(rawImage, 'dealerconnect/profiles') : null;

    const business = await createBusiness({
      shop_name,
      phone,
      gst_number,
      city,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      profile_image_url,
      password_hash,
      description,
    });

    const token = buildToken(business);
    res.status(201).json({ business, token });
  } catch (error) {
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const { phone, password } = req.body;
    const business = await getBusinessByPhone(phone);
    if (!business || !business.password_hash) {
      return res.status(401).json({ error: 'Invalid phone or password' });
    }

    const validPassword = await bcrypt.compare(password, business.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid phone or password' });
    }

    const token = buildToken(business);
    res.json({ business: { id: business.id, shop_name: business.shop_name, phone: business.phone, gst_number: business.gst_number, city: business.city, latitude: business.latitude, longitude: business.longitude, profile_image_url: business.profile_image_url, description: business.description }, token });
  } catch (error) {
    next(error);
  }
}

module.exports = { register, login };

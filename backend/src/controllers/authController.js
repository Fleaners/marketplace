const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createBusiness, getBusinessByPhone } = require('../models/businessModel');
const { uploadImage } = require('../utils/cloudinaryUpload');

const JWT_EXPIRES_IN = '30d';
const JWT_SECRET = process.env.JWT_SECRET || 'demo-jwt-secret';
const ALLOW_DEMO_AUTH = process.env.ALLOW_DEMO_AUTH === 'true';
const DEMO_PHONE = process.env.DEMO_AUTH_PHONE || '9999999999';
const DEMO_PASSWORD = process.env.DEMO_AUTH_PASSWORD || 'demo123';

let demoIdCounter = 1000;
const demoBusinesses = new Map();
demoBusinesses.set(DEMO_PHONE, {
  id: 1,
  shop_name: 'Demo Auto Store',
  phone: DEMO_PHONE,
  gst_number: 'DEMO-GST-001',
  city: 'Demo City',
  latitude: null,
  longitude: null,
  profile_image_url: null,
  description: 'Demo account for exploring Marketplace.',
  password_hash: bcrypt.hashSync(DEMO_PASSWORD, 10),
});

function buildToken(business) {
  return jwt.sign(
    {
      id: business.id,
      shop_name: business.shop_name,
      phone: business.phone,
      gst_number: business.gst_number,
      city: business.city,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

function buildPublicBusiness(business) {
  return {
    id: business.id,
    shop_name: business.shop_name,
    phone: business.phone,
    gst_number: business.gst_number,
    city: business.city,
    latitude: business.latitude,
    longitude: business.longitude,
    profile_image_url: business.profile_image_url,
    description: business.description,
  };
}

async function registerDemoBusiness(payload) {
  if (demoBusinesses.has(payload.phone)) {
    return null;
  }

  const business = {
    id: ++demoIdCounter,
    shop_name: payload.shop_name,
    phone: payload.phone,
    gst_number: payload.gst_number,
    city: payload.city,
    latitude: payload.latitude,
    longitude: payload.longitude,
    profile_image_url: null,
    description: payload.description || null,
    password_hash: await bcrypt.hash(payload.password, 10),
  };

  demoBusinesses.set(payload.phone, business);
  return business;
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
    if (!ALLOW_DEMO_AUTH) {
      return next(error);
    }

    try {
      const { shop_name, phone, gst_number, city, latitude, longitude, password, description } = req.body;
      const demoBusiness = await registerDemoBusiness({
        shop_name,
        phone,
        gst_number,
        city,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        password,
        description,
      });

      if (!demoBusiness) {
        return res.status(409).json({ error: 'Phone number already registered' });
      }

      const token = buildToken(demoBusiness);
      return res.status(201).json({ business: buildPublicBusiness(demoBusiness), token, mode: 'demo-auth' });
    } catch (demoError) {
      return next(demoError);
    }
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
    res.json({ business: buildPublicBusiness(business), token });
  } catch (error) {
    if (!ALLOW_DEMO_AUTH) {
      return next(error);
    }

    const { phone, password } = req.body;
    const demoBusiness = demoBusinesses.get(phone);
    if (!demoBusiness || !demoBusiness.password_hash) {
      return res.status(401).json({ error: 'Invalid phone or password' });
    }

    const validPassword = await bcrypt.compare(password, demoBusiness.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid phone or password' });
    }

    const token = buildToken(demoBusiness);
    return res.json({ business: buildPublicBusiness(demoBusiness), token, mode: 'demo-auth' });
  }
}

module.exports = { register, login };

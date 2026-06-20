const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { createBusiness, getBusinessByPhone } = require('../models/businessModel');
const { uploadImage } = require('../utils/cloudinaryUpload');
const { deliverOtp } = require('../utils/otpDelivery');

const JWT_EXPIRES_IN = '30d';
const JWT_SECRET = process.env.JWT_SECRET || 'demo-jwt-secret';
const ALLOW_DEMO_AUTH = process.env.ALLOW_DEMO_AUTH === 'true';
const DEMO_PHONE = process.env.DEMO_AUTH_PHONE || '9999999999';
const DEMO_PASSWORD = process.env.DEMO_AUTH_PASSWORD || 'demo123';
const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const OTP_DEBUG_MODE = process.env.OTP_DEBUG_MODE === 'true';

const otpChallenges = new Map();

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
    const profile_image_url = rawImage ? await uploadImage(rawImage, 'marketplace-store/profiles') : null;

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
  const requireOtpLogin = process.env.REQUIRE_LOGIN_OTP !== 'false';
  if (requireOtpLogin) {
    return res.status(400).json({ error: 'Use /api/auth/login/request-otp and /api/auth/login/verify-otp for login.' });
  }

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

async function authenticateCredentials(phone, password) {
  const business = await getBusinessByPhone(phone);
  if (business && business.password_hash) {
    const validPassword = await bcrypt.compare(password, business.password_hash);
    if (!validPassword) return null;
    return buildPublicBusiness(business);
  }

  if (!ALLOW_DEMO_AUTH) {
    return null;
  }

  const demoBusiness = demoBusinesses.get(phone);
  if (!demoBusiness || !demoBusiness.password_hash) {
    return null;
  }

  const validPassword = await bcrypt.compare(password, demoBusiness.password_hash);
  if (!validPassword) return null;
  return buildPublicBusiness(demoBusiness);
}

function hashOtp(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function generateOtp() {
  return String(crypto.randomInt(100000, 999999));
}

async function requestLoginOtp(req, res, next) {
  try {
    const { phone, password, channel, email } = req.body;
    const normalizedChannel = channel === 'email' ? 'email' : 'sms';
    const business = await authenticateCredentials(phone, password);
    if (!business) {
      return res.status(401).json({ error: 'Invalid phone or password' });
    }

    const otp = generateOtp();
    const otpHash = hashOtp(otp);
    otpChallenges.set(phone, {
      otpHash,
      business,
      channel: normalizedChannel,
      email: email || null,
      expiresAt: Date.now() + OTP_TTL_MS,
      failedAttempts: 0,
    });

    try {
      await deliverOtp({ channel: normalizedChannel, phone, email, otp });
    } catch (deliveryError) {
      if (!OTP_DEBUG_MODE) {
        otpChallenges.delete(phone);
        throw deliveryError;
      }
    }

    return res.json({
      message: `OTP sent via ${normalizedChannel}`,
      otp: OTP_DEBUG_MODE ? otp : undefined,
    });
  } catch (error) {
    next(error);
  }
}

async function verifyLoginOtp(req, res, next) {
  try {
    const { phone, otp } = req.body;
    const challenge = otpChallenges.get(phone);
    if (!challenge) {
      return res.status(400).json({ error: 'No OTP challenge found. Request OTP first.' });
    }

    if (Date.now() > challenge.expiresAt) {
      otpChallenges.delete(phone);
      return res.status(400).json({ error: 'OTP expired. Request a new OTP.' });
    }

    if (challenge.failedAttempts >= OTP_MAX_ATTEMPTS) {
      otpChallenges.delete(phone);
      return res.status(429).json({ error: 'Too many invalid OTP attempts. Request a new OTP.' });
    }

    if (hashOtp(String(otp)) !== challenge.otpHash) {
      challenge.failedAttempts += 1;
      return res.status(401).json({ error: 'Invalid OTP' });
    }

    otpChallenges.delete(phone);
    const token = buildToken(challenge.business);
    return res.json({ business: challenge.business, token });
  } catch (error) {
    next(error);
  }
}

module.exports = { register, login, requestLoginOtp, verifyLoginOtp };

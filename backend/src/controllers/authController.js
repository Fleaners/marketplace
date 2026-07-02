const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { createBusiness, getBusinessByPhone, getBusinessByEmail, getBusinessByPhoneOrEmail } = require('../models/businessModel');
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
const USE_FIREBASE_PHONE_AUTH = process.env.USE_FIREBASE_PHONE_AUTH !== 'false';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';

const otpChallenges = new Map();

let demoIdCounter = 1000;
const demoBusinesses = new Map();
demoBusinesses.set(DEMO_PHONE, {
  id: 1,
  shop_name: 'Demo Auto Store',
  phone: DEMO_PHONE,
  email: 'demo@marketplacestore.local',
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
      email: business.email,
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
    email: business.email,
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
    email: payload.email || null,
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
    const { shop_name, phone, email, gst_number, city, latitude, longitude, password, description } = req.body;
    const rawImage = req.file;
    const normalizedEmail = typeof email === 'string' && email.trim() ? email.trim().toLowerCase() : null;
    const normalizedGst = typeof gst_number === 'string' && gst_number.trim() ? gst_number.trim() : null;

    const existing = await getBusinessByPhone(phone);
    if (existing) {
      return res.status(409).json({ error: 'Phone number already registered' });
    }

    if (normalizedEmail) {
      const existingByEmail = await getBusinessByEmail(normalizedEmail);
      if (existingByEmail) {
        return res.status(409).json({ error: 'Email already registered' });
      }
    }

    const generatedPassword = password && password.length >= 6 ? password : crypto.randomUUID();
    const password_hash = await bcrypt.hash(generatedPassword, 12);
    const profile_image_url = rawImage ? await uploadImage(rawImage, 'marketplace-store/profiles') : null;

    const business = await createBusiness({
      shop_name,
      phone,
      email: normalizedEmail,
      gst_number: normalizedGst,
      city,
      latitude: latitude ? parseFloat(latitude) : null,
      longitude: longitude ? parseFloat(longitude) : null,
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
      const { shop_name, phone, email, gst_number, city, latitude, longitude, password, description } = req.body;
      const normalizedEmail = typeof email === 'string' && email.trim() ? email.trim().toLowerCase() : null;
      const normalizedGst = typeof gst_number === 'string' && gst_number.trim() ? gst_number.trim() : null;
      const demoBusiness = await registerDemoBusiness({
        shop_name,
        phone,
        email: normalizedEmail,
        gst_number: normalizedGst,
        city,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        password: password || crypto.randomUUID(),
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

function normalizeIdentifier(value) {
  const normalized = String(value || '').trim();
  return normalized.includes('@') ? normalized.toLowerCase() : normalized;
}

function buildOtpChallengeKey(identifier) {
  return normalizeIdentifier(identifier);
}

function inferOtpChannel(identifier) {
  return normalizeIdentifier(identifier).includes('@') ? 'email' : 'sms';
}

async function resolveBusinessForIdentifier(identifier) {
  const normalized = normalizeIdentifier(identifier);
  if (!normalized) return null;

  let business = normalized.includes('@')
    ? await getBusinessByEmail(normalized)
    : await getBusinessByPhone(normalized);

  if (!business) {
    business = await getBusinessByPhoneOrEmail(normalized);
  }

  if (business) return buildPublicBusiness(business);

  if (!ALLOW_DEMO_AUTH) {
    return null;
  }

  const demoBusiness = demoBusinesses.get(normalized);
  if (!demoBusiness) return null;
  return buildPublicBusiness(demoBusiness);
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

function hashOtp(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function generateOtp() {
  return String(crypto.randomInt(100000, 999999));
}

async function requestLoginOtp(req, res, next) {
  try {
    const identifierInput = req.body.identifier || req.body.phone || req.body.email;
    const identifier = normalizeIdentifier(identifierInput);
    const business = await resolveBusinessForIdentifier(identifier);
    if (!business) {
      return res.status(404).json({ error: 'No account found for this phone/email' });
    }

    const normalizedChannel = inferOtpChannel(identifier);


    // In Firebase phone-auth mode, SMS OTP is handled fully on the client.
    if (normalizedChannel === 'sms' && USE_FIREBASE_PHONE_AUTH) {
      return res.json({
        message: 'Phone verification is handled by Firebase. Complete Firebase phone OTP on client and call /api/auth/login/firebase with idToken.',
        method: 'firebase_phone_auth',
        endpoint: '/api/auth/login/firebase',
      });
    }

    const otpTargetPhone = normalizedChannel === 'sms' ? identifier : (business.phone || null);
    const otpTargetEmail = normalizedChannel === 'email' ? identifier : (business.email || null);
    const challengeKey = buildOtpChallengeKey(identifier);

    const otp = generateOtp();
    const otpHash = hashOtp(otp);
    otpChallenges.set(challengeKey, {
      otpHash,
      business,
      channel: normalizedChannel,
      identifier,
      expiresAt: Date.now() + OTP_TTL_MS,
      failedAttempts: 0,
    });

    try {
      await deliverOtp({ channel: normalizedChannel, phone: otpTargetPhone, email: otpTargetEmail, otp });
    } catch (deliveryError) {
      if (!OTP_DEBUG_MODE) {
        otpChallenges.delete(challengeKey);
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
    const identifierInput = req.body.identifier || req.body.phone || req.body.email;
    const challengeKey = buildOtpChallengeKey(identifierInput);
    const { otp } = req.body;
    const challenge = otpChallenges.get(challengeKey);
    if (!challenge) {
      return res.status(400).json({ error: 'No OTP challenge found. Request OTP first.' });
    }

    if (Date.now() > challenge.expiresAt) {
      otpChallenges.delete(challengeKey);
      return res.status(400).json({ error: 'OTP expired. Request a new OTP.' });
    }

    if (challenge.failedAttempts >= OTP_MAX_ATTEMPTS) {
      otpChallenges.delete(challengeKey);
      return res.status(429).json({ error: 'Too many invalid OTP attempts. Request a new OTP.' });
    }

    if (hashOtp(String(otp)) !== challenge.otpHash) {
      challenge.failedAttempts += 1;
      return res.status(401).json({ error: 'Invalid OTP' });
    }

    otpChallenges.delete(challengeKey);
    const token = buildToken(challenge.business);
    return res.json({ business: challenge.business, token });
  } catch (error) {
    next(error);
  }
}

async function googleLogin(req, res, next) {
  try {
    if (!GOOGLE_CLIENT_ID) {
      return res.status(503).json({ error: 'Google login is not configured on the server.' });
    }

    let OAuth2Client;
    try {
      ({ OAuth2Client } = require('google-auth-library'));
    } catch (dependencyError) {
      return res.status(503).json({ error: 'Google login dependency is not installed on the server.' });
    }

    const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ error: 'Google credential is required.' });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const email = payload && payload.email ? payload.email.toLowerCase() : null;

    if (!email || payload.email_verified === false) {
      return res.status(401).json({ error: 'Google account email is not verified.' });
    }

    const business = await getBusinessByEmail(email);
    if (!business) {
      return res.status(404).json({ error: 'No Marketplace account linked to this Google email. Register first.' });
    }

    const token = buildToken(business);
    return res.json({ business: buildPublicBusiness(business), token });
  } catch (error) {
    next(error);
  }
}

module.exports = { register, login, requestLoginOtp, verifyLoginOtp, googleLogin };

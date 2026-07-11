import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import * as jwt from 'jsonwebtoken';
import * as bcryptjs from 'bcryptjs';
import argon2 from 'argon2';
import nodemailer from 'nodemailer';
import * as functions from 'firebase-functions';
import crypto from 'crypto';

const jwtClient = jwt.default || jwt;
const bcrypt = bcryptjs.default || bcryptjs;

const runtimeConfig = (() => {
  try {
    return functions.config() || {};
  } catch {
    return {};
  }
})();

const authConfig = runtimeConfig.auth || {};
const smtpConfig = runtimeConfig.smtp || {};
const twilioConfig = runtimeConfig.twilio || {};

const JWT_SECRET = process.env.JWT_SECRET || authConfig.jwt_secret || '';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || authConfig.google_client_id || '';
const ACCESS_TOKEN_TTL = process.env.ACCESS_TOKEN_TTL || '15m';
const REFRESH_TOKEN_TTL_MS = Number(process.env.REFRESH_TOKEN_TTL_MS || 7 * 24 * 60 * 60 * 1000);
const OTP_DEBUG_MODE = process.env.OTP_DEBUG_MODE === 'true';
const USE_FIREBASE_PHONE_AUTH = process.env.USE_FIREBASE_PHONE_AUTH !== 'false';
const SMTP_HOST = process.env.SMTP_HOST || smtpConfig.host || '';
const SMTP_PORT = Number(process.env.SMTP_PORT || smtpConfig.port || 587);
const SMTP_USER = process.env.SMTP_USER || smtpConfig.user || '';
const SMTP_PASS = process.env.SMTP_PASS || smtpConfig.pass || '';
const SMTP_FROM = process.env.SMTP_FROM || smtpConfig.from || SMTP_USER;
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || twilioConfig.sid || '';
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || twilioConfig.token || '';
const TWILIO_FROM_PHONE = process.env.TWILIO_FROM_PHONE || twilioConfig.from || '';

// Lazy initialize database
function getDb() {
  return getFirestore();
}

/**
 * Get Firebase Auth client
 */
export async function getFirebaseAuthClient() {
  return getAuth();
}

/**
 * Build phone candidates for lookup
 */
export function normalizePhoneNumber(phoneNumber) {
  if (!phoneNumber || typeof phoneNumber !== 'string') return '';

  let normalized = phoneNumber.trim().replace(/[\s-.()]/g, '');
  if (normalized.startsWith('00')) {
    normalized = `+${normalized.slice(2)}`;
  }

  if (normalized.startsWith('+')) {
    return normalized;
  }

  if (normalized.startsWith('0')) {
    return normalized.slice(1);
  }

  return normalized;
}

export function buildPhoneCandidates(phoneNumber) {
  const normalized = normalizePhoneNumber(phoneNumber);
  if (!normalized) return [];

  const candidates = new Set([normalized]);
  const plain = normalized.startsWith('+') ? normalized.slice(1) : normalized;

  if (plain) {
    candidates.add(plain);
    if (plain.startsWith('91')) {
      candidates.add(plain.slice(2));
      candidates.add(`+${plain}`);
    }
    if (plain.length === 10) {
      candidates.add(`+91${plain}`);
      candidates.add(`0${plain}`);
    }
  }

  return Array.from(candidates).filter(Boolean);
}

/**
 * Get business by phone
 */
export async function getBusinessByPhone(phoneNumber) {
  const db = getDb();
  const businessesRef = db.collection('businesses');
  const snapshot = await businessesRef
    .where('phone', '==', phoneNumber)
    .limit(1)
    .get();
  
  if (snapshot.empty) return null;
  
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() };
}

/**
 * Get business by email
 */
export async function getBusinessByEmail(email) {
  const db = getDb();
  const businessesRef = db.collection('businesses');
  const snapshot = await businessesRef
    .where('email', '==', email.toLowerCase())
    .limit(1)
    .get();
  
  if (snapshot.empty) return null;
  
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() };
}

function buildGoogleShopName(payload, email) {
  const profileName = payload && typeof payload.name === 'string' ? payload.name.trim() : '';
  if (profileName) return profileName;
  return email.split('@')[0] || 'Google User';
}

async function findOrCreateGoogleBusiness(payload, email) {
  const existing = await getBusinessByEmail(email);
  if (existing) return existing;

  const db = getDb();
  const businessData = {
    shop_name: buildGoogleShopName(payload, email),
    phone: null,
    email,
    password_hash: null,
    auth_provider: 'google',
    google_sub: payload.sub || null,
    profile_image_url: payload.picture || null,
    created_at: FieldValue.serverTimestamp(),
    updated_at: FieldValue.serverTimestamp(),
  };

  const businessRef = await db.collection('businesses').add(businessData);
  return { id: businessRef.id, ...businessData };
}

/**
 * Build JWT token for business
 */
export function buildToken(business) {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured securely');
  }

  const jti = crypto.randomUUID();
  return jwtClient.sign(
    {
      id: business.id,
      businessId: business.id,
      shop_name: business.shop_name,
      shopName: business.shop_name,
      phone: business.phone,
      email: business.email,
      city: business.city,
      gst_number: business.gst_number,
      jti,
      nonce: crypto.randomUUID(),
    },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_TTL }
  );
}

function hashRefreshToken(token) {
  return crypto.createHash('sha256').update(String(token || '')).digest('hex');
}

async function issueTokenPair(business, req, rotatedFrom = null) {
  const db = getDb();
  const accessToken = buildToken(business);
  const refreshToken = crypto.randomBytes(48).toString('hex');
  const tokenHash = hashRefreshToken(refreshToken);
  const now = Date.now();
  const expiresAt = now + REFRESH_TOKEN_TTL_MS;

  await db.collection('authRefreshTokens').add({
    business_id: business.id,
    token_hash: tokenHash,
    issued_at_ms: now,
    expires_at_ms: expiresAt,
    revoked: false,
    rotated_from: rotatedFrom || null,
    user_agent: String(req.headers['user-agent'] || '').slice(0, 200),
    ip: String(req.ip || '').slice(0, 80),
    created_at: FieldValue.serverTimestamp(),
  });

  return {
    token: accessToken,
    refreshToken,
    accessTokenTtl: ACCESS_TOKEN_TTL,
    refreshTokenExpiresAt: new Date(expiresAt).toISOString(),
  };
}

async function rotateRefreshToken(refreshToken, req) {
  const db = getDb();
  const tokenHash = hashRefreshToken(refreshToken);
  const snapshot = await db
    .collection('authRefreshTokens')
    .where('token_hash', '==', tokenHash)
    .where('revoked', '==', false)
    .limit(1)
    .get();

  if (snapshot.empty) {
    throw new Error('Refresh token is invalid or already rotated.');
  }

  const tokenDoc = snapshot.docs[0];
  const tokenData = tokenDoc.data() || {};
  if (Date.now() > Number(tokenData.expires_at_ms || 0)) {
    await tokenDoc.ref.set({ revoked: true, revoked_reason: 'expired', revoked_at: FieldValue.serverTimestamp() }, { merge: true });
    throw new Error('Refresh token expired.');
  }

  const businessRef = db.collection('businesses').doc(String(tokenData.business_id || ''));
  const businessDoc = await businessRef.get();
  if (!businessDoc.exists) {
    await tokenDoc.ref.set({ revoked: true, revoked_reason: 'orphaned_business', revoked_at: FieldValue.serverTimestamp() }, { merge: true });
    throw new Error('Business account not found for refresh token.');
  }

  const business = { id: businessDoc.id, ...businessDoc.data() };
  const nextPair = await issueTokenPair(business, req, tokenDoc.id);

  await tokenDoc.ref.set({
    revoked: true,
    revoked_reason: 'rotated',
    revoked_at: FieldValue.serverTimestamp(),
  }, { merge: true });

  return {
    business: buildPublicBusiness(business),
    ...nextPair,
  };
}

/**
 * Build public business object (without sensitive data)
 */
export function buildPublicBusiness(business) {
  const { password_hash, ...publicData } = business;
  return publicData;
}

const OTP_TTL_MS = Number(process.env.OTP_TTL_MS || 5 * 60 * 1000);

export function normalizeIdentifier(identifier) {
  if (!identifier || typeof identifier !== 'string') return '';
  const trimmed = identifier.trim();
  if (trimmed.includes('@')) {
    return trimmed.toLowerCase();
  }
  return normalizePhoneNumber(trimmed);
}

export async function resolveBusinessForIdentifier(identifier) {
  const normalized = normalizeIdentifier(identifier);
  if (!normalized) return null;

  const looksLikeEmail = normalized.includes('@');
  if (looksLikeEmail) {
    return getBusinessByEmail(normalized.toLowerCase());
  }

  const candidates = buildPhoneCandidates(normalized);
  for (const candidate of candidates) {
    const business = await getBusinessByPhone(candidate);
    if (business) return business;
  }

  return null;
}

function buildOtpDocId(business) {
  return `otp_${business.id}`;
}

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function sendEmailOtp(email, otp) {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !SMTP_FROM) {
    throw new Error('Email OTP delivery is not configured');
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  await transporter.sendMail({
    from: SMTP_FROM,
    to: email,
    subject: 'Marketplace Premium Login OTP',
    text: `Your Marketplace Premium OTP is ${otp}. It expires in 5 minutes.`,
  });
}

async function sendSmsOtp(phone, otp) {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_PHONE) {
    throw new Error('SMS OTP delivery is not configured');
  }

  const body = new URLSearchParams({
    To: phone,
    From: TWILIO_FROM_PHONE,
    Body: `Your Marketplace Premium OTP is ${otp}. It expires in 5 minutes.`,
  });

  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`SMS OTP send failed: ${message}`);
  }
}

async function deliverOtp(channel, email, phone, otp) {
  if (channel === 'email') {
    return sendEmailOtp(email, otp);
  }
  if (channel === 'sms') {
    return sendSmsOtp(phone, otp);
  }
  throw new Error('Unsupported OTP channel');
}

async function saveOtpRecord(business, otp, expiresAt) {
  const db = getDb();
  const ref = db.collection('authOtps').doc(buildOtpDocId(business));
  await ref.set({
    business_id: business.id,
    otp,
    expiresAt,
    created_at: FieldValue.serverTimestamp(),
  });
}

async function getOtpRecord(business) {
  const db = getDb();
  const ref = db.collection('authOtps').doc(buildOtpDocId(business));
  const doc = await ref.get();
  if (!doc.exists) return null;
  return doc.data();
}

async function deleteOtpRecord(business) {
  const db = getDb();
  const ref = db.collection('authOtps').doc(buildOtpDocId(business));
  await ref.delete();
}

/**
 * Hash password
 */
export async function hashPassword(password) {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
}

/**
 * Verify password
 */
export async function verifyPassword(password, hash) {
  if (typeof hash === 'string' && hash.startsWith('$argon2')) {
    return argon2.verify(hash, password);
  }
  // Legacy compatibility for previously stored bcrypt hashes.
  return bcrypt.compare(password, hash);
}

/**
 * Check if an account exists by phone or email
 */
export async function accountExists(req, res, next) {
  try {
    const { identifier, email, phone } = req.body;
    const rawIdentifier = String(identifier || email || phone || '').trim();

    if (!rawIdentifier) {
      return res.status(400).json({ error: 'Phone or email is required' });
    }

    const looksLikeEmail = rawIdentifier.includes('@');
    let business = null;

    if (looksLikeEmail) {
      business = await getBusinessByEmail(rawIdentifier);
    } else {
      const candidates = buildPhoneCandidates(rawIdentifier);
      for (const candidate of candidates) {
        business = await getBusinessByPhone(candidate);
        if (business) break;
      }
    }

    return res.json({ exists: Boolean(business) });
  } catch (error) {
    next(error);
  }
}

/**
 * Firebase login - Verify Firebase token and create JWT
 */
export async function firebaseLogin(req, res, next) {
  try {
    const { idToken } = req.body;
    
    if (!idToken) {
      return res.status(400).json({ error: 'ID token required' });
    }
    
    const firebaseAuth = await getFirebaseAuthClient();
    const decodedToken = await firebaseAuth.verifyIdToken(idToken, true);
    const phoneNumber = decodedToken.phone_number;
    
    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number not found in Firebase token' });
    }
    
    const candidates = buildPhoneCandidates(phoneNumber);
    let business = null;
    
    for (const candidate of candidates) {
      business = await getBusinessByPhone(candidate);
      if (business) break;
    }
    
    if (!business) {
      return res.status(404).json({ 
        error: 'No Marketplace account linked to this Firebase phone number. Register first.' 
      });
    }
    
    const tokenPair = await issueTokenPair(business, req);
    return res.json({ business: buildPublicBusiness(business), ...tokenPair });
  } catch (error) {
    if (error && error.code && String(error.code).startsWith('auth/')) {
      return res.status(401).json({ error: 'Invalid or expired Firebase token.' });
    }
    next(error);
  }
}

/**
 * Standard login - Phone / Email + OTP
 */
export async function requestOtp(req, res, next) {
  try {
    const { identifier } = req.body;
    const normalizedIdentifier = normalizeIdentifier(identifier);

    if (!normalizedIdentifier) {
      return res.status(400).json({ error: 'Phone or email is required' });
    }

    const isEmail = normalizedIdentifier.includes('@');
    const channel = isEmail ? 'email' : 'sms';

    // In Firebase phone-auth mode, SMS OTP is handled fully on the client.
    // Return guidance immediately so this endpoint is no longer required for phone login.
    if (channel === 'sms' && USE_FIREBASE_PHONE_AUTH) {
      return res.json({
        message: 'Phone verification is handled by Firebase. Complete Firebase phone OTP on client and call /api/auth/login/firebase with idToken.',
        method: 'firebase_phone_auth',
        endpoint: '/api/auth/login/firebase',
      });
    }

    const business = await resolveBusinessForIdentifier(normalizedIdentifier);
    if (!business) {
      return res.status(404).json({
        error: 'No Marketplace account linked to this phone or email. Register first.',
      });
    }

    if (channel === 'email' && !business.email) {
      return res.status(400).json({ error: 'This account has no email on record for OTP login.' });
    }

    if (channel === 'sms' && !business.phone) {
      return res.status(400).json({ error: 'This account has no phone number on record for OTP login.' });
    }

    const otp = OTP_DEBUG_MODE ? '123456' : generateOtp();
    const expiresAt = Date.now() + OTP_TTL_MS;
    await saveOtpRecord(business, otp, expiresAt);

    if (OTP_DEBUG_MODE) {
      console.log(`OTP for ${normalizedIdentifier}: ${otp}`);
    }

    if (!OTP_DEBUG_MODE) {
      try {
        await deliverOtp(channel, business.email, business.phone, otp);
      } catch (deliveryError) {
        console.error('OTP delivery failed', { identifier: normalizedIdentifier, channel, error: deliveryError.message });
        await deleteOtpRecord(business);
        return next(deliveryError);
      }
    }

    return res.json({
      message: 'OTP sent',
      otp: OTP_DEBUG_MODE ? otp : undefined,
    });
  } catch (error) {
    console.error('requestOtp failed', { identifier: req.body.identifier, error: error.message });
    next(error);
  }
}

/**
 * Verify OTP and return business + token
 */
export async function verifyOtp(req, res, next) {
  try {
    const { identifier, otp } = req.body;
    const normalizedIdentifier = normalizeIdentifier(identifier);

    if (!normalizedIdentifier || !otp) {
      return res.status(400).json({ error: 'Phone/email and OTP are required' });
    }

    const business = await resolveBusinessForIdentifier(normalizedIdentifier);
    if (!business) {
      return res.status(404).json({
        error: 'No Marketplace account linked to this phone or email. Register first.',
      });
    }

    const stored = await getOtpRecord(business);
    if (!stored) {
      return res.status(400).json({ error: 'No OTP request found. Request a fresh OTP.' });
    }

    if (Date.now() > stored.expiresAt) {
      await deleteOtpRecord(business);
      return res.status(400).json({ error: 'OTP expired. Please request a new code.' });
    }

    if (stored.otp !== otp) {
      const errorMessage = 'Invalid OTP. Please enter the correct code.';
      console.warn('OTP verification failed', { identifier: normalizedIdentifier, error: errorMessage });
      return res.status(401).json({ error: errorMessage });
    }

    await deleteOtpRecord(business);

    const tokenPair = await issueTokenPair(business, req);
    return res.json({ business: buildPublicBusiness(business), ...tokenPair });
  } catch (error) {
    console.error('verifyOtp failed', { identifier: req.body.identifier, error: error.message });
    next(error);
  }
}

/**
 * Email/Password signup
 */
export async function signup(req, res, next) {
  try {
    const db = getDb();
    const shopName = normalizeIdentifier(req.body.shopName || req.body.shop_name);
    const phone = normalizeIdentifier(req.body.phone);
    const email = normalizeIdentifier(req.body.email).toLowerCase() || null;
    const password = req.body.password;
    const gst_number = normalizeIdentifier(req.body.gst_number);
    const city = normalizeIdentifier(req.body.city);

    if (!shopName || !phone) {
      return res.status(400).json({ error: 'Shop name and phone are required.' });
    }

    // Check if business exists
    const existing = await getBusinessByPhone(phone);
    if (existing) {
      return res.status(400).json({ error: 'Business already registered with this phone' });
    }

    const businessData = {
      shop_name: shopName,
      phone,
      email: email || null,
      gst_number: gst_number || null,
      city: city || null,
      password_hash: null,
      created_at: FieldValue.serverTimestamp(),
    };

    if (password) {
      businessData.password_hash = await hashPassword(password);
    }

    const businessRef = await db.collection('businesses').add(businessData);
    const business = {
      id: businessRef.id,
      shop_name: shopName,
      phone,
      email,
      gst_number: businessData.gst_number,
      city: businessData.city,
    };

    const tokenPair = await issueTokenPair(business, req);
    return res.status(201).json({ business, ...tokenPair });
  } catch (error) {
    next(error);
  }
}

/**
 * Email/Password login
 */
export async function login(req, res, next) {
  try {
    const { identifier, email, phone, password } = req.body;
    const rawIdentifier = String(identifier || email || phone || '').trim();
    
    if (!rawIdentifier || !password) {
      return res.status(400).json({ error: 'Email/phone and password required' });
    }

    const looksLikeEmail = rawIdentifier.includes('@');
    let business = null;

    if (looksLikeEmail) {
      business = await getBusinessByEmail(rawIdentifier);
    } else {
      const candidates = buildPhoneCandidates(rawIdentifier);
      for (const candidate of candidates) {
        business = await getBusinessByPhone(candidate);
        if (business) break;
      }
    }
    
    if (!business) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const isMatch = await verifyPassword(password, business.password_hash);
    
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const tokenPair = await issueTokenPair(business, req);
    return res.json({ business: buildPublicBusiness(business), ...tokenPair });
  } catch (error) {
    next(error);
  }
}

/**
 * Google login - Verify Google credential and create JWT
 */
export async function googleLogin(req, res, next) {
  try {
    if (!GOOGLE_CLIENT_ID) {
      return res.status(503).json({ error: 'Google login is not configured on the server.' });
    }

    const { OAuth2Client } = await import('google-auth-library');
    const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ error: 'Google credential is required.' });
    }

    let ticket;
    try {
      ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: GOOGLE_CLIENT_ID,
      });
    } catch (verifyError) {
      return res.status(401).json({ error: 'Invalid or expired Google credential.' });
    }

    const payload = ticket.getPayload();
    const email = payload && payload.email ? payload.email.toLowerCase() : null;

    if (!email || payload.email_verified === false) {
      return res.status(401).json({ error: 'Google account email is not verified.' });
    }

    const business = await findOrCreateGoogleBusiness(payload, email);

    const tokenPair = await issueTokenPair(business, req);
    return res.json({ business: buildPublicBusiness(business), ...tokenPair });
  } catch (error) {
    next(error);
  }
}

export async function refreshSession(req, res, next) {
  try {
    const refreshToken = String(req.body?.refreshToken || '').trim();
    if (!refreshToken) {
      return res.status(400).json({ error: 'refreshToken is required.' });
    }

    const rotated = await rotateRefreshToken(refreshToken, req);
    return res.json(rotated);
  } catch (error) {
    return res.status(401).json({ error: error.message || 'Unable to refresh session.' });
  }
}

/**
 * Return Google client configuration for frontend initialization
 */
export async function googleClientConfig(req, res) {
  res.json({ clientId: GOOGLE_CLIENT_ID });
}

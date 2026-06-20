import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import * as jwt from 'jsonwebtoken';
import * as bcryptjs from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';

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
export function buildPhoneCandidates(phoneNumber) {
  if (!phoneNumber) return [];
  
  const candidates = [phoneNumber];
  
  // Remove country code variations
  if (phoneNumber.startsWith('+')) {
    candidates.push(phoneNumber.slice(1));
    candidates.push(phoneNumber.slice(3));
  }
  
  return candidates;
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

/**
 * Build JWT token for business
 */
export function buildToken(business) {
  return jwt.sign(
    {
      businessId: business.id,
      shopName: business.shop_name,
      phone: business.phone,
      email: business.email,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

/**
 * Build public business object (without sensitive data)
 */
export function buildPublicBusiness(business) {
  const { password_hash, ...publicData } = business;
  return publicData;
}

/**
 * Hash password
 */
export async function hashPassword(password) {
  const salt = await bcryptjs.genSalt(10);
  return bcryptjs.hash(password, salt);
}

/**
 * Verify password
 */
export async function verifyPassword(password, hash) {
  return bcryptjs.compare(password, hash);
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
    
    const token = buildToken(business);
    return res.json({ business: buildPublicBusiness(business), token });
  } catch (error) {
    if (error && error.code && String(error.code).startsWith('auth/')) {
      return res.status(401).json({ error: 'Invalid or expired Firebase token.' });
    }
    next(error);
  }
}

/**
 * Standard login - Phone + OTP (existing Twilio flow)
 */
export async function requestOtp(req, res, next) {
  try {
    const { phone } = req.body;
    
    if (!phone) {
      return res.status(400).json({ error: 'Phone number required' });
    }
    
    // TODO: Implement OTP sending via SMS provider
    // For now, return mock OTP for testing
    const mockOtp = '123456';
    
    // Store in Redis or session for verification
    return res.json({ 
      message: 'OTP sent',
      _debug: process.env.OTP_DEBUG_MODE ? mockOtp : undefined 
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Verify OTP and return business + token
 */
export async function verifyOtp(req, res, next) {
  try {
    const { phone, otp } = req.body;
    
    if (!phone || !otp) {
      return res.status(400).json({ error: 'Phone and OTP required' });
    }
    
    // TODO: Verify OTP from Redis/session
    // For now, accept any OTP
    
    const business = await getBusinessByPhone(phone);
    
    if (!business) {
      return res.status(404).json({ 
        error: 'Business not found. Please register first.' 
      });
    }
    
    const token = buildToken(business);
    return res.json({ business: buildPublicBusiness(business), token });
  } catch (error) {
    next(error);
  }
}

/**
 * Email/Password signup
 */
export async function signup(req, res, next) {
  try {
    const db = getDb();
    const { shopName, phone, email, password } = req.body;
    
    if (!shopName || !phone || !password) {
      return res.status(400).json({ error: 'Shop name, phone, and password required' });
    }
    
    // Check if business exists
    const existing = await getBusinessByPhone(phone);
    if (existing) {
      return res.status(400).json({ error: 'Business already registered with this phone' });
    }
    
    // Hash password
    const password_hash = await hashPassword(password);
    
    // Create business in Firestore
    const businessRef = await db.collection('businesses').add({
      shop_name: shopName,
      phone,
      email: email?.toLowerCase() || null,
      password_hash,
      created_at: FieldValue.serverTimestamp(),
    });
    
    const business = { id: businessRef.id, shop_name: shopName, phone, email };
    const token = buildToken(business);
    
    return res.status(201).json({ business, token });
  } catch (error) {
    next(error);
  }
}

/**
 * Email/Password login
 */
export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    
    const business = await getBusinessByEmail(email);
    
    if (!business) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const isMatch = await verifyPassword(password, business.password_hash);
    
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = buildToken(business);
    return res.json({ business: buildPublicBusiness(business), token });
  } catch (error) {
    next(error);
  }
}

import * as jwt from 'jsonwebtoken';
import { getAuth } from 'firebase-admin/auth';

const jwtClient = jwt.default || jwt;

function resolveJwtSecret() {
  const secret = process.env.JWT_SECRET || '';
  if (secret) return secret;
  return '';
}

const JWT_SECRET = resolveJwtSecret();

/**
 * Map a Firebase Auth decoded token to the internal user shape.
 * businessId is derived from the UID — sellers are stored under uid in Firestore.
 */
function firebaseDecodedToUser(decoded) {
  return {
    id: decoded.uid,
    businessId: decoded.uid,
    email: decoded.email || '',
    shop_name: decoded.name || decoded.email || '',
    shopName: decoded.name || decoded.email || '',
    phone: decoded.phone_number || '',
    city: '',
    gst_number: '',
    role: 'seller',
    firebase: true
  };
}

/**
 * Verify JWT token or Firebase ID token and set req.user.
 * Priority:
 *   1. Firebase ID token (issued by Firebase Auth — used by the Next.js frontend)
 *   2. Legacy JWT (issued by /api/auth/login OTP flow)
 *   3. Demo mock user (dev only)
 */
export async function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const isDev = (process.env.NODE_ENV || 'development') === 'development';
  const isDemoEnabled = process.env.DEMO_MODE === 'true' && isDev;

  const mockUser = {
    id: 'seller-demo-01',
    businessId: 'seller-demo-01',
    shop_name: 'Northline Industrial Supply',
    shopName: 'Northline Industrial Supply',
    phone: '919876543210',
    email: 'partner@dealerconnect.in',
    city: 'Lucknow',
    gst_number: '27AAAAA1111A1Z1',
    role: 'seller'
  };

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    if (isDemoEnabled) {
      req.user = mockUser;
      return next();
    }
    return res.status(401).json({ error: 'Authentication required.' });
  }

  const token = authHeader.slice(7);
  if (!token || token === 'undefined') {
    if (isDemoEnabled) {
      req.user = mockUser;
      return next();
    }
    return res.status(401).json({ error: 'Authentication required.' });
  }

  // In dev mode with mock-token, allow through only if demo mode is enabled
  if (token === 'mock-token' && isDemoEnabled) {
    req.user = mockUser;
    return next();
  }

  // --- Strategy 1: Firebase ID token (from Firebase Auth / Google Sign-In) ---
  // Firebase ID tokens are JWTs with iss = accounts.google.com or securetoken.google.com
  try {
    const decoded = await getAuth().verifyIdToken(token);
    req.user = firebaseDecodedToUser(decoded);
    return next();
  } catch (firebaseErr) {
    // Not a Firebase token — fall through to legacy JWT
  }

  // --- Strategy 2: Legacy JWT (issued by /api/auth/login) ---
  if (!JWT_SECRET) {
    if (isDemoEnabled) {
      req.user = mockUser;
      return next();
    }
    return res.status(500).json({ error: 'Server authentication configuration error.' });
  }

  try {
    req.user = jwtClient.verify(token, JWT_SECRET);
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired authentication token.' });
  }
}

/**
 * Optional: Make token verification optional (for public endpoints)
 */
export function verifyTokenOptional(req, res, next) {
  if (!JWT_SECRET) return next();

  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      req.user = jwtClient.verify(token, JWT_SECRET);
    } catch (error) {
      // Token is invalid but optional, so continue without user
    }
  }
  
  next();
}

export function requireUserContext(req, res, next) {
  if (!req.user || !req.user.businessId) {
    return res.status(403).json({ error: 'For your security, this action requires additional access.' });
  }
  return next();
}

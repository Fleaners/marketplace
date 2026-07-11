import * as jwt from 'jsonwebtoken';

const jwtClient = jwt.default || jwt;

function resolveJwtSecret() {
  const secret = process.env.JWT_SECRET || '';
  if (secret) return secret;
  return '';
}

const JWT_SECRET = resolveJwtSecret();

/**
 * Verify JWT token and set req.user
 */
export function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const isDev = (process.env.NODE_ENV || 'development') === 'development';

  const mockUser = {
    id: 'seller-demo-01',
    businessId: 'seller-demo-01',
    shop_name: 'Northline Industrial Supply',
    shopName: 'Northline Industrial Supply',
    phone: '919876543210',
    email: 'partner@dealerconnect.in',
    city: 'Lucknow',
    gst_number: '27AAAAA1111A1Z1',
  };

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    if (isDev) {
      req.user = mockUser;
      return next();
    }
    return res.status(401).json({ error: 'Authentication required.' });
  }

  const token = authHeader.slice(7);
  if (!token || token === 'undefined') {
    if (isDev) {
      req.user = mockUser;
      return next();
    }
    return res.status(401).json({ error: 'Authentication required.' });
  }

  // In dev mode with mock-token, allow through
  if (token === 'mock-token' && isDev) {
    req.user = mockUser;
    return next();
  }

  if (!JWT_SECRET) {
    if (isDev) {
      req.user = mockUser;
      return next();
    }
    return res.status(500).json({ error: 'Server authentication configuration error.' });
  }

  try {
    req.user = jwtClient.verify(token, JWT_SECRET);
    next();
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

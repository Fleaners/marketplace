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
  if (!JWT_SECRET) {
    return res.status(503).json({ error: 'Authentication service is not configured securely.' });
  }

  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'For your security, please sign in again.' });
  }

  const token = authHeader.slice(7);
  
  try {
    req.user = jwtClient.verify(token, JWT_SECRET);
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Your session expired. Please sign in again.' });
    }
    return res.status(401).json({ error: 'For your security, please sign in again.' });
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

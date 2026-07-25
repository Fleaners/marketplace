const crypto = require('crypto');

const MAX_CLOCK_DRIFT_MS = Number(process.env.MAX_CLOCK_DRIFT_MS || 5 * 60 * 1000);
const NONCE_TTL_MS = Number(process.env.NONCE_TTL_MS || 10 * 60 * 1000);
const MAX_BODY_STRING_LENGTH = Number(process.env.MAX_BODY_STRING_LENGTH || 5000);
const MAX_BODY_DEPTH = Number(process.env.MAX_BODY_DEPTH || 8);
const ENFORCE_REPLAY_HEADERS = process.env.ENFORCE_REPLAY_HEADERS !== 'false';

const replayNonceStore = new Map();

function purgeExpiredNonces(now = Date.now()) {
  for (const [nonce, expiresAt] of replayNonceStore.entries()) {
    if (expiresAt <= now) replayNonceStore.delete(nonce);
  }
}

function buildAllowedOrigins() {
  return (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function requestIdMiddleware(req, res, next) {
  const incomingId = String(req.headers['x-request-id'] || '').trim();
  const requestId = incomingId || crypto.randomUUID();
  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
}

function shouldInspectBody(req) {
  const contentType = String(req.headers['content-type'] || '').toLowerCase();
  return contentType.includes('application/json') || contentType.includes('application/x-www-form-urlencoded');
}

function scanUnsafePayload(value, depth = 0) {
  if (depth > MAX_BODY_DEPTH) {
    return { ok: false, reason: 'Payload depth limit exceeded' };
  }

  if (value === null || value === undefined) {
    return { ok: true };
  }

  if (typeof value === 'string') {
    if (value.length > MAX_BODY_STRING_LENGTH) {
      return { ok: false, reason: 'Input length exceeds secure limit' };
    }
    return { ok: true };
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const child = scanUnsafePayload(item, depth + 1);
      if (!child.ok) return child;
    }
    return { ok: true };
  }

  if (typeof value === 'object') {
    for (const [key, childValue] of Object.entries(value)) {
      const normalizedKey = String(key || '').toLowerCase();
      if (
        normalizedKey.startsWith('$') ||
        normalizedKey.includes('.') ||
        normalizedKey === '__proto__' ||
        normalizedKey === 'constructor' ||
        normalizedKey === 'prototype' ||
        normalizedKey === '$where' ||
        normalizedKey === '$regex' ||
        normalizedKey === '$gt' ||
        normalizedKey === '$ne' ||
        normalizedKey === '$or' ||
        normalizedKey === '$and'
      ) {
        return { ok: false, reason: `Blocked unsafe field: ${key}` };
      }

      const child = scanUnsafePayload(childValue, depth + 1);
      if (!child.ok) return child;
    }
    return { ok: true };
  }

  return { ok: true };
}

function sanitizeInputMiddleware(req, res, next) {
  if (!shouldInspectBody(req)) return next();

  const bodyStatus = scanUnsafePayload(req.body);
  if (!bodyStatus.ok) {
    return res.status(400).json({ error: bodyStatus.reason });
  }

  const queryStatus = scanUnsafePayload(req.query);
  if (!queryStatus.ok) {
    return res.status(400).json({ error: queryStatus.reason });
  }

  return next();
}

function replayProtectionMiddleware(req, res, next) {
  const method = String(req.method || 'GET').toUpperCase();
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return next();

  if (!ENFORCE_REPLAY_HEADERS) return next();

  const path = String(req.path || '');
  const hasAuthHeader = Boolean(String(req.headers.authorization || '').trim());
  const sensitivePath = path.startsWith('/api/auth') || path.startsWith('/api/messages') || path.startsWith('/api/products') || path.startsWith('/api/invoices');
  if (!hasAuthHeader && !sensitivePath) return next();

  const timestamp = String(req.headers['x-timestamp'] || '').trim();
  const nonce = String(req.headers['x-nonce'] || '').trim();

  if (!timestamp || !nonce) {
    return res.status(400).json({ error: 'Missing replay-protection headers.' });
  }

  const parsedTs = Number(timestamp);
  if (!Number.isFinite(parsedTs)) {
    return res.status(400).json({ error: 'Invalid X-Timestamp header.' });
  }

  const now = Date.now();
  if (Math.abs(now - parsedTs) > MAX_CLOCK_DRIFT_MS) {
    return res.status(401).json({ error: 'Request timestamp is outside the allowed security window.' });
  }

  purgeExpiredNonces(now);
  if (replayNonceStore.has(nonce)) {
    return res.status(409).json({ error: 'Duplicate request nonce rejected.' });
  }

  replayNonceStore.set(nonce, now + NONCE_TTL_MS);
  return next();
}

function originValidationMiddleware(req, res, next) {
  const method = String(req.method || 'GET').toUpperCase();
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return next();

  const allowedOrigins = buildAllowedOrigins();
  if (!allowedOrigins.length) return next();

  const origin = String(req.headers.origin || '').trim();
  if (!origin) return next();
  if (allowedOrigins.includes(origin)) return next();

  return res.status(403).json({ error: 'Origin is not allowed for this action.' });
}

function uploadSecurityMiddleware(req, res, next) {
  const contentType = String(req.headers['content-type'] || '').toLowerCase();
  if (!contentType.includes('multipart/form-data')) return next();

  const allowedMime = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
  ]);

  const hintedMime = String(req.headers['x-upload-mime'] || '').toLowerCase().trim();
  if (hintedMime && !allowedMime.has(hintedMime)) {
    return res.status(415).json({ error: 'Unsupported upload type.' });
  }

  const deniedExt = ['.exe', '.js', '.php', '.bat', '.sh'];
  const fileName = String(req.headers['x-upload-filename'] || '').toLowerCase();
  if (deniedExt.some((ext) => fileName.endsWith(ext))) {
    return res.status(415).json({ error: 'Blocked upload extension.' });
  }

  return next();
}

function parseCookies(cookieHeader) {
  const result = {};
  String(cookieHeader || '')
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .forEach((cookie) => {
      const idx = cookie.indexOf('=');
      if (idx <= 0) return;
      const key = cookie.slice(0, idx).trim();
      const value = cookie.slice(idx + 1).trim();
      result[key] = value;
    });
  return result;
}

function csrfProtectionMiddleware(req, res, next) {
  const method = String(req.method || 'GET').toUpperCase();
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return next();

  const authHeader = String(req.headers.authorization || '').trim();
  if (authHeader.startsWith('Bearer ')) return next();

  const cookies = parseCookies(req.headers.cookie || '');
  const csrfCookie = String(cookies.csrf_token || '').trim();
  const csrfHeader = String(req.headers['x-csrf-token'] || '').trim();

  if (!csrfCookie && !csrfHeader) return next();
  if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
    return res.status(403).json({ error: 'CSRF validation failed.' });
  }

  return next();
}

function createRateLimitHandler(message) {
  return (_req, res) => {
    res.status(429).json({ error: message });
  };
}

function redactSecrets(data) {
  const fullRedactKeys = ['password', 'token', 'authorization', 'jwt', 'secret', 'otp', 'cookie', 'set-cookie',
    'bank_account', 'account_number', 'ifsc', 'aadhaar', 'card_number', 'cvv', 'pin',
    'api_key', 'apikey', 'private_key', 'refresh_token', 'access_token'];
  const partialRedactKeys = ['gst_number', 'gstin', 'pan', 'pan_number'];
  const phoneRedactKeys = ['phone', 'phone_number', 'mobile', 'from_phone'];
  const emailRedactKeys = ['email', 'smtp_user', 'smtp_from'];

  if (Array.isArray(data)) {
    return data.map((item) => redactSecrets(item));
  }
  if (data && typeof data === 'object') {
    return Object.entries(data).reduce((acc, [key, value]) => {
      const lower = key.toLowerCase();
      if (fullRedactKeys.some((k) => lower.includes(k))) {
        acc[key] = '[REDACTED]';
      } else if (partialRedactKeys.some((k) => lower === k || lower.includes(k))) {
        // Show last 4 characters for identification (e.g., ***********1Z5)
        const str = String(value || '');
        acc[key] = str.length > 4 ? '*'.repeat(str.length - 4) + str.slice(-4) : '[REDACTED]';
      } else if (phoneRedactKeys.some((k) => lower === k || lower.includes(k))) {
        const str = String(value || '');
        acc[key] = str.length > 4 ? '******' + str.slice(-4) : '[REDACTED]';
      } else if (emailRedactKeys.some((k) => lower === k || lower.includes(k))) {
        const str = String(value || '');
        const atIdx = str.indexOf('@');
        if (atIdx > 1) {
          acc[key] = str[0] + '***@' + str.slice(atIdx + 1);
        } else {
          acc[key] = '[REDACTED]';
        }
      } else {
        acc[key] = redactSecrets(value);
      }
      return acc;
    }, {});
  }
  return data;
}

function auditLogMiddleware(req, res, next) {
  const startedAt = Date.now();
  const originalJson = res.json.bind(res);

  res.json = (body) => {
    const payload = {
      timestamp: new Date().toISOString(),
      request_id: req.requestId || null,
      method: req.method,
      path: req.originalUrl || req.url,
      ip: req.ip,
      status: res.statusCode,
      duration_ms: Date.now() - startedAt,
      user_id: req.user?.businessId || req.user?.id || null,
      user_agent: String(req.headers['user-agent'] || '').slice(0, 200),
      body: redactSecrets(req.body || {}),
    };

    if (process.env.ENABLE_SECURITY_AUDIT_LOGS !== 'false') {
      console.log('[SECURITY_AUDIT]', JSON.stringify(payload));
    }

    return originalJson(body);
  };

  next();
}

module.exports = {
  requestIdMiddleware,
  sanitizeInputMiddleware,
  replayProtectionMiddleware,
  originValidationMiddleware,
  uploadSecurityMiddleware,
  csrfProtectionMiddleware,
  createRateLimitHandler,
  auditLogMiddleware,
};
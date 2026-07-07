const functions = require('firebase-functions/v1');
require('dotenv').config();
const { initializeApp } = require('firebase-admin/app');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const {
  requestIdMiddleware,
  sanitizeInputMiddleware,
  replayProtectionMiddleware,
  originValidationMiddleware,
  uploadSecurityMiddleware,
  csrfProtectionMiddleware,
  createRateLimitHandler,
  auditLogMiddleware,
} = require('./middleware/security.cjs');

initializeApp();

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      frameAncestors: ["'none'"],
      objectSrc: ["'none'"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", 'https://*.googleapis.com'],
      imgSrc: ["'self'", 'data:', 'https:'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https:'],
      fontSrc: ["'self'", 'https:', 'data:'],
      formAction: ["'self'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: { policy: 'require-corp' },
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  crossOriginResourcePolicy: { policy: 'same-origin' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));

app.use((req, res, next) => {
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), clipboard-read=(), clipboard-write=(self)');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  res.setHeader('Content-Security-Policy-Report-Only', "require-trusted-types-for 'script'; trusted-types default dompurify");
  next();
});

function deriveProjectIdFromHost(hostname) {
  const host = String(hostname || '').toLowerCase().trim();
  if (!host) return '';

  if (host.endsWith('.web.app')) {
    return host.replace('.web.app', '');
  }

  if (host.endsWith('.firebaseapp.com')) {
    return host.replace('.firebaseapp.com', '');
  }

  return '';
}

app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (!allowedOrigins.length) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origin not allowed by CORS policy'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 86400,
}));

const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.RATE_LIMIT_PER_MIN || 120),
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler('Too many requests. Please try again shortly.'),
});

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.AUTH_RATE_LIMIT_PER_MIN || 5),
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler('Too many authentication attempts. Please try again shortly.'),
});

const otpLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.OTP_RATE_LIMIT_PER_MIN || 3),
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler('Too many OTP attempts. Please wait before trying again.'),
});

const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.SEARCH_RATE_LIMIT_PER_MIN || 60),
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler('Search rate limit exceeded. Please slow down.'),
});

const messagesLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.MESSAGES_RATE_LIMIT_PER_MIN || 20),
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler('Messaging rate limit exceeded. Please retry shortly.'),
});

const productCreateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.PRODUCT_CREATE_RATE_LIMIT_PER_MIN || 10),
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler('Product creation rate limit exceeded.'),
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.UPLOAD_RATE_LIMIT_PER_MIN || 5),
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler('Upload rate limit exceeded.'),
});

app.use(globalLimiter);
app.use(requestIdMiddleware);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(auditLogMiddleware);
app.use(originValidationMiddleware);
app.use(csrfProtectionMiddleware);
app.use(replayProtectionMiddleware);
app.use(sanitizeInputMiddleware);
app.use(uploadSecurityMiddleware);

app.get('/api/status', (req, res) => {
  res.json({
    message: 'Marketplace Premium backend is running on Firebase',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production'
  });
});

// Import routes (CommonJS requires) and normalize ESM default exports
const _requireRoute = (p) => {
  const mod = require(p);
  return (mod && mod.default) ? mod.default : mod;
};

const authRoutes = _requireRoute('./routes/auth');
const businessRoutes = _requireRoute('./routes/business');
const productRoutes = _requireRoute('./routes/products');
const postRoutes = _requireRoute('./routes/posts');
const invoiceRoutes = _requireRoute('./routes/invoices');
const aiRoutes = _requireRoute('./routes/ai');
const insightsRoutes = _requireRoute('./routes/insights');
const messagesRoutes = _requireRoute('./routes/messages');
const analyticsRoutes = _requireRoute('./routes/analytics');
const recommendationsRoutes = _requireRoute('./routes/recommendations');

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/login/request-otp', otpLimiter);
app.use('/api/auth/login/verify-otp', otpLimiter);
app.use('/api/auth/signup', authLimiter);
app.use('/api/products', searchLimiter);
app.use('/api/messages', messagesLimiter);
app.use('/api/products', (req, res, next) => {
  if (String(req.method || '').toUpperCase() === 'POST') {
    return productCreateLimiter(req, res, next);
  }
  return next();
});
app.use('/api/uploads', uploadLimiter);

app.use((req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(String(req.method || '').toUpperCase())) {
    const idempotencyKey = String(req.headers['idempotency-key'] || '').trim();
    if (req.path.startsWith('/api/invoices') && !idempotencyKey) {
      return res.status(400).json({ error: 'Missing Idempotency-Key header for invoice mutations.' });
    }
  }
  return next();
});

app.get('/api/public/config', (req, res) => {
  const hostDerivedProjectId = deriveProjectIdFromHost(req.hostname);
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.MP_FIREBASE_PROJECT_ID || hostDerivedProjectId || '';
  const authDomain = process.env.FIREBASE_AUTH_DOMAIN || process.env.MP_FIREBASE_AUTH_DOMAIN || (projectId ? `${projectId}.firebaseapp.com` : '');
  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET || process.env.MP_FIREBASE_STORAGE_BUCKET || (projectId ? `${projectId}.appspot.com` : '');

  res.json({
    firebase: {
      apiKey: process.env.FIREBASE_WEB_API_KEY || process.env.MP_FIREBASE_WEB_API_KEY || '',
      authDomain,
      projectId,
      storageBucket,
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || process.env.MP_FIREBASE_MESSAGING_SENDER_ID || '',
      appId: process.env.FIREBASE_APP_ID || process.env.MP_FIREBASE_APP_ID || '',
    },
    recaptcha: {
      siteKey: process.env.RECAPTCHA_SITE_KEY || process.env.MP_RECAPTCHA_SITE_KEY || '',
      enterprise: true,
    },
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/business', businessRoutes);
app.use('/api/products', productRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/insights', insightsRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/recommendations', recommendationsRoutes);

app.use((err, req, res, next) => {
  const status = err.status || 500;
  if ((process.env.NODE_ENV || 'development') !== 'production') {
    console.error('Error:', err);
  }
  if (status >= 500) {
    return res.status(status).json({ error: 'We hit a temporary issue. Please try again.' });
  }
  return res.status(status).json({ error: err.message || 'Request could not be completed.' });
});

exports.api = functions.region('us-central1').https.onRequest(app);

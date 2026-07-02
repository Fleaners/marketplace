import express from 'express';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { verifyTokenOptional } from '../middleware/auth.js';
import { rejectUnknownBodyFields, requireString, optionalString } from '../middleware/validation.js';

const router = express.Router();

const ALLOWED_EVENTS = new Set([
  'page_view',
  'product_view',
  'search_query',
  'whatsapp_click',
  'seller_profile_view',
  'contact_seller',
  'favorite_product',
  'returning_user',
  'city_location',
  'device_type',
  'traffic_source',
]);

function getDb() {
  return getFirestore();
}

router.post(
  '/events',
  verifyTokenOptional,
  rejectUnknownBodyFields(['event', 'business_id', 'product_id', 'city_location', 'device_type', 'traffic_source', 'metadata']),
  requireString('event', { min: 2, max: 80 }),
  optionalString('business_id', { max: 120 }),
  optionalString('product_id', { max: 120 }),
  optionalString('city_location', { max: 120 }),
  optionalString('device_type', { max: 40 }),
  optionalString('traffic_source', { max: 140 }),
  async (req, res, next) => {
  try {
    const db = getDb();
    const event = String(req.body?.event || '').trim();
    const businessId = String(req.body?.business_id || req.user?.businessId || '').trim() || null;

    if (!event || !ALLOWED_EVENTS.has(event)) {
      return res.status(400).json({ error: 'Unsupported analytics event' });
    }

    const metadata = req.body?.metadata && typeof req.body.metadata === 'object' ? req.body.metadata : {};
    if (JSON.stringify(metadata).length > 10000) {
      return res.status(400).json({ error: 'Analytics metadata exceeds secure size limit' });
    }

    const payload = {
      event,
      business_id: businessId,
      product_id: req.body?.product_id || null,
      city_location: req.body?.city_location || null,
      device_type: req.body?.device_type || null,
      traffic_source: req.body?.traffic_source || null,
      metadata,
      created_at: FieldValue.serverTimestamp(),
    };

    const ref = await db.collection('analytics_events').add(payload);
    return res.status(202).json({ accepted: true, id: ref.id });
  } catch (error) {
    next(error);
  }
});

export default router;

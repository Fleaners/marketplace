import express from 'express';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { verifyToken, requireUserContext } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { rejectUnknownBodyFields } from '../middleware/validation.js';

const router = express.Router();

function getDb() {
  return getFirestore();
}

async function resolveBusinessId(req) {
  const fromToken = req.user?.businessId ? String(req.user.businessId) : '';
  const fromBody = typeof req.body?.business_id === 'string' ? req.body.business_id.trim() : '';
  const fromQuery = typeof req.query.business_id === 'string' ? req.query.business_id.trim() : '';
  if (fromToken) return fromToken;
  if (fromBody) return fromBody;
  if (fromQuery) return fromQuery;
  return '';
}

router.get('/', verifyToken, requireUserContext, async (req, res, next) => {
  try {
    const db = getDb();
    const businessId = await resolveBusinessId(req);
    if (!businessId) {
      return res.json({ business_id: '', threads: [] });
    }

    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 40)));

    const messagesSnapshot = await db
      .collection('messages')
      .where('seller_business_id', '==', businessId)
      .orderBy('created_at', 'desc')
      .limit(limit)
      .get()
      .catch(() => ({ docs: [] }));

    const threadsMap = new Map();
    messagesSnapshot.docs.forEach((doc) => {
      const payload = { id: doc.id, ...doc.data() };
      const threadKey = String(payload.thread_id || payload.visitor_phone || payload.visitor_email || payload.visitor_name || doc.id);
      const created = payload.created_at?.toDate ? payload.created_at.toDate().toISOString() : new Date(payload.created_at || Date.now()).toISOString();
      if (!threadsMap.has(threadKey)) {
        threadsMap.set(threadKey, {
          thread_id: threadKey,
          buyer_name: payload.visitor_name || 'Buyer',
          buyer_phone: payload.visitor_phone || null,
          buyer_email: payload.visitor_email || null,
          latest_message: payload.message || payload.text || 'New buyer message',
          latest_message_at: created,
          unread_count: payload.is_read ? 0 : 1,
          messages: [],
        });
      }
      const thread = threadsMap.get(threadKey);
      thread.messages.push({
        id: payload.id,
        sender_role: payload.sender_role || 'buyer',
        text: payload.message || payload.text || '',
        created_at: created,
        is_read: !!payload.is_read,
      });
      if (!payload.is_read) thread.unread_count += 1;
    });

    const threads = Array.from(threadsMap.values())
      .sort((a, b) => new Date(b.latest_message_at) - new Date(a.latest_message_at));

    return res.json({ business_id: businessId, threads });
  } catch (error) {
    next(error);
  }
});

router.post(
  '/:threadId/reply',
  verifyToken,
  requireUserContext,
  requirePermission('inventory:manage'),
  rejectUnknownBodyFields(['business_id', 'text', 'message']),
  async (req, res, next) => {
  try {
    const db = getDb();
    const businessId = await resolveBusinessId(req);
    const threadId = String(req.params.threadId || '').trim();
    const text = String(req.body?.text || req.body?.message || '').trim();

    if (!businessId) {
      return res.status(400).json({ error: 'business_id is required' });
    }

    if (!threadId || !text) {
      return res.status(400).json({ error: 'threadId and reply text are required' });
    }

    const payload = {
      seller_business_id: businessId,
      thread_id: threadId,
      sender_role: 'seller',
      message: text,
      is_read: true,
      created_at: FieldValue.serverTimestamp(),
    };

    const ref = await db.collection('messages').add(payload);
    return res.status(201).json({ id: ref.id, thread_id: threadId, message: text });
  } catch (error) {
    next(error);
  }
});

export default router;

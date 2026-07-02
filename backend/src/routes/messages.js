const express = require('express');
const { body, param } = require('express-validator');
const { requireAuth } = require('../middleware/auth');
const { runValidation } = require('../middleware/validators');
const pool = require('../../config/db');

const router = express.Router();

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const businessId = req.business.id;
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 40)));

    const threads = await pool.query(
      `SELECT
         id::text AS thread_id,
         buyer_name,
         buyer_phone,
         buyer_email,
         latest_message,
         latest_message_at,
         unread_count
       FROM message_threads
       WHERE seller_business_id = $1
       ORDER BY latest_message_at DESC
       LIMIT $2`,
      [businessId, limit]
    );

    res.json({ threads: threads.rows });
  } catch (error) {
    next(error);
  }
});

router.post(
  '/:threadId/reply',
  requireAuth,
  [param('threadId').notEmpty(), body('text').trim().notEmpty().withMessage('Reply text is required')],
  runValidation,
  async (req, res, next) => {
    try {
      const businessId = req.business.id;
      const threadId = req.params.threadId;
      const text = req.body.text;

      const thread = await pool.query(
        'SELECT id FROM message_threads WHERE id = $1 AND seller_business_id = $2',
        [threadId, businessId]
      );

      if (!thread.rows[0]) {
        return res.status(404).json({ error: 'Thread not found' });
      }

      const inserted = await pool.query(
        `INSERT INTO messages (thread_id, sender_role, message_text)
         VALUES ($1, 'seller', $2)
         RETURNING id, created_at`,
        [threadId, text]
      );

      await pool.query(
        `UPDATE message_threads
         SET latest_message = $1,
             latest_message_at = NOW(),
             unread_count = 0
         WHERE id = $2`,
        [text, threadId]
      );

      res.status(201).json({
        id: inserted.rows[0].id,
        thread_id: threadId,
        message: text,
        created_at: inserted.rows[0].created_at,
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;

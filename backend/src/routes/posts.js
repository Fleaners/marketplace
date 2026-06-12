const express = require('express');
const { body, param } = require('express-validator');
const upload = require('../utils/multer');
const { requireAuth } = require('../middleware/auth');
const { runValidation } = require('../middleware/validators');
const { fetchFeed, addPost, removePost } = require('../controllers/postsController');

const router = express.Router();

router.get('/feed', fetchFeed);

router.post(
  '/',
  requireAuth,
  upload.single('image'),
  [body('content').notEmpty().withMessage('Post content is required')],
  runValidation,
  addPost
);

router.delete('/:id', requireAuth, [param('id').isInt().withMessage('Post ID must be an integer')], runValidation, removePost);

module.exports = router;

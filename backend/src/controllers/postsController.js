const { listFeed, createPost, deletePost } = require('../models/postModel');
const { uploadImage } = require('../utils/cloudinaryUpload');

async function fetchFeed(req, res, next) {
  try {
    const { city, limit, offset } = req.query;
    const feed = await listFeed({ city, limit: limit ? parseInt(limit, 10) : undefined, offset: offset ? parseInt(offset, 10) : undefined });
    res.json(feed);
  } catch (error) {
    next(error);
  }
}

async function addPost(req, res, next) {
  try {
    const { content } = req.body;
    const business_id = req.business.id;
    const image_url = req.file ? await uploadImage(req.file, 'dealerconnect/posts') : null;

    const post = await createPost({ business_id, content, image_url });
    res.status(201).json(post);
  } catch (error) {
    next(error);
  }
}

async function removePost(req, res, next) {
  try {
    const { id } = req.params;
    const deleted = await deletePost(parseInt(id, 10), req.business.id);

    if (!deleted) {
      return res.status(404).json({ error: 'Post not found or not authorized' });
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

module.exports = { fetchFeed, addPost, removePost };

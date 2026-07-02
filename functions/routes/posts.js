import express from 'express';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { verifyToken } from '../middleware/auth.js';
import { rejectUnknownBodyFields, requireString, optionalString } from '../middleware/validation.js';

const router = express.Router();

function getDb() {
  return getFirestore();
}

router.use(verifyToken);

// Get all posts for business
router.get('/', async (req, res, next) => {
  try {
    const db = getDb();
    const businessId = req.user?.businessId;
    if (!businessId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const snapshot = await db
      .collection('businesses')
      .doc(businessId)
      .collection('posts')
      .orderBy('created_at', 'desc')
      .get();
    
    const posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(posts);
  } catch (error) {
    next(error);
  }
});

// Create post
router.post(
  '/',
  rejectUnknownBodyFields(['content', 'imageUrl']),
  requireString('content', { min: 1, max: 3000 }),
  optionalString('imageUrl', { max: 900000 }),
  async (req, res, next) => {
  try {
    const db = getDb();
    const businessId = req.user?.businessId;
    if (!businessId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { content, imageUrl } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'Content required' });
    }
    
    const docRef = await db
      .collection('businesses')
      .doc(businessId)
      .collection('posts')
      .add({
        content,
        image_url: imageUrl,
        created_at: FieldValue.serverTimestamp(),
      });
    
    res.status(201).json({ id: docRef.id, message: 'Post created' });
  } catch (error) {
    next(error);
  }
});

// Delete post
router.delete('/:id', async (req, res, next) => {
  try {
    const db = getDb();
    const businessId = req.user?.businessId;
    if (!businessId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    await db
      .collection('businesses')
      .doc(businessId)
      .collection('posts')
      .doc(req.params.id)
      .delete();
    
    res.json({ message: 'Post deleted' });
  } catch (error) {
    next(error);
  }
});

export default router;

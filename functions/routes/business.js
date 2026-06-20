import express from 'express';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

function getDb() {
  return getFirestore();
}

router.use(verifyToken);

// Get business profile
router.get('/profile', async (req, res, next) => {
  try {
    const db = getDb();
    const businessId = req.user?.businessId;
    if (!businessId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const doc = await db.collection('businesses').doc(businessId).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Business not found' });
    }
    
    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    next(error);
  }
});

// Update business profile
router.put('/profile', async (req, res, next) => {
  try {
    const db = getDb();
    const businessId = req.user?.businessId;
    if (!businessId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { shopName, email, city, description, gstNumber, latitude, longitude, profileImageUrl } = req.body;
    
    const updateData = {
      ...(shopName && { shop_name: shopName }),
      ...(email && { email: email.toLowerCase() }),
      ...(city && { city }),
      ...(description && { description }),
      ...(gstNumber && { gst_number: gstNumber }),
      ...(latitude && { latitude }),
      ...(longitude && { longitude }),
      ...(profileImageUrl && { profile_image_url: profileImageUrl }),
      updated_at: FieldValue.serverTimestamp(),
    };
    
    await db.collection('businesses').doc(businessId).update(updateData);
    
    const doc = await db.collection('businesses').doc(businessId).get();
    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    next(error);
  }
});

export default router;

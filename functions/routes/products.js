import express from 'express';
import * as admin from 'firebase-admin';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

function getDb() {
  return admin.firestore();
}

router.use(verifyToken);

// Get all products for business
router.get('/', async (req, res, next) => {
  try {
    const businessId = req.user?.businessId;
    if (!businessId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const snapshot = await db
      .collection('businesses')
      .doc(businessId)
      .collection('products')
      .get();
    
    const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(products);
  } catch (error) {
    next(error);
  }
});

// Create product
router.post('/', async (req, res, next) => {
  try {
    const businessId = req.user?.businessId;
    if (!businessId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { name, description, price, costPrice, stock, imageUrl } = req.body;
    
    const docRef = await db
      .collection('businesses')
      .doc(businessId)
      .collection('products')
      .add({
        name,
        description,
        price: parseFloat(price) || 0,
        cost_price: parseFloat(costPrice) || 0,
        stock: parseInt(stock) || 0,
        image_url: imageUrl,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
      });
    
    res.status(201).json({ id: docRef.id, message: 'Product created' });
  } catch (error) {
    next(error);
  }
});

// Get product by ID
router.get('/:id', async (req, res, next) => {
  try {
    const businessId = req.user?.businessId;
    if (!businessId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const doc = await db
      .collection('businesses')
      .doc(businessId)
      .collection('products')
      .doc(req.params.id)
      .get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    next(error);
  }
});

// Update product
router.put('/:id', async (req, res, next) => {
  try {
    const businessId = req.user?.businessId;
    if (!businessId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { name, description, price, costPrice, stock, imageUrl } = req.body;
    
    const updateData = {
      ...(name && { name }),
      ...(description && { description }),
      ...(price !== undefined && { price: parseFloat(price) }),
      ...(costPrice !== undefined && { cost_price: parseFloat(costPrice) }),
      ...(stock !== undefined && { stock: parseInt(stock) }),
      ...(imageUrl && { image_url: imageUrl }),
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    };
    
    await db
      .collection('businesses')
      .doc(businessId)
      .collection('products')
      .doc(req.params.id)
      .update(updateData);
    
    res.json({ message: 'Product updated' });
  } catch (error) {
    next(error);
  }
});

// Delete product
router.delete('/:id', async (req, res, next) => {
  try {
    const businessId = req.user?.businessId;
    if (!businessId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    await db
      .collection('businesses')
      .doc(businessId)
      .collection('products')
      .doc(req.params.id)
      .delete();
    
    res.json({ message: 'Product deleted' });
  } catch (error) {
    next(error);
  }
});

export default router;

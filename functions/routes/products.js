import express from 'express';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { verifyToken, verifyTokenOptional } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { rejectUnknownBodyFields, requireString, optionalString, optionalNumber } from '../middleware/validation.js';

const router = express.Router();
const MAX_IMAGE_URL_LENGTH = 900000;
const MAX_VISITS_PER_PRODUCT = 25;

function getDb() {
  return getFirestore();
}

function serializeDate(value) {
  if (!value) return null;
  if (value.toDate) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

// Get products (public):
// - /api/products -> all listings across businesses
// - /api/products?business_id=... -> listings for one business
router.get('/', verifyTokenOptional, async (req, res, next) => {
  try {
    const db = getDb();
    const queryBusinessId = typeof req.query.business_id === 'string' ? req.query.business_id.trim() : '';
    const businessId = queryBusinessId || req.user?.businessId || '';

    if (businessId) {
      const businessDoc = await db.collection('businesses').doc(businessId).get();
      if (!businessDoc.exists) {
        return res.json([]);
      }

      const business = businessDoc.data() || {};
      const snapshot = await db
        .collection('businesses')
        .doc(businessId)
        .collection('products')
        .orderBy('created_at', 'desc')
        .get();

      const products = snapshot.docs.map((doc) => ({
        id: doc.id,
        business_id: businessId,
        ...doc.data(),
        shop_name: business.shop_name || 'Marketplace seller',
        city: business.city || 'Marketplace',
        phone: business.phone || null,
        email: business.email || null,
      }));

      return res.json(products);
    }
    const businessesSnapshot = await db.collection('businesses').get();
    const businesses = businessesSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    const listingBatches = await Promise.all(
      businesses.map(async (business) => {
        const productsSnapshot = await db
          .collection('businesses')
          .doc(business.id)
          .collection('products')
          .get();

        return productsSnapshot.docs.map((doc) => ({
          id: doc.id,
          business_id: business.id,
          ...doc.data(),
          shop_name: business.shop_name || 'Marketplace seller',
          city: business.city || 'Marketplace',
          phone: business.phone || null,
          email: business.email || null,
        }));
      })
    );

    const products = listingBatches
      .flat()
      .sort((a, b) => {
        const aTime = a.created_at?.toMillis ? a.created_at.toMillis() : 0;
        const bTime = b.created_at?.toMillis ? b.created_at.toMillis() : 0;
        return bTime - aTime;
      });

    res.json(products);
  } catch (error) {
    next(error);
  }
});

// Create product
router.post(
  '/',
  verifyToken,
  requirePermission('products:create'),
  rejectUnknownBodyFields(['name', 'description', 'price', 'stock', 'imageUrl', 'image_url']),
  requireString('name', { min: 1, max: 180 }),
  optionalString('description', { max: 4000 }),
  optionalString('imageUrl', { max: MAX_IMAGE_URL_LENGTH }),
  optionalString('image_url', { max: MAX_IMAGE_URL_LENGTH }),
  optionalNumber('price', { min: 0, max: 1e9 }),
  optionalNumber('stock', { min: 0, max: 1e6 }),
  async (req, res, next) => {
  try {
    const db = getDb();
    const businessId = req.user?.businessId;
    if (!businessId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { name, description, price, stock, imageUrl, image_url } = req.body;
    const normalizedName = String(name || '').trim();
    const normalizedDescription = typeof description === 'string' ? description.trim() : '';
    const normalizedImageUrl = typeof (imageUrl ?? image_url) === 'string' ? String(imageUrl ?? image_url).trim() : '';

    if (!normalizedName) {
      return res.status(400).json({ error: 'Product name is required' });
    }

    if (normalizedImageUrl.length > MAX_IMAGE_URL_LENGTH) {
      return res.status(400).json({ error: 'Image is too large. Please upload a smaller image.' });
    }
    
    const docRef = await db
      .collection('businesses')
      .doc(businessId)
      .collection('products')
      .add({
        name: normalizedName,
        description: normalizedDescription,
        price: parseFloat(price) || 0,
        stock: parseInt(stock) || 0,
        image_url: normalizedImageUrl || null,
        created_at: FieldValue.serverTimestamp(),
      });
    
    res.status(201).json({ id: docRef.id, name: normalizedName, message: 'Product created' });
  } catch (error) {
    next(error);
  }
});

// Seller visitor insights for their own listings
router.get('/visits', verifyToken, async (req, res, next) => {
  try {
    const db = getDb();
    const businessId = req.user?.businessId;
    if (!businessId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const productsSnapshot = await db
      .collection('businesses')
      .doc(businessId)
      .collection('products')
      .orderBy('created_at', 'desc')
      .get();

    const visitBatches = await Promise.all(
      productsSnapshot.docs.map(async (productDoc) => {
        const product = productDoc.data() || {};
        const visitsSnapshot = await productDoc.ref
          .collection('visits')
          .orderBy('visited_at', 'desc')
          .limit(MAX_VISITS_PER_PRODUCT)
          .get();

        return visitsSnapshot.docs.map((visitDoc) => {
          const visit = visitDoc.data() || {};
          return {
            id: visitDoc.id,
            product_id: productDoc.id,
            product_name: product.name || 'Untitled Listing',
            visitor_business_id: visit.visitor_business_id || null,
            visitor_name: visit.visitor_name || 'Guest visitor',
            visitor_phone: visit.visitor_phone || null,
            visitor_email: visit.visitor_email || null,
            visitor_city: visit.visitor_city || null,
            user_agent: visit.user_agent || null,
            visited_at: serializeDate(visit.visited_at),
          };
        });
      })
    );

    const visits = visitBatches
      .flat()
      .sort((a, b) => new Date(b.visited_at || 0) - new Date(a.visited_at || 0))
      .slice(0, 100);

    const summary = productsSnapshot.docs.map((productDoc) => {
      const product = productDoc.data() || {};
      return {
        product_id: productDoc.id,
        product_name: product.name || 'Untitled Listing',
        view_count: Number(product.view_count || 0),
        last_viewed_at: serializeDate(product.last_viewed_at),
      };
    });

    return res.json({ visits, summary });
  } catch (error) {
    next(error);
  }
});

// Record a listing visit. Logged-in visitors share business contact info with the seller.
router.post(
  '/:id/visits',
  verifyTokenOptional,
  rejectUnknownBodyFields(['business_id']),
  async (req, res, next) => {
  try {
    const db = getDb();
    const sellerBusinessId = String(req.body?.business_id || req.query.business_id || '').trim();
    const productId = String(req.params.id || '').trim();

    if (!sellerBusinessId || !productId) {
      return res.status(400).json({ error: 'Product and seller business are required' });
    }

    if (req.user?.businessId && String(req.user.businessId) === sellerBusinessId) {
      return res.json({ recorded: false, reason: 'Own listing view ignored' });
    }

    const productRef = db
      .collection('businesses')
      .doc(sellerBusinessId)
      .collection('products')
      .doc(productId);
    const productDoc = await productRef.get();

    if (!productDoc.exists) {
      return res.status(404).json({ error: 'Product not found' });
    }

    let visitorBusiness = null;
    if (req.user?.businessId) {
      const visitorDoc = await db.collection('businesses').doc(String(req.user.businessId)).get();
      if (visitorDoc.exists) visitorBusiness = { id: visitorDoc.id, ...visitorDoc.data() };
    }

    const visitPayload = {
      product_id: productId,
      seller_business_id: sellerBusinessId,
      visitor_business_id: visitorBusiness?.id || null,
      visitor_name: visitorBusiness?.shop_name || req.user?.shopName || 'Guest visitor',
      visitor_phone: visitorBusiness?.phone || req.user?.phone || null,
      visitor_email: visitorBusiness?.email || req.user?.email || null,
      visitor_city: visitorBusiness?.city || null,
      user_agent: String(req.headers['user-agent'] || '').slice(0, 180),
      visited_at: FieldValue.serverTimestamp(),
    };

    await productRef.collection('visits').add(visitPayload);
    await productRef.set(
      {
        view_count: FieldValue.increment(1),
        last_viewed_at: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return res.status(201).json({ recorded: true });
  } catch (error) {
    next(error);
  }
});

// Get product by ID
router.get('/:id', verifyToken, async (req, res, next) => {
  try {
    const db = getDb();
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
router.put(
  '/:id',
  verifyToken,
  requirePermission('products:update'),
  rejectUnknownBodyFields(['name', 'description', 'price', 'stock', 'imageUrl', 'image_url']),
  optionalString('name', { max: 180 }),
  optionalString('description', { max: 4000 }),
  optionalString('imageUrl', { max: MAX_IMAGE_URL_LENGTH }),
  optionalString('image_url', { max: MAX_IMAGE_URL_LENGTH }),
  optionalNumber('price', { min: 0, max: 1e9 }),
  optionalNumber('stock', { min: 0, max: 1e6 }),
  async (req, res, next) => {
  try {
    const db = getDb();
    const businessId = req.user?.businessId;
    if (!businessId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { name, description, price, stock, imageUrl, image_url } = req.body;
    const normalizedImageUrl = typeof (imageUrl ?? image_url) === 'string' ? String(imageUrl ?? image_url).trim() : '';

    if (normalizedImageUrl.length > MAX_IMAGE_URL_LENGTH) {
      return res.status(400).json({ error: 'Image is too large. Please upload a smaller image.' });
    }
    
    const updateData = {
      ...(name && { name }),
      ...(description && { description }),
      ...(price !== undefined && { price: parseFloat(price) }),
      ...(stock !== undefined && { stock: parseInt(stock) }),
      ...(normalizedImageUrl && { image_url: normalizedImageUrl }),
      updated_at: FieldValue.serverTimestamp(),
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
router.delete('/:id', verifyToken, requirePermission('products:delete'), async (req, res, next) => {
  try {
    const db = getDb();
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

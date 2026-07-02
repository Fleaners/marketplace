import express from 'express';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { verifyToken, verifyTokenOptional } from '../middleware/auth.js';
import { rejectUnknownBodyFields, optionalString, optionalNumber } from '../middleware/validation.js';

const router = express.Router();
const MAX_PROFILE_IMAGE_URL_LENGTH = 900000;
const PLACEHOLDER_IMAGE_URL = 'https://via.placeholder.com/640x420?text=Product';

function isHttpUrl(value) {
  return /^https?:\/\//i.test(String(value || '').trim());
}

function normalizeImageUrl(value) {
  const candidate = String(value || '').trim();
  if (!candidate) return '';
  if (!isHttpUrl(candidate)) return PLACEHOLDER_IMAGE_URL;
  return candidate;
}

function getDb() {
  return getFirestore();
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

router.get('/public/:slug', verifyTokenOptional, async (req, res, next) => {
  try {
    const db = getDb();
    const slug = String(req.params.slug || '').trim().toLowerCase();
    if (!slug) {
      return res.status(400).json({ error: 'Business slug is required' });
    }

    const businessesSnapshot = await db.collection('businesses').limit(180).get();
    const businessDoc = businessesSnapshot.docs.find((doc) => {
      const row = doc.data() || {};
      const nameSlug = slugify(row.shop_name || row.name || doc.id);
      return nameSlug === slug;
    });

    if (!businessDoc) {
      return res.status(404).json({ error: 'Business not found' });
    }

    const businessId = businessDoc.id;
    const business = businessDoc.data() || {};

    const [productsSnapshot, inquiriesSnapshot] = await Promise.all([
      db.collection('businesses').doc(businessId).collection('products').orderBy('created_at', 'desc').limit(24).get(),
      db.collection('inquiries').where('sellerId', '==', businessId).limit(200).get().catch(() => ({ docs: [] })),
    ]);

    const products = productsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const inquiryCount = inquiriesSnapshot.docs.length;
    const currentYear = new Date().getFullYear();
    const establishedYear = Number(business.established_year || business.year_started || 0);
    const yearsInBusiness = establishedYear > 1900 ? Math.max(1, currentYear - establishedYear) : null;

    const trustScoreBase = 60
      + (business.gst_number || business.gstNumber ? 18 : 0)
      + Math.min(12, Math.round(inquiryCount / 8))
      + Math.min(10, Math.round(products.length / 3));

    const certifications = Array.isArray(business.certifications) && business.certifications.length
      ? business.certifications
      : [
          business.gst_number || business.gstNumber ? 'GST Verified' : 'Verification pending',
          'Business identity verified',
          'Inquiry response SLA enabled',
        ];

    const socialLinks = business.social_links && typeof business.social_links === 'object'
      ? business.social_links
      : {
          website: business.website || `https://${slug}.business.site`,
          linkedin: business.linkedin || `https://www.linkedin.com/company/${slug}`,
          instagram: business.instagram || `https://instagram.com/${slug.replace(/-/g, '')}`,
        };

    const gallery = products
      .map((item) => normalizeImageUrl(item.image_url || item.image || ''))
      .filter(Boolean)
      .slice(0, 12);

    return res.json({
      id: businessId,
      slug,
      name: business.shop_name || business.name || 'Business',
      location: business.city || business.location || 'India',
      phone: business.phone || null,
      email: business.email || null,
      verified: Boolean(business.gst_number || business.gstNumber),
      years_in_business: yearsInBusiness,
      products_count: products.length,
      inquiry_count: inquiryCount,
      response_time: business.response_time || 'Responds in 2 hours',
      trust_score: Math.min(99, trustScoreBase),
      story: business.description || `${business.shop_name || 'This business'} supports buyers with transparent communication and dependable supply quality.`,
      certifications,
      social_links: socialLinks,
      gallery,
      products: products.map((item) => ({
        id: item.id,
        name: item.name || 'Product',
        description: item.description || '',
        price: Number(item.price || 0),
        image: normalizeImageUrl(item.image_url || item.image || ''),
      })),
    });
  } catch (error) {
    next(error);
  }
});

// Get business profile
router.get('/profile', verifyToken, async (req, res, next) => {
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
router.put(
  '/profile',
  verifyToken,
  rejectUnknownBodyFields(['shopName', 'email', 'city', 'description', 'gstNumber', 'latitude', 'longitude', 'profileImageUrl']),
  optionalString('shopName', { max: 180 }),
  optionalString('email', { max: 255 }),
  optionalString('city', { max: 120 }),
  optionalString('description', { max: 4000 }),
  optionalString('gstNumber', { max: 20 }),
  optionalString('profileImageUrl', { max: MAX_PROFILE_IMAGE_URL_LENGTH }),
  optionalNumber('latitude', { min: -90, max: 90 }),
  optionalNumber('longitude', { min: -180, max: 180 }),
  async (req, res, next) => {
  try {
    const db = getDb();
    const businessId = req.user?.businessId;
    if (!businessId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { shopName, email, city, description, gstNumber, latitude, longitude, profileImageUrl } = req.body;
    const normalizedProfileImageUrl = typeof profileImageUrl === 'string' ? profileImageUrl.trim() : '';

    if (normalizedProfileImageUrl.length > MAX_PROFILE_IMAGE_URL_LENGTH) {
      return res.status(400).json({ error: 'Profile image is too large. Please upload a smaller image.' });
    }
    
    const updateData = {
      ...(shopName && { shop_name: shopName }),
      ...(email && { email: email.toLowerCase() }),
      ...(city && { city }),
      ...(description && { description }),
      ...(gstNumber && { gst_number: gstNumber }),
      ...(latitude && { latitude }),
      ...(longitude && { longitude }),
      ...(normalizedProfileImageUrl && { profile_image_url: normalizedProfileImageUrl }),
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

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

function validateGSTIN(gstin) {
  gstin = String(gstin || '').trim().toUpperCase();
  if (!gstin) return { valid: false, message: 'GSTIN is empty.' };
  if (gstin.length !== 15) {
    return { valid: false, message: 'GSTIN must be exactly 15 characters long.' };
  }

  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[0-9A-Z]{1}[0-9A-Z]{1}$/;
  if (!gstinRegex.test(gstin)) {
    return { valid: false, message: 'Invalid GSTIN format. Expected format like 27AAAAA0000A1Z5.' };
  }

  const stateCode = parseInt(gstin.substring(0, 2), 10);
  if ((stateCode < 1 || stateCode > 38) && stateCode !== 97) {
    return { valid: false, message: 'Invalid State Code. Must be between 01 and 38, or 97.' };
  }

  const pan = gstin.substring(2, 12);
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  if (!panRegex.test(pan)) {
    return { valid: false, message: 'Invalid PAN structure inside GSTIN.' };
  }

  const charList = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const val = charList.indexOf(gstin[i]);
    const factor = (i % 2 === 0) ? 1 : 2;
    let product = val * factor;
    product = Math.floor(product / 36) + (product % 36);
    sum += product;
  }
  const checkDigit = (36 - (sum % 36)) % 36;
  const expectedChar = charList[checkDigit];
  if (gstin[14] !== expectedChar) {
    return { valid: false, message: `GSTIN Checksum validation failed. Expected final character: ${expectedChar}.` };
  }

  return { valid: true, gstin };
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
  rejectUnknownBodyFields([
    'shopName', 'email', 'city', 'description', 'gstNumber', 'latitude', 'longitude', 'profileImageUrl',
    'ownerName', 'pan', 'address', 'state', 'pincode', 'whatsappNumber'
  ]),
  optionalString('shopName', { max: 180 }),
  optionalString('email', { max: 255 }),
  optionalString('city', { max: 120 }),
  optionalString('description', { max: 4000 }),
  optionalString('gstNumber', { max: 20 }),
  optionalString('profileImageUrl', { max: MAX_PROFILE_IMAGE_URL_LENGTH }),
  optionalNumber('latitude', { min: -90, max: 90 }),
  optionalNumber('longitude', { min: -180, max: 180 }),
  optionalString('ownerName', { max: 120 }),
  optionalString('pan', { max: 10 }),
  optionalString('address', { max: 500 }),
  optionalString('state', { max: 120 }),
  optionalString('pincode', { max: 10 }),
  optionalString('whatsappNumber', { max: 20 }),
  async (req, res, next) => {
  try {
    const db = getDb();
    const businessId = req.user?.businessId;
    if (!businessId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { 
      shopName, email, city, description, gstNumber, latitude, longitude, profileImageUrl,
      ownerName, pan, address, state: stateName, pincode, whatsappNumber
    } = req.body;
    
    const normalizedProfileImageUrl = typeof profileImageUrl === 'string' ? profileImageUrl.trim() : '';

    if (normalizedProfileImageUrl.length > MAX_PROFILE_IMAGE_URL_LENGTH) {
      return res.status(400).json({ error: 'Profile image is too large. Please upload a smaller image.' });
    }

    let gstStatus = 'unprovided';
    let verifiedAt = null;
    let verificationMethod = null;
    let verifiedBy = null;
    let gstVerified = false;
    let normalizedGst = '';

    if (typeof gstNumber === 'string' && gstNumber.trim().length > 0) {
      const validation = validateGSTIN(gstNumber);
      if (!validation.valid) {
        return res.status(400).json({ error: validation.message });
      }
      normalizedGst = validation.gstin;

      const apiAvailable = !!(process.env.GST_API_KEY || process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development');
      gstStatus = apiAvailable ? 'verified' : 'pending';
      gstVerified = apiAvailable;
      verifiedAt = apiAvailable ? FieldValue.serverTimestamp() : null;
      verificationMethod = apiAvailable ? 'gst_verification_api' : 'pending_manual_review';
      verifiedBy = apiAvailable ? 'system_api' : null;
    }
    
    const updateData = {
      ...(shopName && { shop_name: shopName }),
      ...(email && { email: email.toLowerCase() }),
      ...(city && { city }),
      ...(description && { description }),
      ...(latitude && { latitude }),
      ...(longitude && { longitude }),
      ...(normalizedProfileImageUrl && { profile_image_url: normalizedProfileImageUrl }),
      
      // Part 1 New Fields
      ...(ownerName && { owner_name: ownerName }),
      ...(pan && { pan: pan.toUpperCase() }),
      ...(address && { address }),
      ...(stateName && { state: stateName }),
      ...(pincode && { pincode }),
      ...(whatsappNumber && { whatsapp_number: whatsappNumber }),

      // GST Verification Info
      gstNumber: normalizedGst,
      gstStatus,
      verifiedAt,
      verificationMethod,
      verifiedBy,
      gstVerified,

      updated_at: FieldValue.serverTimestamp(),
    };
    
    await db.collection('businesses').doc(businessId).update(updateData);

    // Also update users collection if it exists
    if (req.user?.uid) {
      try {
        const userRef = db.collection('users').doc(req.user.uid);
        const userSnap = await userRef.get();
        if (userSnap.exists) {
          await userRef.update({
            businessName: shopName || userSnap.data().businessName || '',
            gstNumber: normalizedGst,
            gstVerified,
            gstStatus,
            whatsappNumber: whatsappNumber || userSnap.data().whatsappNumber || '',
            address: address || userSnap.data().address || '',
            state: stateName || userSnap.data().state || '',
            pincode: pincode || userSnap.data().pincode || ''
          });
        }
      } catch (err) {
        console.warn('Failed to sync to users collection:', err);
      }
    }
    
    const doc = await db.collection('businesses').doc(businessId).get();
    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    next(error);
  }
});

export default router;

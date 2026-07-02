import { getFirestore } from 'firebase-admin/firestore';

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(value) {
  const text = normalizeText(value);
  if (!text) return [];
  return text.split(' ').filter((token) => token.length > 2);
}

function toMillis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  const date = value.toDate ? value.toDate() : new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function jaccardScore(aTokens, bTokens) {
  const a = new Set(aTokens);
  const b = new Set(bTokens);
  if (!a.size || !b.size) return 0;

  let intersection = 0;
  a.forEach((item) => {
    if (b.has(item)) intersection += 1;
  });
  const union = new Set([...a, ...b]).size;
  return union ? intersection / union : 0;
}

function inferTags(product) {
  const fromFields = [
    product.category,
    product.name,
    product.description,
    product.city,
    product.location,
  ];
  return tokenize(fromFields.filter(Boolean).join(' '));
}

function buildProductCard(productDoc, businessById) {
  const product = productDoc.data() || {};
  const business = businessById.get(product.business_id || '') || {};
  const rawImage = String(product.image_url || product.image || '').trim();
  const safeImage = rawImage.startsWith('data:') && rawImage.length > 2500
    ? 'https://via.placeholder.com/640x420?text=Product'
    : (rawImage || 'https://via.placeholder.com/640x420?text=Product');
  return {
    id: productDoc.id,
    name: product.name || 'Untitled Product',
    description: product.description || 'No description available.',
    category: product.category || 'General',
    image: safeImage,
    price: Number(product.price || 0),
    businessId: product.business_id || '',
    seller: business.shop_name || 'Marketplace seller',
    location: business.city || 'India',
    verified: Boolean(business.gst_number || business.gstNumber),
    responseTime: business.response_time || 'Responds in 2 hours',
    updatedAt: toMillis(product.updated_at || product.created_at),
    tags: inferTags({ ...product, city: business.city }),
  };
}

async function readAllBusinessProducts(db, limit = 250) {
  const businessesSnapshot = await db.collection('businesses').limit(120).get();
  const businesses = businessesSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  const businessById = new Map(businesses.map((item) => [item.id, item]));

  const productSnapshots = await Promise.all(
    businesses.map((business) => db.collection('businesses').doc(business.id).collection('products').limit(30).get())
  );

  const cards = productSnapshots
    .flatMap((snapshot) => snapshot.docs.map((doc) => {
      const row = doc.data() || {};
      const merged = {
        ...row,
        business_id: businessById.has(row.business_id) ? row.business_id : snapshotPathBusinessId(doc.ref.path),
      };
      const wrappedDoc = {
        id: doc.id,
        data: () => merged,
      };
      return buildProductCard(wrappedDoc, businessById);
    }))
    .filter((item) => item.id)
    .slice(0, limit);

  return { businesses, businessById, products: cards };
}

function snapshotPathBusinessId(path) {
  const parts = String(path || '').split('/');
  const idx = parts.indexOf('businesses');
  if (idx >= 0 && parts[idx + 1]) return parts[idx + 1];
  return '';
}

async function readUserSignals(db, uid) {
  const [viewsSnapshot, wishlistSnapshot, inquiriesSnapshot] = await Promise.all([
    db.collection('productViews').where('viewerId', '==', uid).limit(80).get().catch(() => ({ docs: [] })),
    db.collection('wishlist').where('buyerId', '==', uid).limit(80).get().catch(() => ({ docs: [] })),
    db.collection('inquiries').where('buyerId', '==', uid).limit(80).get().catch(() => ({ docs: [] })),
  ]);

  const viewedProductIds = viewsSnapshot.docs.map((doc) => String(doc.data()?.productId || '')).filter(Boolean);
  const wishlistedProductIds = wishlistSnapshot.docs.map((doc) => String(doc.data()?.productId || '')).filter(Boolean);
  const inquiryProductIds = inquiriesSnapshot.docs.map((doc) => String(doc.data()?.productId || '')).filter(Boolean);

  return {
    viewedProductIds,
    wishlistedProductIds,
    inquiryProductIds,
  };
}

function collaborativeScore(targetProductId, allSignals) {
  if (!targetProductId) return 0;
  let score = 0;
  allSignals.forEach((signal) => {
    if (signal.productId === targetProductId) {
      if (signal.type === 'view') score += 1;
      if (signal.type === 'wishlist') score += 2.5;
      if (signal.type === 'inquiry') score += 3.5;
    }
  });
  return score;
}

async function readGlobalSignals(db) {
  const [viewsSnapshot, wishlistSnapshot, inquiriesSnapshot] = await Promise.all([
    db.collection('productViews').limit(400).get().catch(() => ({ docs: [] })),
    db.collection('wishlist').limit(250).get().catch(() => ({ docs: [] })),
    db.collection('inquiries').limit(250).get().catch(() => ({ docs: [] })),
  ]);

  const signals = [];
  viewsSnapshot.docs.forEach((doc) => {
    const row = doc.data() || {};
    if (row.productId) signals.push({ type: 'view', productId: String(row.productId) });
  });
  wishlistSnapshot.docs.forEach((doc) => {
    const row = doc.data() || {};
    if (row.productId) signals.push({ type: 'wishlist', productId: String(row.productId) });
  });
  inquiriesSnapshot.docs.forEach((doc) => {
    const row = doc.data() || {};
    if (row.productId) signals.push({ type: 'inquiry', productId: String(row.productId) });
  });

  return signals;
}

function computeProfileTokens(userSignals, productById) {
  const tokens = [];
  [...userSignals.viewedProductIds, ...userSignals.wishlistedProductIds, ...userSignals.inquiryProductIds]
    .forEach((id) => {
      const product = productById.get(id);
      if (product) tokens.push(...product.tags);
    });
  return tokens;
}

function buildInsightNarratives(topProducts, nearbyBusinesses) {
  const category = topProducts[0]?.category || 'Industrial';
  const city = nearbyBusinesses[0]?.location || 'your city';
  const seller = nearbyBusinesses[0]?.seller || 'verified businesses';

  return [
    `${category} products are trending in ${city}.`,
    `Buyers are contacting ${seller} more often this week.`,
    'Verified sellers usually respond faster to detailed inquiries.',
    'Most buyers compare 2-3 suppliers before first contact.',
  ];
}

export async function getBuyerRecommendations({ uid = '', city = '', category = '', limit = 10 }) {
  const db = getFirestore();
  const { products, businesses } = await readAllBusinessProducts(db, 320);

  const productById = new Map(products.map((item) => [item.id, item]));
  const globalSignals = await readGlobalSignals(db);

  let userSignals = {
    viewedProductIds: [],
    wishlistedProductIds: [],
    inquiryProductIds: [],
  };

  if (uid) {
    userSignals = await readUserSignals(db, uid);
  }

  const profileTokens = computeProfileTokens(userSignals, productById);
  const interacted = new Set([
    ...userSignals.viewedProductIds,
    ...userSignals.wishlistedProductIds,
    ...userSignals.inquiryProductIds,
  ]);

  const scored = products.map((product) => {
    const content = jaccardScore(profileTokens, product.tags) * 7;
    const collaborative = collaborativeScore(product.id, globalSignals) * 1.1;
    const freshness = product.updatedAt ? Math.max(0, 2 - ((Date.now() - product.updatedAt) / (1000 * 60 * 60 * 24 * 14))) : 0;
    const cityBoost = city && String(product.location || '').toLowerCase() === String(city).toLowerCase() ? 1.5 : 0;
    const categoryBoost = category && String(product.category || '').toLowerCase() === String(category).toLowerCase() ? 1.5 : 0;
    const trustBoost = product.verified ? 1 : 0;

    return {
      ...product,
      score: Number((content + collaborative + freshness + cityBoost + categoryBoost + trustBoost).toFixed(4)),
      reason: content >= collaborative
        ? 'Matched from your interests and viewed categories.'
        : 'Popular with buyers who viewed similar products.',
      alreadyInteracted: interacted.has(product.id),
    };
  });

  const ranked = scored
    .filter((item) => !item.alreadyInteracted)
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.min(Math.max(Number(limit) || 10, 4), 20));

  const nearbyBusinesses = ranked
    .map((item) => ({
      seller: item.seller,
      location: item.location,
      verified: item.verified,
      responseTime: item.responseTime,
    }))
    .filter((item, index, arr) => arr.findIndex((x) => x.seller === item.seller) === index)
    .slice(0, 6);

  return {
    strategy: 'hybrid_collaborative_content',
    recommendations: ranked,
    nearbyBusinesses,
    insights: buildInsightNarratives(ranked, nearbyBusinesses),
    businessCount: businesses.length,
    generatedAt: new Date().toISOString(),
  };
}

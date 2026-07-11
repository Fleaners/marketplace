import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  onSnapshot,
} from 'firebase/firestore';
import {
  getDownloadURL,
  ref,
  uploadBytes,
} from 'firebase/storage';
import { getFirebaseServices } from '../firebase';
import type { ProductRecord, UserProfile, RfqRecord } from './types';

export async function upsertUserProfile(profile: UserProfile): Promise<void> {
  const services = await getFirebaseServices();
  const db = services?.db;
  if (!db) return;
  const userRef = doc(db, 'users', profile.id);
  await setDoc(
    userRef,
    {
      role: profile.role,
      subscriptionPlan: profile.subscriptionPlan,
      profileImage: profile.profileImage || '',
      coverImage: profile.coverImage || '',
      verified: profile.verified,
      businessName: profile.businessName,
      bio: profile.bio,
      socialLinks: profile.socialLinks,
      shippingAddresses: profile.shippingAddresses || [],
      wishlist: profile.wishlist || [],
      reviewHistory: profile.reviewHistory || [],
      orderTracking: profile.orderTracking || [],
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function loadUserProfile(userId: string): Promise<UserProfile | null> {
  const services = await getFirebaseServices();
  const db = services?.db;
  if (!db) return null;
  const userSnap = await getDoc(doc(db, 'users', userId));
  if (!userSnap.exists()) return null;
  const data = userSnap.data();

  return {
    id: userSnap.id,
    role: data.role || 'buyer',
    subscriptionPlan: data.subscriptionPlan || 'standard',
    profileImage: data.profileImage || '',
    coverImage: data.coverImage || '',
    verified: !!data.verified,
    businessName: data.businessName || '',
    bio: data.bio || '',
    socialLinks: data.socialLinks || {},
    shippingAddresses: Array.isArray(data.shippingAddresses) ? data.shippingAddresses : [],
    wishlist: Array.isArray(data.wishlist) ? data.wishlist : [],
    reviewHistory: Array.isArray(data.reviewHistory) ? data.reviewHistory : [],
    orderTracking: Array.isArray(data.orderTracking) ? data.orderTracking : [],
  };
}

export async function saveProduct(product: ProductRecord): Promise<void> {
  const services = await getFirebaseServices();
  const db = services?.db;
  if (!db) return;
  const productRef = doc(db, 'products', product.id);
  await setDoc(
    productRef,
    {
      sellerId: product.sellerId,
      title: product.title,
      description: product.description,
      richDescription: product.richDescription || '',
      images: product.images,
      features: product.features,
      specifications: product.specifications,
      categories: product.categories,
      tags: product.tags,
      analytics: product.analytics,
      featured: product.featured,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function listSellerProducts(sellerId: string): Promise<ProductRecord[]> {
  const services = await getFirebaseServices();
  const db = services?.db;
  if (!db) return [];

  const q = query(collection(db, 'products'), limit(100));
  const snapshot = await getDocs(q);

  return snapshot.docs
    .map((item) => ({ id: item.id, ...(item.data() as Omit<ProductRecord, 'id'>) }))
    .filter((product) => product.sellerId === sellerId);
}

export async function uploadProfileAsset(userId: string, file: Blob, name: string): Promise<string> {
  const services = await getFirebaseServices();
  const storage = services?.storage;
  if (!storage) return '';
  const objectRef = ref(storage, `users/${userId}/${Date.now()}-${name}`);
  await uploadBytes(objectRef, file, { contentType: 'image/jpeg' });
  return getDownloadURL(objectRef);
}

export async function markFeaturedProducts(productIds: string[], featured: boolean): Promise<void> {
  const services = await getFirebaseServices();
  const db = services?.db;
  if (!db || !productIds.length) return;
  await Promise.all(
    productIds.map((id) => updateDoc(doc(db, 'products', id), { featured })),
  );
}

export function subscribeProducts(callback: (products: ProductRecord[]) => void): () => void {
  let unsub: (() => void) | null = null;
  let active = true;

  getFirebaseServices().then((services) => {
    if (!active) return;
    const db = services?.db;
    if (!db) return;

    const q = query(collection(db, 'products'), limit(100));
    unsub = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<ProductRecord, 'id'>),
      }));
      callback(list);
    }, (error) => {
      console.warn('Real-time products subscription error:', error);
    });
  }).catch((err) => {
    console.error('Failed to initialize products subscription:', err);
  });

  return () => {
    active = false;
    if (unsub) unsub();
  };
}

export function subscribeUserProfile(userId: string, callback: (profile: UserProfile) => void): () => void {
  let unsub: (() => void) | null = null;
  let active = true;

  getFirebaseServices().then((services) => {
    if (!active) return;
    const db = services?.db;
    if (!db) return;

    unsub = onSnapshot(doc(db, 'users', userId), (docSnap) => {
      if (!docSnap.exists()) return;
      const data = docSnap.data();
      const profile: UserProfile = {
        id: docSnap.id,
        role: data.role || 'buyer',
        subscriptionPlan: data.subscriptionPlan || 'standard',
        profileImage: data.profileImage || '',
        coverImage: data.coverImage || '',
        verified: !!data.verified,
        businessName: data.businessName || '',
        bio: data.bio || '',
        socialLinks: data.socialLinks || {},
        shippingAddresses: Array.isArray(data.shippingAddresses) ? data.shippingAddresses : [],
        wishlist: Array.isArray(data.wishlist) ? data.wishlist : [],
        reviewHistory: Array.isArray(data.reviewHistory) ? data.reviewHistory : [],
        orderTracking: Array.isArray(data.orderTracking) ? data.orderTracking : [],
      };
      callback(profile);
    }, (error) => {
      console.warn('Real-time profile subscription error:', error);
    });
  }).catch((err) => {
    console.error('Failed to initialize profile subscription:', err);
  });

  return () => {
    active = false;
    if (unsub) unsub();
  };
}

export async function createRfq(rfq: RfqRecord): Promise<void> {
  const services = await getFirebaseServices();
  const db = services?.db;
  if (!db) return;
  const rfqRef = doc(db, 'rfqs', rfq.id);
  await setDoc(rfqRef, {
    buyerId: rfq.buyerId,
    buyerName: rfq.buyerName,
    productName: rfq.productName,
    category: rfq.category,
    quantity: rfq.quantity,
    budget: rfq.budget,
    deliveryLocation: rfq.deliveryLocation,
    deliveryDate: rfq.deliveryDate,
    notes: rfq.notes,
    status: rfq.status,
    createdAt: rfq.createdAt,
  });
}

export function subscribeRfqs(buyerId: string, callback: (rfqs: RfqRecord[]) => void): () => void {
  let unsub: (() => void) | null = null;
  let active = true;

  getFirebaseServices().then((services) => {
    if (!active) return;
    const db = services?.db;
    if (!db) return;

    const q = query(collection(db, 'rfqs'), limit(100));
    unsub = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs
        .map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<RfqRecord, 'id'>),
        }))
        .filter((r) => r.buyerId === buyerId);
      callback(list);
    }, (error) => {
      console.warn('Real-time RFQs subscription error:', error);
    });
  }).catch((err) => {
    console.error('Failed to initialize RFQs subscription:', err);
  });

  return () => {
    active = false;
    if (unsub) unsub();
  };
}

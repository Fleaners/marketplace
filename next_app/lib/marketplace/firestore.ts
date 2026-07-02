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
} from 'firebase/firestore';
import {
  getDownloadURL,
  ref,
  uploadBytes,
} from 'firebase/storage';
import { getFirebaseServices } from '../firebase';
import type { ProductRecord, UserProfile } from './types';

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

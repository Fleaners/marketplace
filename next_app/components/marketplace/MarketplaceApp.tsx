'use client';

import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  PLAN_CAPABILITIES,
  PREMIUM_FEATURES,
  STANDARD_FEATURES,
} from '../../lib/marketplace/plans';
import { compressImage, createObjectUrl } from '../../lib/marketplace/image';
import {
  markFeaturedProducts,
  saveProduct,
  upsertUserProfile,
  uploadProfileAsset,
} from '../../lib/marketplace/firestore';
import type {
  ProductRecord,
  SellerPlan,
  ShippingAddress,
  UserProfile,
} from '../../lib/marketplace/types';

const demoAddresses: ShippingAddress[] = [
  {
    id: 'a1',
    recipient: 'Operations Desk',
    line1: '12 River Industrial Estate',
    city: 'Lucknow',
    state: 'Uttar Pradesh',
    zip: '226010',
    country: 'India',
  },
];

function initials(name: string): string {
  const pieces = name.trim().split(/\s+/).slice(0, 2);
  return pieces.map((item) => item[0]?.toUpperCase() || '').join('') || 'MS';
}

function aiDescription(title: string, category: string): string {
  return `${title} is optimized for high-volume B2B procurement in ${category}. Built for consistent quality, reliable fulfillment, and transparent post-sales support.`;
}

const sellerThemes = ['Executive Navy', 'Amber Commerce', 'Graphite Modern'];

export default function MarketplaceApp() {
  const [isDark, setIsDark] = useState(false);
  const [plan, setPlan] = useState<SellerPlan>('standard');
  const [sellerProfile, setSellerProfile] = useState<UserProfile>({
    id: 'seller-demo-01',
    role: 'seller',
    subscriptionPlan: 'standard',
    verified: false,
    businessName: 'Northline Industrial Supply',
    bio: 'Trusted B2B supplier focused on fast response, verified inventory, and SLA-backed fulfillment.',
    socialLinks: {
      linkedin: 'https://linkedin.com/company/northline',
      website: 'https://marketplace-store-fef91.web.app',
    },
    shippingAddresses: demoAddresses,
    wishlist: [],
    reviewHistory: [],
    orderTracking: [],
  });
  const [buyerProfile, setBuyerProfile] = useState<UserProfile>({
    id: 'buyer-demo-01',
    role: 'buyer',
    subscriptionPlan: 'standard',
    verified: false,
    businessName: 'Anika Sharma',
    bio: 'Procurement lead managing monthly sourcing cycles for electrical systems.',
    socialLinks: {},
    profileImage: '',
    shippingAddresses: demoAddresses,
    wishlist: ['Industrial Copper Cable', 'Stainless Valve Set'],
    reviewHistory: [
      {
        id: 'r1',
        productTitle: 'Copper Cable Bundle',
        rating: 5,
        comment: 'Packaging and delivery speed exceeded expectation.',
        createdAt: '2026-06-18',
      },
    ],
    orderTracking: [
      {
        orderId: 'ORD-9921',
        title: 'Copper Cable Bundle',
        status: 'shipped',
        eta: '2026-07-04',
      },
    ],
  });
  const [productDraft, setProductDraft] = useState({
    title: '',
    category: 'Electrical',
    description: '',
    richDescription: '',
    featureInput: '',
    specInput: '',
    tagInput: '',
  });
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [featuredProductIds, setFeaturedProductIds] = useState<string[]>([]);
  const [storeTheme, setStoreTheme] = useState(sellerThemes[0]);
  const [promoText, setPromoText] = useState('Monsoon bulk quote week is live.');
  const [statusMessage, setStatusMessage] = useState('');

  const caps = useMemo(() => PLAN_CAPABILITIES[plan], [plan]);
  const totalRevenue = products.reduce((sum, item) => sum + (item.analytics.revenue || 0), 0);

  async function handleProfileImage(file: File, profileType: 'seller' | 'buyer') {
    const compressed = await compressImage(file);
    const preview = createObjectUrl(compressed);
    const targetId = profileType === 'seller' ? sellerProfile.id : buyerProfile.id;

    const uploaded = await uploadProfileAsset(targetId, compressed, `${profileType}-avatar.jpg`).catch(() => '');
    const finalUrl = uploaded || preview;

    if (profileType === 'seller') {
      const updated = { ...sellerProfile, profileImage: finalUrl };
      setSellerProfile(updated);
      await upsertUserProfile(updated);
    } else {
      const updated = { ...buyerProfile, profileImage: finalUrl };
      setBuyerProfile(updated);
      await upsertUserProfile(updated);
    }
  }

  async function handleBannerUpload(file: File) {
    const compressed = await compressImage(file, 1800, 0.86);
    const preview = createObjectUrl(compressed);
    const uploaded = await uploadProfileAsset(sellerProfile.id, compressed, 'cover.jpg').catch(() => '');
    const updated = { ...sellerProfile, coverImage: uploaded || preview };
    setSellerProfile(updated);
    await upsertUserProfile(updated);
  }

  async function handleProductImages(files: FileList | null) {
    if (!files?.length) return;

    const nextUrls: string[] = [];
    for (const file of Array.from(files)) {
      const compressed = await compressImage(file, 1500, 0.84);
      nextUrls.push(createObjectUrl(compressed));
    }

    const combined = [...uploadedImages, ...nextUrls].slice(0, caps.maxImagesPerProduct);
    setUploadedImages(combined);
    if (uploadedImages.length + nextUrls.length > caps.maxImagesPerProduct) {
      setStatusMessage(`Image limit for ${plan.toUpperCase()} is ${caps.maxImagesPerProduct} per product.`);
    }
  }

  async function saveDraftProduct() {
    if (!productDraft.title.trim()) {
      setStatusMessage('Product title is required.');
      return;
    }

    const features = productDraft.featureInput.split(',').map((item) => item.trim()).filter(Boolean);
    const tags = productDraft.tagInput.split(',').map((item) => item.trim()).filter(Boolean);
    const specs = productDraft.specInput
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean)
      .reduce<Record<string, string>>((acc, row) => {
        const [k, v] = row.split(':').map((item) => item.trim());
        if (k && v) acc[k] = v;
        return acc;
      }, {});

    const description = productDraft.description || (caps.aiDescriptions ? aiDescription(productDraft.title, productDraft.category) : '');

    const record: ProductRecord = {
      id: `prd-${Date.now()}`,
      sellerId: sellerProfile.id,
      title: productDraft.title,
      description,
      richDescription: caps.richTextDescriptions ? productDraft.richDescription : '',
      images: uploadedImages,
      features,
      specifications: specs,
      categories: [productDraft.category],
      tags,
      analytics: {
        views: 0,
        salesCount: 0,
        conversionRate: caps.advancedAnalytics ? 0 : undefined,
        revenue: caps.advancedAnalytics ? 0 : undefined,
        customerInsights: caps.advancedAnalytics ? [] : undefined,
        trafficSources: caps.advancedAnalytics ? { direct: 0, search: 0, social: 0 } : undefined,
      },
      featured: false,
      updatedAt: new Date().toISOString(),
    };

    await saveProduct(record);
    setProducts((prev) => [record, ...prev]);
    setProductDraft({
      title: '',
      category: 'Electrical',
      description: '',
      richDescription: '',
      featureInput: '',
      specInput: '',
      tagInput: '',
    });
    setUploadedImages([]);
    setStatusMessage('Product saved. Listings remain unlimited for all plans.');
  }

  async function updateFeatured(ids: string[]) {
    setFeaturedProductIds(ids);
    await markFeaturedProducts(ids, true).catch(() => {});
  }

  const themeClass = isDark ? 'dark' : '';

  return (
    <div className={themeClass}>
      <main className="min-h-screen bg-slate-100 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
        <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-8">
          <motion.header
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl border border-slate-200 bg-mesh p-6 shadow-premium dark:border-slate-800"
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-slate-600 dark:text-slate-300">Enterprise Marketplace</p>
                <h1 className="font-display text-3xl sm:text-4xl">Seller Central + Professional Buyer Workspace</h1>
                <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
                  Standard and Premium sellers both get unlimited active listings. Plans differ by visibility, analytics depth, customization, and growth tooling.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button className="rounded-full border border-slate-400 px-4 py-2 text-sm" onClick={() => setIsDark((prev) => !prev)}>
                  {isDark ? 'Light Mode' : 'Dark Mode'}
                </button>
                <select
                  aria-label="Select seller plan"
                  className="rounded-full border border-slate-400 bg-transparent px-4 py-2 text-sm"
                  value={plan}
                  onChange={(event) => {
                    const selectedPlan = event.target.value as SellerPlan;
                    setPlan(selectedPlan);
                    setSellerProfile((prev) => ({ ...prev, subscriptionPlan: selectedPlan, verified: selectedPlan === 'premium' }));
                  }}
                >
                  <option value="standard">Standard Seller</option>
                  <option value="premium">Premium Seller</option>
                </select>
              </div>
            </div>
          </motion.header>

          <section className="grid gap-4 md:grid-cols-2">
            <article className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <h2 className="font-display text-xl">Standard Plan</h2>
              <ul className="mt-3 space-y-1 text-sm text-slate-600 dark:text-slate-300">
                {STANDARD_FEATURES.map((item) => <li key={item}>• {item}</li>)}
              </ul>
            </article>
            <article className="rounded-2xl border border-premium/40 bg-gradient-to-br from-blue-500/10 to-slate-900/10 p-5 dark:border-premium/70">
              <h2 className="font-display text-xl">Premium Plan</h2>
              <ul className="mt-3 space-y-1 text-sm text-slate-700 dark:text-slate-200">
                {PREMIUM_FEATURES.map((item) => <li key={item}>• {item}</li>)}
              </ul>
            </article>
          </section>

          <section className="grid gap-6 lg:grid-cols-3">
            <article className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <h3 className="font-display text-lg">Seller Profile</h3>
              <div className="mt-4 flex items-center gap-4">
                {sellerProfile.profileImage ? (
                  <img src={sellerProfile.profileImage} alt="Seller avatar" className="h-16 w-16 rounded-full object-cover" />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-300 text-xl font-bold text-ink">{initials(sellerProfile.businessName)}</div>
                )}
                <div>
                  <p className="font-semibold">{sellerProfile.businessName}</p>
                  <p className="text-xs text-slate-500">{sellerProfile.verified ? 'Premium Verified Badge' : 'Standard Seller Badge'}</p>
                </div>
              </div>
              <label className="mt-4 block text-sm">Profile photo
                <input className="mt-1 w-full text-xs" type="file" accept="image/*" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleProfileImage(file, 'seller').catch(() => setStatusMessage('Unable to update seller photo.'));
                }} />
              </label>
              <label className="mt-3 block text-sm">Store banner
                <input className="mt-1 w-full text-xs" type="file" accept="image/*" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleBannerUpload(file).catch(() => setStatusMessage('Unable to update banner.'));
                }} />
              </label>
              {sellerProfile.coverImage && <img src={sellerProfile.coverImage} alt="Store banner" className="mt-3 h-24 w-full rounded-xl object-cover" />}
              <textarea
                className="mt-3 w-full rounded-xl border border-slate-300 bg-transparent p-3 text-sm"
                value={sellerProfile.bio}
                onChange={(e) => setSellerProfile((prev) => ({ ...prev, bio: e.target.value }))}
                aria-label="Business description"
              />
              <button
                className="mt-3 rounded-xl bg-ink px-4 py-2 text-sm text-white"
                onClick={async () => {
                  await upsertUserProfile(sellerProfile);
                  setStatusMessage('Seller profile updated.');
                }}
              >
                Save Seller Profile
              </button>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 lg:col-span-2">
              <h3 className="font-display text-lg">Product Management</h3>
              <p className="text-xs text-slate-500">Unlimited listings enabled. Current plan image cap: {caps.maxImagesPerProduct} per product.</p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <input className="rounded-xl border border-slate-300 bg-transparent p-3 text-sm" placeholder="Product title" value={productDraft.title} onChange={(e) => setProductDraft((prev) => ({ ...prev, title: e.target.value }))} />
                <input className="rounded-xl border border-slate-300 bg-transparent p-3 text-sm" placeholder="Category" value={productDraft.category} onChange={(e) => setProductDraft((prev) => ({ ...prev, category: e.target.value }))} />
              </div>
              <textarea className="mt-3 w-full rounded-xl border border-slate-300 bg-transparent p-3 text-sm" placeholder="Basic product description" value={productDraft.description} onChange={(e) => setProductDraft((prev) => ({ ...prev, description: e.target.value }))} />
              {caps.richTextDescriptions && (
                <textarea className="mt-3 w-full rounded-xl border border-premium/40 bg-blue-50/40 p-3 text-sm dark:bg-slate-800" placeholder="Rich text description (markdown/html)" value={productDraft.richDescription} onChange={(e) => setProductDraft((prev) => ({ ...prev, richDescription: e.target.value }))} />
              )}
              {caps.aiDescriptions && (
                <button className="mt-2 rounded-lg border border-premium px-3 py-2 text-xs" onClick={() => setProductDraft((prev) => ({ ...prev, description: aiDescription(prev.title || 'Premium Product', prev.category) }))}>
                  Generate AI Description
                </button>
              )}
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <input className="rounded-xl border border-slate-300 bg-transparent p-3 text-sm" placeholder="Features (comma separated)" value={productDraft.featureInput} onChange={(e) => setProductDraft((prev) => ({ ...prev, featureInput: e.target.value }))} />
                <input className="rounded-xl border border-slate-300 bg-transparent p-3 text-sm" placeholder="Specs (key:value, comma)" value={productDraft.specInput} onChange={(e) => setProductDraft((prev) => ({ ...prev, specInput: e.target.value }))} />
                <input className="rounded-xl border border-slate-300 bg-transparent p-3 text-sm" placeholder="Tags (comma separated)" value={productDraft.tagInput} onChange={(e) => setProductDraft((prev) => ({ ...prev, tagInput: e.target.value }))} />
              </div>

              <label className="mt-4 block rounded-2xl border border-dashed border-slate-400 p-5 text-center text-sm">
                Drag-and-drop style upload area: choose images (auto-compressed)
                <input className="mt-2 w-full text-xs" multiple type="file" accept="image/*" onChange={(e) => {
                  handleProductImages(e.target.files).catch(() => setStatusMessage('Image upload failed.'));
                }} />
              </label>

              {uploadedImages.length > 0 && (
                <div className="mt-4 flex snap-x gap-3 overflow-x-auto pb-1">
                  {uploadedImages.map((src) => (
                    <img key={src} src={src} alt="Product upload" className="h-24 w-24 snap-start rounded-lg object-cover" />
                  ))}
                </div>
              )}

              <button className="mt-4 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-ink" onClick={saveDraftProduct}>
                Save Product
              </button>
            </article>
          </section>

          <section className="grid gap-6 lg:grid-cols-3">
            <article className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 lg:col-span-2">
              <h3 className="font-display text-lg">Seller Analytics</h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700"><p className="text-xs">Product Views</p><p className="text-2xl font-semibold">{products.reduce((s, p) => s + p.analytics.views, 0)}</p></div>
                <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700"><p className="text-xs">Sales Count</p><p className="text-2xl font-semibold">{products.reduce((s, p) => s + p.analytics.salesCount, 0)}</p></div>
                <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700"><p className="text-xs">Revenue</p><p className="text-2xl font-semibold">₹{totalRevenue.toLocaleString()}</p></div>
                <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700"><p className="text-xs">Conversion Rate</p><p className="text-2xl font-semibold">{caps.advancedAnalytics ? '3.2%' : 'Premium'}</p></div>
              </div>
              <p className="mt-3 text-xs text-slate-500">Advanced customer insights, traffic sources, and conversion details unlock on Premium.</p>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <h3 className="font-display text-lg">Storefront Control</h3>
              <select className="mt-3 w-full rounded-xl border border-slate-300 bg-transparent p-2 text-sm" value={storeTheme} onChange={(e) => setStoreTheme(e.target.value)} disabled={!caps.customThemes}>
                {sellerThemes.map((item) => <option value={item} key={item}>{item}</option>)}
              </select>
              <textarea className="mt-3 w-full rounded-xl border border-slate-300 bg-transparent p-3 text-sm" value={promoText} onChange={(e) => setPromoText(e.target.value)} disabled={!caps.promotionalTools} />
              <button
                className="mt-3 rounded-xl border border-slate-400 px-4 py-2 text-sm"
                onClick={() => updateFeatured(products.slice(0, 3).map((item) => item.id)).then(() => setStatusMessage('Featured products updated.'))}
                disabled={!caps.multipleBanners}
              >
                Configure Featured Products
              </button>
              <p className="mt-2 text-xs text-slate-500">Current featured count: {featuredProductIds.length}</p>
            </article>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="font-display text-lg">Buyer Profile Workspace</h3>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm">Buyer profile image
                  <input className="mt-1 block text-xs" type="file" accept="image/*" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleProfileImage(file, 'buyer').catch(() => setStatusMessage('Buyer photo update failed.'));
                  }} />
                </label>
                {buyerProfile.profileImage ? <img src={buyerProfile.profileImage} alt="Buyer avatar" className="mt-3 h-20 w-20 rounded-full object-cover" /> : <div className="mt-3 flex h-20 w-20 items-center justify-center rounded-full bg-slate-300 font-semibold">{initials(buyerProfile.businessName)}</div>}
                <input className="mt-3 w-full rounded-xl border border-slate-300 bg-transparent p-3 text-sm" value={buyerProfile.businessName} onChange={(e) => setBuyerProfile((prev) => ({ ...prev, businessName: e.target.value }))} placeholder="Buyer name" />
                <textarea className="mt-3 w-full rounded-xl border border-slate-300 bg-transparent p-3 text-sm" value={buyerProfile.bio} onChange={(e) => setBuyerProfile((prev) => ({ ...prev, bio: e.target.value }))} placeholder="Buyer profile bio" />
                <button className="mt-3 rounded-xl bg-ink px-4 py-2 text-sm text-white" onClick={async () => {
                  await upsertUserProfile(buyerProfile);
                  setStatusMessage('Buyer profile updated.');
                }}>Save Buyer Profile</button>
              </div>
              <div className="space-y-3 text-sm">
                <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700"><strong>Shipping Addresses</strong><p className="mt-1 text-slate-600 dark:text-slate-300">{buyerProfile.shippingAddresses?.map((a) => `${a.line1}, ${a.city}`).join(' • ')}</p></div>
                <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700"><strong>Wishlist</strong><p className="mt-1 text-slate-600 dark:text-slate-300">{buyerProfile.wishlist?.join(', ') || 'No saved products yet.'}</p></div>
                <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700"><strong>Review History</strong><p className="mt-1 text-slate-600 dark:text-slate-300">{buyerProfile.reviewHistory?.map((r) => `${r.productTitle} (${r.rating}/5)`).join(' • ') || 'No reviews yet.'}</p></div>
                <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700"><strong>Order Tracking</strong><p className="mt-1 text-slate-600 dark:text-slate-300">{buyerProfile.orderTracking?.map((o) => `${o.orderId} ${o.status}`).join(' • ') || 'No active orders.'}</p></div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="font-display text-lg">Live Product Gallery</h3>
            <AnimatePresence>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                {products.map((item) => (
                  <motion.article key={item.id} layout initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                    {item.images[0] ? <img src={item.images[0]} alt={item.title} className="h-36 w-full rounded-lg object-cover" /> : <div className="flex h-36 items-center justify-center rounded-lg bg-slate-200 text-sm dark:bg-slate-800">No image</div>}
                    <h4 className="mt-2 font-semibold">{item.title}</h4>
                    <p className="mt-1 text-xs text-slate-500">{item.description}</p>
                    <p className="mt-2 text-xs">{item.categories.join(', ')}</p>
                    <div className="mt-2 text-[11px] text-slate-500">Featured: {featuredProductIds.includes(item.id) ? 'Yes' : 'No'}</div>
                  </motion.article>
                ))}
              </div>
            </AnimatePresence>
          </section>

          {statusMessage && <p role="status" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-ink dark:bg-amber-100">{statusMessage}</p>}
        </div>
      </main>
    </div>
  );
}

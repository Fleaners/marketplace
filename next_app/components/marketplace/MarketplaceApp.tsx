'use client';

import { useMemo, useState, useEffect } from 'react';
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
import { getFirebaseServices } from '../../lib/firebase';
import type {
  ProductRecord,
  SellerPlan,
  ShippingAddress,
  UserProfile,
} from '../../lib/marketplace/types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

const demoAddresses: ShippingAddress[] = [
  {
    id: 'a1',
    recipient: 'Operations Desk',
    line1: '12 River Industrial Estate',
    city: 'Lucknow',
    state: 'Uttar Pradesh',
    zip: '226010',
    country: 'India',
    isDefault: true
  },
];

const CATEGORIES = [
  'All',
  'Industrial',
  'Electrical',
  'Hardware',
  'Chemicals',
  'Packaging',
  'Safety Components',
  'Agriculture',
  'Office Supplies',
];

export default function MarketplaceApp() {
  const [isDark, setIsDark] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [plan, setPlan] = useState<SellerPlan>('premium');
  const [activeTab, setActiveTab] = useState<'home' | 'search' | 'wishlist' | 'profile' | 'more'>('home');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGstOnly, setFilterGstOnly] = useState(false);
  const [filterInStockOnly, setFilterInStockOnly] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showSellerSandbox, setShowSellerSandbox] = useState(false);

  const [sellerProfile, setSellerProfile] = useState<UserProfile>({
    id: 'seller-demo-01',
    role: 'seller',
    subscriptionPlan: 'premium',
    verified: true,
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
    wishlist: ['Industrial Water Pump', 'Copper Core Grounding Wire'],
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
        title: 'Copper Core Grounding Wire',
        status: 'shipped',
        eta: '2026-07-15',
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
    price: '1200',
    moq: '5',
    stock: '50',
    sku: 'EL-CC-GEN',
    delivery: '3-5 days',
    gst: true,
  });

  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [featuredProductIds, setFeaturedProductIds] = useState<string[]>([]);
  const [storeTheme, setStoreTheme] = useState('Executive Navy');
  const [promoText, setPromoText] = useState('Monsoon bulk quote week is live.');
  const [statusMessage, setStatusMessage] = useState('');

  const caps = useMemo(() => PLAN_CAPABILITIES[plan], [plan]);
  const totalRevenue = products.reduce((sum, item) => sum + (item.analytics.revenue || 0), 0);

  // Sync products with localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('marketplace_products');
      if (stored) {
        setProducts(JSON.parse(stored));
      } else {
        const defaultProducts = [
          {
            id: '1',
            title: 'Industrial Water Pump',
            categories: ['Industrial'],
            description: 'Centrifugal industrial water pump with robust 5HP cast iron body. Direct support for heavy farming irrigation and manufacturing lines.',
            price: 14500,
            moq: 2,
            stock: 15,
            sku: 'WP-IND-100',
            unit: 'Pieces',
            gst: true,
            delivery: '2-3 days',
            tags: ['Pumps', 'Irrigation'],
            whatsapp: '919876543210',
            images: [],
            analytics: { views: 184, salesCount: 3, revenue: 43500 },
            featured: true
          },
          {
            id: '2',
            title: 'Heavy Duty Adhesive Sealant',
            categories: ['Industrial'],
            description: 'Waterproof fast-curing polyurethane adhesive sealant. Ideal for joint sealing in heavy construction and metals.',
            price: 450,
            moq: 10,
            stock: 3,
            sku: 'AD-HD-450',
            unit: 'Pieces',
            gst: true,
            delivery: 'Next day',
            tags: ['Adhesives', 'Chemicals'],
            whatsapp: '919876543210',
            images: [],
            analytics: { views: 42, salesCount: 1, revenue: 450 },
            featured: false
          },
          {
            id: '3',
            title: 'Copper Core Grounding Wire',
            categories: ['Electrical'],
            description: 'High conductivity copper grounding cable wire for residential, commercial, and solar substation safety layouts.',
            price: 1200,
            moq: 5,
            stock: 25,
            sku: 'EL-CC-GND',
            unit: 'Meters',
            gst: true,
            delivery: '3-5 days',
            tags: ['Electrical', 'Wiring'],
            whatsapp: '919876543210',
            images: [],
            analytics: { views: 241, salesCount: 8, revenue: 9600 },
            featured: true
          },
          {
            id: '4',
            title: 'Brass Coupling Joints (1/2 Inch)',
            categories: ['Hardware'],
            description: 'Corrosion resistant high-pressure brass coupler joints for secure industrial piping systems.',
            price: 85,
            moq: 20,
            stock: 2,
            sku: 'HW-BCJ-12',
            unit: 'Pieces',
            gst: false,
            delivery: '2-4 days',
            tags: ['Pipes', 'Hardware'],
            whatsapp: '919876543210',
            images: [],
            analytics: { views: 76, salesCount: 0, revenue: 0 },
            featured: false
          },
        ];
        localStorage.setItem('marketplace_products', JSON.stringify(defaultProducts));
        setProducts(defaultProducts as any);
      }
    } catch (e) {
      console.error('Failed to sync products', e);
    }
  }, []);

  // Monitor scroll for back-to-top button
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Toggle wishlist item
  const handleToggleWishlist = (productTitle: string) => {
    setBuyerProfile((prev) => {
      const current = prev.wishlist || [];
      const updated = current.includes(productTitle)
        ? current.filter((t) => t !== productTitle)
        : [...current, productTitle];
      return { ...prev, wishlist: updated };
    });
  };

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

  async function handleGenerateAIDescription() {
    const title = productDraft.title.trim();
    if (!title) {
      setStatusMessage('Please enter a product title first.');
      return;
    }

    setIsGenerating(true);
    setStatusMessage('Generating AI Description...');

    try {
      let token = '';
      if (typeof window !== 'undefined') {
        token = localStorage.getItem('mp_backend_token') || '';
      }
      if (!token) {
        try {
          const services = await getFirebaseServices();
          if (services?.auth && services.auth.currentUser) {
            token = await services.auth.currentUser.getIdToken();
          }
        } catch (err) {
          console.warn('Could not get id token fallback:', err);
        }
      }

      const timestamp = Date.now().toString();
      const nonce = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Timestamp': timestamp,
        'X-Nonce': nonce
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '';
      const response = await fetch(`${API_BASE}/api/ai/analyze`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'generate_description',
          params: {
            title,
            category: productDraft.category
          },
          data: {
            sellerName: sellerProfile.businessName,
            category: productDraft.category
          }
        })
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to generate AI description.');
      }

      setProductDraft((prev) => ({
        ...prev,
        description: payload.answer || prev.description
      }));
      setStatusMessage('AI description generated successfully.');
    } catch (err: any) {
      console.error(err);
      setStatusMessage(err.message || 'Error generating description.');
    } finally {
      setIsGenerating(false);
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

    const record: ProductRecord = {
      id: `prd-${Date.now()}`,
      sellerId: sellerProfile.id,
      title: productDraft.title,
      description: productDraft.description || 'Verified industrial component.',
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
    const updatedList = [record, ...products];
    setProducts(updatedList);
    localStorage.setItem('marketplace_products', JSON.stringify(updatedList));

    setProductDraft({
      title: '',
      category: 'Electrical',
      description: '',
      richDescription: '',
      featureInput: '',
      specInput: '',
      tagInput: '',
      price: '1200',
      moq: '5',
      stock: '50',
      sku: 'EL-CC-GEN',
      delivery: '3-5 days',
      gst: true,
    });
    setUploadedImages([]);
    setStatusMessage('Product saved in Sandbox. View it in the Live Product Gallery!');
    setTimeout(() => setStatusMessage(''), 4000);
  }

  async function updateFeatured(ids: string[]) {
    setFeaturedProductIds(ids);
    await markFeaturedProducts(ids, true).catch(() => {});
  }

  // Filter products for Buyer Sourcing Gallery
  const filteredProducts = useMemo(() => {
    return products.filter((prod) => {
      const matchesCategory = selectedCategory === 'All' || prod.categories?.includes(selectedCategory);
      const matchesSearch = !searchQuery.trim() || 
        prod.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prod.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesGst = !filterGstOnly || (prod as any).gst !== false;
      const matchesStock = !filterInStockOnly || ((prod as any).stock ?? 5) > 0;

      return matchesCategory && matchesSearch && matchesGst && matchesStock;
    });
  }, [products, selectedCategory, searchQuery, filterGstOnly, filterInStockOnly]);

  const activeThemeClass = isDark ? 'dark' : '';

  return (
    <div className={activeThemeClass}>
      <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors duration-200 dark:bg-slate-950 dark:text-slate-100 font-sans pb-[calc(env(safe-area-inset-bottom)+5.5rem)]">
        
        {/* Main Header / Top Search Bar */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200/80 dark:bg-slate-900/80 dark:border-slate-800/80 px-4 py-3">
          <div className="mx-auto max-w-5xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🏬</span>
              <div>
                <h1 className="text-base font-black tracking-tight leading-none text-slate-900 dark:text-white">marketplace.store</h1>
                <p className="text-[10px] uppercase font-black tracking-widest text-[#FAB12F] mt-0.5">B2B Trade Network</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsDark(!isDark)}
                className="p-2.5 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 transition-all text-sm shadow-sm"
                aria-label="Toggle dark mode"
              >
                {isDark ? '☀️' : '🌙'}
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-4 py-6">
          <AnimatePresence mode="wait">
            {/* 1. HOME TAB */}
            {activeTab === 'home' && (
              <motion.div
                key="home"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.18 }}
                className="space-y-6"
              >
                {/* Hero Promotion Widget */}
                <div className="relative rounded-3xl bg-gradient-to-br from-slate-900 to-indigo-950 p-6 text-white overflow-hidden shadow-xl animate-fade-in">
                  <div className="absolute right-0 bottom-0 opacity-15 translate-x-10 translate-y-10 pointer-events-none select-none text-9xl">🏭</div>
                  <div className="space-y-2">
                    <span className="inline-flex rounded-full bg-[#FAB12F]/20 px-3 py-1 text-xs font-bold text-[#FAB12F] border border-[#FAB12F]/30 uppercase tracking-widest">
                      📢 {promoText}
                    </span>
                    <h2 className="text-2xl font-black tracking-tight leading-tight sm:text-3xl max-w-lg">
                      Source Verified Industrial Goods Directly.
                    </h2>
                    <p className="text-xs text-slate-300 max-w-md font-medium leading-relaxed">
                      Connect with MSME verified sellers, request wholesale quotations in 1-click, and handle compliance ledgers instantly.
                    </p>
                  </div>
                </div>

                {/* Horizontal Category Scroll */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Categories</h3>
                  <div className="flex snap-x gap-2 overflow-x-auto pb-2 scrollbar-none">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`snap-start whitespace-nowrap rounded-full px-5 py-2 text-xs font-bold transition-all border ${
                          selectedCategory === cat
                            ? 'bg-[#FAB12F] text-slate-950 border-[#FAB12F] shadow-sm font-black scale-105'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-[#FAB12F]'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sticky Search bar under Categories */}
                <div className="relative rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm space-y-3">
                  <div className="relative">
                    <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 text-sm">🔍</span>
                    <input
                      type="text"
                      placeholder="Search pumps, cables, valves..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-[#FAB12F] focus:ring-1 focus:ring-[#FAB12F] transition-colors"
                    />
                  </div>
                  <div className="flex items-center gap-4 text-xs font-bold text-slate-600 dark:text-slate-400">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" checked={filterGstOnly} onChange={(e) => setFilterGstOnly(e.target.checked)} className="rounded text-[#FAB12F] focus:ring-[#FAB12F]" />
                      <span>GST Verified</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" checked={filterInStockOnly} onChange={(e) => setFilterInStockOnly(e.target.checked)} className="rounded text-[#FAB12F] focus:ring-[#FAB12F]" />
                      <span>In Stock</span>
                    </label>
                  </div>
                </div>

                {/* Product Gallery Grid */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
                      Product Catalog ({filteredProducts.length})
                    </h3>
                  </div>

                  {filteredProducts.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 p-10 text-center text-slate-500">
                      <p className="text-3xl">📦</p>
                      <p className="mt-2 text-sm font-bold">No products match your filters</p>
                    </div>
                  ) : (
                    <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
                      {filteredProducts.map((prod) => {
                        const isWishlisted = buyerProfile.wishlist?.includes(prod.title);
                        return (
                          <motion.article 
                            key={prod.id}
                            layout
                            whileTap={{ scale: 0.98 }}
                            className="group flex flex-col justify-between rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-sm hover:shadow-md transition-all relative"
                          >
                            <div>
                              {/* Product Image area */}
                              <div className="relative aspect-square rounded-2xl bg-slate-100 dark:bg-slate-950 overflow-hidden flex items-center justify-center border border-slate-100 dark:border-slate-800">
                                {prod.images[0] ? (
                                  <img src={prod.images[0]} alt={prod.title} className="h-full w-full object-cover" />
                                ) : (
                                  <div className="text-slate-400 text-3xl font-light">📦</div>
                                )}
                                <button 
                                  onClick={() => handleToggleWishlist(prod.title)}
                                  className="absolute top-2 right-2 h-8 w-8 rounded-full bg-white/90 dark:bg-slate-900/90 shadow-sm flex items-center justify-center text-sm border border-slate-100 dark:border-slate-800 hover:scale-105 active:scale-95 transition-transform"
                                >
                                  {isWishlisted ? '❤️' : '🤍'}
                                </button>
                              </div>

                              {/* Badges */}
                              <div className="mt-2.5 flex flex-wrap gap-1">
                                <span className="inline-flex rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                                  🏅 Premium
                                </span>
                                {(prod as any).gst !== false && (
                                  <span className="inline-flex rounded-full bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 text-[9px] font-bold text-blue-600 dark:text-blue-400">
                                    ✓ GSTIN
                                  </span>
                                )}
                              </div>

                              {/* Title and descriptions */}
                              <h4 className="mt-2 text-xs font-black tracking-tight text-slate-800 dark:text-white line-clamp-1 leading-snug">
                                {prod.title}
                              </h4>
                              <p className="text-[10px] text-slate-500 line-clamp-2 mt-1 leading-normal">
                                {prod.description}
                              </p>
                              
                              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-semibold truncate">
                                🏢 {sellerProfile.businessName}
                              </p>
                            </div>

                            {/* Sourcing Parameters and CTAs */}
                            <div className="mt-3.5 border-t border-slate-100 dark:border-slate-800/60 pt-2.5 space-y-2">
                              <div className="flex items-baseline justify-between">
                                <span className="text-[10px] text-slate-500 font-semibold">MOQ: {(prod as any).moq ?? 5} units</span>
                                <span className="text-xs font-black text-slate-900 dark:text-white">₹{prod.price?.toLocaleString()}</span>
                              </div>
                              <div className="grid gap-1.5 grid-cols-2">
                                <a 
                                  href={`https://wa.me/${prod.whatsapp || '919876543210'}?text=Hello%20sires!%20Interested%20in%20buying%20wholesale%20${encodeURIComponent(prod.title)}.%20Please%20share%20bulk%20quotes.`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] py-2 text-center transition-colors flex items-center justify-center gap-1 shadow-sm"
                                >
                                  💬 Chat
                                </a>
                                <button 
                                  onClick={() => setStatusMessage(`RFQ submitted for ${prod.title}. Seller typically replies in 2 hours.`)}
                                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-850 dark:text-slate-200 font-extrabold text-[10px] py-2 text-center hover:bg-slate-50 transition-colors shadow-sm"
                                >
                                  ⚡ RFQ
                                </button>
                              </div>
                            </div>
                          </motion.article>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Become a Seller callout */}
                <div className="rounded-3xl border border-[#f3d9a7] bg-[#fff6e6]/60 dark:bg-slate-900/40 p-6 flex flex-col items-center text-center space-y-3 animate-pulse-slow">
                  <div className="h-12 w-12 rounded-2xl bg-amber-100 flex items-center justify-center text-2xl shadow-inner">🏬</div>
                  <h4 className="text-sm font-black text-[#1f2937] dark:text-white">Grow your trade business online today</h4>
                  <p className="text-xs text-slate-500 max-w-sm font-semibold">
                    Set up your digital catalog, verify your business GST ledger, and receive direct buyer inquiries on WhatsApp.
                  </p>
                  <Button 
                    variant="primary" 
                    size="md"
                    onClick={() => {
                      if (typeof window !== 'undefined') window.location.href = '/dashboard';
                    }}
                    className="rounded-xl bg-[#FAB12F] hover:bg-[#e09e1b] text-slate-900 font-extrabold shadow-[0_8px_20px_rgba(250,177,47,0.25)]"
                  >
                    Open Seller Cockpit
                  </Button>
                </div>
              </motion.div>
            )}

            {/* 2. SEARCH TAB */}
            {activeTab === 'search' && (
              <motion.div
                key="search"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.18 }}
                className="space-y-6"
              >
                <div className="space-y-4">
                  <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Explore the Sourcing Directory</h2>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 text-sm">🔍</span>
                    <input
                      type="text"
                      placeholder="Type component keywords, categories, HSN..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 pl-10 pr-4 py-3.5 text-sm focus:outline-none focus:border-[#FAB12F] focus:ring-1 focus:ring-[#FAB12F] transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Categories Directory</h3>
                  <div className="grid gap-2 grid-cols-2">
                    {CATEGORIES.filter(c => c !== 'All').map((cat) => (
                      <button
                        key={cat}
                        onClick={() => {
                          setSelectedCategory(cat);
                          setActiveTab('home');
                        }}
                        className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 text-left hover:border-[#FAB12F] transition-all flex items-center justify-between group"
                      >
                        <span className="text-xs font-black text-slate-850 dark:text-white">{cat}</span>
                        <span className="text-slate-400 group-hover:translate-x-1 transition-transform">→</span>
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* 3. WISHLIST TAB */}
            {activeTab === 'wishlist' && (
              <motion.div
                key="wishlist"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.18 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Sourcing Wishlist</h2>
                  <p className="text-xs text-slate-500 font-semibold mt-1">Products bookmarked for quick bulk inquiry cycles.</p>
                </div>

                {buyerProfile.wishlist?.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 p-12 text-center text-slate-500 bg-white dark:bg-slate-900">
                    <p className="text-4xl">❤️</p>
                    <p className="mt-3 text-sm font-bold">Your sourcing wishlist is currently empty</p>
                    <button 
                      onClick={() => setActiveTab('home')}
                      className="mt-4 rounded-xl bg-[#FAB12F] text-slate-950 px-4 py-2 text-xs font-bold"
                    >
                      Browse Products
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {products.filter(p => buyerProfile.wishlist?.includes(p.title)).map((prod) => (
                      <div 
                        key={prod.id} 
                        className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex items-center gap-4 justify-between shadow-sm"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-xl bg-slate-100 dark:bg-slate-950 flex items-center justify-center text-slate-400">📦</div>
                          <div>
                            <h4 className="text-xs font-black text-slate-800 dark:text-white">{prod.title}</h4>
                            <p className="text-[10px] text-slate-400 mt-0.5">₹{prod.price?.toLocaleString()} • MOQ {(prod as any).moq ?? 5}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => handleToggleWishlist(prod.title)}
                            className="p-2 text-xs text-slate-400 hover:text-rose-500 transition-colors"
                          >
                            Remove
                          </button>
                          <button 
                            onClick={() => setStatusMessage(`RFQ inquiry generated for ${prod.title}`)}
                            className="rounded-lg bg-[#FAB12F] text-slate-950 px-3 py-1.5 text-[10px] font-bold"
                          >
                            RFQ
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* 4. PROFILE TAB */}
            {activeTab === 'profile' && (
              <motion.div
                key="profile"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.18 }}
                className="space-y-6"
              >
                {/* Buyer Card Header */}
                <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex items-center gap-4 shadow-sm animate-fade-in">
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-amber-500 to-[#FAB12F] flex items-center justify-center text-xl font-bold text-slate-950 shadow-md">
                    {(buyerProfile.businessName || 'Anika Sharma').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white">{buyerProfile.businessName}</h3>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5 font-bold">Verified Trade Buyer</p>
                    <span className="mt-1.5 inline-flex rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-400">
                      🏢 MSME Sourcing Division
                    </span>
                  </div>
                </div>

                {/* Sourcing Timeline */}
                <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Active Procurement Orders</h3>
                  {buyerProfile.orderTracking && buyerProfile.orderTracking.length > 0 ? (
                    <div className="space-y-4">
                      {buyerProfile.orderTracking.map((ord, idx) => (
                        <div key={idx} className="relative pl-6 border-l-2 border-[#FAB12F]/30 pb-1">
                          <div className="absolute -left-[7px] top-1 h-3.5 w-3.5 rounded-full bg-[#FAB12F] border-2 border-white dark:border-slate-900 shadow-sm" />
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-black text-slate-800 dark:text-white">{ord.title}</h4>
                              <span className="text-[10px] bg-[#FAB12F]/10 text-[#f59e0b] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">{ord.status}</span>
                            </div>
                            <p className="text-[10px] text-slate-500">Order ID: {ord.orderId} • Sourced from {sellerProfile.businessName}</p>
                            <p className="text-[10px] font-semibold text-slate-650 dark:text-slate-400">📅 Estimated ETA: {ord.eta}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">No active procurement lines running.</p>
                  )}
                </div>

                {/* Review History */}
                <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Corporate Review Ledger</h3>
                  {buyerProfile.reviewHistory && buyerProfile.reviewHistory.length > 0 ? (
                    <div className="space-y-3">
                      {buyerProfile.reviewHistory.map((rev, idx) => (
                        <div key={idx} className="text-xs border-b border-slate-100 dark:border-slate-800/40 pb-2 last:border-0 last:pb-0">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800 dark:text-white">{rev.productTitle}</span>
                            <span className="text-amber-500 font-bold">{'★'.repeat(rev.rating)}</span>
                          </div>
                          <p className="text-slate-500 mt-1 italic">"{rev.comment}"</p>
                          <span className="text-[9px] text-slate-400 mt-1 block">Reviewed on {rev.createdAt}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">No review logs available.</p>
                  )}
                </div>
              </motion.div>
            )}

            {/* 5. MORE / SETTINGS TAB */}
            {activeTab === 'more' && (
              <motion.div
                key="more"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.18 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">System & Settings</h2>
                  <p className="text-xs text-slate-500 font-semibold mt-1">Configure your B2B marketplace parameters.</p>
                </div>

                {/* Seller Cockpit link banner */}
                <div className="rounded-3xl bg-gradient-to-r from-amber-500/20 to-orange-500/10 border border-[#f3d9a7] p-5 flex items-center justify-between gap-4 shadow-sm">
                  <div className="space-y-1">
                    <h3 className="text-sm font-black text-[#1f2937] dark:text-white">Seller Dashboard Access</h3>
                    <p className="text-[10px] text-slate-650 dark:text-slate-300 font-semibold">Manage live listings, view sales reports, and track leads.</p>
                  </div>
                  <Button 
                    variant="primary" 
                    size="sm"
                    onClick={() => {
                      if (typeof window !== 'undefined') window.location.href = '/dashboard';
                    }}
                    className="rounded-xl bg-[#FAB12F] hover:bg-[#e09e1b] text-slate-900 font-bold shadow-sm"
                  >
                    Open Dashboard
                  </Button>
                </div>

                {/* Sandbox Toggle */}
                <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-black text-slate-850 dark:text-white">Quick Seller Sandbox Workspace</h3>
                      <p className="text-[10px] text-slate-500 mt-0.5">Toggle local listing creation and mock analytics views in-place.</p>
                    </div>
                    <button 
                      onClick={() => setShowSellerSandbox(!showSellerSandbox)}
                      className={`h-6 w-11 rounded-full p-0.5 transition-colors duration-200 outline-none ${
                        showSellerSandbox ? 'bg-[#FAB12F]' : 'bg-slate-200 dark:bg-slate-800'
                      }`}
                    >
                      <div className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                        showSellerSandbox ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>

                  {showSellerSandbox && (
                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-6">
                      
                      {/* Product Management Sandbox */}
                      <article className="space-y-4">
                        <div className="space-y-1">
                          <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">Add Sandbox Product</h4>
                          <p className="text-[10px] text-slate-400">Add mock listings directly to test local rendering.</p>
                        </div>
                        
                        <div className="grid gap-3 grid-cols-2">
                          <input className="rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent p-3 text-xs" placeholder="Product title" value={productDraft.title} onChange={(e) => setProductDraft((prev) => ({ ...prev, title: e.target.value }))} />
                          <input className="rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent p-3 text-xs" placeholder="Category" value={productDraft.category} onChange={(e) => setProductDraft((prev) => ({ ...prev, category: e.target.value }))} />
                        </div>
                        
                        <textarea className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent p-3 text-xs" placeholder="Product description" value={productDraft.description} onChange={(e) => setProductDraft((prev) => ({ ...prev, description: e.target.value }))} />
                        
                        {caps.aiDescriptions && (
                          <button
                            className="rounded-lg border border-[#FAB12F] px-3 py-2 text-[10px] font-bold text-[#FAB12F] hover:bg-[#FAB12F]/10 transition-colors disabled:opacity-50"
                            onClick={handleGenerateAIDescription}
                            disabled={isGenerating}
                          >
                            {isGenerating ? 'Generating Description...' : 'Generate AI Description'}
                          </button>
                        )}
                        
                        <div className="grid gap-3 grid-cols-3">
                          <input className="rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent p-3 text-xs" placeholder="Features (comma)" value={productDraft.featureInput} onChange={(e) => setProductDraft((prev) => ({ ...prev, featureInput: e.target.value }))} />
                          <input className="rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent p-3 text-xs" placeholder="Specs (key:value)" value={productDraft.specInput} onChange={(e) => setProductDraft((prev) => ({ ...prev, specInput: e.target.value }))} />
                          <input className="rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent p-3 text-xs" placeholder="Tags (comma)" value={productDraft.tagInput} onChange={(e) => setProductDraft((prev) => ({ ...prev, tagInput: e.target.value }))} />
                        </div>

                        <label className="block rounded-xl border border-dashed border-slate-350 dark:border-slate-800 p-4 text-center text-xs cursor-pointer">
                          Upload images (Auto-compress enabled)
                          <input className="hidden" multiple type="file" accept="image/*" onChange={(e) => {
                            handleProductImages(e.target.files).catch(() => setStatusMessage('Image upload failed.'));
                          }} />
                        </label>

                        {uploadedImages.length > 0 && (
                          <div className="flex gap-2 overflow-x-auto pb-1">
                            {uploadedImages.map((src) => (
                              <img key={src} src={src} alt="Upload" className="h-16 w-16 rounded-xl object-cover" />
                            ))}
                          </div>
                        )}

                        <div className="flex justify-start">
                          <button
                            className="rounded-xl bg-[#FAB12F] hover:bg-[#e09e1b] px-4 py-2.5 text-xs font-black text-slate-950 shadow-md"
                            onClick={saveDraftProduct}
                          >
                            Save Product
                          </button>
                        </div>
                      </article>

                      {/* Mock analytics widgets */}
                      <article className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">Quick Analytics Widget</h4>
                        <div className="grid gap-2 grid-cols-2 sm:grid-cols-4">
                          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-3"><p className="text-[10px] text-slate-400">Views</p><p className="text-lg font-bold">{products.reduce((s, p) => s + (p.analytics?.views || 0), 0)}</p></div>
                          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-3"><p className="text-[10px] text-slate-400">Sales</p><p className="text-lg font-bold">{products.reduce((s, p) => s + (p.analytics?.salesCount || 0), 0)}</p></div>
                          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-3"><p className="text-[10px] text-slate-400">Revenue</p><p className="text-lg font-bold">₹{totalRevenue.toLocaleString()}</p></div>
                          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-3"><p className="text-[10px] text-slate-400">Store Theme</p><p className="text-xs font-bold truncate mt-1">{storeTheme}</p></div>
                        </div>
                      </article>
                    </div>
                  )}
                </div>

                {/* Developer / system info */}
                <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">System Information</h3>
                  <div className="text-xs space-y-2 text-slate-600 dark:text-slate-400">
                    <p className="flex justify-between"><span>App Version</span><span className="font-bold">v1.2.0</span></p>
                    <p className="flex justify-between"><span>Active Sourcing Plan</span><span className="font-bold text-[#FAB12F] uppercase">{plan}</span></p>
                    <p className="flex justify-between"><span>Network Status</span><span className="font-bold text-emerald-500">🟢 Online</span></p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Dynamic Status/Error floating notifications */}
        {statusMessage && (
          <div className="fixed bottom-24 inset-x-4 z-50 rounded-2xl border border-amber-300 bg-amber-50 dark:bg-amber-950 p-4 text-xs font-black text-amber-900 dark:text-amber-100 flex items-center gap-2 shadow-lg animate-fade-in max-w-md mx-auto">
            <span>ℹ️</span> {statusMessage}
          </div>
        )}

        {/* Floating WhatsApp Quick Link */}
        <a 
          href="https://wa.me/919876543210?text=Hello!%20I%20have%20an%20inquiry%20regarding%20the%20marketplace.store%20products."
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] right-4 z-40 h-12 w-12 rounded-full bg-emerald-500 hover:bg-emerald-600 shadow-xl flex items-center justify-center text-white text-2xl hover:scale-105 active:scale-95 transition-transform"
          title="Direct Support on WhatsApp"
        >
          💬
        </a>

        {/* Floating Back to top Button */}
        {showScrollTop && (
          <button 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="fixed bottom-[calc(env(safe-area-inset-bottom)+9rem)] right-4 z-40 h-10 w-10 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg flex items-center justify-center text-slate-500 text-sm hover:scale-105 active:scale-95 transition-transform"
            title="Back to Top"
          >
            ▲
          </button>
        )}

        {/* Mobile Bottom Navigation Bar (Buyer View) */}
        <nav 
          className="fixed bottom-0 inset-x-0 z-50 flex items-center justify-around border-t border-slate-200 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl px-2 pt-2.5 pb-[calc(env(safe-area-inset-bottom)+0.6rem)] shadow-[0_-8px_30px_rgba(0,0,0,0.05)] rounded-t-[20px]"
          aria-label="Buyer Mobile Navigation"
        >
          {[
            { id: 'home', label: 'Home', icon: '🏠' },
            { id: 'search', label: 'Search', icon: '🔍' },
            { id: 'wishlist', label: 'Wishlist', icon: '❤️' },
            { id: 'profile', label: 'Profile', icon: '👤' },
            { id: 'more', label: 'More', icon: '☰' },
          ].map((tab) => {
            const activeState = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`relative flex flex-col items-center justify-center flex-1 py-1 px-2 rounded-2xl transition-all duration-200 text-center gap-1.5 outline-none ${
                  activeState ? 'text-accent-500 font-bold' : 'text-slate-500'
                }`}
              >
                <motion.span 
                  whileTap={{ scale: 0.9 }}
                  className={`text-xl flex items-center justify-center h-9 w-9 rounded-full transition-all duration-200 relative z-10 ${
                    activeState ? 'bg-accent-500/10 text-accent-500 shadow-inner' : 'bg-transparent'
                  }`}
                >
                  {tab.icon}
                </motion.span>
                <span className="text-[10px] font-bold tracking-wide leading-none z-10">{tab.label}</span>
                {activeState && (
                  <motion.div 
                    layoutId="buyerTabGlow"
                    className="absolute inset-0 bg-[#FAB12F]/5 rounded-2xl border border-[#FAB12F]/10 z-0"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </nav>

      </div>
    </div>
  );
}

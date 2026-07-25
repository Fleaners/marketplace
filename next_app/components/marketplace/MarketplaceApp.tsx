'use client';

import { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  subscribeProducts,
  subscribeUserProfile,
  createRfq,
  subscribeRfqs,
} from '../../lib/marketplace/firestore';
import { getFirebaseServices } from '../../lib/firebase';
import type {
  ProductRecord,
  SellerPlan,
  ShippingAddress,
  UserProfile,
  RfqRecord,
} from '../../lib/marketplace/types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { VersionAlert } from '../dashboard/VersionAlert';
import { Greeting } from '../dashboard/Greeting';

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

const TabWrapper = ({ children, className }: { children: React.ReactNode; className?: string }) => {
  const isTestMode = typeof window !== 'undefined' && (
    localStorage.getItem('use_mock_auth') === 'true' || 
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  );
  if (isTestMode) {
    return <div className={className}>{children}</div>;
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.18 }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

const AnimationContainer = ({ children }: { children: React.ReactNode }) => {
  const isTestMode = typeof window !== 'undefined' && (
    localStorage.getItem('use_mock_auth') === 'true' || 
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  );
  if (isTestMode) {
    return <>{children}</>;
  }
  return <AnimatePresence mode="wait">{children}</AnimatePresence>;
};

export default function MarketplaceApp() {
  const router = useRouter();
  const [isTestMode, setIsTestMode] = useState(false);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isMock = localStorage.getItem('use_mock_auth') === 'true' || 
                     window.location.hostname === 'localhost' ||
                     window.location.hostname === '127.0.0.1';
      setIsTestMode(isMock);
    }
  }, []);

  const [isDark, setIsDark] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [plan, setPlan] = useState<SellerPlan>('premium');
  const [activeTab, setActiveTab] = useState<'home' | 'search' | 'wishlist' | 'profile' | 'more'>('home');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [filterGstOnly, setFilterGstOnly] = useState(false);
  const [filterInStockOnly, setFilterInStockOnly] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showSellerSandbox, setShowSellerSandbox] = useState(false);

  // RFQ Engine states
  const [rfqs, setRfqs] = useState<RfqRecord[]>([]);
  const [isRfqModalOpen, setIsRfqModalOpen] = useState(false);
  const [rfqProductName, setRfqProductName] = useState('');
  const [rfqCategory, setRfqCategory] = useState('Industrial');
  const [rfqQuantity, setRfqQuantity] = useState(10);
  const [rfqBudget, setRfqBudget] = useState(5000);
  const [rfqLocation, setRfqLocation] = useState('Chennai');
  const [rfqDate, setRfqDate] = useState('2026-07-25');
  const [rfqNotes, setRfqNotes] = useState('');

  // Product detail modal state
  const [selectedProduct, setSelectedProduct] = useState<ProductRecord | null>(null);

  // Gemini B2B AI Assistant states
  const [geminiQuery, setGeminiQuery] = useState('');
  const [geminiLoading, setGeminiLoading] = useState(false);
  const [geminiResponse, setGeminiResponse] = useState('');

  useEffect(() => {
    setIsSearching(true);
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setIsSearching(false);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

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
  const totalRevenue = products.reduce((sum, item) => sum + (item.analytics?.revenue || 0), 0);

  // Sync products with Firestore real-time listener (fallback to localStorage initially)
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

    // Set up real-time listener to keep products updated
    const unsubscribeProducts = subscribeProducts((updatedList) => {
      setProducts(updatedList);
      try {
        localStorage.setItem('marketplace_products', JSON.stringify(updatedList));
      } catch (e) {}
    });

    // Set up profile listeners for real-time buyer & seller updates
    const unsubscribeSeller = subscribeUserProfile(sellerProfile.id, (profile) => {
      setSellerProfile(profile);
      try {
        localStorage.setItem('marketplace_seller_profile', JSON.stringify(profile));
      } catch (e) {}
    });

    const unsubscribeBuyer = subscribeUserProfile(buyerProfile.id, (profile) => {
      setBuyerProfile(profile);
      try {
        localStorage.setItem('marketplace_buyer_profile', JSON.stringify(profile));
      } catch (e) {}
    });

    const unsubscribeRfqs = subscribeRfqs(buyerProfile.id, (list) => {
      setRfqs(list);
    });

    return () => {
      unsubscribeProducts();
      unsubscribeSeller();
      unsubscribeBuyer();
      unsubscribeRfqs();
    };
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
      // Try Firebase Auth ID token first (Google/email sign-in)
      try {
        const services = await getFirebaseServices();
        if (services?.auth?.currentUser) {
          token = await services.auth.currentUser.getIdToken();
        }
      } catch (err) {
        console.warn('Could not get Firebase id token:', err);
      }
      // Fall back to legacy stored token
      if (!token && typeof window !== 'undefined') {
        token = localStorage.getItem('mp_backend_token') || '';
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

  // Gemini AI Search Sourcing Copilot Handler
  async function handleGeminiSourcingSearch() {
    const text = geminiQuery.trim();
    if (!text) return;

    setGeminiLoading(true);
    setGeminiResponse('Gemini is analyzing your sourcing intent...');

    try {
      let token = '';
      // Try Firebase Auth ID token first (Google/email sign-in)
      try {
        const services = await getFirebaseServices();
        if (services?.auth?.currentUser) {
          token = await services.auth.currentUser.getIdToken();
        }
      } catch (e) {}
      // Fall back to legacy stored token
      if (!token && typeof window !== 'undefined') {
        token = localStorage.getItem('mp_backend_token') || '';
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
          prompt: `Classify B2B sourcing intent: "${text}". Output Category, Search String, Max MOQ, and GST requirement, and write a summary.`,
          agentName: 'gemini'
        })
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || 'Gemini pipeline error.');
      }

      const answer = payload.answer || '';
      setGeminiResponse(answer);

      // Parse fields to apply client-side filters automatically
      try {
        const catMatch = answer.match(/Category:\s*([^\n\r]+)/i);
        const searchMatch = answer.match(/Search String:\s*([^\n\r]+)/i);
        const gstMatch = answer.match(/GST Only:\s*([^\n\r]+)/i);
        
        if (catMatch && catMatch[1]) {
          const cat = catMatch[1].replace(/[*_`]/g, '').trim();
          if (CATEGORIES.includes(cat)) {
            setSelectedCategory(cat);
          }
        }
        if (searchMatch && searchMatch[1]) {
          const queryStr = searchMatch[1].replace(/[*_`]/g, '').trim();
          if (queryStr && queryStr.toLowerCase() !== 'null' && queryStr.toLowerCase() !== 'none') {
            setSearchQuery(queryStr);
          }
        }
        if (gstMatch && gstMatch[1]) {
          const gstStr = gstMatch[1].toLowerCase();
          if (gstStr.includes('true') || gstStr.includes('yes')) {
            setFilterGstOnly(true);
          }
        }
      } catch (parseErr) {
        console.warn('Failed to auto-parse Gemini intent fields:', parseErr);
      }
    } catch (err: any) {
      console.error(err);
      setGeminiResponse(`Gemini was unable to complete the search query: ${err.message}`);
    } finally {
      setGeminiLoading(false);
    }
  }

  // Handle RFQ Submission to Firestore
  async function handleSubmitRfq(e: React.FormEvent) {
    e.preventDefault();
    if (!rfqProductName.trim()) {
      setStatusMessage('Product Name is required to post an RFQ.');
      return;
    }

    const rfqRecord: RfqRecord = {
      id: `rfq-${Date.now()}`,
      buyerId: buyerProfile.id,
      buyerName: buyerProfile.businessName || 'Anika Sharma',
      productName: rfqProductName,
      category: rfqCategory,
      quantity: Number(rfqQuantity) || 1,
      budget: Number(rfqBudget) || 0,
      deliveryLocation: rfqLocation,
      deliveryDate: rfqDate,
      notes: rfqNotes,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    try {
      await createRfq(rfqRecord);
      setRfqs((prev) => [rfqRecord, ...prev]);
      setIsRfqModalOpen(false);
      
      // Reset form
      setRfqProductName('');
      setRfqQuantity(10);
      setRfqBudget(5000);
      setRfqNotes('');
      
      setStatusMessage(`RFQ posted successfully! Verifying seller availability...`);
      setTimeout(() => setStatusMessage(''), 4000);
    } catch (err: any) {
      console.error(err);
      setStatusMessage(`Failed to submit RFQ: ${err.message}`);
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
      const matchesSearch = !debouncedSearchQuery.trim() || 
        prod.title.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        prod.description.toLowerCase().includes(debouncedSearchQuery.toLowerCase());
      const matchesGst = !filterGstOnly || (prod as any).gst !== false;
      const matchesStock = !filterInStockOnly || ((prod as any).stock ?? 5) > 0;

      return matchesCategory && matchesSearch && matchesGst && matchesStock;
    });
  }, [products, selectedCategory, debouncedSearchQuery, filterGstOnly, filterInStockOnly]);

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
          <AnimationContainer>
            {/* 1. HOME TAB */}
            {activeTab === 'home' && (
              <TabWrapper className="space-y-6">
                <Greeting />

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

                {/* Gemini AI Search Sourcing Copilot Card */}
                <div className="relative rounded-3xl border border-[#f3d9a7] bg-gradient-to-br from-[#fffdfa] to-[#fff6e6] dark:from-slate-900 dark:to-indigo-950/20 p-5 shadow-sm space-y-4 overflow-hidden">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">✨</span>
                    <div>
                      <h4 className="text-sm font-black text-slate-900 dark:text-white">Gemini B2B AI Assistant</h4>
                      <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Parse natural language requests into instant directory filters.</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="relative">
                      <textarea
                        rows={2}
                        value={geminiQuery}
                        onChange={(e) => setGeminiQuery(e.target.value)}
                        placeholder="e.g. Find electrical core grounding cables with low MOQ and GST verification..."
                        className="w-full rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 p-3 text-xs focus:outline-none focus:border-[#FAB12F] focus:ring-1 focus:ring-[#FAB12F] transition-colors resize-none font-medium leading-relaxed"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          onClick={() => setGeminiQuery('Find industrial water pumps with MOQ under 3')}
                          className="rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 px-2.5 py-1 text-[9px] font-bold text-slate-600 dark:text-slate-400"
                        >
                          "Pumps MOQ &lt; 3"
                        </button>
                        <button
                          onClick={() => setGeminiQuery('Show GST verified electrical components')}
                          className="rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 px-2.5 py-1 text-[9px] font-bold text-slate-600 dark:text-slate-400"
                        >
                          "GST Electricals"
                        </button>
                      </div>

                      <Button
                        variant="primary"
                        size="sm"
                        disabled={geminiLoading}
                        onClick={handleGeminiSourcingSearch}
                        className="rounded-xl bg-[#FAB12F] hover:bg-[#e09e1b] text-slate-950 font-extrabold text-[10px] shadow-sm flex items-center gap-1.5 shrink-0"
                      >
                        {geminiLoading ? (
                          <>
                            <span className="h-3 w-3 border-2 border-slate-950 border-t-transparent rounded-full animate-spin mr-1" />
                            Analyzing...
                          </>
                        ) : (
                          <>
                            <span>✨</span> Search with AI
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {geminiResponse && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="rounded-2xl bg-white/70 dark:bg-slate-950/60 p-3.5 border border-[#f3d9a7]/40 dark:border-slate-800 text-[11px] leading-relaxed font-sans text-slate-800 dark:text-slate-200 shadow-inner"
                    >
                      <p className="font-extrabold text-[#FAB12F] uppercase tracking-wider text-[9px] mb-1">AI Sourcing Analysis</p>
                      <div className="whitespace-pre-line font-medium">{geminiResponse}</div>
                      <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[9px] text-slate-400">
                        <span>Filters applied automatically</span>
                        <button
                          onClick={() => {
                            setGeminiQuery('');
                            setGeminiResponse('');
                            setSelectedCategory('All');
                            setSearchQuery('');
                            setFilterGstOnly(false);
                          }}
                          className="text-amber-600 hover:underline font-bold"
                        >
                          Clear Filters
                        </button>
                      </div>
                    </motion.div>
                  )}
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

                  {isSearching ? (
                    <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
                      {[1, 2, 3].map((idx) => (
                        <div key={idx} className="animate-pulse rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 flex flex-col justify-between h-[300px]">
                          <div className="aspect-square rounded-2xl bg-slate-200 dark:bg-slate-850 w-full" />
                          <div className="space-y-2 mt-3 flex-1 flex flex-col justify-end">
                            <div className="h-4 bg-slate-200 dark:bg-slate-850 rounded w-3/4" />
                            <div className="h-3 bg-slate-200 dark:bg-slate-850 rounded w-1/2" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : filteredProducts.length === 0 ? (
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
                            className="group flex flex-col justify-between rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-sm hover:shadow-md transition-all relative cursor-pointer"
                            onClick={() => setSelectedProduct(prod)}
                          >
                            <div>
                              {/* Product Image area */}
                              <div className="relative aspect-square rounded-2xl bg-slate-100 dark:bg-slate-950 overflow-hidden flex items-center justify-center border border-slate-100 dark:border-slate-800">
                                {prod.images?.[0] ? (
                                  <img src={prod.images?.[0]} alt={prod.title} className="h-full w-full object-cover" />
                                ) : (
                                  <div className="text-slate-400 text-3xl font-light">📦</div>
                                )}
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleWishlist(prod.title);
                                  }}
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
                                  onClick={(e) => e.stopPropagation()}
                                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] py-2 text-center transition-colors flex items-center justify-center gap-1 shadow-sm"
                                >
                                  💬 Chat
                                </a>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setRfqProductName(prod.title);
                                    setRfqCategory(prod.categories?.[0] || 'Industrial');
                                    setIsRfqModalOpen(true);
                                  }}
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
                      router.push('/dashboard');
                    }}
                    className="rounded-xl bg-[#FAB12F] hover:bg-[#e09e1b] text-slate-900 font-extrabold shadow-[0_8px_20px_rgba(250,177,47,0.25)]"
                  >
                    Open Seller Cockpit
                  </Button>
                </div>
              </TabWrapper>
            )}

            {/* 2. SEARCH TAB */}
            {activeTab === 'search' && (
              <TabWrapper className="space-y-6">
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
              </TabWrapper>
            )}

            {/* 3. WISHLIST TAB */}
            {activeTab === 'wishlist' && (
              <TabWrapper className="space-y-6">
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
              </TabWrapper>
            )}

            {/* 4. PROFILE TAB */}
            {activeTab === 'profile' && (
              <TabWrapper className="space-y-6">
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

                {/* RFQ Sourcing Registry */}
                <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Live RFQ Registry</h3>
                    <button
                      onClick={() => {
                        setRfqProductName('');
                        setIsRfqModalOpen(true);
                      }}
                      className="rounded-xl bg-[#FAB12F] text-slate-950 px-3 py-1.5 text-[10px] font-black shadow-sm flex items-center gap-1 hover:bg-[#e09e1b] transition-colors animate-pulse-slow"
                    >
                      + Create RFQ
                    </button>
                  </div>
                  {rfqs && rfqs.length > 0 ? (
                    <div className="space-y-3">
                      {rfqs.map((rfq) => (
                        <div key={rfq.id} className="p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/20 text-xs space-y-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-black text-slate-800 dark:text-white">{rfq.productName}</h4>
                              <p className="text-[10px] text-slate-400 mt-0.5">Category: {rfq.category} • Budget: ₹{rfq.budget?.toLocaleString()}</p>
                            </div>
                            <span className="text-[9px] bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                              {rfq.status}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 line-clamp-2">{rfq.notes}</p>
                          <div className="flex items-center justify-between text-[9px] text-slate-400 dark:text-slate-500 font-semibold pt-1.5 border-t border-slate-100 dark:border-slate-800/40">
                            <span>Qty: {rfq.quantity} units • {rfq.deliveryLocation}</span>
                            <span>ETA: {rfq.deliveryDate}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">No active RFQs posted. Click "Create RFQ" to post your sourcing requirement.</p>
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
              </TabWrapper>
            )}

            {/* 5. MORE / SETTINGS TAB */}
            {activeTab === 'more' && (
              <TabWrapper className="space-y-6">
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
                      router.push('/dashboard');
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
              </TabWrapper>
            )}
          </AnimationContainer>
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

        <VersionAlert />

        {/* Product Details Modal Overlay */}
        <AnimatePresence>
          {selectedProduct && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm"
              onClick={() => setSelectedProduct(null)}
            >
              <motion.div
                initial={{ scale: 0.95, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 15 }}
                transition={{ duration: 0.2 }}
                className="w-full max-w-lg rounded-[32px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl relative max-h-[85vh] overflow-y-auto space-y-5"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header Actions */}
                <div className="flex justify-between items-start">
                  <span className="rounded-full bg-[#FAB12F]/10 border border-[#FAB12F]/20 px-3 py-1 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                    🏬 Verified B2B Listing
                  </span>
                  <button
                    onClick={() => setSelectedProduct(null)}
                    className="h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 flex items-center justify-center text-sm font-bold text-slate-500 dark:text-slate-400 transition-colors"
                  >
                    ✕
                  </button>
                </div>

                {/* Image Gallery */}
                <div className="aspect-video w-full rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 overflow-hidden flex items-center justify-center">
                  {selectedProduct.images && selectedProduct.images[0] ? (
                    <img src={selectedProduct.images[0]} alt={selectedProduct.title} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-slate-350 text-4xl">📦</span>
                  )}
                </div>

                {/* Details */}
                <div className="space-y-2">
                  <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight tracking-tight">
                    {selectedProduct.title}
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {selectedProduct.description}
                  </p>
                </div>

                {/* HSN & GST compliance info */}
                <div className="grid gap-2 grid-cols-3 rounded-2xl bg-slate-50 dark:bg-slate-950 p-3 text-[10px] border border-slate-100 dark:border-slate-850">
                  <div className="text-center border-r border-slate-200 dark:border-slate-800 last:border-0 pr-2">
                    <span className="block text-slate-450 uppercase font-black tracking-wider text-[8px]">HSN Code</span>
                    <span className="font-extrabold text-slate-800 dark:text-slate-200 mt-0.5 block">{(selectedProduct as any).sku || '8544-4920'}</span>
                  </div>
                  <div className="text-center border-r border-slate-200 dark:border-slate-800 last:border-0 px-2">
                    <span className="block text-slate-450 uppercase font-black tracking-wider text-[8px]">GST Slab</span>
                    <span className="font-extrabold text-slate-800 dark:text-slate-200 mt-0.5 block">{(selectedProduct as any).gst !== false ? '18% IGST' : 'Exempt'}</span>
                  </div>
                  <div className="text-center last:border-0 pl-2">
                    <span className="block text-slate-450 uppercase font-black tracking-wider text-[8px]">Delivery</span>
                    <span className="font-extrabold text-slate-800 dark:text-slate-200 mt-0.5 block">{(selectedProduct as any).delivery || '3-5 Days'}</span>
                  </div>
                </div>

                {/* Specifications List */}
                <div className="space-y-2">
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-450">Technical Specifications</h4>
                  <div className="rounded-2xl border border-slate-100 dark:border-slate-800/80 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 text-[10px]">
                    <div className="flex justify-between p-2.5 bg-slate-50/50 dark:bg-slate-950/10">
                      <span className="font-semibold text-slate-400">Minimum Order Quantity (MOQ)</span>
                      <span className="font-extrabold text-slate-850 dark:text-slate-200">{(selectedProduct as any).moq ?? 5} units</span>
                    </div>
                    <div className="flex justify-between p-2.5">
                      <span className="font-semibold text-slate-400">Stock Availability</span>
                      <span className="font-extrabold text-slate-850 dark:text-slate-200">{(selectedProduct as any).stock ?? 50} units</span>
                    </div>
                    {selectedProduct.specifications && Object.entries(selectedProduct.specifications).map(([k, v]) => (
                      <div key={k} className="flex justify-between p-2.5">
                        <span className="font-semibold text-slate-400 capitalize">{k}</span>
                        <span className="font-extrabold text-slate-850 dark:text-slate-200">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sourcing Actions */}
                <div className="grid gap-2 grid-cols-2 pt-2">
                  <a
                    href={`https://wa.me/${selectedProduct.whatsapp || '919876543210'}?text=Hello!%20Interested%20in%2520bulk%2520quote%252520for%252520${encodeURIComponent(selectedProduct.title)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-3 text-center transition-colors shadow-sm flex items-center justify-center gap-1.5"
                  >
                    💬 WhatsApp Chat
                  </a>
                  <button
                    onClick={() => {
                      setRfqProductName(selectedProduct.title);
                      setRfqCategory(selectedProduct.categories?.[0] || 'Industrial');
                      setSelectedProduct(null);
                      setIsRfqModalOpen(true);
                    }}
                    className="rounded-2xl bg-[#FAB12F] hover:bg-[#e09e1b] text-slate-950 font-extrabold text-xs py-3 shadow-md flex items-center justify-center gap-1.5"
                  >
                    ⚡ Submit B2B RFQ
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* RFQ Creation Modal Dialog */}
        <AnimatePresence>
          {isRfqModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm"
              onClick={() => setIsRfqModalOpen(false)}
            >
              <motion.div
                initial={{ scale: 0.95, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 15 }}
                transition={{ duration: 0.2 }}
                className="w-full max-w-md rounded-[32px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl relative space-y-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Post Sourcing RFQ</h3>
                  <button
                    onClick={() => setIsRfqModalOpen(false)}
                    className="h-7 w-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-500 dark:text-slate-400"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleSubmitRfq} className="space-y-3.5 text-xs">
                  <div className="space-y-1">
                    <label className="font-extrabold text-slate-500">Product/Component Name</label>
                    <input
                      type="text"
                      required
                      value={rfqProductName}
                      onChange={(e) => setRfqProductName(e.target.value)}
                      placeholder="e.g. Copper Cable Bundle"
                      className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 p-2.5 focus:outline-none focus:border-[#FAB12F]"
                    />
                  </div>

                  <div className="grid gap-3 grid-cols-2">
                    <div className="space-y-1">
                      <label className="font-extrabold text-slate-500">Required Quantity</label>
                      <input
                        type="number"
                        min={1}
                        required
                        value={rfqQuantity}
                        onChange={(e) => setRfqQuantity(Number(e.target.value))}
                        className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 p-2.5 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-extrabold text-slate-500">Target Unit Budget (₹)</label>
                      <input
                        type="number"
                        min={1}
                        required
                        value={rfqBudget}
                        onChange={(e) => setRfqBudget(Number(e.target.value))}
                        className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 p-2.5 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 grid-cols-2">
                    <div className="space-y-1">
                      <label className="font-extrabold text-slate-500">Delivery Location</label>
                      <input
                        type="text"
                        required
                        value={rfqLocation}
                        onChange={(e) => setRfqLocation(e.target.value)}
                        placeholder="City name"
                        className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 p-2.5 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-extrabold text-slate-500">Delivery ETA</label>
                      <input
                        type="date"
                        required
                        value={rfqDate}
                        onChange={(e) => setRfqDate(e.target.value)}
                        className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 p-2.5 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-extrabold text-slate-500">Detailed Sourcing Notes & Specs</label>
                    <textarea
                      rows={3}
                      value={rfqNotes}
                      onChange={(e) => setRfqNotes(e.target.value)}
                      placeholder="Specify dimensions, compliance standards, packaging, etc."
                      className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 p-2.5 focus:outline-none resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full rounded-2xl bg-[#FAB12F] hover:bg-[#e09e1b] text-slate-950 font-black py-3 text-center shadow-md transition-colors"
                  >
                    Submit Quotation Request
                  </button>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

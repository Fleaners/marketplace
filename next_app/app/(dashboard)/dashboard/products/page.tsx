'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ImageUploader } from '@/components/ui/ImageUploader';
import { navigationItems } from '@/lib/navigation';
import { Greeting } from '@/components/dashboard/Greeting';

interface Product {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  moq: number;
  stock: number;
  sku: string;
  unit: string;
  gst: boolean;
  delivery: string;
  tags: string[];
  whatsapp: string;
  images: string[];
  archived?: boolean;
}

const CATEGORIES = [
  'Industrial',
  'Electrical',
  'Hardware',
  'Chemicals',
  'Packaging',
  'Safety Components',
  'Agriculture',
  'Office Supplies',
];

const UNITS = [
  'Pieces',
  'Meters',
  'Kilograms',
  'Liters',
  'Boxes',
  'Packs',
  'Tons',
];

function ProductsCatalog() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const shouldOpenNewForm = searchParams.get('new') === 'true';

  // State
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'live' | 'low_stock' | 'archived'>('all');
  
  // Modal/Drawer States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form Field States
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState(CATEGORIES[0]);
  const [formDescription, setFormDescription] = useState('');
  const [formPrice, setFormPrice] = useState<number | ''>('');
  const [formMoq, setFormMoq] = useState<number | ''>('');
  const [formStock, setFormStock] = useState<number | ''>('');
  const [formSku, setFormSku] = useState('');
  const [formUnit, setFormUnit] = useState(UNITS[0]);
  const [formGst, setFormGst] = useState(true);
  const [formDelivery, setFormDelivery] = useState('3-5 days');
  const [formWhatsapp, setFormWhatsapp] = useState('919876543210');
  const [formTags, setFormTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [formImages, setFormImages] = useState<string[]>([]);

  // Validation state
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Initial Seed / Fetch
  useEffect(() => {
    try {
      const stored = localStorage.getItem('marketplace_products');
      if (stored) {
        setProducts(JSON.parse(stored));
      } else {
        const defaultProducts: Product[] = [
          { id: '1', name: 'Industrial Water Pump', category: 'Industrial', description: 'Heavy duty centrifugal water pump suited for high pressure flow rate industrial operations. Engineered with premium raw copper winding and dynamic balancing system.', price: 14500, moq: 2, stock: 15, sku: 'WP-IND-100', unit: 'Pieces', gst: true, delivery: '2-3 days', tags: ['Pumps', 'Heavy Duty', 'Centrifugal'], whatsapp: '919876543210', images: [] },
          { id: '2', name: 'Heavy Duty Adhesive Sealant', category: 'Industrial', description: 'Premium grade, super high strength polyurethane adhesive sealant. Ideal for high density joints, hardware bonding, and structural sealing.', price: 450, moq: 10, stock: 3, sku: 'AD-HD-450', unit: 'Pieces', gst: true, delivery: 'Next day', tags: ['Adhesives', 'Hardware', 'Bonding'], whatsapp: '919876543210', images: [] },
          { id: '3', name: 'Copper Core Grounding Wire', category: 'Electrical', description: 'Premium grade pure copper grounding cable designed for protective earth systems and electrical leakage prevention. Fully conforming with ISI standard certifications.', price: 1200, moq: 5, stock: 25, sku: 'EL-CC-GND', unit: 'Meters', gst: true, delivery: '3-5 days', tags: ['Electrical', 'Wiring', 'Copper'], whatsapp: '919876543210', images: [] },
          { id: '4', name: 'Brass Coupling Joints (1/2 Inch)', category: 'Hardware', description: 'Ultra durable solid brass coupler, designed for secure hydraulic pipe connections. Corrosion resistant construction with high temperature threshold tolerance.', price: 85, moq: 20, stock: 2, sku: 'HW-BCJ-12', unit: 'Pieces', gst: false, delivery: '2-4 days', tags: ['Plumbing', 'Brass', 'Pipes'], whatsapp: '919876543210', images: [] },
        ];
        localStorage.setItem('marketplace_products', JSON.stringify(defaultProducts));
        setProducts(defaultProducts);
      }
    } catch (e) {
      console.error('Failed to load products from storage', e);
    }
  }, []);

  // Handle URL Parameter to trigger drawer
  useEffect(() => {
    if (shouldOpenNewForm) {
      openAddForm();
      // Clean query parameter after trigger to avoid loop
      router.replace('/dashboard/products');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldOpenNewForm]);

  // Save products
  const saveProductsToStorage = (updatedList: Product[]) => {
    setProducts(updatedList);
    localStorage.setItem('marketplace_products', JSON.stringify(updatedList));
  };

  // Form State Triggers
  const openAddForm = () => {
    setEditingProduct(null);
    setFormName('');
    setFormCategory(CATEGORIES[0]);
    setFormDescription('');
    setFormPrice('');
    setFormMoq('');
    setFormStock('');
    setFormSku(`SKU-${Math.floor(100000 + Math.random() * 900000)}`);
    setFormUnit(UNITS[0]);
    setFormGst(true);
    setFormDelivery('2-3 days');
    setFormWhatsapp('919876543210');
    setFormTags([]);
    setFormImages([]);
    setFormErrors({});
    setIsFormOpen(true);
  };

  const openEditForm = (prod: Product) => {
    setEditingProduct(prod);
    setFormName(prod.name);
    setFormCategory(prod.category);
    setFormDescription(prod.description);
    setFormPrice(prod.price);
    setFormMoq(prod.moq);
    setFormStock(prod.stock);
    setFormSku(prod.sku);
    setFormUnit(prod.unit);
    setFormGst(prod.gst);
    setFormDelivery(prod.delivery);
    setFormWhatsapp(prod.whatsapp || '919876543210');
    setFormTags(prod.tags || []);
    setFormImages(prod.images || []);
    setFormErrors({});
    setIsFormOpen(true);
  };

  // Add Tag Pill
  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = tagInput.trim().replace(/,/g, '');
      if (val && !formTags.includes(val)) {
        setFormTags([...formTags, val]);
      }
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormTags(formTags.filter((t) => t !== tagToRemove));
  };

  // Validate form
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formName.trim()) errors.name = 'Product name is required';
    if (!formCategory) errors.category = 'Category is required';
    if (!formDescription.trim()) errors.description = 'Description is required';
    if (formPrice === '' || Number(formPrice) <= 0) errors.price = 'Price must be a positive number';
    if (formMoq === '' || Number(formMoq) < 1) errors.moq = 'MOQ must be at least 1 piece';
    if (formStock === '' || Number(formStock) < 0) errors.stock = 'Stock must be 0 or more';
    if (!formSku.trim()) errors.sku = 'SKU Code is required';
    if (!formDelivery.trim()) errors.delivery = 'Delivery timeframe is required';
    if (!formWhatsapp.trim() || !formWhatsapp.match(/^\d{10,14}$/)) {
      errors.whatsapp = 'Valid WhatsApp number is required (e.g. 919876543210)';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Save product (Add or Edit)
  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const targetProduct: Product = {
      id: editingProduct ? editingProduct.id : Date.now().toString(),
      name: formName,
      category: formCategory,
      description: formDescription,
      price: Number(formPrice),
      moq: Number(formMoq),
      stock: Number(formStock),
      sku: formSku,
      unit: formUnit,
      gst: formGst,
      delivery: formDelivery,
      whatsapp: formWhatsapp,
      tags: formTags,
      images: formImages,
      archived: editingProduct ? editingProduct.archived : false,
    };

    let updatedProducts: Product[];
    if (editingProduct) {
      updatedProducts = products.map((p) => (p.id === editingProduct.id ? targetProduct : p));
    } else {
      updatedProducts = [targetProduct, ...products];
    }

    saveProductsToStorage(updatedProducts);
    setIsFormOpen(false);
  };

  // Duplicate product
  const handleDuplicateProduct = (prod: Product) => {
    const duplicated: Product = {
      ...prod,
      id: Date.now().toString(),
      name: `${prod.name} (Copy)`,
      sku: `${prod.sku}-COPY-${Math.floor(100 + Math.random() * 900)}`,
      stock: 0, // Reset stock for copies to prevent inventory inflation
    };
    const updated = [duplicated, ...products];
    saveProductsToStorage(updated);
  };

  // Toggle Archive
  const handleToggleArchive = (prod: Product) => {
    const updated = products.map((p) =>
      p.id === prod.id ? { ...p, archived: !p.archived } : p
    );
    saveProductsToStorage(updated);
  };

  // Delete product Trigger
  const handleDeleteTrigger = (id: string) => {
    setDeleteConfirmId(id);
  };

  const handleConfirmDelete = () => {
    if (deleteConfirmId) {
      const updated = products.filter((p) => p.id !== deleteConfirmId);
      saveProductsToStorage(updated);
      setDeleteConfirmId(null);
    }
  };

  // Filtering Products
  const filteredProducts = products.filter((p) => {
    // Search filter
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.tags || []).some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

    // Category filter
    const matchesCategory = categoryFilter === '' || p.category === categoryFilter;

    // Tab filter
    let matchesTab = true;
    if (activeTab === 'live') {
      matchesTab = !p.archived && p.stock > p.moq;
    } else if (activeTab === 'low_stock') {
      matchesTab = !p.archived && p.stock <= p.moq;
    } else if (activeTab === 'archived') {
      matchesTab = !!p.archived;
    } else {
      // 'all' includes active items (not archived), or everything? Standard dashboard: 'all' excludes archived unless activeTab is 'archived'
      matchesTab = !p.archived;
    }

    return matchesSearch && matchesCategory && matchesTab;
  });

  return (
    <DashboardLayout
      navigationItems={navigationItems}
      user={{ name: 'Gaurav Enterprise', email: 'partner@dealerconnect.in' }}
      topBarProps={{
        pageTitle: 'Products Catalog',
        breadcrumbs: [{ label: 'Cockpit', href: '/dashboard' }, { label: 'Products' }],
        unreadNotifications: 3,
        onAddProduct: openAddForm,
      }}
    >
      <div className="space-y-6">
        {/* Header Action bar */}
        <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <Greeting />
          </div>
          <div>
            <Button
              variant="primary"
              size="md"
              onClick={openAddForm}
              className="rounded-xl flex items-center gap-2 shadow-[0_8px_20px_-6px_rgba(255,149,0,0.3)] hover:scale-[1.01] active:scale-[0.99] transition-all"
            >
              <span className="text-lg leading-none">+</span> Add New Product
            </Button>
          </div>
        </section>

        {/* Filters and Search Container */}
        <Card className="rounded-3xl border border-[#f3d9a7] bg-white p-6 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-3 flex items-center text-slate-500 text-sm">
                🔍
              </span>
              <input
                type="text"
                placeholder="Search products by name, SKU, tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-2xl bg-[#fff6e6] border border-[#f3d9a7] pl-10 pr-4 py-3 text-sm text-[#1f2937] focus:outline-none focus:border-accent-500 transition-colors placeholder:text-slate-500"
              />
            </div>

            {/* Category Select Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Category:
              </span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="rounded-2xl bg-[#fff6e6] border border-[#f3d9a7] px-4 py-3 text-sm text-[#1f2937] focus:outline-none focus:border-accent-500 transition-colors"
              >
                <option value="">All Categories</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Catalog Tab Selectors */}
          <div className="flex gap-2 border-b border-[#f3d9a7] pb-2 overflow-x-auto scrollbar-none">
            {(['all', 'live', 'low_stock', 'archived'] as const).map((tab) => {
              const count = products.filter((p) => {
                if (tab === 'live') return !p.archived && p.stock > p.moq;
                if (tab === 'low_stock') return !p.archived && p.stock <= p.moq;
                if (tab === 'archived') return !!p.archived;
                return !p.archived; // 'all' active
              }).length;

              const label =
                tab === 'all'
                  ? 'All Active'
                  : tab === 'live'
                  ? 'Live / In Stock'
                  : tab === 'low_stock'
                  ? '⚠️ Low Stock'
                  : '🗄️ Archived';

              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap ${
                    activeTab === tab
                      ? 'bg-[#FAB12F]/10 text-amber-600 border border-accent-500/20 shadow-inner'
                      : 'text-slate-500 hover:text-[#1f2937] border border-transparent'
                  }`}
                >
                  {label} ({count})
                </button>
              );
            })}
          </div>
        </Card>

        {/* Product Grid Layout */}
        {filteredProducts.length === 0 ? (
          <div className="rounded-[32px] border border-dashed border-[#f3d9a7] py-16 px-4 flex flex-col items-center justify-center text-center space-y-4">
            <span className="text-4xl">📦</span>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-[#1f2937]">No products found</h3>
              <p className="text-sm text-slate-500 max-w-sm">
                Try adjusting your search queries, category filters, or add a fresh product to get started.
              </p>
            </div>
            <Button variant="secondary" onClick={openAddForm} className="rounded-xl">
              Create New Listing
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {filteredProducts.map((prod) => {
              const isLowStock = prod.stock <= prod.moq;
              return (
                <Card
                  key={prod.id}
                  className={`group relative rounded-[28px] border overflow-hidden bg-white dark:bg-slate-900 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:border-slate-700/80 dark:hover:border-slate-650 hover:shadow-[0_16px_36px_-6px_rgba(0,0,0,0.05)] ${
                    prod.archived
                      ? 'border-[#f3d9a7] dark:border-slate-800 opacity-60'
                      : isLowStock
                      ? 'border-amber-500/20 dark:border-amber-500/10 hover:border-amber-500/40 shadow-[0_12px_24px_-10px_rgba(245,158,11,0.05)]'
                      : 'border-[#f3d9a7] dark:border-slate-850'
                  }`}
                >
                  <div>
                    {/* Header Image area */}
                    <div className="relative aspect-[16/10] bg-[#fff6e6] dark:bg-slate-950 border-b border-[#f3d9a7]/60 dark:border-slate-800/60 overflow-hidden flex items-center justify-center">
                      {prod.images && prod.images.length > 0 ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={prod.images[0]}
                          alt={prod.name}
                          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                      ) : (
                        <div className="text-4xl select-none opacity-40">🛠️</div>
                      )}

                      {/* Floating Status Badges */}
                      <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start">
                        <span className="rounded-md bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border border-[#f3d9a7] dark:border-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-650 dark:text-slate-300">
                          {prod.category}
                        </span>
                        {prod.gst && (
                          <span className="rounded-md bg-emerald-500/90 dark:bg-emerald-600/90 backdrop-blur-md border border-emerald-600 dark:border-emerald-700 px-2 py-0.5 text-[10px] font-bold text-slate-950 uppercase tracking-wide">
                            GST Benefit
                          </span>
                        )}
                      </div>

                      {/* stock alert badge */}
                      <div className="absolute top-3 right-3">
                        {prod.archived ? (
                          <span className="rounded-md bg-[#fff6e6]/95 dark:bg-slate-950 border border-[#f3d9a7] dark:border-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-500 uppercase">
                            Archived
                          </span>
                        ) : isLowStock ? (
                          <span className="rounded-md bg-amber-500/90 backdrop-blur-md border border-amber-600 px-2 py-0.5 text-[10px] font-extrabold text-slate-950 uppercase tracking-wide">
                            Low Stock: {prod.stock}
                          </span>
                        ) : (
                          <span className="rounded-md bg-emerald-500/10 dark:bg-emerald-500/20 backdrop-blur-md border border-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                            Stock: {prod.stock} {prod.unit}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Meta Content */}
                    <div className="p-5 space-y-3">
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-start gap-2">
                          <h3 className="text-base font-bold text-[#1f2937] dark:text-white line-clamp-1 group-hover:text-amber-600 transition-colors">
                            {prod.name}
                          </h3>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tracking-tight">
                          SKU: {prod.sku}
                        </p>
                      </div>

                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {prod.description}
                      </p>

                      {/* Specific metrics specs */}
                      <div className="grid grid-cols-2 gap-2 bg-[#fff6e6] dark:bg-slate-950 p-2.5 rounded-2xl border border-[#f3d9a7]/60 dark:border-slate-800/60 text-center">
                        <div>
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                            Min Order (MOQ)
                          </p>
                          <p className="text-xs font-bold text-[#1f2937] dark:text-white mt-0.5">
                            {prod.moq} {prod.unit}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                            Delivery
                          </p>
                          <p className="text-xs font-bold text-[#1f2937] dark:text-white mt-0.5">
                            {prod.delivery}
                          </p>
                        </div>
                      </div>

                      {/* Display pills tags */}
                      {prod.tags && prod.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {prod.tags.slice(0, 3).map((t) => (
                            <span
                              key={t}
                              className="text-[10px] font-medium bg-[#fff6e6] dark:bg-slate-950 border border-[#f3d9a7] dark:border-slate-800 px-2 py-0.5 rounded-full text-slate-500 dark:text-slate-400"
                            >
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions bottom tray */}
                  <div className="p-5 border-t border-[#f3d9a7]/80 dark:border-slate-850 bg-[#fff0db]/50 dark:bg-slate-950/40 flex items-center justify-between gap-4 rounded-b-[28px]">
                    <div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold">
                        Wholesale Price
                      </p>
                      <p className="text-lg font-black text-[#1f2937] dark:text-white">
                        ₹{prod.price.toLocaleString('en-IN')}{' '}
                        <span className="text-xs text-slate-500 font-medium">/ {prod.unit}</span>
                      </p>
                    </div>

                    {/* Icon options overlay */}
                    <div className="flex items-center gap-1.5">
                      {/* Edit Button */}
                      <button
                        onClick={() => openEditForm(prod)}
                        title="Edit Product"
                        className="h-9 w-9 rounded-xl bg-[#fff6e6] dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 border border-[#f3d9a7] dark:border-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:text-[#1f2937] dark:hover:text-white transition-all duration-200 active:scale-95"
                      >
                        ✏️
                      </button>

                      {/* Duplicate Button */}
                      <button
                        onClick={() => handleDuplicateProduct(prod)}
                        title="Duplicate Listing"
                        className="h-9 w-9 rounded-xl bg-[#fff6e6] dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 border border-[#f3d9a7] dark:border-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:text-[#1f2937] dark:hover:text-white transition-all duration-200 active:scale-95"
                      >
                        👥
                      </button>

                      {/* Archive Button */}
                      <button
                        onClick={() => handleToggleArchive(prod)}
                        title={prod.archived ? 'Activate Product' : 'Archive Product'}
                        className={`h-9 w-9 rounded-xl border flex items-center justify-center transition-all duration-200 active:scale-95 ${
                          prod.archived
                            ? 'bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-900 text-amber-700 dark:text-amber-400 hover:bg-amber-100'
                            : 'bg-[#fff6e6] dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 border-[#f3d9a7] dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-amber-700'
                        }`}
                      >
                        🗄️
                      </button>
                      
                      {/* Delete Button */}
                      <button
                        onClick={() => handleDeleteTrigger(prod.id)}
                        title="Delete Permanently"
                        className="h-9 w-9 rounded-xl bg-[#fff6e6] dark:bg-slate-950 hover:bg-rose-50 dark:hover:bg-rose-950/20 border border-[#f3d9a7] dark:border-slate-800 hover:border-rose-200 dark:hover:border-rose-800/40 flex items-center justify-center text-slate-500 hover:text-rose-700 transition-all duration-200 active:scale-95"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* FULL SCREEN ADD/EDIT DRAWER OVERLAY */}
        {isFormOpen && (
          <div className="fixed inset-0 z-50 flex justify-end overflow-hidden">
            {/* Backdrop background blur */}
            <div
              onClick={() => setIsFormOpen(false)}
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm transition-opacity duration-300 animate-fade-in"
            />

            {/* Slide-in Form Container */}
            <div className="relative w-full max-w-2xl h-full bg-white dark:bg-slate-900 border-l border-[#f3d9a7] dark:border-slate-800 flex flex-col shadow-2xl z-10 transition-transform duration-300 ease-out transform animate-slide-in">
              {/* Form Header */}
              <div className="p-6 border-b border-[#f3d9a7] dark:border-slate-800 flex items-center justify-between bg-white/90 dark:bg-slate-900/90 backdrop-blur-md sticky top-0 z-20">
                <div>
                  <h2 className="text-xl font-bold text-[#1f2937] dark:text-white">
                    {editingProduct ? 'Edit Product Listing' : 'Add New B2B Listing'}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Setup premium products configured with wholesale MOQ, unit types, and GST details.
                  </p>
                </div>
                <button
                  onClick={() => setIsFormOpen(false)}
                  className="h-10 h-10 rounded-2xl bg-[#fff6e6] border border-[#f3d9a7] flex items-center justify-center text-slate-500 hover:text-[#1f2937] transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Form Content (Scrollable) */}
              <form
                onSubmit={handleSaveProduct}
                className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-slate-900"
              >
                {/* 1. Basic Details */}
                <div className="space-y-4">
                  <div className="border-b border-[#f3d9a7] pb-2">
                    <h3 className="text-sm font-bold text-amber-600 uppercase tracking-widest">
                      1. Product Details
                    </h3>
                  </div>

                  {/* Name field */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600">Product Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Pure Copper Grounding Wire"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className={`w-full rounded-2xl bg-[#fff6e6] border px-4 py-3 text-sm text-[#1f2937] focus:outline-none focus:border-accent-500 transition-colors ${
                        formErrors.name ? 'border-rose-500' : 'border-[#f3d9a7]'
                      }`}
                    />
                    {formErrors.name && (
                      <p className="text-[11px] font-medium text-rose-400">{formErrors.name}</p>
                    )}
                  </div>

                  {/* Category & Sku Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-600">Category *</label>
                      <select
                        value={formCategory}
                        onChange={(e) => setFormCategory(e.target.value)}
                        className="w-full rounded-2xl bg-[#fff6e6] border border-[#f3d9a7] px-4 py-3 text-sm text-[#1f2937] focus:outline-none focus:border-accent-500 transition-colors"
                      >
                        {CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-600">SKU Code *</label>
                      <input
                        type="text"
                        placeholder="e.g. EL-CC-GND"
                        value={formSku}
                        onChange={(e) => setFormSku(e.target.value)}
                        className={`w-full rounded-2xl bg-[#fff6e6] border px-4 py-3 text-sm text-[#1f2937] focus:outline-none focus:border-accent-500 transition-colors ${
                          formErrors.sku ? 'border-rose-500' : 'border-[#f3d9a7]'
                        }`}
                      />
                      {formErrors.sku && (
                        <p className="text-[11px] font-medium text-rose-400">{formErrors.sku}</p>
                      )}
                    </div>
                  </div>

                  {/* Description area */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600">Description *</label>
                    <textarea
                      placeholder="Write premium wholesale description highlighting certifications, build material, dimensions, and standard quality tests..."
                      rows={4}
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      className={`w-full rounded-2xl bg-[#fff6e6] border px-4 py-3 text-sm text-[#1f2937] focus:outline-none focus:border-accent-500 transition-colors ${
                        formErrors.description ? 'border-rose-500' : 'border-[#f3d9a7]'
                      }`}
                    />
                    {formErrors.description && (
                      <p className="text-[11px] font-medium text-rose-400">
                        {formErrors.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* 2. Media Uploads */}
                <div className="space-y-4">
                  <div className="border-b border-[#f3d9a7] pb-2">
                    <h3 className="text-sm font-bold text-amber-600 uppercase tracking-widest">
                      2. Product Images
                    </h3>
                  </div>
                  <ImageUploader images={formImages} onChange={setFormImages} maxImages={5} />
                </div>

                {/* 3. Pricing, Stock & Bulk parameters */}
                <div className="space-y-4">
                  <div className="border-b border-[#f3d9a7] pb-2">
                    <h3 className="text-sm font-bold text-amber-600 uppercase tracking-widest">
                      3. Pricing & Fulfillment
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Price field */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-600">Unit Price (₹) *</label>
                      <input
                        type="number"
                        placeholder="e.g. 14500"
                        value={formPrice}
                        onChange={(e) =>
                          setFormPrice(e.target.value === '' ? '' : Number(e.target.value))
                        }
                        className={`w-full rounded-2xl bg-[#fff6e6] border px-4 py-3 text-sm text-[#1f2937] focus:outline-none focus:border-accent-500 transition-colors ${
                          formErrors.price ? 'border-rose-500' : 'border-[#f3d9a7]'
                        }`}
                      />
                      {formErrors.price && (
                        <p className="text-[11px] font-medium text-rose-400">{formErrors.price}</p>
                      )}
                    </div>

                    {/* MOQ Field */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-600">Min Order Qty *</label>
                      <input
                        type="number"
                        placeholder="e.g. 10"
                        value={formMoq}
                        onChange={(e) =>
                          setFormMoq(e.target.value === '' ? '' : Number(e.target.value))
                        }
                        className={`w-full rounded-2xl bg-[#fff6e6] border px-4 py-3 text-sm text-[#1f2937] focus:outline-none focus:border-accent-500 transition-colors ${
                          formErrors.moq ? 'border-rose-500' : 'border-[#f3d9a7]'
                        }`}
                      />
                      {formErrors.moq && (
                        <p className="text-[11px] font-medium text-rose-400">{formErrors.moq}</p>
                      )}
                    </div>

                    {/* Stock Inventory */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-600">
                        Current Stock Level *
                      </label>
                      <input
                        type="number"
                        placeholder="e.g. 150"
                        value={formStock}
                        onChange={(e) =>
                          setFormStock(e.target.value === '' ? '' : Number(e.target.value))
                        }
                        className={`w-full rounded-2xl bg-[#fff6e6] border px-4 py-3 text-sm text-[#1f2937] focus:outline-none focus:border-accent-500 transition-colors ${
                          formErrors.stock ? 'border-rose-500' : 'border-[#f3d9a7]'
                        }`}
                      />
                      {formErrors.stock && (
                        <p className="text-[11px] font-medium text-rose-400">{formErrors.stock}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Unit Selector */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-600">Unit Type *</label>
                      <select
                        value={formUnit}
                        onChange={(e) => setFormUnit(e.target.value)}
                        className="w-full rounded-2xl bg-[#fff6e6] border border-[#f3d9a7] px-4 py-3 text-sm text-[#1f2937] focus:outline-none focus:border-accent-500 transition-colors"
                      >
                        {UNITS.map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Delivery Time frame */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-600">
                        Delivery Time *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 2-3 days, Next day"
                        value={formDelivery}
                        onChange={(e) => setFormDelivery(e.target.value)}
                        className={`w-full rounded-2xl bg-[#fff6e6] border px-4 py-3 text-sm text-[#1f2937] focus:outline-none focus:border-accent-500 transition-colors ${
                          formErrors.delivery ? 'border-rose-500' : 'border-[#f3d9a7]'
                        }`}
                      />
                      {formErrors.delivery && (
                        <p className="text-[11px] font-medium text-rose-400">
                          {formErrors.delivery}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* GST Applicability */}
                  <div className="flex items-center justify-between bg-[#fff6e6] border border-[#f3d9a7] rounded-2xl p-4">
                    <div>
                      <h4 className="text-xs font-bold text-[#1f2937] uppercase tracking-wider">
                        GST Applicable / Invoicing Available
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Enable this if you issue tax invoices with GST returns for trade buyers.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formGst}
                        onChange={(e) => setFormGst(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#FAB12F] peer-checked:after:bg-white peer-checked:after:border-slate-950" />
                    </label>
                  </div>
                </div>

                {/* 4. Trust Settings */}
                <div className="space-y-4">
                  <div className="border-b border-[#f3d9a7] pb-2">
                    <h3 className="text-sm font-bold text-amber-600 uppercase tracking-widest">
                      4. Communication & Keywords
                    </h3>
                  </div>

                  {/* WhatsApp contact number */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600">
                      WhatsApp Inquiry Number (With Country Code) *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 919876543210"
                      value={formWhatsapp}
                      onChange={(e) => setFormWhatsapp(e.target.value)}
                      className={`w-full rounded-2xl bg-[#fff6e6] border px-4 py-3 text-sm text-[#1f2937] focus:outline-none focus:border-accent-500 transition-colors ${
                        formErrors.whatsapp ? 'border-rose-500' : 'border-[#f3d9a7]'
                      }`}
                    />
                    <p className="text-[10px] text-slate-500">
                      Direct connection link opens with this mobile number. Format: 12-14 digits without + or spaces.
                    </p>
                    {formErrors.whatsapp && (
                      <p className="text-[11px] font-medium text-rose-400">
                        {formErrors.whatsapp}
                      </p>
                    )}
                  </div>

                  {/* Tags Editor */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600">Product Tags / Keywords</label>
                    <input
                      type="text"
                      placeholder="Type a keyword and press Enter or Comma..."
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={handleAddTag}
                      className="w-full rounded-2xl bg-[#fff6e6] border border-[#f3d9a7] px-4 py-3 text-sm text-[#1f2937] focus:outline-none focus:border-accent-500 transition-colors"
                    />
                    {formTags.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-2">
                        {formTags.map((tag) => (
                          <span
                            key={tag}
                            onClick={() => removeTag(tag)}
                            className="group flex items-center gap-1.5 bg-[#fff6e6] hover:bg-rose-950/20 hover:border-rose-900/30 text-xs font-medium border border-[#f3d9a7] hover:text-rose-400 px-3 py-1 rounded-full cursor-pointer transition-colors"
                          >
                            #{tag}{' '}
                            <span className="text-[9px] text-slate-500 group-hover:text-rose-400">
                              ✕
                            </span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Form Buttons */}
                <div className="pt-6 border-t border-[#f3d9a7] flex gap-4 sticky bottom-0 bg-white/90 backdrop-blur-md pb-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setIsFormOpen(false)}
                    className="flex-1 justify-center rounded-2xl"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    className="flex-1 justify-center rounded-2xl bg-[#FAB12F] text-slate-950 shadow-[0_12px_30px_-6px_rgba(255,149,0,0.3)]"
                  >
                    {editingProduct ? 'Save Changes' : 'Publish Wholesale Listing'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* DELETE CONFIRMATION MODAL */}
        {deleteConfirmId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              onClick={() => setDeleteConfirmId(null)}
              className="absolute inset-0 bg-white/80 backdrop-blur-sm"
            />
            <Card className="relative w-full max-w-md border border-[#f3d9a7] bg-white p-6 rounded-3xl space-y-4 shadow-2xl animate-scale-up">
              <div className="h-12 w-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center text-xl">
                ⚠️
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-bold text-[#1f2937]">Permanently delete product?</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  This action is permanent and cannot be undone. Any active WhatsApp reference links
                  to this product from potential trade buyers might break.
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  variant="secondary"
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 justify-center rounded-2xl"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmDelete}
                  className="flex-1 justify-center bg-rose-500 hover:bg-rose-600 text-[#1f2937] border-transparent rounded-2xl"
                >
                  Confirm Delete
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center text-slate-500 text-sm font-semibold tracking-widest uppercase">
          Loading Catalog...
        </div>
      }
    >
      <ProductsCatalog />
    </Suspense>
  );
}

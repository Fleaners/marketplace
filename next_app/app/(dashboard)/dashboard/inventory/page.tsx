'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { navigationItems } from '@/lib/navigation';

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

interface PendingEdit {
  price: number;
  stock: number;
}

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  
  // Tracking inline edits: productId -> { price, stock }
  const [pendingEdits, setPendingEdits] = useState<Record<string, PendingEdit>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

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

  // Initial Load from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('marketplace_products');
      if (stored) {
        setProducts(JSON.parse(stored));
      } else {
        const defaultProducts: Product[] = [
          { id: '1', name: 'Industrial Water Pump', category: 'Industrial', description: 'Centrifugal industrial water pump.', price: 14500, moq: 2, stock: 15, sku: 'WP-IND-100', unit: 'Pieces', gst: true, delivery: '2-3 days', tags: ['Pumps'], whatsapp: '919876543210', images: [] },
          { id: '2', name: 'Heavy Duty Adhesive Sealant', category: 'Industrial', description: 'Adhesive sealant.', price: 450, moq: 10, stock: 3, sku: 'AD-HD-450', unit: 'Pieces', gst: true, delivery: 'Next day', tags: ['Adhesives'], whatsapp: '919876543210', images: [] },
          { id: '3', name: 'Copper Core Grounding Wire', category: 'Electrical', description: 'Copper grounding cable.', price: 1200, moq: 5, stock: 25, sku: 'EL-CC-GND', unit: 'Meters', gst: true, delivery: '3-5 days', tags: ['Electrical'], whatsapp: '919876543210', images: [] },
          { id: '4', name: 'Brass Coupling Joints (1/2 Inch)', category: 'Hardware', description: 'Solid brass coupler.', price: 85, moq: 20, stock: 2, sku: 'HW-BCJ-12', unit: 'Pieces', gst: false, delivery: '2-4 days', tags: ['Hardware'], whatsapp: '919876543210', images: [] },
        ];
        localStorage.setItem('marketplace_products', JSON.stringify(defaultProducts));
        setProducts(defaultProducts);
      }
    } catch (e) {
      console.error('Failed to load products from storage', e);
    }
  }, []);

  const hasUnsavedChanges = Object.keys(pendingEdits).length > 0;

  // Handle cell text change
  const handleCellChange = (productId: string, field: 'price' | 'stock', value: string) => {
    const numericValue = value === '' ? 0 : Math.max(0, parseInt(value, 10) || 0);
    const originalProduct = products.find((p) => p.id === productId);
    if (!originalProduct) return;

    const currentEdit = pendingEdits[productId] || {
      price: originalProduct.price,
      stock: originalProduct.stock,
    };

    const updatedEdit = {
      ...currentEdit,
      [field]: numericValue,
    };

    // If the edited value is identical to the original, we can potentially clean it up
    if (updatedEdit.price === originalProduct.price && updatedEdit.stock === originalProduct.stock) {
      const copy = { ...pendingEdits };
      delete copy[productId];
      setPendingEdits(copy);
    } else {
      setPendingEdits({
        ...pendingEdits,
        [productId]: updatedEdit,
      });
    }
  };

  // Reset spreadsheet changes
  const handleReset = () => {
    setPendingEdits({});
    setSaveSuccess(false);
  };

  // Save All modifications to local storage & state
  const handleSaveAll = () => {
    if (!hasUnsavedChanges) return;

    setIsSaving(true);
    setSaveSuccess(false);

    setTimeout(() => {
      const updatedProducts = products.map((prod) => {
        const edits = pendingEdits[prod.id];
        if (edits) {
          return {
            ...prod,
            price: edits.price,
            stock: edits.stock,
          };
        }
        return prod;
      });

      setProducts(updatedProducts);
      localStorage.setItem('marketplace_products', JSON.stringify(updatedProducts));
      setPendingEdits({});
      setIsSaving(false);
      setSaveSuccess(true);

      // Fade success banner
      setTimeout(() => {
        setSaveSuccess(false);
      }, 4000);
    }, 800);
  };

  // Filter products (excluding archived for inventory operations unless searched specifically)
  const filteredProducts = products.filter((p) => {
    if (p.archived) return false;

    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = categoryFilter === '' || p.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  return (
    <DashboardLayout
      navigationItems={navigationItems}
      user={{ name: 'Gaurav Enterprise', email: 'partner@dealerconnect.in' }}
      onLogout={() => {
        if (typeof window !== 'undefined') window.location.href = '/';
      }}
      topBarProps={{
        pageTitle: 'Inventory Cockpit',
        breadcrumbs: [{ label: 'Cockpit', href: '/dashboard' }, { label: 'Inventory' }],
        unreadNotifications: 3,
      }}
    >
      <div className="space-y-6">
        
        {/* Title action row */}
        <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Spreadsheet Inventory Editor</h1>
            <p className="text-sm text-slate-400">
              Bulk modify your listing stock levels and active prices with Excel-style inline editing.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {hasUnsavedChanges && (
              <Button
                variant="secondary"
                size="md"
                onClick={handleReset}
                disabled={isSaving}
                className="rounded-xl font-semibold border-slate-800 text-slate-400 hover:text-white"
              >
                Discard Changes
              </Button>
            )}
            
            <Button
              variant="primary"
              size="md"
              onClick={handleSaveAll}
              disabled={!hasUnsavedChanges || isSaving}
              className={`rounded-xl font-bold flex items-center gap-2 shadow-[0_8px_20px_-6px_rgba(255,149,0,0.3)] transition-all ${
                hasUnsavedChanges
                  ? 'bg-accent-500 text-slate-950 hover:scale-[1.01]'
                  : 'bg-slate-800/40 border-slate-900 text-slate-500 cursor-not-allowed'
              }`}
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-slate-950" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Saving Cockpit...
                </>
              ) : (
                'Save All Changes'
              )}
            </Button>
          </div>
        </section>

        {/* Dynamic Success notifications banner */}
        {saveSuccess && (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 p-4 text-xs font-semibold uppercase tracking-wider flex items-center gap-2 animate-fade-in shadow-inner">
            <span>✓</span> Inventory spreadsheet saved and synced to database collections successfully!
          </div>
        )}

        {/* Searching Filtering */}
        <Card className="rounded-3xl border border-slate-800 bg-slate-950 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <span className="absolute inset-y-0 left-3 flex items-center text-slate-500 text-sm">
              🔍
            </span>
            <input
              type="text"
              placeholder="Search by product name or SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-2xl bg-slate-900 border border-slate-800 pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-accent-500 transition-colors placeholder:text-slate-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Filter Category:
            </span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-2xl bg-slate-900 border border-slate-800 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-accent-500 transition-colors"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </Card>

        {/* SPREADSHEET TABLE GRID CARD */}
        <Card className="rounded-3xl border border-slate-800 bg-slate-950 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-slate-900/50 border-b border-slate-900 text-xs font-bold uppercase tracking-widest text-slate-400">
                <tr>
                  <th className="py-4 px-6">Product Details</th>
                  <th className="py-4 px-6">SKU / Code</th>
                  <th className="py-4 px-6 text-center">Current Status</th>
                  <th className="py-4 px-6 text-right">Wholesale Price (₹)</th>
                  <th className="py-4 px-6 text-right">Inventory Stock Level</th>
                  <th className="py-4 px-6 text-center">GST Apply</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900 font-medium">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-500 font-medium">
                      No active inventory products match your criteria.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((prod) => {
                    const editState = pendingEdits[prod.id];
                    const activePrice = editState ? editState.price : prod.price;
                    const activeStock = editState ? editState.stock : prod.stock;
                    
                    const isEdited = !!editState;

                    // Calculate stock indicators
                    let statusLabel = 'Healthy';
                    let statusColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25';
                    
                    if (activeStock === 0) {
                      statusLabel = 'Out of Stock';
                      statusColor = 'bg-rose-500/10 text-rose-400 border-rose-500/25';
                    } else if (activeStock <= prod.moq) {
                      statusLabel = 'Low Stock';
                      statusColor = 'bg-amber-500/10 text-amber-400 border-amber-500/25';
                    }

                    return (
                      <tr
                        key={prod.id}
                        className={`transition-colors group hover:bg-slate-900/10 ${
                          isEdited ? 'bg-accent-500/5' : ''
                        }`}
                      >
                        {/* 1. Product Name & Thumb */}
                        <td className="py-4 px-6 flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-slate-900 border border-slate-800/80 overflow-hidden flex items-center justify-center text-lg shadow-sm">
                            {prod.images && prod.images.length > 0 ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={prod.images[0]} alt={prod.name} className="h-full w-full object-cover" />
                            ) : (
                              '📦'
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white group-hover:text-accent-400 transition-colors">
                              {prod.name}
                            </p>
                            <p className="text-[11px] text-slate-500 mt-0.5">{prod.category}</p>
                          </div>
                        </td>

                        {/* 2. SKU Code */}
                        <td className="py-4 px-6 font-mono text-xs text-slate-400">
                          {prod.sku}
                        </td>

                        {/* 3. Live Indicator Status */}
                        <td className="py-4 px-6 text-center">
                          <span
                            className={`inline-flex px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider ${statusColor}`}
                          >
                            {statusLabel}
                          </span>
                        </td>

                        {/* 4. Wholesale Price Cell */}
                        <td className="py-4 px-6 text-right">
                          <div className="inline-flex items-center gap-1.5 bg-slate-900/60 border border-slate-800/60 rounded-xl px-3 py-1.5 focus-within:border-accent-500 focus-within:bg-slate-900 transition-all shadow-inner">
                            <span className="text-xs text-slate-500 font-bold">₹</span>
                            <input
                              type="number"
                              value={activePrice}
                              onChange={(e) => handleCellChange(prod.id, 'price', e.target.value)}
                              className="w-20 bg-transparent text-right text-sm font-bold text-white focus:outline-none placeholder:text-slate-600 font-sans"
                            />
                          </div>
                          {isEdited && editState.price !== prod.price && (
                            <p className="text-[10px] text-accent-400 font-bold mt-1 block">
                              Was: ₹{prod.price}
                            </p>
                          )}
                        </td>

                        {/* 5. Inventory Stock level Cell */}
                        <td className="py-4 px-6 text-right">
                          <div className="inline-flex items-center gap-1.5 bg-slate-900/60 border border-slate-800/60 rounded-xl px-3 py-1.5 focus-within:border-accent-500 focus-within:bg-slate-900 transition-all shadow-inner">
                            <input
                              type="number"
                              value={activeStock}
                              onChange={(e) => handleCellChange(prod.id, 'stock', e.target.value)}
                              className="w-16 bg-transparent text-right text-sm font-bold text-white focus:outline-none placeholder:text-slate-600 font-sans"
                            />
                            <span className="text-[11px] text-slate-500 font-semibold lowercase">
                              {prod.unit}
                            </span>
                          </div>
                          {isEdited && editState.stock !== prod.stock && (
                            <p className="text-[10px] text-accent-400 font-bold mt-1 block">
                              Was: {prod.stock}
                            </p>
                          )}
                        </td>

                        {/* 6. GST compliance label */}
                        <td className="py-4 px-6 text-center text-xs font-semibold">
                          {prod.gst ? (
                            <span className="text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-md border border-emerald-500/15">
                              Yes (18%)
                            </span>
                          ) : (
                            <span className="text-slate-500">Exempt</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Offline bulk tips and guidelines */}
        <section className="grid gap-6 md:grid-cols-2">
          <Card className="rounded-3xl border border-slate-800 bg-slate-950 p-6 space-y-2">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              💡 Keyboard Productivity tip
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Use your keyboard's <kbd className="px-1.5 py-0.5 rounded border border-slate-800 bg-slate-900 text-slate-300 font-mono text-[10px]">Tab</kbd> key to instantly switch focus between columns and price fields. Hit the "Save All Changes" CTA to record your updates in bulk and update analytics in real-time.
            </p>
          </Card>

          <Card className="rounded-3xl border border-slate-800 bg-slate-950 p-6 space-y-2">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              📦 Warehouse Safety Stock policy
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              The dashboard triggers active alert emails and high priority dashboard icons when stock drops beneath your product's configured Minimum Order Quantity (MOQ). This keeps your supply chain highly reliable.
            </p>
          </Card>
        </section>
      </div>
    </DashboardLayout>
  );
}

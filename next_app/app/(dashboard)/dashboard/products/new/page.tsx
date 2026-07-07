'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ImageUploader } from '@/components/ui/ImageUploader';
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

export default function NewProductPage() {
  const router = useRouter();

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
  const [formWhatsapp, setFormWhatsapp] = useState('');
  const [formTags, setFormTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [formImages, setFormImages] = useState<string[]>([]);

  // Validation state
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Initialize form with defaults
  useEffect(() => {
    setFormSku(`SKU-${Math.floor(100000 + Math.random() * 900000)}`);
    
    // Retrieve seller phone number from local profile if available
    try {
      const storedUser = localStorage.getItem('mp_user');
      if (storedUser) {
        const userObj = JSON.parse(storedUser);
        if (userObj.whatsappNumber || userObj.mobileNumber) {
          setFormWhatsapp(userObj.whatsappNumber || userObj.mobileNumber);
        } else {
          setFormWhatsapp('919876543210');
        }
      } else {
        setFormWhatsapp('919876543210');
      }
    } catch (e) {
      setFormWhatsapp('919876543210');
    }
  }, []);

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = tagInput.trim();
      if (val && !formTags.includes(val)) {
        setFormTags([...formTags, val]);
        setTagInput('');
      }
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormTags(formTags.filter((t) => t !== tagToRemove));
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formName.trim()) errors.name = 'Product name is required';
    if (!formDescription.trim()) errors.description = 'Description is required';
    if (!formSku.trim()) errors.sku = 'SKU is required';
    
    if (formPrice === '' || Number(formPrice) <= 0) {
      errors.price = 'Price must be a positive number';
    }
    if (formMoq === '' || Number(formMoq) < 1) {
      errors.moq = 'Minimum order quantity must be at least 1';
    }
    if (formStock === '' || Number(formStock) < 0) {
      errors.stock = 'Stock level cannot be negative';
    }
    if (!formDelivery.trim()) errors.delivery = 'Delivery timeframe is required';
    
    const cleanWhatsapp = String(formWhatsapp).replace(/[^0-9]/g, '');
    if (!cleanWhatsapp || cleanWhatsapp.length < 10 || cleanWhatsapp.length > 15) {
      errors.whatsapp = 'Enter a valid B2B WhatsApp contact number (10-15 digits)';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSaving(true);

    try {
      const stored = localStorage.getItem('marketplace_products');
      const currentList: Product[] = stored ? JSON.parse(stored) : [];

      const newProduct: Product = {
        id: `prod_${Date.now()}`,
        name: formName.trim(),
        category: formCategory,
        description: formDescription.trim(),
        price: Number(formPrice),
        moq: Number(formMoq),
        stock: Number(formStock),
        sku: formSku.trim(),
        unit: formUnit,
        gst: formGst,
        delivery: formDelivery.trim(),
        tags: formTags,
        whatsapp: formWhatsapp.replace(/[^0-9]/g, ''),
        images: formImages,
      };

      const updatedList = [newProduct, ...currentList];
      localStorage.setItem('marketplace_products', JSON.stringify(updatedList));

      // Trigger standard tracking event
      if (typeof window !== 'undefined' && (window as any).trackEvent) {
        (window as any).trackEvent('product_add', { id: newProduct.id, name: newProduct.name });
      }

      router.push('/dashboard/products');
    } catch (error) {
      console.error('Failed to save product', error);
      alert('An error occurred while saving the product.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout navigationItems={navigationItems}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Back and Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <button
              onClick={() => router.push('/dashboard/products')}
              className="text-amber-600 hover:text-accent-300 font-semibold text-sm transition-all duration-200 flex items-center gap-1.5 mb-2"
            >
              ← Back to Products Catalog
            </button>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
              Add New B2B Product
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Publish a premium product listing onto the B2B marketplace directory.
            </p>
          </div>
        </div>

        <Card className="rounded-3xl border border-[#f3d9a7] bg-white p-6 sm:p-8 shadow-2xl">
          <form onSubmit={handleSaveProduct} className="space-y-6">
            {/* Grid 1: Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Product Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Industrial Centrifugal Pump"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className={`w-full rounded-2xl border bg-[#fff6e6] px-4 py-3 text-sm text-[#1f2937] placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-accent-500 transition-all ${
                    formErrors.name ? 'border-rose-500' : 'border-[#f3d9a7]'
                  }`}
                />
                {formErrors.name && (
                  <p className="text-[11px] font-medium text-rose-400">{formErrors.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Category <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full rounded-2xl border border-[#f3d9a7] bg-[#fff6e6] px-4 py-3 text-sm text-[#1f2937] focus:outline-none focus:ring-2 focus:ring-accent-500 transition-all"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  SKU Identifier <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. WP-IND-100"
                  value={formSku}
                  onChange={(e) => setFormSku(e.target.value)}
                  className={`w-full rounded-2xl border bg-[#fff6e6] px-4 py-3 text-sm text-[#1f2937] placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-accent-500 transition-all ${
                    formErrors.sku ? 'border-rose-500' : 'border-[#f3d9a7]'
                  }`}
                />
                {formErrors.sku && (
                  <p className="text-[11px] font-medium text-rose-400">{formErrors.sku}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Delivery Timeframe <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 2-3 days, Next day"
                  value={formDelivery}
                  onChange={(e) => setFormDelivery(e.target.value)}
                  className={`w-full rounded-2xl border bg-[#fff6e6] px-4 py-3 text-sm text-[#1f2937] placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-accent-500 transition-all ${
                    formErrors.delivery ? 'border-rose-500' : 'border-[#f3d9a7]'
                  }`}
                />
                {formErrors.delivery && (
                  <p className="text-[11px] font-medium text-rose-400">{formErrors.delivery}</p>
                )}
              </div>
            </div>

            {/* Product Description */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Product Description <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={4}
                placeholder="Highlight specifications, raw materials, manufacturing standards, and warranties..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                className={`w-full rounded-2xl border bg-[#fff6e6] px-4 py-3 text-sm text-[#1f2937] placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-accent-500 transition-all resize-none ${
                  formErrors.description ? 'border-rose-500' : 'border-[#f3d9a7]'
                }`}
              />
              {formErrors.description && (
                <p className="text-[11px] font-medium text-rose-400">{formErrors.description}</p>
              )}
            </div>

            {/* Drag & Drop Image Compressor zone */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Product Images
              </label>
              <ImageUploader images={formImages} onChange={setFormImages} maxImages={5} />
              <p className="text-[10px] text-slate-500">
                Stripe-grade client canvas engine auto-compresses WebP images before uploading. (Up to 5 files)
              </p>
            </div>

            {/* Grid 2: Pricing, Stock, and Units */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Unit Price (₹) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  placeholder="₹ Amount"
                  value={formPrice}
                  onChange={(e) =>
                    setFormPrice(e.target.value === '' ? '' : Number(e.target.value))
                  }
                  className={`w-full rounded-2xl border bg-[#fff6e6] px-4 py-3 text-sm text-[#1f2937] placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-accent-500 transition-all ${
                    formErrors.price ? 'border-rose-500' : 'border-[#f3d9a7]'
                  }`}
                />
                {formErrors.price && (
                  <p className="text-[11px] font-medium text-rose-400">{formErrors.price}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Min Order Qty <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  placeholder="Min MOQ"
                  value={formMoq}
                  onChange={(e) =>
                    setFormMoq(e.target.value === '' ? '' : Number(e.target.value))
                  }
                  className={`w-full rounded-2xl border bg-[#fff6e6] px-4 py-3 text-sm text-[#1f2937] placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-accent-500 transition-all ${
                    formErrors.moq ? 'border-rose-500' : 'border-[#f3d9a7]'
                  }`}
                />
                {formErrors.moq && (
                  <p className="text-[11px] font-medium text-rose-400">{formErrors.moq}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Stock Level <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  placeholder="Units available"
                  value={formStock}
                  onChange={(e) =>
                    setFormStock(e.target.value === '' ? '' : Number(e.target.value))
                  }
                  className={`w-full rounded-2xl border bg-[#fff6e6] px-4 py-3 text-sm text-[#1f2937] placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-accent-500 transition-all ${
                    formErrors.stock ? 'border-rose-500' : 'border-[#f3d9a7]'
                  }`}
                />
                {formErrors.stock && (
                  <p className="text-[11px] font-medium text-rose-400">{formErrors.stock}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Unit Type <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formUnit}
                  onChange={(e) => setFormUnit(e.target.value)}
                  className="w-full rounded-2xl border border-[#f3d9a7] bg-[#fff6e6] px-4 py-3 text-sm text-[#1f2937] focus:outline-none focus:ring-2 focus:ring-accent-500 transition-all"
                >
                  {UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* GST applicability toggle */}
            <div className="flex items-center justify-between p-4 rounded-2xl border border-[#f3d9a7] bg-[#fff6e6]">
              <div>
                <p className="text-sm font-semibold text-[#1f2937]">GST Applicable</p>
                <p className="text-xs text-slate-500 mt-0.5">Toggle if GST details should be listed on buyer invoice drafts.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formGst}
                  onChange={(e) => setFormGst(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-300 after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#FAB12F] peer-checked:after:bg-white" />
              </label>
            </div>

            {/* B2B Connection Details */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Direct WhatsApp Inquiries Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. 919876543210 (Country code + number)"
                value={formWhatsapp}
                onChange={(e) => setFormWhatsapp(e.target.value)}
                className={`w-full rounded-2xl border bg-[#fff6e6] px-4 py-3 text-sm text-[#1f2937] placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-accent-500 transition-all ${
                  formErrors.whatsapp ? 'border-rose-500' : 'border-[#f3d9a7]'
                }`}
              />
              <p className="text-[10px] text-slate-500">
                Direct connection link opens with this mobile number. Format: 12-14 digits without + or spaces.
              </p>
              {formErrors.whatsapp && (
                <p className="text-[11px] font-medium text-rose-400">{formErrors.whatsapp}</p>
              )}
            </div>

            {/* Interactive Tags Manager */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Tags / Search Keywords
              </label>
              <input
                type="text"
                placeholder="Type tag and press Enter"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                className="w-full rounded-2xl border border-[#f3d9a7] bg-[#fff6e6] px-4 py-3 text-sm text-[#1f2937] placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-accent-500 transition-all"
              />
              {formTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {formTags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 rounded-full bg-[#fff6e6] border border-[#f3d9a7] px-2.5 py-0.5 text-xs text-slate-600 font-medium"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="text-slate-500 hover:text-rose-400 font-bold transition-colors"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#f3d9a7]">
              <Button
                variant="secondary"
                type="button"
                onClick={() => router.push('/dashboard/products')}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="rounded-xl px-6 bg-gradient-to-r from-accent-500 to-accent-600 text-[#1f2937] font-bold hover:shadow-[0_0_24px_rgba(30,144,255,0.3)] transition-all"
              >
                {isSaving ? 'Saving...' : 'Publish Product'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </DashboardLayout>
  );
}

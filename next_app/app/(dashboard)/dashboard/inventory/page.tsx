'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { navigationItems } from '@/lib/navigation';
import { Greeting } from '@/components/dashboard/Greeting';

interface ProductVariant {
  size?: string;
  color?: string;
  weight?: string;
  material?: string;
}

interface Product {
  id: string;
  name: string;
  category: string;
  brand?: string;
  description: string;
  price: number;
  moq: number;
  stock: number; // Available
  reserved?: number;
  damaged?: number;
  returned?: number;
  sku: string;
  unit: string;
  gst: boolean;
  gstRate?: number; // e.g. 18
  hsn?: string;
  barcode?: string;
  qrCode?: string;
  batchNo?: string;
  expiryDate?: string;
  serialNo?: string;
  imei?: string;
  warehouse?: string;
  variants?: ProductVariant;
  delivery: string;
  tags: string[];
  whatsapp: string;
  images: string[];
  archived?: boolean;
}

interface Supplier {
  id: string;
  name: string;
  rating: number;
  category: string;
  performance: string;
  location: string;
  whatsapp: string;
}

interface PurchaseOrder {
  id: string;
  supplierName: string;
  item: string;
  quantity: number;
  totalValue: number;
  status: 'pending' | 'approved' | 'received';
  date: string;
}

interface GRNRecord {
  id: string;
  poId: string;
  supplierName: string;
  item: string;
  quantityReceived: number;
  receivedBy: string;
  date: string;
  warehouse: string;
}

interface PendingEdit {
  price: number;
  stock: number;
}

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [activeTab, setActiveTab] = useState<'catalog' | 'adjustments' | 'ai' | 'purchasing'>('catalog');
  
  // Modals & Details State
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPoModalOpen, setIsPoModalOpen] = useState(false);

  // Form Fields for Add/Edit
  const [formName, setFormName] = useState('');
  const [formBrand, setFormBrand] = useState('');
  const [formCategory, setFormCategory] = useState('Industrial');
  const [formDescription, setFormDescription] = useState('');
  const [formPrice, setFormPrice] = useState(1000);
  const [formMoq, setFormMoq] = useState(5);
  const [formStock, setFormStock] = useState(100);
  const [formReserved, setFormReserved] = useState(0);
  const [formDamaged, setFormDamaged] = useState(0);
  const [formReturned, setFormReturned] = useState(0);
  const [formSku, setFormSku] = useState('');
  const [formUnit, setFormUnit] = useState('Pieces');
  const [formGstRate, setFormGstRate] = useState(18);
  const [formHsn, setFormHsn] = useState('');
  const [formBarcode, setFormBarcode] = useState('');
  const [formBatchNo, setFormBatchNo] = useState('');
  const [formExpiryDate, setFormExpiryDate] = useState('');
  const [formSerialNo, setFormSerialNo] = useState('');
  const [formImei, setFormImei] = useState('');
  const [formWarehouse, setFormWarehouse] = useState('Warehouse A');
  const [formVariantSize, setFormVariantSize] = useState('');
  const [formVariantColor, setFormVariantColor] = useState('');
  const [formVariantWeight, setFormVariantWeight] = useState('');
  const [formVariantMaterial, setFormVariantMaterial] = useState('');

  // Bulk operation states
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [bulkMoqValue, setBulkMoqValue] = useState<number>(5);

  // Spreadsheet Edits
  const [pendingEdits, setPendingEdits] = useState<Record<string, PendingEdit>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Suppliers & Purchasing Mock State
  const [suppliers, setSuppliers] = useState<Supplier[]>([
    { id: 'sup-1', name: 'Hindalco Metal Industries', rating: 4.8, category: 'Electrical', performance: '98%', location: 'Mumbai', whatsapp: '919876543210' },
    { id: 'sup-2', name: 'Kirloskar Pump Division', rating: 4.7, category: 'Industrial', performance: '95%', location: 'Pune', whatsapp: '919876543210' },
    { id: 'sup-3', name: 'Asian Paints Chemical Corp', rating: 4.5, category: 'Chemicals', performance: '92%', location: 'Surat', whatsapp: '919876543210' },
  ]);

  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([
    { id: 'PO-9912', supplierName: 'Hindalco Metal Industries', item: 'Copper Core Grounding Wire', quantity: 200, totalValue: 240000, status: 'approved', date: '2026-07-09' },
    { id: 'PO-9913', supplierName: 'Kirloskar Pump Division', item: 'Industrial Water Pump', quantity: 15, totalValue: 217500, status: 'pending', date: '2026-07-11' },
  ]);

  const [grns, setGrns] = useState<GRNRecord[]>([
    { id: 'GRN-4421', poId: 'PO-9912', supplierName: 'Hindalco Metal Industries', item: 'Copper Core Grounding Wire', quantityReceived: 200, receivedBy: 'Warehouse Team A', date: '2026-07-10', warehouse: 'Warehouse Alpha' },
  ]);

  // Form Fields for PO Creator
  const [poSupplierName, setPoSupplierName] = useState('Hindalco Metal Industries');
  const [poItemName, setPoItemName] = useState('Copper Core Grounding Wire');
  const [poQty, setPoQty] = useState(100);
  const [poBudget, setPoBudget] = useState(1200);

  const CATEGORIES = ['Industrial', 'Electrical', 'Hardware', 'Chemicals', 'Packaging', 'Safety Components', 'Agriculture', 'Office Supplies'];
  const WAREHOUSES = ['Warehouse Alpha', 'Warehouse Beta', 'Warehouse Gamma'];

  // Load from local storage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('marketplace_products');
      if (stored) {
        setProducts(JSON.parse(stored));
      } else {
        const defaultProducts: Product[] = [
          {
            id: '1',
            name: 'Industrial Water Pump',
            category: 'Industrial',
            brand: 'Kirloskar',
            description: 'Heavy duty centrifugal water pump suited for high pressure flow rate industrial operations.',
            price: 14500,
            moq: 2,
            stock: 15,
            reserved: 3,
            damaged: 1,
            returned: 2,
            sku: 'WP-IND-100',
            unit: 'Pieces',
            gst: true,
            gstRate: 18,
            hsn: '8413-7010',
            barcode: '890103241092',
            qrCode: 'QR-WP-IND-100',
            batchNo: 'B-PMP-2026',
            expiryDate: '2030-12-31',
            serialNo: 'SN-7761002-A',
            warehouse: 'Warehouse Alpha',
            variants: { size: 'Standard', color: 'Blue', material: 'Cast Iron' },
            delivery: '2-3 days',
            tags: ['Pumps', 'Heavy Duty'],
            whatsapp: '919876543210',
            images: [],
          },
          {
            id: '2',
            name: 'Copper Core Grounding Wire',
            category: 'Electrical',
            brand: 'Hindalco',
            description: 'Premium grade pure copper grounding cable designed for protective earth systems.',
            price: 1200,
            moq: 5,
            stock: 25,
            reserved: 10,
            damaged: 0,
            returned: 1,
            sku: 'EL-CC-GND',
            unit: 'Meters',
            gst: true,
            gstRate: 18,
            hsn: '8544-4920',
            barcode: '890103241093',
            batchNo: 'B-COP-2026',
            warehouse: 'Warehouse Alpha',
            variants: { size: '10 Meters', material: 'Copper' },
            delivery: '3-5 days',
            tags: ['Electrical', 'Wiring'],
            whatsapp: '919876543210',
            images: [],
          },
        ];
        localStorage.setItem('marketplace_products', JSON.stringify(defaultProducts));
        setProducts(defaultProducts);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const saveProducts = (list: Product[]) => {
    setProducts(list);
    localStorage.setItem('marketplace_products', JSON.stringify(list));
  };

  // Cell edits
  const handleCellChange = (productId: string, field: 'price' | 'stock', value: string) => {
    const numericValue = value === '' ? 0 : Math.max(0, parseInt(value, 10) || 0);
    const original = products.find((p) => p.id === productId);
    if (!original) return;

    const currentEdit = pendingEdits[productId] || { price: original.price, stock: original.stock };
    const updatedEdit = { ...currentEdit, [field]: numericValue };

    if (updatedEdit.price === original.price && updatedEdit.stock === original.stock) {
      const copy = { ...pendingEdits };
      delete copy[productId];
      setPendingEdits(copy);
    } else {
      setPendingEdits({ ...pendingEdits, [productId]: updatedEdit });
    }
  };

  const handleSaveAll = () => {
    setIsSaving(true);
    setSaveSuccess(false);
    setTimeout(() => {
      const updated = products.map((prod) => {
        const edits = pendingEdits[prod.id];
        if (edits) {
          return { ...prod, price: edits.price, stock: edits.stock };
        }
        return prod;
      });
      saveProducts(updated);
      setPendingEdits({});
      setIsSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    }, 800);
  };

  // Add Product Form Submit
  const handleAddProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newProd: Product = {
      id: `prd-${Date.now()}`,
      name: formName,
      brand: formBrand,
      category: formCategory,
      description: formDescription,
      price: Number(formPrice) || 0,
      moq: Number(formMoq) || 1,
      stock: Number(formStock) || 0,
      reserved: Number(formReserved) || 0,
      damaged: Number(formDamaged) || 0,
      returned: Number(formReturned) || 0,
      sku: formSku || `SKU-${Math.floor(100000 + Math.random() * 900000)}`,
      unit: formUnit,
      gst: true,
      gstRate: Number(formGstRate) || 18,
      hsn: formHsn,
      barcode: formBarcode || `BAR-${Math.floor(100000000 + Math.random() * 900000000)}`,
      batchNo: formBatchNo,
      expiryDate: formExpiryDate,
      serialNo: formSerialNo,
      imei: formImei,
      warehouse: formWarehouse,
      variants: {
        size: formVariantSize || undefined,
        color: formVariantColor || undefined,
        weight: formVariantWeight || undefined,
        material: formVariantMaterial || undefined,
      },
      delivery: '3-5 days',
      tags: [formCategory],
      whatsapp: '919876543210',
      images: [],
    };

    saveProducts([newProd, ...products]);
    setIsAddModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setFormName('');
    setFormBrand('');
    setFormCategory('Industrial');
    setFormDescription('');
    setFormPrice(1000);
    setFormMoq(5);
    setFormStock(100);
    setFormReserved(0);
    setFormDamaged(0);
    setFormReturned(0);
    setFormSku('');
    setFormHsn('');
    setFormBarcode('');
    setFormBatchNo('');
    setFormExpiryDate('');
    setFormSerialNo('');
    setFormImei('');
    setFormVariantSize('');
    setFormVariantColor('');
    setFormVariantWeight('');
    setFormVariantMaterial('');
  };

  // Duplicate / Archive / Delete Actions
  const handleDuplicateProduct = (prod: Product) => {
    const duplicated: Product = {
      ...prod,
      id: `prd-dup-${Date.now()}`,
      name: `${prod.name} (Copy)`,
      sku: `${prod.sku}-COPY`,
      barcode: `BAR-${Math.floor(100000000 + Math.random() * 900000000)}`,
    };
    saveProducts([duplicated, ...products]);
  };

  const handleArchiveToggle = (productId: string) => {
    const updated = products.map((p) => {
      if (p.id === productId) {
        return { ...p, archived: !p.archived };
      }
      return p;
    });
    saveProducts(updated);
  };

  const handleDeleteProduct = (productId: string) => {
    if (confirm('Are you sure you want to permanently delete this product?')) {
      const updated = products.filter((p) => p.id !== productId);
      saveProducts(updated);
    }
  };

  // Bulk Operations
  const handleToggleSelectProduct = (productId: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };

  const handleBulkDelete = () => {
    if (confirm(`Are you sure you want to delete ${selectedProductIds.length} products?`)) {
      const updated = products.filter((p) => !selectedProductIds.includes(p.id));
      saveProducts(updated);
      setSelectedProductIds([]);
    }
  };

  const handleBulkUpdateMoq = () => {
    const updated = products.map((p) => {
      if (selectedProductIds.includes(p.id)) {
        return { ...p, moq: bulkMoqValue };
      }
      return p;
    });
    saveProducts(updated);
    setSelectedProductIds([]);
    alert(`Bulk updated MOQ to ${bulkMoqValue} for ${selectedProductIds.length} products.`);
  };

  const handleBulkExport = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(products, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', 'marketplace_products_export.json');
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Purchase Order Submission
  const handleCreatePoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newPo: PurchaseOrder = {
      id: `PO-${Math.floor(1000 + Math.random() * 9000)}`,
      supplierName: poSupplierName,
      item: poItemName,
      quantity: poQty,
      totalValue: poQty * poBudget,
      status: 'pending',
      date: new Date().toISOString().split('T')[0],
    };
    setPurchaseOrders([newPo, ...purchaseOrders]);
    setIsPoModalOpen(false);

    // Simulate real-time automated GRN delivery in 10 seconds
    setTimeout(() => {
      setPurchaseOrders((prevList) =>
        prevList.map((po) => {
          if (po.id === newPo.id) {
            return { ...po, status: 'received' };
          }
          return po;
        })
      );
      // Auto append Goods Received Note (GRN)
      const newGrn: GRNRecord = {
        id: `GRN-${Math.floor(1000 + Math.random() * 9000)}`,
        poId: newPo.id,
        supplierName: newPo.supplierName,
        item: newPo.item,
        quantityReceived: newPo.quantity,
        receivedBy: 'Warehouse Team Alpha',
        date: new Date().toISOString().split('T')[0],
        warehouse: 'Warehouse Alpha',
      };
      setGrns((prev) => [newGrn, ...prev]);

      // Realtime Stock update on GRN receipt
      setProducts((currentProds) => {
        const list = currentProds.map((p) => {
          if (p.name.toLowerCase().includes(newPo.item.toLowerCase())) {
            return { ...p, stock: p.stock + newPo.quantity };
          }
          return p;
        });
        localStorage.setItem('marketplace_products', JSON.stringify(list));
        return list;
      });
    }, 8000);
  };

  // Filter products
  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === '' || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // AI Insights calculations
  const totalStockValuation = products.reduce((acc, p) => acc + (p.price * p.stock), 0);
  const totalReservedValuation = products.reduce((acc, p) => acc + (p.price * (p.reserved || 0)), 0);

  return (
    <DashboardLayout
      navigationItems={navigationItems}
      user={{ name: 'Gaurav Enterprise', email: 'partner@dealerconnect.in' }}
      topBarProps={{
        pageTitle: 'Inventory OS Cockpit',
        breadcrumbs: [{ label: 'Cockpit', href: '/dashboard' }, { label: 'Inventory' }],
        unreadNotifications: 3,
      }}
    >
      <div className="space-y-6 pb-12">
        {/* Title action row */}
        <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <Greeting />
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">Enterprise Inventory Management System</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="rounded-xl bg-[#FAB12F] text-slate-950 font-black px-4 py-2.5 text-xs shadow-md hover:bg-[#e09e1b] transition-all"
            >
              + Add Product
            </button>
            <button
              onClick={handleBulkExport}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-extrabold px-3 py-2.5 text-xs hover:bg-slate-50 transition-all shadow-sm"
            >
              📤 Bulk Export
            </button>
            {Object.keys(pendingEdits).length > 0 && (
              <button
                onClick={handleSaveAll}
                disabled={isSaving}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-4 py-2.5 text-xs shadow-md transition-all flex items-center gap-1.5"
              >
                {isSaving ? 'Saving...' : '✓ Save Changes'}
              </button>
            )}
          </div>
        </section>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
          {(['catalog', 'adjustments', 'ai', 'purchasing'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-xs uppercase tracking-widest font-black transition-all border-b-2 ${
                activeTab === tab
                  ? 'border-[#FAB12F] text-slate-900 dark:text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-700'
              }`}
            >
              {tab === 'catalog' ? 'Product Catalog' : tab === 'adjustments' ? 'Stock Levels & Adjustments' : tab === 'ai' ? 'AI Forecasting & XYZ' : 'Purchase Orders & GRN'}
            </button>
          ))}
        </div>

        {/* Notification Toast */}
        {saveSuccess && (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-500 p-4 text-xs font-black uppercase tracking-wider flex items-center gap-2 animate-fade-in shadow-inner">
            <span>✓</span> Database configuration records saved and synchronized in real-time.
          </div>
        )}

        {/* Search & Filter Row */}
        {activeTab === 'catalog' && (
          <Card className="rounded-3xl border border-[#f3d9a7] dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
            <div className="relative flex-1 max-w-md">
              <span className="absolute inset-y-0 left-3 flex items-center text-slate-500 text-sm">🔍</span>
              <input
                type="text"
                placeholder="Search catalog by name, brand, SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 pl-10 pr-4 py-2.5 text-xs text-slate-850 dark:text-slate-200 focus:outline-none focus:border-[#FAB12F] transition-all"
              />
            </div>

            <div className="flex items-center gap-3">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-4 py-2.5 text-xs text-slate-700 dark:text-slate-350 focus:outline-none"
              >
                <option value="">All Categories</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </Card>
        )}

        {/* TAB 1: PRODUCT CATALOG SPREADSHEET */}
        {activeTab === 'catalog' && (
          <div className="space-y-4">
            {/* Bulk Toolbar */}
            {selectedProductIds.length > 0 && (
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 flex flex-wrap items-center justify-between gap-4 text-xs font-bold animate-fade-in shadow-inner">
                <span className="text-amber-600 font-extrabold">{selectedProductIds.length} Products selected for Bulk Actions</span>
                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1">
                    <span className="text-[10px] text-slate-400 mr-2">Bulk MOQ</span>
                    <input
                      type="number"
                      value={bulkMoqValue}
                      onChange={(e) => setBulkMoqValue(Number(e.target.value))}
                      className="w-12 bg-transparent text-center font-bold text-slate-800 dark:text-slate-100 focus:outline-none"
                    />
                  </div>
                  <button
                    onClick={handleBulkUpdateMoq}
                    className="rounded-xl bg-amber-500 text-slate-950 px-3.5 py-2 font-black shadow-sm"
                  >
                    Update MOQ
                  </button>
                  <button
                    onClick={handleBulkDelete}
                    className="rounded-xl bg-rose-600 text-white px-3.5 py-2 font-black shadow-sm"
                  >
                    Delete Selected
                  </button>
                </div>
              </div>
            )}

            <Card className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="py-4 px-5 text-center">
                        <input
                          type="checkbox"
                          checked={selectedProductIds.length === filteredProducts.length && filteredProducts.length > 0}
                          onChange={(e) =>
                            setSelectedProductIds(e.target.checked ? filteredProducts.map((p) => p.id) : [])
                          }
                          className="rounded text-amber-500 focus:ring-amber-500"
                        />
                      </th>
                      <th className="py-4 px-5">Product Details</th>
                      <th className="py-4 px-5">Brand / SKU</th>
                      <th className="py-4 px-5">HSN / GST</th>
                      <th className="py-4 px-5 text-center">Warehouse</th>
                      <th className="py-4 px-5 text-right">Price (₹)</th>
                      <th className="py-4 px-5 text-right">Available Stock</th>
                      <th className="py-4 px-5 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 dark:divide-slate-800/80 font-semibold text-slate-800 dark:text-slate-200">
                    {filteredProducts.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-12 text-slate-500">
                          No active products found in matching category.
                        </td>
                      </tr>
                    ) : (
                      filteredProducts.map((prod) => {
                        const edits = pendingEdits[prod.id];
                        const activePrice = edits ? edits.price : prod.price;
                        const activeStock = edits ? edits.stock : prod.stock;
                        const isEdited = !!edits;

                        return (
                          <tr
                            key={prod.id}
                            className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors ${
                              prod.archived ? 'opacity-50 bg-slate-100/30' : ''
                            } ${isEdited ? 'bg-[#FAB12F]/5' : ''}`}
                          >
                            <td className="py-4 px-5 text-center">
                              <input
                                type="checkbox"
                                checked={selectedProductIds.includes(prod.id)}
                                onChange={() => handleToggleSelectProduct(prod.id)}
                                className="rounded text-amber-500 focus:ring-amber-500"
                              />
                            </td>
                            <td className="py-4 px-5">
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-950 flex items-center justify-center text-lg font-light border border-slate-150 dark:border-slate-850 shrink-0">
                                  {prod.images && prod.images[0] ? (
                                    <img src={prod.images[0]} alt={prod.name} className="h-full w-full object-cover" />
                                  ) : (
                                    '📦'
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p
                                    onClick={() => setSelectedProduct(prod)}
                                    className="font-black text-sm text-slate-900 dark:text-white hover:text-amber-600 cursor-pointer truncate"
                                  >
                                    {prod.name}
                                  </p>
                                  <p className="text-[10px] text-slate-400 mt-0.5">{prod.category}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-5">
                              <span className="font-extrabold block text-slate-750 dark:text-slate-300">{prod.brand || 'N/A'}</span>
                              <span className="text-[10px] font-mono text-slate-400 mt-0.5 block">{prod.sku}</span>
                            </td>
                            <td className="py-4 px-5">
                              <span className="font-extrabold text-slate-700 dark:text-slate-350">{prod.hsn || '8544'}</span>
                              <span className="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full font-bold ml-2">{prod.gstRate}%</span>
                            </td>
                            <td className="py-4 px-5 text-center font-bold text-slate-500">
                              {prod.warehouse || 'Warehouse A'}
                            </td>
                            <td className="py-4 px-5 text-right">
                              <div className="inline-flex items-center gap-1.5 bg-[#fff6e6] dark:bg-slate-950 border border-[#f3d9a7]/60 dark:border-slate-800 rounded-xl px-2.5 py-1.5 focus-within:border-accent-500 transition-all shadow-inner">
                                <span className="text-[10px] text-slate-500 font-bold">₹</span>
                                <input
                                  type="number"
                                  value={activePrice}
                                  onChange={(e) => handleCellChange(prod.id, 'price', e.target.value)}
                                  className="w-16 bg-transparent text-right font-black text-slate-850 dark:text-slate-100 focus:outline-none"
                                />
                              </div>
                            </td>
                            <td className="py-4 px-5 text-right">
                              <div className="inline-flex items-center gap-1.5 bg-[#fff6e6] dark:bg-slate-950 border border-[#f3d9a7]/60 dark:border-slate-800 rounded-xl px-2.5 py-1.5 focus-within:border-accent-500 transition-all shadow-inner">
                                <input
                                  type="number"
                                  value={activeStock}
                                  onChange={(e) => handleCellChange(prod.id, 'stock', e.target.value)}
                                  className="w-12 bg-transparent text-right font-black text-slate-850 dark:text-slate-100 focus:outline-none"
                                />
                                <span className="text-[9px] text-slate-400 font-bold">{prod.unit}</span>
                              </div>
                            </td>
                            <td className="py-4 px-5 text-center space-x-1.5">
                              <button
                                onClick={() => handleDuplicateProduct(prod)}
                                className="p-1.5 text-slate-400 hover:text-amber-500 transition-colors"
                                title="Duplicate"
                              >
                                📋
                              </button>
                              <button
                                onClick={() => handleArchiveToggle(prod.id)}
                                className={`p-1.5 transition-colors ${prod.archived ? 'text-emerald-500 hover:text-emerald-600' : 'text-slate-400 hover:text-slate-500'}`}
                                title={prod.archived ? 'Restore' : 'Archive'}
                              >
                                {prod.archived ? '🔄' : '📥'}
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(prod.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors"
                                title="Delete"
                              >
                                🗑️
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* TAB 2: QUANTITY MANAGEMENT & ADJUSTMENTS */}
        {activeTab === 'adjustments' && (
          <Card className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl space-y-4">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-500">Warehouse Stock Adjustments</h3>
              <p className="text-xs text-slate-400 font-semibold mt-1">Allocate inventory levels between available, reserved, damaged, and returned buckets.</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Product Name</th>
                    <th className="py-3 px-4 text-center">Warehouse</th>
                    <th className="py-3 px-4 text-right">Available (Sellable)</th>
                    <th className="py-3 px-4 text-right">Reserved (Active Leads)</th>
                    <th className="py-3 px-4 text-right">Damaged (Lockout)</th>
                    <th className="py-3 px-4 text-right">Returned (Inspection)</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 dark:divide-slate-800 font-semibold text-slate-800 dark:text-slate-200">
                  {products.map((prod) => (
                    <tr key={prod.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                      <td className="py-4 px-4 font-black">{prod.name}</td>
                      <td className="py-4 px-4 text-center text-slate-500">{prod.warehouse || 'Warehouse Alpha'}</td>
                      <td className="py-4 px-4 text-right text-emerald-600 dark:text-emerald-400 font-black">{prod.stock}</td>
                      <td className="py-4 px-4 text-right text-amber-600 dark:text-amber-400 font-black">{prod.reserved || 0}</td>
                      <td className="py-4 px-4 text-right text-rose-500 font-black">{prod.damaged || 0}</td>
                      <td className="py-4 px-4 text-right text-blue-500 font-black">{prod.returned || 0}</td>
                      <td className="py-4 px-4 text-right">
                        <button
                          onClick={() => {
                            const newQty = prompt(`Enter new available stock for ${prod.name}:`, String(prod.stock));
                            if (newQty !== null) {
                              const updated = products.map((p) => (p.id === prod.id ? { ...p, stock: Number(newQty) || 0 } : p));
                              saveProducts(updated);
                            }
                          }}
                          className="rounded-lg border border-[#f3d9a7] bg-[#fff6e6] text-[#FAB12F] font-bold px-2 py-1 text-[10px] hover:bg-slate-50"
                        >
                          Quick Adjust
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* TAB 3: AI FORECASTING & DEADBAND */}
        {activeTab === 'ai' && (
          <div className="grid gap-6 md:grid-cols-2">
            {/* Health and Forecasting stats */}
            <Card className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5 shadow-xl">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-500">AI Inventory Health Analyzer</h3>
                <p className="text-xs text-slate-400 font-semibold mt-1">Real-time demand forecasting and turnover rates powered by Gemini B2B OS.</p>
              </div>

              <div className="grid gap-4 grid-cols-2">
                <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-4 text-center">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Inventory Health Score</span>
                  <span className="text-3xl font-black text-amber-500 mt-2 block">88%</span>
                  <span className="text-[9px] text-emerald-500 font-bold mt-1 block">↗ Optimal stock cover</span>
                </div>
                <div className="rounded-2xl bg-blue-500/10 border border-blue-500/20 p-4 text-center">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Forecast Confidence</span>
                  <span className="text-3xl font-black text-blue-500 mt-2 block">94%</span>
                  <span className="text-[9px] text-slate-450 block mt-1">Based on historical inquiries</span>
                </div>
              </div>

              <div className="space-y-3.5 text-xs">
                <h4 className="font-black text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-1">AI Reorder Suggestions</h4>
                {products.filter((p) => p.stock <= p.moq * 2).map((p) => (
                  <div key={p.id} className="flex justify-between items-center bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-850">
                    <div>
                      <p className="font-extrabold text-slate-850 dark:text-slate-100">{p.name}</p>
                      <p className="text-[10px] text-slate-400">Available: {p.stock} units • MOQ: {p.moq}</p>
                    </div>
                    <button
                      onClick={() => {
                        setPoSupplierName('Hindalco Metal Industries');
                        setPoItemName(p.name);
                        setPoQty(p.moq * 10);
                        setIsPoModalOpen(true);
                      }}
                      className="rounded-lg bg-[#FAB12F] text-slate-950 font-black px-2.5 py-1.5 text-[9px] shadow-sm"
                    >
                      ⚡ Auto Reorder
                    </button>
                  </div>
                ))}
              </div>
            </Card>

            {/* ABC / XYZ Analysis & Pricing Recommendations */}
            <Card className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5 shadow-xl">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-500">ABC / XYZ Matrix</h3>
                <p className="text-xs text-slate-400 font-semibold mt-1">Sourcing turnover classification and pricing optimization guides.</p>
              </div>

              <div className="space-y-4 text-xs font-semibold">
                <div className="space-y-2">
                  <h4 className="font-black text-slate-800 dark:text-white uppercase tracking-wider text-[10px] text-slate-450">ABC Sourcing Classification</h4>
                  <div className="space-y-1.5">
                    <div className="flex justify-between p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-xl">
                      <span>Class A (80% Revenue value)</span>
                      <span className="font-black">Industrial Centrifugal Pump</span>
                    </div>
                    <div className="flex justify-between p-2 bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-400 rounded-xl">
                      <span>Class B (15% Revenue value)</span>
                      <span className="font-black">Copper Core Grounding Wire</span>
                    </div>
                    <div className="flex justify-between p-2 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 text-slate-500 rounded-xl">
                      <span>Class C (5% Revenue value)</span>
                      <span className="font-black">Couplers & Sealants</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-black text-slate-800 dark:text-white uppercase tracking-wider text-[10px] text-slate-450">AI Pricing & Promo Optimization</h4>
                  <div className="rounded-xl border border-[#f3d9a7]/60 bg-[#fff6e6]/30 dark:bg-slate-950/20 p-3 space-y-2 text-slate-655 dark:text-slate-300">
                    <p className="leading-relaxed">
                      💡 **Industrial Water Pump**: Sourcing inquiries peak in July. Suggest setting a bulk discount of **5%** for quantities above **20 units** to capture monsoon agri-purchasing runs.
                    </p>
                    <p className="leading-relaxed">
                      ⚠️ **Adhesive Sealants**: Detected as **Dead Stock** (zero clicks in 14 days). Recommend promotional bundle discount with Class A hardware connectors.
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* TAB 4: PURCHASING & GRN MANAGEMENT */}
        {activeTab === 'purchasing' && (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Purchase Orders Creator & List */}
            <Card className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-500">Purchase Orders Registry</h3>
                  <p className="text-xs text-slate-400 font-semibold mt-1">Generate bulk stock procurement POs to verified suppliers.</p>
                </div>
                <button
                  onClick={() => setIsPoModalOpen(true)}
                  className="rounded-xl bg-[#FAB12F] text-slate-950 font-black px-3.5 py-2 text-xs shadow-md"
                >
                  Create PO
                </button>
              </div>

              <div className="space-y-3">
                {purchaseOrders.map((po) => (
                  <div key={po.id} className="p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/20 text-xs space-y-2">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-black text-slate-800 dark:text-white">{po.item}</h4>
                        <p className="text-[10px] text-slate-400">Supplier: {po.supplierName} • Date: {po.date}</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                        po.status === 'received'
                          ? 'bg-emerald-500/10 text-emerald-600'
                          : po.status === 'approved'
                          ? 'bg-blue-500/10 text-blue-600'
                          : 'bg-amber-500/10 text-amber-600'
                      }`}>
                        {po.status}
                      </span>
                    </div>
                    <div className="flex justify-between items-baseline pt-1.5 border-t border-slate-100 dark:border-slate-800/40 text-[10px] text-slate-500">
                      <span>Qty: {po.quantity} units</span>
                      <span className="font-extrabold text-slate-900 dark:text-white">₹{po.totalValue.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Goods Received Notes (GRN) Ledger */}
            <Card className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl space-y-5">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-500">Goods Received Notes (GRN)</h3>
                <p className="text-xs text-slate-400 font-semibold mt-1">Historical verification ledger of physically checked inventory inbound.</p>
              </div>

              <div className="space-y-3 text-xs">
                {grns.map((grn) => (
                  <div key={grn.id} className="p-3 border border-slate-150 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/10 rounded-2xl space-y-1.5">
                    <div className="flex justify-between text-[10px] font-extrabold text-slate-450 uppercase tracking-wider">
                      <span>{grn.id} (PO Link: {grn.poId})</span>
                      <span>{grn.date}</span>
                    </div>
                    <h4 className="font-black text-slate-850 dark:text-white">{grn.item}</h4>
                    <p className="text-[10px] text-slate-500">Received from {grn.supplierName} • Location: {grn.warehouse}</p>
                    <div className="flex justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800/40">
                      <span>Quantity Received: {grn.quantityReceived}</span>
                      <span>Verified: {grn.receivedBy}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Add Product Modal Overlay */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-[32px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center pb-2 border-b border-slate-150 dark:border-slate-800">
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Add New Product</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-500">✕</button>
            </div>

            <form onSubmit={handleAddProductSubmit} className="space-y-4 text-xs font-semibold">
              <div className="grid gap-4 grid-cols-2">
                <div className="space-y-1">
                  <label className="text-slate-500">Product Name</label>
                  <input type="text" required value={formName} onChange={(e) => setFormName(e.target.value)} className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 p-2.5 focus:outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-500">Brand Name</label>
                  <input type="text" required value={formBrand} onChange={(e) => setFormBrand(e.target.value)} className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 p-2.5 focus:outline-none" />
                </div>
              </div>

              <div className="grid gap-4 grid-cols-3">
                <div className="space-y-1">
                  <label className="text-slate-500">Category</label>
                  <select value={formCategory} onChange={(e) => setFormCategory(e.target.value)} className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 p-2.5 focus:outline-none">
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-slate-500">Wholesale Price (₹)</label>
                  <input type="number" required value={formPrice} onChange={(e) => setFormPrice(Number(e.target.value))} className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 p-2.5 focus:outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-500">Minimum Order Quantity (MOQ)</label>
                  <input type="number" required value={formMoq} onChange={(e) => setFormMoq(Number(e.target.value))} className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 p-2.5 focus:outline-none" />
                </div>
              </div>

              <div className="grid gap-4 grid-cols-4">
                <div className="space-y-1">
                  <label className="text-slate-500">Available Stock</label>
                  <input type="number" required value={formStock} onChange={(e) => setFormStock(Number(e.target.value))} className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 p-2.5" />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-500">Reserved</label>
                  <input type="number" value={formReserved} onChange={(e) => setFormReserved(Number(e.target.value))} className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 p-2.5" />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-500">Damaged</label>
                  <input type="number" value={formDamaged} onChange={(e) => setFormDamaged(Number(e.target.value))} className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 p-2.5" />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-500">Returned</label>
                  <input type="number" value={formReturned} onChange={(e) => setFormReturned(Number(e.target.value))} className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 p-2.5" />
                </div>
              </div>

              <div className="grid gap-4 grid-cols-3">
                <div className="space-y-1">
                  <label className="text-slate-500">SKU Code</label>
                  <input type="text" value={formSku} onChange={(e) => setFormSku(e.target.value)} placeholder="Auto-generated if empty" className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 p-2.5" />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-500">HSN Code</label>
                  <input type="text" value={formHsn} onChange={(e) => setFormHsn(e.target.value)} className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 p-2.5" />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-500">GST Rate (%)</label>
                  <select value={formGstRate} onChange={(e) => setFormGstRate(Number(e.target.value))} className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 p-2.5">
                    <option value={5}>5%</option>
                    <option value={12}>12%</option>
                    <option value={18}>18%</option>
                    <option value={28}>28%</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-4 grid-cols-2">
                <div className="space-y-1">
                  <label className="text-slate-500">Batch Number</label>
                  <input type="text" value={formBatchNo} onChange={(e) => setFormBatchNo(e.target.value)} className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 p-2.5" />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-500">Expiry Date</label>
                  <input type="date" value={formExpiryDate} onChange={(e) => setFormExpiryDate(e.target.value)} className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 p-2.5" />
                </div>
              </div>

              <div className="grid gap-4 grid-cols-3">
                <div className="space-y-1">
                  <label className="text-slate-500">Serial Number</label>
                  <input type="text" value={formSerialNo} onChange={(e) => setFormSerialNo(e.target.value)} className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 p-2.5" />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-500">IMEI</label>
                  <input type="text" value={formImei} onChange={(e) => setFormImei(e.target.value)} className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 p-2.5" />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-500">Target Warehouse</label>
                  <select value={formWarehouse} onChange={(e) => setFormWarehouse(e.target.value)} className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 p-2.5">
                    {WAREHOUSES.map((w) => <option key={w} value={w}>{w}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-2 bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-850">
                <h4 className="font-black text-slate-800 dark:text-white uppercase tracking-wider text-[10px]">Product Variants</h4>
                <div className="grid gap-3 grid-cols-4">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400">Size</label>
                    <input type="text" value={formVariantSize} onChange={(e) => setFormVariantSize(e.target.value)} placeholder="e.g. Standard" className="w-full rounded-lg bg-white dark:bg-slate-900 border border-slate-200 p-2" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400">Color</label>
                    <input type="text" value={formVariantColor} onChange={(e) => setFormVariantColor(e.target.value)} placeholder="e.g. Blue" className="w-full rounded-lg bg-white dark:bg-slate-900 border border-slate-200 p-2" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400">Weight</label>
                    <input type="text" value={formVariantWeight} onChange={(e) => setFormVariantWeight(e.target.value)} placeholder="e.g. 5kg" className="w-full rounded-lg bg-white dark:bg-slate-900 border border-slate-200 p-2" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400">Material</label>
                    <input type="text" value={formVariantMaterial} onChange={(e) => setFormVariantMaterial(e.target.value)} placeholder="e.g. Copper" className="w-full rounded-lg bg-white dark:bg-slate-900 border border-slate-200 p-2" />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-505">Detailed Product Description</label>
                <textarea rows={3} required value={formDescription} onChange={(e) => setFormDescription(e.target.value)} className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 p-2.5 resize-none" />
              </div>

              <button type="submit" className="w-full rounded-2xl bg-[#FAB12F] text-slate-950 font-black py-3 text-center shadow-md">Add Product to Inventory</button>
            </form>
          </div>
        </div>
      )}

      {/* PO Creation Modal */}
      {isPoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm" onClick={() => setIsPoModalOpen(false)}>
          <div className="w-full max-w-md rounded-[32px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl relative space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center pb-2 border-b border-slate-150 dark:border-slate-800">
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Create Purchase Order</h3>
              <button onClick={() => setIsPoModalOpen(false)} className="h-7 w-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-500">✕</button>
            </div>

            <form onSubmit={handleCreatePoSubmit} className="space-y-3.5 text-xs font-semibold">
              <div className="space-y-1">
                <label className="text-slate-505">Select Supplier</label>
                <select value={poSupplierName} onChange={(e) => setPoSupplierName(e.target.value)} className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 p-2.5">
                  {suppliers.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-505">Product Item Name</label>
                <input type="text" required value={poItemName} onChange={(e) => setPoItemName(e.target.value)} className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 p-2.5" />
              </div>

              <div className="grid gap-3 grid-cols-2">
                <div className="space-y-1">
                  <label className="text-slate-505">Order Quantity</label>
                  <input type="number" required value={poQty} onChange={(e) => setPoQty(Number(e.target.value))} className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 p-2.5" />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-505">Target Unit Price (₹)</label>
                  <input type="number" required value={poBudget} onChange={(e) => setPoBudget(Number(e.target.value))} className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 p-2.5" />
                </div>
              </div>

              <button type="submit" className="w-full rounded-2xl bg-[#FAB12F] text-slate-950 font-black py-3 text-center shadow-md">Submit Purchase Order</button>
            </form>
          </div>
        </div>
      )}

      {/* Product View Details Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm" onClick={() => setSelectedProduct(null)}>
          <div className="w-full max-w-lg rounded-[32px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl relative max-h-[85vh] overflow-y-auto space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center pb-2 border-b border-slate-150 dark:border-slate-800">
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Product Specs Sheet</h3>
              <button onClick={() => setSelectedProduct(null)} className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-500">✕</button>
            </div>

            <div className="space-y-4 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <div>
                <h4 className="text-base font-black text-slate-900 dark:text-white">{selectedProduct.name}</h4>
                <p className="text-slate-450">{selectedProduct.brand} • {selectedProduct.category}</p>
              </div>

              <div className="grid gap-2 grid-cols-2 bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-100 dark:border-slate-850">
                <p>📦 SKU: <span className="font-extrabold text-slate-800 dark:text-slate-200">{selectedProduct.sku}</span></p>
                <p>🏷️ Barcode: <span className="font-extrabold text-slate-800 dark:text-slate-200">{selectedProduct.barcode || 'N/A'}</span></p>
                <p>🔢 Batch: <span className="font-extrabold text-slate-800 dark:text-slate-200">{selectedProduct.batchNo || 'N/A'}</span></p>
                <p>📅 Expiry: <span className="font-extrabold text-slate-800 dark:text-slate-200">{selectedProduct.expiryDate || 'N/A'}</span></p>
                <p>🔢 Serial: <span className="font-extrabold text-slate-800 dark:text-slate-200">{selectedProduct.serialNo || 'N/A'}</span></p>
                <p>📱 IMEI: <span className="font-extrabold text-slate-800 dark:text-slate-200">{selectedProduct.imei || 'N/A'}</span></p>
                <p>🏬 Warehouse: <span className="font-extrabold text-slate-800 dark:text-slate-200">{selectedProduct.warehouse || 'N/A'}</span></p>
                <p>⚖️ HSN: <span className="font-extrabold text-slate-800 dark:text-slate-200">{selectedProduct.hsn || 'N/A'}</span></p>
              </div>

              {selectedProduct.variants && (
                <div className="space-y-2">
                  <h4 className="font-black text-slate-800 dark:text-white uppercase tracking-wider text-[10px]">Configured Variants</h4>
                  <div className="grid gap-2 grid-cols-4 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-100 dark:border-slate-850 text-center">
                    <div><span className="text-[10px] text-slate-400 block">Size</span><span>{selectedProduct.variants.size || '-'}</span></div>
                    <div><span className="text-[10px] text-slate-400 block">Color</span><span>{selectedProduct.variants.color || '-'}</span></div>
                    <div><span className="text-[10px] text-slate-400 block">Weight</span><span>{selectedProduct.variants.weight || '-'}</span></div>
                    <div><span className="text-[10px] text-slate-400 block">Material</span><span>{selectedProduct.variants.material || '-'}</span></div>
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <h4 className="font-black text-slate-800 dark:text-white uppercase tracking-wider text-[10px]">Description</h4>
                <p className="text-slate-500 leading-relaxed bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-100 dark:border-slate-850 font-normal">{selectedProduct.description}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

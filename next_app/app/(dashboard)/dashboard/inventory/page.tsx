'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { navigationItems } from '@/lib/navigation';
import { Greeting } from '@/components/dashboard/Greeting';
import { calculateGST, GSTCalculationResult } from '@/lib/gst';
import { getFirebaseServices } from '@/lib/firebase';
import { collection, query, where, onSnapshot, setDoc, doc, deleteDoc } from 'firebase/firestore';

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
  moq: number; // Minimum order qty
  reorderLevel: number; // Reorder alert level
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
  reorderLevel: number;
}

interface SKUInvoice {
  id: string;
  sku: string;
  productName: string;
  customerName: string;
  customerPhone: string;
  quantity: number;
  subtotal: number;
  taxValue: number;
  total: number;
  status: 'draft' | 'sent' | 'paid';
  date: string;
  gstRate: number;
  cgst: number;
  sgst: number;
  igst: number;
  stateType: 'intra' | 'inter';
}

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [stockStatusFilter, setStockStatusFilter] = useState<'active' | 'instock' | 'low' | 'archived'>('active');
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'stock' | 'reorder'>('name');
  const [activeTab, setActiveTab] = useState<'catalog' | 'adjustments' | 'ai' | 'purchasing'>('catalog');
  
  // Modals & Details State
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPoModalOpen, setIsPoModalOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

  // Form Fields for Add/Edit
  const [formName, setFormName] = useState('');
  const [formBrand, setFormBrand] = useState('');
  const [formCategory, setFormCategory] = useState('Industrial');
  const [formDescription, setFormDescription] = useState('');
  const [formPrice, setFormPrice] = useState(1000);
  const [formMoq, setFormMoq] = useState(5);
  const [formReorderLevel, setFormReorderLevel] = useState(10);
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
  const [formWarehouse, setFormWarehouse] = useState('Warehouse Alpha');
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

  // CRM context & local lead caches
  const [leads, setLeads] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<SKUInvoice[]>([]);

  // Stock Adjustment sub-form state (inside spec sheet modal)
  const [adjustStockVal, setAdjustStockVal] = useState(0);
  const [adjustReservedVal, setAdjustReservedVal] = useState(0);
  const [adjustDamagedVal, setAdjustDamagedVal] = useState(0);
  const [adjustReturnedVal, setAdjustReturnedVal] = useState(0);
  const [isAdjustDispatch, setIsAdjustDispatch] = useState(false);
  const [createInvoiceOnDispatch, setCreateInvoiceOnDispatch] = useState(false);

  // Invoice creator form states
  const [invoiceCustomer, setInvoiceCustomer] = useState('Rajesh Electricals');
  const [invoicePhone, setInvoicePhone] = useState('919876543210');
  const [invoiceGstin, setInvoiceGstin] = useState('27AAAAA1111A1Z1');
  const [invoiceQty, setInvoiceQty] = useState(5);
  const [invoiceGstSlab, setInvoiceGstSlab] = useState(18);
  const [invoiceStateType, setInvoiceStateType] = useState<'intra' | 'inter'>('intra');

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

  // Load from local storage and Firestore on mount
  useEffect(() => {
    let unsubscribeProducts = () => {};
    
    // Load other stored parameters
    try {
      // Load leads (CRM context)
      const storedLeads = localStorage.getItem('marketplace_leads');
      if (storedLeads) {
        setLeads(JSON.parse(storedLeads));
      } else {
        const defaultLeads = [
          { id: 'LD-101', customerName: 'Rajesh Sharma', businessName: 'Rajesh Electricals', productName: 'Copper Core Grounding Wire', value: 24000, location: 'Nagpur, MH', status: 'contacted', date: '2026-07-09', phone: '919876543210', notes: 'Wants delivery by Friday.' },
          { id: 'LD-102', customerName: 'Siddharth Roy', businessName: 'Siddharth Pumps Ltd', productName: 'Industrial Water Pump', value: 145000, location: 'Kolkata, WB', status: 'proposal', date: '2026-07-10', phone: '919876543210', notes: 'Sent quotation with 5% discount.' },
          { id: 'LD-103', customerName: 'Amit Desai', businessName: 'Desai Hardware Store', productName: 'Brass Coupling Joints (1/2 Inch)', value: 1700, location: 'Pune, MH', status: 'uncontacted', date: '2026-07-11', phone: '919876543210' },
        ];
        localStorage.setItem('marketplace_leads', JSON.stringify(defaultLeads));
        setLeads(defaultLeads);
      }

      // Load invoices
      const storedInvoices = localStorage.getItem('marketplace_inventory_invoices');
      if (storedInvoices) {
        setInvoices(JSON.parse(storedInvoices));
      } else {
        const mockInvoices: SKUInvoice[] = [
          {
            id: 'GE-INV-8821',
            sku: 'EL-CC-GND',
            productName: 'Copper Core Grounding Wire',
            customerName: 'Rajesh Sharma',
            customerPhone: '919876543210',
            quantity: 20,
            subtotal: 24000,
            taxValue: 4320,
            total: 28320,
            status: 'paid',
            date: '2026-07-12',
            gstRate: 18,
            cgst: 2160,
            sgst: 2160,
            igst: 0,
            stateType: 'intra'
          },
          {
            id: 'GE-INV-8822',
            sku: 'WP-IND-100',
            productName: 'Industrial Water Pump',
            customerName: 'Siddharth Roy',
            customerPhone: '919876543210',
            quantity: 2,
            subtotal: 29000,
            taxValue: 5220,
            total: 34220,
            status: 'sent',
            date: '2026-07-15',
            gstRate: 18,
            cgst: 0,
            sgst: 0,
            igst: 5220,
            stateType: 'inter'
          }
        ];
        localStorage.setItem('marketplace_inventory_invoices', JSON.stringify(mockInvoices));
        setInvoices(mockInvoices);
      }
    } catch (e) {
      console.error(e);
    }

    // Connect products query to Firestore
    const initFirestoreProducts = async () => {
      try {
        const storedUser = localStorage.getItem('mp_user');
        const userObj = storedUser ? JSON.parse(storedUser) : null;
        if (!userObj || !userObj.uid) return;

        const services = await getFirebaseServices();
        if (!services) return;
        const { db } = services;

        const q = query(
          collection(db, 'products'),
          where('sellerId', '==', userObj.uid)
        );

        unsubscribeProducts = onSnapshot(q, (snapshot) => {
          const list: Product[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            list.push({
              id: doc.id,
              name: data.name || '',
              category: data.category || 'General',
              brand: data.specifications?.brand || 'General',
              description: data.description || '',
              price: Number(data.price) || 0,
              moq: Number(data.moq) || 1,
              reorderLevel: Number(data.reorderLevel) || Number(data.moq) * 2 || 10,
              stock: Number(data.stock) || 0,
              reserved: Number(data.reserved) || 0,
              damaged: Number(data.damaged) || 0,
              returned: Number(data.returned) || 0,
              sku: data.sku || '',
              unit: data.unit || 'Pieces',
              gst: !!data.gst,
              gstRate: Number(data.gstRate) || 18,
              hsn: data.hsn || '8538',
              barcode: data.barcode || '',
              qrCode: data.qrCode || '',
              batchNo: data.batchNo || '',
              expiryDate: data.expiryDate || '',
              serialNo: data.serialNo || '',
              imei: data.imei || '',
              warehouse: data.warehouse || 'Warehouse Alpha',
              variants: data.variants || {},
              delivery: data.delivery || '3-5 days',
              tags: data.features || [],
              whatsapp: data.whatsapp || '',
              images: Array.isArray(data.images) ? data.images : (data.image ? [data.image] : []),
              archived: !!data.archived,
            });
          });
          setProducts(list);
          localStorage.setItem('marketplace_products', JSON.stringify(list));
        }, (err) => {
          console.error("Firestore inventory products stream error:", err);
        });
      } catch (err) {
        console.error("Failed to connect products to Firestore:", err);
      }
    };
    initFirestoreProducts();

    return () => {
      unsubscribeProducts();
    };
  }, []);

  const saveProducts = async (list: Product[]) => {
    try {
      const storedUser = localStorage.getItem('mp_user');
      const userObj = storedUser ? JSON.parse(storedUser) : null;
      const sellerId = userObj?.uid || '';
      const seller = userObj?.businessName || userObj?.name || 'Gaurav Enterprise';

      const services = await getFirebaseServices();
      if (!services) return;
      const { db } = services;

      // Detect deleted products
      for (const originalProd of products) {
        const stillExists = list.some(p => p.id === originalProd.id);
        if (!stillExists) {
          await deleteDoc(doc(db, 'products', originalProd.id));
        }
      }

      for (const prod of list) {
        const original = products.find(p => p.id === prod.id);
        if (!original) {
          // New product - write full schema matching security rules
          await setDoc(doc(db, 'products', prod.id), {
            sellerId,
            seller,
            name: prod.name,
            title: prod.name,
            category: prod.category || 'General',
            description: prod.description || '',
            price: Number(prod.price) || 0,
            moq: Number(prod.moq) || 1,
            stock: Number(prod.stock) || 0,
            sku: prod.sku || `SKU-${Date.now()}`,
            unit: prod.unit || 'Pieces',
            gst: !!prod.gst,
            delivery: prod.delivery || '3-5 days',
            whatsapp: prod.whatsapp || userObj?.whatsappNumber || '919876543210',
            images: prod.images || [],
            archived: !!prod.archived,
            features: prod.tags || [],
            specifications: {
              brand: prod.brand || 'General',
              model: prod.sku || '',
            },
            analytics: {
              views: 0,
              orders: 0
            },
            reorderLevel: prod.reorderLevel || prod.moq * 2 || 10,
            reserved: prod.reserved || 0,
            damaged: prod.damaged || 0,
            returned: prod.returned || 0,
            gstRate: prod.gstRate || 18,
            hsn: prod.hsn || '8538',
            warehouse: prod.warehouse || 'Warehouse Alpha',
            created_at: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        } else if (
            original.price !== prod.price || 
            original.stock !== prod.stock || 
            original.reorderLevel !== prod.reorderLevel ||
            original.reserved !== prod.reserved ||
            original.damaged !== prod.damaged ||
            original.returned !== prod.returned ||
            original.archived !== prod.archived ||
            original.moq !== prod.moq) {
          
          // Existing product edit - update fields
          await setDoc(doc(db, 'products', prod.id), {
            price: prod.price,
            stock: prod.stock,
            reorderLevel: prod.reorderLevel,
            reserved: prod.reserved || 0,
            damaged: prod.damaged || 0,
            returned: prod.returned || 0,
            archived: !!prod.archived,
            moq: prod.moq,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        }
      }
    } catch (err) {
      console.error('Failed to save products to Firestore:', err);
    }
  };

  const saveInvoices = (list: SKUInvoice[]) => {
    setInvoices(list);
    localStorage.setItem('marketplace_inventory_invoices', JSON.stringify(list));
  };

  // Cell edits
  const handleCellChange = (productId: string, field: 'price' | 'stock' | 'reorderLevel', value: string) => {
    const numericValue = value === '' ? 0 : Math.max(0, parseInt(value, 10) || 0);
    const original = products.find((p) => p.id === productId);
    if (!original) return;

    const currentEdit = pendingEdits[productId] || { 
      price: original.price, 
      stock: original.stock,
      reorderLevel: original.reorderLevel !== undefined ? original.reorderLevel : (original.moq * 2 || 10)
    };
    const updatedEdit = { ...currentEdit, [field]: numericValue };

    const isMatchOriginal = 
      updatedEdit.price === original.price && 
      updatedEdit.stock === original.stock && 
      updatedEdit.reorderLevel === (original.reorderLevel !== undefined ? original.reorderLevel : (original.moq * 2 || 10));

    if (isMatchOriginal) {
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
          return { ...prod, price: edits.price, stock: edits.stock, reorderLevel: edits.reorderLevel };
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
      reorderLevel: Number(formReorderLevel) || 10,
      stock: Number(formStock) || 0,
      reserved: Number(formReserved) || 0,
      damaged: Number(formDamaged) || 0,
      returned: Number(formReturned) || 0,
      sku: formSku || `SKU-${Math.floor(100000 + Math.random() * 900000)}`,
      unit: formUnit,
      gst: true,
      gstRate: Number(formGstRate) || 18,
      hsn: formHsn || '8544',
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
    setFormReorderLevel(10);
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
    
    // Flat tabs filter
    const reorder = p.reorderLevel !== undefined ? p.reorderLevel : (p.moq * 2 || 10);
    const isLow = p.stock <= reorder;
    let matchesStatus = true;
    if (stockStatusFilter === 'active') {
      matchesStatus = !p.archived;
    } else if (stockStatusFilter === 'instock') {
      matchesStatus = !p.archived && !isLow && p.stock > 0;
    } else if (stockStatusFilter === 'low') {
      matchesStatus = !p.archived && isLow;
    } else if (stockStatusFilter === 'archived') {
      matchesStatus = !!p.archived;
    }

    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Sort products
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === 'name') {
      return a.name.localeCompare(b.name);
    } else if (sortBy === 'price') {
      return a.price - b.price;
    } else if (sortBy === 'stock') {
      return a.stock - b.stock;
    } else if (sortBy === 'reorder') {
      const aVal = a.reorderLevel !== undefined ? a.reorderLevel : (a.moq * 2 || 10);
      const bVal = b.reorderLevel !== undefined ? b.reorderLevel : (b.moq * 2 || 10);
      return aVal - bVal;
    }
    return 0;
  });

  // AI Insights calculations
  const totalStockValuation = products.reduce((acc, p) => acc + (p.price * p.stock), 0);
  const totalReservedValuation = products.reduce((acc, p) => acc + (p.price * (p.reserved || 0)), 0);

  // Helper for consistent status color coding
  const getStockStatus = (stock: number, reorder: number) => {
    if (stock === 0) {
      return { 
        color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/40', 
        label: 'Out of Stock', 
        badge: 'bg-rose-500',
        text: 'text-rose-600 font-extrabold'
      };
    }
    if (stock <= reorder) {
      return { 
        color: 'text-amber-600 bg-amber-50 dark:bg-amber-955/20 border-amber-200 dark:border-amber-800/40', 
        label: 'Low Stock', 
        badge: 'bg-amber-500',
        text: 'text-amber-600 font-extrabold'
      };
    }
    return { 
      color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-955/20 border-emerald-200 dark:border-emerald-800/40', 
      label: 'Healthy', 
      badge: 'bg-emerald-500',
      text: 'text-emerald-600 font-extrabold'
    };
  };

  // Sync state variable from selectedProduct to stock adjustments subform
  useEffect(() => {
    if (selectedProduct) {
      setAdjustStockVal(selectedProduct.stock);
      setAdjustReservedVal(selectedProduct.reserved || 0);
      setAdjustDamagedVal(selectedProduct.damaged || 0);
      setAdjustReturnedVal(selectedProduct.returned || 0);
      setCreateInvoiceOnDispatch(false);
      setIsAdjustDispatch(false);
    }
  }, [selectedProduct]);

  // Handle stock adjustments submit
  const handleStockAdjustmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    const diff = selectedProduct.stock - adjustStockVal;
    
    const updated = products.map((p) => {
      if (p.id === selectedProduct.id) {
        const u = {
          ...p,
          stock: adjustStockVal,
          reserved: adjustReservedVal,
          damaged: adjustDamagedVal,
          returned: adjustReturnedVal
        };
        setSelectedProduct(u); // Update currently viewed product
        return u;
      }
      return p;
    });
    
    saveProducts(updated);
    alert('Stock buckets successfully updated.');

    // If dispatch and create invoice is enabled
    if (diff > 0 && createInvoiceOnDispatch) {
      // Set up invoicing fields pre-filled
      setInvoiceQty(diff);
      setInvoiceGstSlab(selectedProduct.gstRate || 18);
      // Try to find a matching buyer name from leads
      const productLeads = leads.filter(l => l.productName.toLowerCase().includes(selectedProduct.name.toLowerCase()));
      if (productLeads.length > 0) {
        setInvoiceCustomer(productLeads[0].businessName || productLeads[0].customerName);
        setInvoicePhone(productLeads[0].phone || '919876543210');
      } else {
        setInvoiceCustomer('Rajesh Electricals');
        setInvoicePhone('919876543210');
      }
      setIsInvoiceModalOpen(true);
    }
  };

  // Handle new invoice submit
  const handleCreateInvoiceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    const calc: GSTCalculationResult = calculateGST({
      price: selectedProduct.price,
      quantity: invoiceQty,
      gstApplicable: selectedProduct.gst,
      gstSlab: invoiceGstSlab,
      stateType: invoiceStateType,
      buyerGSTIN: invoiceGstin
    });

    const newInvoice: SKUInvoice = {
      id: `GE-INV-${Math.floor(1000 + Math.random() * 9000)}`,
      sku: selectedProduct.sku,
      productName: selectedProduct.name,
      customerName: invoiceCustomer,
      customerPhone: invoicePhone,
      quantity: invoiceQty,
      subtotal: calc.subtotal,
      taxValue: calc.taxValue,
      total: calc.total,
      status: 'draft',
      date: new Date().toISOString().split('T')[0],
      gstRate: invoiceGstSlab,
      cgst: calc.cgst,
      sgst: calc.sgst,
      igst: calc.igst,
      stateType: invoiceStateType
    };

    const updatedInvoices = [newInvoice, ...invoices];
    saveInvoices(updatedInvoices);
    setIsInvoiceModalOpen(false);
    alert(`B2B Invoice ${newInvoice.id} generated successfully in Draft status.`);
  };

  const handleUpdateInvoiceStatus = (invId: string, nextStatus: SKUInvoice['status']) => {
    const updated = invoices.map(inv => {
      if (inv.id === invId) {
        return { ...inv, status: nextStatus };
      }
      return inv;
    });
    saveInvoices(updated);
  };

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
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-extrabold px-3 py-2.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm"
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
                  : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
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
          <Card className="rounded-3xl border border-[#f3d9a7] dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
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

              <div className="flex flex-wrap items-center gap-3">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Sort By</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-350 focus:outline-none focus:ring-1 focus:ring-[#FAB12F]"
                >
                  <option value="name">Name (A-Z)</option>
                  <option value="price">Price (Low-High)</option>
                  <option value="stock">Available Stock (Low-High)</option>
                  <option value="reorder">Reorder Level (Low-High)</option>
                </select>

                <span className="text-[10px] text-slate-400 font-bold uppercase">Category</span>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-350 focus:outline-none focus:ring-1 focus:ring-[#FAB12F]"
                >
                  <option value="">All Categories</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Flat filters bar */}
            <div className="flex flex-wrap gap-1.5 border-t border-slate-100 dark:border-slate-800 pt-3">
              {([
                { id: 'active', label: 'All Active' },
                { id: 'instock', label: 'Live-In Stock' },
                { id: 'low', label: 'Low Stock' },
                { id: 'archived', label: 'Archived' }
              ] as const).map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setStockStatusFilter(filter.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                    stockStatusFilter === filter.id
                      ? 'bg-slate-950 dark:bg-white text-white dark:text-slate-950 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-955 text-slate-450 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-850'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
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
                    className="rounded-xl bg-[#FAB12F] text-slate-950 px-3.5 py-2 font-black shadow-sm"
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
                          checked={selectedProductIds.length === sortedProducts.length && sortedProducts.length > 0}
                          onChange={(e) =>
                            setSelectedProductIds(e.target.checked ? sortedProducts.map((p) => p.id) : [])
                          }
                          className="rounded text-amber-500 focus:ring-amber-500"
                        />
                      </th>
                      <th className="py-4 px-5">Product Details</th>
                      <th className="py-4 px-5">Brand / SKU</th>
                      <th className="py-4 px-5">HSN / GST</th>
                      <th className="py-4 px-5 text-center">Warehouse</th>
                      <th className="py-4 px-5 text-right">Price (₹)</th>
                      <th className="py-4 px-5 text-right">Reorder Alert Level</th>
                      <th className="py-4 px-5 text-right">Available Stock</th>
                      <th className="py-4 px-5 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 dark:divide-slate-800/80 font-semibold text-slate-800 dark:text-slate-200">
                    {sortedProducts.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="text-center py-12 text-slate-500 font-bold">
                          No matching inventory items found.
                        </td>
                      </tr>
                    ) : (
                      sortedProducts.map((prod) => {
                        const edits = pendingEdits[prod.id];
                        const originalReorder = prod.reorderLevel !== undefined ? prod.reorderLevel : (prod.moq * 2 || 10);
                        const activePrice = edits ? edits.price : prod.price;
                        const activeStock = edits ? edits.stock : prod.stock;
                        const activeReorder = edits ? edits.reorderLevel : originalReorder;
                        const isEdited = !!edits;
                        const status = getStockStatus(activeStock, originalReorder);

                        return (
                          <tr
                            key={prod.id}
                            className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors ${
                              prod.archived ? 'opacity-55 bg-slate-100/30' : ''
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
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[10px] text-slate-400">{prod.category}</span>
                                    <span className={`w-1.5 h-1.5 rounded-full ${status.badge}`} />
                                    <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-450">{status.label}</span>
                                  </div>
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
                              {prod.warehouse || 'Warehouse Alpha'}
                            </td>
                            <td className="py-4 px-5 text-right">
                              <div className="inline-flex items-center gap-1.5 bg-[#fff6e6] dark:bg-slate-950 border border-[#f3d9a7]/60 dark:border-slate-800 rounded-xl px-2.5 py-1.5 focus-within:border-[#FAB12F] transition-all shadow-inner">
                                <span className="text-[10px] text-slate-505 font-bold">₹</span>
                                <input
                                  type="number"
                                  value={activePrice}
                                  onChange={(e) => handleCellChange(prod.id, 'price', e.target.value)}
                                  className="w-16 bg-transparent text-right font-black text-slate-850 dark:text-slate-100 focus:outline-none"
                                />
                              </div>
                            </td>
                            <td className="py-4 px-5 text-right">
                              <div className="inline-flex items-center gap-1.5 bg-[#fff6e6] dark:bg-slate-950 border border-[#f3d9a7]/60 dark:border-slate-800 rounded-xl px-2.5 py-1.5 focus-within:border-[#FAB12F] transition-all shadow-inner">
                                <input
                                  type="number"
                                  value={activeReorder}
                                  onChange={(e) => handleCellChange(prod.id, 'reorderLevel', e.target.value)}
                                  className="w-12 bg-transparent text-right font-black text-slate-850 dark:text-slate-100 focus:outline-none"
                                />
                                <span className="text-[9px] text-slate-400 font-bold">{prod.unit}</span>
                              </div>
                            </td>
                            <td className="py-4 px-5 text-right">
                              <div className={`inline-flex items-center gap-1.5 bg-[#fff6e6] dark:bg-slate-950 border rounded-xl px-2.5 py-1.5 focus-within:border-[#FAB12F] transition-all shadow-inner ${
                                activeStock === 0 ? 'border-rose-400' : activeStock <= originalReorder ? 'border-amber-400' : 'border-[#f3d9a7]/60 dark:border-slate-800'
                              }`}>
                                <input
                                  type="number"
                                  value={activeStock}
                                  onChange={(e) => handleCellChange(prod.id, 'stock', e.target.value)}
                                  className={`w-12 bg-transparent text-right font-black focus:outline-none ${status.text}`}
                                />
                                <span className="text-[9px] text-slate-450 font-bold">{prod.unit}</span>
                              </div>
                            </td>
                            <td className="py-4 px-5 text-center space-x-1">
                              <button
                                onClick={() => {
                                  setSelectedProduct(prod);
                                }}
                                className="p-1.5 text-slate-400 hover:text-amber-500 transition-colors"
                                title="CRM Specs & Adjustment details"
                              >
                                👁️
                              </button>
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
                  {products.map((prod) => {
                    const status = getStockStatus(prod.stock, prod.reorderLevel || prod.moq || 10);
                    return (
                      <tr key={prod.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                        <td className="py-4 px-4 font-black">
                          <div className="flex items-center gap-2">
                            <span>{prod.name}</span>
                            <span className={`w-2 h-2 rounded-full ${status.badge}`} />
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center text-slate-500">{prod.warehouse || 'Warehouse Alpha'}</td>
                        <td className={`py-4 px-4 text-right font-black ${status.text}`}>{prod.stock}</td>
                        <td className="py-4 px-4 text-right text-amber-600 dark:text-amber-400 font-black">{prod.reserved || 0}</td>
                        <td className="py-4 px-4 text-right text-rose-500 font-black">{prod.damaged || 0}</td>
                        <td className="py-4 px-4 text-right text-blue-500 font-black">{prod.returned || 0}</td>
                        <td className="py-4 px-4 text-right">
                          <button
                            onClick={() => {
                              setSelectedProduct(prod);
                            }}
                            className="rounded-lg border border-[#f3d9a7] bg-[#fff6e6] dark:bg-slate-950 text-[#FAB12F] font-bold px-2 py-1 text-[10px] hover:bg-slate-50 dark:hover:bg-slate-800"
                          >
                            Adjust Buckets
                          </button>
                        </td>
                      </tr>
                    );
                  })}
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
                {products.filter((p) => p.stock <= (p.reorderLevel || p.moq || 10)).map((p) => (
                  <div key={p.id} className="flex justify-between items-center bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-850">
                    <div>
                      <p className="font-extrabold text-slate-850 dark:text-slate-100">{p.name}</p>
                      <p className="text-[10px] text-slate-400">Available: <span className="text-rose-500 font-bold">{p.stock} units</span> • Alert Trigger: {p.reorderLevel || p.moq}</p>
                    </div>
                    <button
                      onClick={() => {
                        setPoSupplierName(suppliers.find(s => s.category === p.category)?.name || 'Hindalco Metal Industries');
                        setPoItemName(p.name);
                        setPoQty(p.moq * 10);
                        setIsPoModalOpen(true);
                      }}
                      className="rounded-lg bg-[#FAB12F] text-slate-950 font-black px-2.5 py-1.5 text-[9px] shadow-sm hover:bg-[#e09e1b] transition-all"
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
                  <h4 className="font-black text-slate-800 dark:text-white uppercase tracking-wider text-[10px] text-slate-455">ABC Sourcing Classification</h4>
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
                  <h4 className="font-black text-slate-800 dark:text-white uppercase tracking-wider text-[10px] text-slate-455">AI Pricing & Promo Optimization</h4>
                  <div className="rounded-xl border border-[#f3d9a7]/60 bg-[#fff6e6]/30 dark:bg-slate-950/20 p-3 space-y-2 text-slate-655 dark:text-slate-350">
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
                  <div key={po.id} className="p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-955 text-xs space-y-2">
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
                    <h4 className="font-black text-slate-855 dark:text-white">{grn.item}</h4>
                    <p className="text-[10px] text-slate-505">Received from {grn.supplierName} • Location: {grn.warehouse}</p>
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
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-[32px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center pb-2 border-b border-slate-150 dark:border-slate-800">
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Add New Product</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-500">✕</button>
            </div>

            <form onSubmit={handleAddProductSubmit} className="space-y-4 text-xs font-semibold">
              <div className="grid gap-4 grid-cols-2">
                <div className="space-y-1">
                  <label className="text-slate-500">Product Name</label>
                  <input type="text" required value={formName} onChange={(e) => setFormName(e.target.value)} className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 p-2.5 focus:outline-none dark:text-slate-100" />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-500">Brand Name</label>
                  <input type="text" required value={formBrand} onChange={(e) => setFormBrand(e.target.value)} className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 p-2.5 focus:outline-none dark:text-slate-100" />
                </div>
              </div>

              <div className="grid gap-4 grid-cols-4">
                <div className="space-y-1">
                  <label className="text-slate-500">Category</label>
                  <select value={formCategory} onChange={(e) => setFormCategory(e.target.value)} className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 p-2.5 focus:outline-none dark:text-slate-100">
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-slate-500">Wholesale Price (₹)</label>
                  <input type="number" required value={formPrice} onChange={(e) => setFormPrice(Number(e.target.value))} className="w-full rounded-xl bg-slate-50 dark:bg-slate-955 border border-slate-200 p-2.5 focus:outline-none dark:text-slate-100" />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-505">Min. Order Qty (MOQ)</label>
                  <input type="number" required value={formMoq} onChange={(e) => setFormMoq(Number(e.target.value))} className="w-full rounded-xl bg-slate-50 dark:bg-slate-955 border border-slate-200 p-2.5 focus:outline-none dark:text-slate-100" />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-505">Reorder Level Alert</label>
                  <input type="number" required value={formReorderLevel} onChange={(e) => setFormReorderLevel(Number(e.target.value))} className="w-full rounded-xl bg-slate-50 dark:bg-slate-955 border border-slate-200 p-2.5 focus:outline-none dark:text-slate-100" />
                </div>
              </div>

              <div className="grid gap-4 grid-cols-4">
                <div className="space-y-1">
                  <label className="text-slate-500">Available Stock</label>
                  <input type="number" required value={formStock} onChange={(e) => setFormStock(Number(e.target.value))} className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 p-2.5 dark:text-slate-100" />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-500">Reserved</label>
                  <input type="number" value={formReserved} onChange={(e) => setFormReserved(Number(e.target.value))} className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 p-2.5 dark:text-slate-100" />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-500">Damaged</label>
                  <input type="number" value={formDamaged} onChange={(e) => setFormDamaged(Number(e.target.value))} className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 p-2.5 dark:text-slate-100" />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-500">Returned</label>
                  <input type="number" value={formReturned} onChange={(e) => setFormReturned(Number(e.target.value))} className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 p-2.5 dark:text-slate-100" />
                </div>
              </div>

              <div className="grid gap-4 grid-cols-3">
                <div className="space-y-1">
                  <label className="text-slate-500">SKU Code</label>
                  <input type="text" value={formSku} onChange={(e) => setFormSku(e.target.value)} placeholder="Auto-generated if empty" className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 p-2.5 dark:text-slate-100" />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-500">HSN Code</label>
                  <input type="text" value={formHsn} onChange={(e) => setFormHsn(e.target.value)} className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 p-2.5 dark:text-slate-100" />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-500">GST Rate (%)</label>
                  <select value={formGstRate} onChange={(e) => setFormGstRate(Number(e.target.value))} className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 p-2.5 dark:text-slate-100">
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
                  <input type="text" value={formBatchNo} onChange={(e) => setFormBatchNo(e.target.value)} className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 p-2.5 dark:text-slate-100" />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-500">Expiry Date</label>
                  <input type="date" value={formExpiryDate} onChange={(e) => setFormExpiryDate(e.target.value)} className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 p-2.5 dark:text-slate-100" />
                </div>
              </div>

              <div className="grid gap-4 grid-cols-3">
                <div className="space-y-1">
                  <label className="text-slate-500">Serial Number</label>
                  <input type="text" value={formSerialNo} onChange={(e) => setFormSerialNo(e.target.value)} className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 p-2.5 dark:text-slate-100" />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-500">IMEI</label>
                  <input type="text" value={formImei} onChange={(e) => setFormImei(e.target.value)} className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 p-2.5 dark:text-slate-100" />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-500">Target Warehouse</label>
                  <select value={formWarehouse} onChange={(e) => setFormWarehouse(e.target.value)} className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 p-2.5 dark:text-slate-100">
                    {WAREHOUSES.map((w) => <option key={w} value={w}>{w}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-2 bg-slate-50 dark:bg-slate-955 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                <h4 className="font-black text-slate-800 dark:text-white uppercase tracking-wider text-[10px]">Product Variants</h4>
                <div className="grid gap-3 grid-cols-4">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400">Size</label>
                    <input type="text" value={formVariantSize} onChange={(e) => setFormVariantSize(e.target.value)} placeholder="e.g. Standard" className="w-full rounded-lg bg-white dark:bg-slate-900 border border-slate-200 p-2 dark:text-slate-100 dark:border-slate-800" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400">Color</label>
                    <input type="text" value={formVariantColor} onChange={(e) => setFormVariantColor(e.target.value)} placeholder="e.g. Blue" className="w-full rounded-lg bg-white dark:bg-slate-900 border border-slate-200 p-2 dark:text-slate-100 dark:border-slate-800" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400">Weight</label>
                    <input type="text" value={formVariantWeight} onChange={(e) => setFormVariantWeight(e.target.value)} placeholder="e.g. 5kg" className="w-full rounded-lg bg-white dark:bg-slate-900 border border-slate-200 p-2 dark:text-slate-100 dark:border-slate-800" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400">Material</label>
                    <input type="text" value={formVariantMaterial} onChange={(e) => setFormVariantMaterial(e.target.value)} placeholder="e.g. Copper" className="w-full rounded-lg bg-white dark:bg-slate-900 border border-slate-200 p-2 dark:text-slate-100 dark:border-slate-800" />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-505">Detailed Product Description</label>
                <textarea rows={3} required value={formDescription} onChange={(e) => setFormDescription(e.target.value)} className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 p-2.5 resize-none dark:text-slate-100 dark:border-slate-800" />
              </div>

              <button type="submit" className="w-full rounded-2xl bg-[#FAB12F] text-slate-950 font-black py-3 text-center shadow-md hover:bg-[#e09e1b] transition-all">Add Product to Inventory</button>
            </form>
          </div>
        </div>
      )}

      {/* PO Creation Modal */}
      {isPoModalOpen && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm" onClick={() => setIsPoModalOpen(false)}>
          <div className="w-full max-w-md rounded-[32px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl relative space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center pb-2 border-b border-slate-150 dark:border-slate-800">
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Create Purchase Order</h3>
              <button onClick={() => setIsPoModalOpen(false)} className="h-7 w-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-500">✕</button>
            </div>

            <form onSubmit={handleCreatePoSubmit} className="space-y-3.5 text-xs font-semibold">
              <div className="space-y-1">
                <label className="text-slate-505">Select Supplier</label>
                <select value={poSupplierName} onChange={(e) => setPoSupplierName(e.target.value)} className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 p-2.5 dark:text-slate-100 dark:border-slate-800">
                  {suppliers.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-505">Product Item Name</label>
                <input type="text" required value={poItemName} onChange={(e) => setPoItemName(e.target.value)} className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 p-2.5 dark:text-slate-100 dark:border-slate-800" />
              </div>

              <div className="grid gap-3 grid-cols-2">
                <div className="space-y-1">
                  <label className="text-slate-505">Order Quantity</label>
                  <input type="number" required value={poQty} onChange={(e) => setPoQty(Number(e.target.value))} className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 p-2.5 dark:text-slate-100 dark:border-slate-800" />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-505">Target Unit Price (₹)</label>
                  <input type="number" required value={poBudget} onChange={(e) => setPoBudget(Number(e.target.value))} className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 p-2.5 dark:text-slate-100 dark:border-slate-800" />
                </div>
              </div>

              <button type="submit" className="w-full rounded-2xl bg-[#FAB12F] text-slate-955 font-black py-3 text-center shadow-md hover:bg-[#e09e1b] transition-all">Submit Purchase Order</button>
            </form>
          </div>
        </div>
      )}

      {/* Upgraded Product View Details Specs Modal (CRM + ERP Cockpit) */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm overflow-y-auto" onClick={() => setSelectedProduct(null)}>
          <div className="w-full max-w-4xl rounded-[32px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto space-y-6" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex justify-between items-center pb-3 border-b border-slate-150 dark:border-slate-800">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider">SKU Control Panel & CRM Insights</h3>
                <p className="text-xs text-slate-450 mt-1">Comprehensive Zoho-style ledger context for this item.</p>
              </div>
              <button onClick={() => setSelectedProduct(null)} className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-850 hover:bg-slate-200 dark:hover:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-500">✕</button>
            </div>

            {/* Content split in 2 columns */}
            <div className="grid gap-6 md:grid-cols-2 text-xs">
              
              {/* Column 1: Core Specifications */}
              <div className="space-y-4">
                <div className="bg-slate-50/50 dark:bg-slate-950/40 p-4 rounded-3xl border border-slate-150 dark:border-slate-850 space-y-3">
                  <div>
                    <span className="text-[9px] uppercase font-black text-slate-400 block tracking-widest">Selected Item</span>
                    <h4 className="text-base font-black text-slate-900 dark:text-white leading-tight">{selectedProduct.name}</h4>
                    <p className="text-slate-450 font-bold mt-1">{selectedProduct.brand} • {selectedProduct.category}</p>
                  </div>

                  <div className="grid gap-2 grid-cols-2 pt-2 border-t border-slate-200 dark:border-slate-850 font-semibold text-slate-700 dark:text-slate-350">
                    <p>📦 SKU: <span className="font-extrabold text-slate-900 dark:text-white font-mono">{selectedProduct.sku}</span></p>
                    <p>🏷️ Barcode: <span className="font-extrabold text-slate-900 dark:text-white font-mono">{selectedProduct.barcode || 'N/A'}</span></p>
                    <p>🔢 Batch: <span className="font-extrabold text-slate-900 dark:text-white font-mono">{selectedProduct.batchNo || 'N/A'}</span></p>
                    <p>📅 Expiry: <span className="font-extrabold text-slate-900 dark:text-white">{selectedProduct.expiryDate || 'N/A'}</span></p>
                    <p>🔢 Serial: <span className="font-extrabold text-slate-900 dark:text-white font-mono">{selectedProduct.serialNo || 'N/A'}</span></p>
                    <p>📱 IMEI: <span className="font-extrabold text-slate-900 dark:text-white font-mono">{selectedProduct.imei || 'N/A'}</span></p>
                    <p>🏬 Warehouse: <span className="font-extrabold text-slate-900 dark:text-white">{selectedProduct.warehouse || 'Warehouse Alpha'}</span></p>
                    <p>⚖️ HSN Code: <span className="font-extrabold text-slate-900 dark:text-white font-mono">{selectedProduct.hsn || '8544'}</span></p>
                    <p>💰 Price (Wholesale): <span className="font-extrabold text-slate-900 dark:text-white">₹{selectedProduct.price.toLocaleString('en-IN')}</span></p>
                    <p>💼 GST Slab: <span className="font-extrabold text-slate-900 dark:text-white">{selectedProduct.gstRate || 18}%</span></p>
                  </div>
                </div>

                {selectedProduct.variants && (
                  <div className="space-y-2">
                    <h4 className="font-black text-slate-500 uppercase tracking-wider text-[10px]">Configured Variants</h4>
                    <div className="grid gap-2 grid-cols-4 bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-100 dark:border-slate-850 text-center font-bold">
                      <div><span className="text-[10px] text-slate-400 block font-normal">Size</span><span>{selectedProduct.variants.size || '-'}</span></div>
                      <div><span className="text-[10px] text-slate-400 block font-normal">Color</span><span>{selectedProduct.variants.color || '-'}</span></div>
                      <div><span className="text-[10px] text-slate-400 block font-normal">Weight</span><span>{selectedProduct.variants.weight || '-'}</span></div>
                      <div><span className="text-[10px] text-slate-400 block font-normal">Material</span><span>{selectedProduct.variants.material || '-'}</span></div>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <h4 className="font-black text-slate-500 uppercase tracking-wider text-[10px]">Item Description</h4>
                  <p className="text-slate-500 leading-relaxed bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-100 dark:border-slate-850 font-normal">{selectedProduct.description}</p>
                </div>

                {/* Stock Adjustment bucket update form */}
                <Card className="p-4 border border-[#f3d9a7]/65 dark:border-slate-800 bg-[#fff6e6]/20 dark:bg-slate-950/20 rounded-3xl space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">📦 Stock Adjustment Cockpit</h4>
                    <span className="text-[9px] text-[#FAB12F] font-bold">Quick Update Buckets</span>
                  </div>
                  
                  <form onSubmit={handleStockAdjustmentSubmit} className="space-y-3">
                    <div className="grid gap-2 grid-cols-4 text-center font-bold">
                      <div>
                        <label className="text-[10px] text-slate-400 block font-medium mb-1">Available</label>
                        <input 
                          type="number" 
                          value={adjustStockVal} 
                          onChange={(e) => {
                            const val = Number(e.target.value) || 0;
                            setAdjustStockVal(val);
                            setIsAdjustDispatch(val < selectedProduct.stock);
                          }} 
                          className="w-full text-center border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg p-1 text-xs font-bold dark:text-slate-150" 
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block font-medium mb-1">Reserved</label>
                        <input type="number" value={adjustReservedVal} onChange={(e) => setAdjustReservedVal(Number(e.target.value) || 0)} className="w-full text-center border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg p-1 text-xs font-bold dark:text-slate-150" />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block font-medium mb-1">Damaged</label>
                        <input type="number" value={adjustDamagedVal} onChange={(e) => setAdjustDamagedVal(Number(e.target.value) || 0)} className="w-full text-center border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg p-1 text-xs font-bold dark:text-slate-150" />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block font-medium mb-1">Returned</label>
                        <input type="number" value={adjustReturnedVal} onChange={(e) => setAdjustReturnedVal(Number(e.target.value) || 0)} className="w-full text-center border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg p-1 text-xs font-bold dark:text-slate-150" />
                      </div>
                    </div>

                    {isAdjustDispatch && (
                      <div className="flex items-center gap-2 p-2 bg-[#FAB12F]/10 rounded-xl border border-[#f3d9a7]/40 animate-fade-in text-[10px] text-amber-700 font-bold">
                        <input 
                          type="checkbox" 
                          id="chkDispatchInvoice"
                          checked={createInvoiceOnDispatch} 
                          onChange={(e) => setCreateInvoiceOnDispatch(e.target.checked)}
                          className="rounded text-amber-500 focus:ring-amber-500"
                        />
                        <label htmlFor="chkDispatchInvoice" className="cursor-pointer">
                          Generate compliant B2B tax invoice for this dispatch of {selectedProduct.stock - adjustStockVal} {selectedProduct.unit}
                        </label>
                      </div>
                    )}

                    <button 
                      type="submit" 
                      className="w-full bg-[#FAB12F] text-slate-950 py-2 rounded-xl font-black text-[10px] shadow-sm hover:bg-[#e09e1b] transition-all"
                    >
                      Apply Stock Adjustment
                    </button>
                  </form>
                </Card>
              </div>

              {/* Column 2: CRM & Invoicing Context */}
              <div className="space-y-4">
                
                {/* Linked Supplier Card */}
                {(() => {
                  const supplier = suppliers.find(s => s.category === selectedProduct.category) || suppliers[0];
                  return (
                    <Card className="p-4 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 rounded-3xl space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Linked Supplier Partner</span>
                        <span className="text-[9px] bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full font-bold">Verified SKU Provider</span>
                      </div>
                      
                      <div className="flex justify-between items-start">
                        <div>
                          <h5 className="font-black text-slate-850 dark:text-white text-sm">{supplier.name}</h5>
                          <p className="text-[10px] text-slate-450 mt-0.5">{supplier.location} • Rating: ⭐ {supplier.rating} ({supplier.performance} On-Time)</p>
                        </div>
                        
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => window.open(`https://wa.me/${supplier.whatsapp}?text=Hello%20${supplier.name},%20we%20would%2520like%2520to%2520inquire%2520about%2520restocking%2520${selectedProduct.name}%2520(SKU:%2520${selectedProduct.sku}).`)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-2.5 py-1.5 font-bold text-[10px] shadow-sm flex items-center gap-1 transition-all"
                          >
                            💬 WhatsApp
                          </button>
                          <a
                            href={`tel:${supplier.whatsapp}`}
                            className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl px-2.5 py-1.5 font-bold text-[10px] shadow-sm flex items-center justify-center transition-all"
                          >
                            📞 Call
                          </a>
                        </div>
                      </div>
                    </Card>
                  );
                })()}

                {/* Recent Buyers CRM Context */}
                <Card className="p-4 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 rounded-3xl space-y-3">
                  <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider block">Recent CRM Buyers & RFQs</span>
                  
                  {(() => {
                    const productLeads = leads.filter(l => l.productName.toLowerCase().includes(selectedProduct.name.toLowerCase()));
                    if (productLeads.length === 0) {
                      return <p className="text-slate-400 italic text-[11px] font-medium">No recent customer inquiries logged for this SKU.</p>;
                    }
                    return (
                      <div className="space-y-2.5">
                        {productLeads.slice(0, 3).map((lead, idx) => (
                          <div key={idx} className="p-2.5 border border-slate-100 dark:border-slate-850 bg-white dark:bg-slate-900 rounded-2xl flex justify-between items-center">
                            <div>
                              <p className="font-extrabold text-slate-800 dark:text-slate-100">{lead.businessName || lead.customerName}</p>
                              <p className="text-[9px] text-slate-450 mt-0.5">Value: ₹{lead.value.toLocaleString()} • Status: <span className="text-amber-600 font-extrabold uppercase">{lead.status}</span></p>
                              <span className="text-[8px] text-slate-400">{lead.date} • {lead.location}</span>
                            </div>

                            <div className="flex gap-1 shrink-0">
                              <button
                                onClick={() => window.open(`https://wa.me/${lead.phone || '919876543210'}?text=Hi%20${lead.customerName},%20regarding%2520your%2520inquiry%2520for%252520${selectedProduct.name}...`)}
                                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-850 rounded-lg text-xs"
                                title="WhatsApp Buyer"
                              >
                                💬
                              </button>
                              <a
                                href={`tel:${lead.phone || '919876543210'}`}
                                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-850 rounded-lg text-xs flex items-center justify-center"
                                title="Call Buyer"
                              >
                                📞
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </Card>

                {/* SKU Transaction & Invoice History */}
                <Card className="p-4 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 rounded-3xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider">SKU Invoices & Fulfillment</span>
                    <button
                      onClick={() => {
                        setInvoiceQty(selectedProduct.moq);
                        setInvoiceGstSlab(selectedProduct.gstRate || 18);
                        const pLeads = leads.filter(l => l.productName.toLowerCase().includes(selectedProduct.name.toLowerCase()));
                        if (pLeads.length > 0) {
                          setInvoiceCustomer(pLeads[0].businessName || pLeads[0].customerName);
                          setInvoicePhone(pLeads[0].phone || '919876543210');
                        }
                        setIsInvoiceModalOpen(true);
                      }}
                      className="text-[10px] text-[#FAB12F] font-black hover:underline"
                    >
                      + Create Invoice
                    </button>
                  </div>

                  {(() => {
                    const skuInvoices = invoices.filter(inv => inv.sku === selectedProduct.sku);
                    if (skuInvoices.length === 0) {
                      return <p className="text-slate-400 italic text-[11px] font-medium">No billing invoices issued for this SKU.</p>;
                    }
                    return (
                      <div className="space-y-2 max-h-[160px] overflow-y-auto">
                        {skuInvoices.map((inv) => (
                          <div key={inv.id} className="p-2 border border-slate-100 dark:border-slate-850 bg-white dark:bg-slate-900 rounded-2xl space-y-1.5">
                            <div className="flex justify-between items-center">
                              <div>
                                <span className="font-extrabold text-[10px] text-slate-800 dark:text-slate-150">{inv.id}</span>
                                <span className="text-[8px] text-slate-400 block">{inv.date}</span>
                              </div>
                              
                              <div className="flex items-center gap-1.5">
                                <span className={`rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-wider ${
                                  inv.status === 'paid'
                                    ? 'bg-emerald-500/10 text-emerald-600'
                                    : inv.status === 'sent'
                                    ? 'bg-blue-500/10 text-blue-600'
                                    : 'bg-amber-500/10 text-amber-600'
                                }`}>
                                  {inv.status}
                                </span>
                                
                                <select
                                  value={inv.status}
                                  onChange={(e) => handleUpdateInvoiceStatus(inv.id, e.target.value as any)}
                                  className="text-[8px] font-bold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded px-1 py-0.5 focus:outline-none"
                                >
                                  <option value="draft">Draft</option>
                                  <option value="sent">Sent</option>
                                  <option value="paid">Paid</option>
                                </select>
                              </div>
                            </div>
                            
                            <div className="flex justify-between text-[9px] text-slate-500 border-t border-slate-100 dark:border-slate-800/40 pt-1 font-semibold">
                              <span>Customer: {inv.customerName}</span>
                              <span>{inv.quantity} units • ₹{inv.total.toLocaleString()}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </Card>

              </div>
            </div>
          </div>
        </div>
      )}

      {/* Zoho compliant Tax Invoice Creator Overlay */}
      {isInvoiceModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-2xl rounded-[32px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl relative space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center pb-2 border-b border-slate-150 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Generate Compliant B2B GST Invoice</h3>
                <p className="text-[10px] text-slate-450 mt-0.5">Pre-filled with product HSN, base price, and GST rates.</p>
              </div>
              <button onClick={() => setIsInvoiceModalOpen(false)} className="h-7 w-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-500">✕</button>
            </div>

            <form onSubmit={handleCreateInvoiceSubmit} className="space-y-4 text-xs font-semibold">
              <div className="bg-slate-50/50 dark:bg-slate-950/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-850 grid gap-2 grid-cols-3">
                <p>📦 Product: <span className="font-extrabold text-slate-850 dark:text-white">{selectedProduct.name}</span></p>
                <p>🔢 SKU: <span className="font-extrabold text-slate-850 dark:text-white font-mono">{selectedProduct.sku}</span></p>
                <p>⚖️ HSN: <span className="font-extrabold text-slate-850 dark:text-white font-mono">{selectedProduct.hsn || '8544'}</span></p>
              </div>

              <div className="grid gap-3 grid-cols-2">
                <div className="space-y-1">
                  <label className="text-slate-500">Buyer Business / Customer Name</label>
                  <select 
                    value={invoiceCustomer} 
                    onChange={(e) => {
                      setInvoiceCustomer(e.target.value);
                      const matching = leads.find(l => (l.businessName || l.customerName) === e.target.value);
                      if (matching) {
                        setInvoicePhone(matching.phone || '919876543210');
                        setInvoiceStateType(matching.location.includes('MH') || matching.location.toLowerCase().includes('maharashtra') ? 'intra' : 'inter');
                      }
                    }} 
                    className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 p-2.5 focus:outline-none dark:text-slate-100"
                  >
                    <option value="Rajesh Electricals">Rajesh Electricals (Nagpur, MH)</option>
                    <option value="Siddharth Pumps Ltd">Siddharth Pumps Ltd (Kolkata, WB)</option>
                    <option value="Desai Hardware Store">Desai Hardware Store (Pune, MH)</option>
                    {leads.map((l, i) => (
                      <option key={i} value={l.businessName || l.customerName}>{l.businessName || l.customerName} ({l.location})</option>
                    ))}
                  </select>
                </div>
                
                <div className="space-y-1">
                  <label className="text-slate-500">Buyer Phone Number</label>
                  <input type="text" required value={invoicePhone} onChange={(e) => setInvoicePhone(e.target.value)} className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 p-2.5 focus:outline-none dark:text-slate-100" />
                </div>
              </div>

              <div className="grid gap-3 grid-cols-3">
                <div className="space-y-1">
                  <label className="text-slate-500">Billing Quantity</label>
                  <input type="number" required min={1} value={invoiceQty} onChange={(e) => setInvoiceQty(Number(e.target.value) || 1)} className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 p-2.5 focus:outline-none dark:text-slate-100" />
                </div>
                
                <div className="space-y-1">
                  <label className="text-slate-500">GST Slab (%)</label>
                  <select value={invoiceGstSlab} onChange={(e) => setInvoiceGstSlab(Number(e.target.value))} className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 p-2.5 focus:outline-none dark:text-slate-100">
                    <option value={5}>5%</option>
                    <option value={12}>12%</option>
                    <option value={18}>18%</option>
                    <option value={28}>28%</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-500">Buyer State Code type</label>
                  <select value={invoiceStateType} onChange={(e) => setInvoiceStateType(e.target.value as any)} className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 p-2.5 focus:outline-none dark:text-slate-100">
                    <option value="intra">Intra-State (Maharashtra: CGST+SGST)</option>
                    <option value="inter">Inter-State (IGST Compliant)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-500">Buyer GSTIN Identification Number (Optional)</label>
                <input type="text" placeholder="e.g. 27AAAAA1111A1Z1" value={invoiceGstin} onChange={(e) => setInvoiceGstin(e.target.value.toUpperCase())} className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 p-2.5 focus:outline-none font-mono uppercase dark:text-slate-100" />
                {invoiceGstin && invoiceGstin.length < 15 && (
                  <p className="text-[9px] text-amber-500 mt-1">Note: Compliant GSTIN requires exactly 15 alphanumeric characters.</p>
                )}
              </div>

              {/* Dynamic Live calculations display */}
              {(() => {
                const calc = calculateGST({
                  price: selectedProduct.price,
                  quantity: invoiceQty,
                  gstApplicable: selectedProduct.gst,
                  gstSlab: invoiceGstSlab,
                  stateType: invoiceStateType,
                  buyerGSTIN: invoiceGstin
                });

                return (
                  <div className="bg-[#fff6e6]/30 dark:bg-slate-955 border border-[#f3d9a7]/50 dark:border-slate-800 p-4 rounded-2xl space-y-2">
                    <span className="text-[9px] uppercase font-black text-slate-400 tracking-wider">Dynamic GST Invoice Calculations</span>
                    <div className="grid grid-cols-2 gap-2 text-slate-655 dark:text-slate-350">
                      <p>Subtotal Amount: <span className="font-extrabold text-slate-900 dark:text-white">₹{calc.subtotal.toLocaleString()}</span></p>
                      {invoiceStateType === 'intra' ? (
                        <>
                          <p>CGST ({invoiceGstSlab / 2}%): <span className="font-extrabold text-slate-900 dark:text-white">₹{calc.cgst.toLocaleString()}</span></p>
                          <p>SGST ({invoiceGstSlab / 2}%): <span className="font-extrabold text-slate-900 dark:text-white">₹{calc.sgst.toLocaleString()}</span></p>
                        </>
                      ) : (
                        <p>IGST ({invoiceGstSlab}%): <span className="font-extrabold text-slate-900 dark:text-white">₹{calc.igst.toLocaleString()}</span></p>
                      )}
                      <p className="col-span-2 border-t border-slate-200 dark:border-slate-800/80 pt-2 flex justify-between items-center text-sm font-black">
                        <span className="text-slate-500 uppercase text-[10px]">Net Receivable (Total):</span>
                        <span className="text-emerald-600 dark:text-emerald-450 text-base">₹{calc.total.toLocaleString()}</span>
                      </p>
                    </div>
                  </div>
                );
              })()}

              <button type="submit" className="w-full rounded-2xl bg-[#FAB12F] text-slate-950 font-black py-3 text-center shadow-md hover:bg-[#e09e1b] transition-all">Generate & Record Invoice</button>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

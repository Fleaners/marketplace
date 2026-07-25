'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { navigationItems } from '@/lib/navigation';
import { getFirebaseServices } from '@/lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';

interface RFQOrder {
  id: string;
  buyerName: string;
  buyerCompany: string;
  productName: string;
  quantity: number;
  unit: string;
  targetPrice?: number;
  totalValue: number;
  createdAt: string;
  status: 'pending' | 'discussion' | 'confirmed' | 'dispatched';
  whatsappNumber: string;
  notes?: string;
}

export default function OrdersPage() {
  const router = useRouter();

  // State
  const [rfqs, setRfqs] = useState<RFQOrder[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusTab, setStatusTab] = useState<'all' | 'pending' | 'discussion' | 'confirmed' | 'dispatched'>('all');
  const [selectedRfq, setSelectedRfq] = useState<RFQOrder | null>(null);
  const [quotationPrice, setQuotationPrice] = useState<number | ''>('');

  // Initial load
  useEffect(() => {
    let unsubscribe = () => {};
    const initFirestore = async () => {
      try {
        const storedUser = localStorage.getItem('mp_user');
        const userObj = storedUser ? JSON.parse(storedUser) : null;
        if (!userObj || !userObj.uid) return;

        const services = await getFirebaseServices();
        if (!services) return;
        const { db } = services;

        const q = query(
          collection(db, 'inquiries'),
          where('sellerId', '==', userObj.uid)
        );

        unsubscribe = onSnapshot(q, (snapshot) => {
          const list: RFQOrder[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            const message = data.message || '';
            let qty = Number(data.quantity) || 1;
            let targetDate = data.requiredDate || '';

            if (!data.quantity) {
              const qtyMatch = message.match(/Quantity Required:\s*(\d+)/i);
              if (qtyMatch) qty = parseInt(qtyMatch[1]);
            }
            if (!data.requiredDate) {
              const dateMatch = message.match(/Target Date:\s*([\d-]+)/i);
              if (dateMatch) targetDate = dateMatch[1];
            }

            list.push({
              id: doc.id,
              buyerName: data.buyerName || 'Valued Lead',
              buyerCompany: data.buyerCompany || data.buyerName || 'Trade Partner',
              productName: data.productName || 'General Product',
              quantity: qty,
              unit: data.unit || 'Pieces',
              targetPrice: Number(data.targetPrice) || undefined,
              totalValue: Number(data.totalValue) || (qty * (Number(data.price) || 0)),
              createdAt: data.timestamp ? (data.timestamp.toDate ? data.timestamp.toDate().toISOString() : data.timestamp) : new Date().toISOString(),
              status: data.status || 'pending',
              whatsappNumber: data.buyerPhone || '919876543210',
              notes: message,
            });
          });
          setRfqs(list);
          localStorage.setItem('marketplace_rfqs', JSON.stringify(list));
        }, (err) => {
          console.error("Firestore orders query error:", err);
        });
      } catch (err) {
        console.error("Failed to load inquiries from Firestore:", err);
      }
    };
    initFirestore();
    return () => unsubscribe();
  }, []);

  const handleUpdateStatus = async (id: string, nextStatus: RFQOrder['status']) => {
    try {
      const services = await getFirebaseServices();
      if (!services) return;
      const { db } = services;
      await updateDoc(doc(db, 'inquiries', id), {
        status: nextStatus,
        updatedAt: new Date().toISOString()
      });
      if (selectedRfq && selectedRfq.id === id) {
        setSelectedRfq({ ...selectedRfq, status: nextStatus });
      }
    } catch (err) {
      console.error('Failed to update inquiry status in Firestore:', err);
    }
  };

  const handleSubmitQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRfq || !quotationPrice) return;

    try {
      const services = await getFirebaseServices();
      if (!services) return;
      const { db } = services;

      const priceNum = Number(quotationPrice);
      const total = priceNum * selectedRfq.quantity;
      const newNotes = `${selectedRfq.notes || ''}\n[Quotation Submitted: ₹${priceNum}/unit on ${new Date().toLocaleDateString()}]`;

      await updateDoc(doc(db, 'inquiries', selectedRfq.id), {
        status: 'discussion',
        targetPrice: priceNum,
        totalValue: total,
        message: newNotes,
        updatedAt: new Date().toISOString()
      });

      setSelectedRfq(null);
      setQuotationPrice('');
      alert('Quotation submitted successfully! Initiating discussion with the buyer.');
    } catch (err) {
      console.error('Failed to submit quotation in Firestore:', err);
      alert('Failed to submit quote. Please try again.');
    }
  };

  // Filter products by tabs and search query
  const filteredRfqs = rfqs.filter((r) => {
    const matchesSearch =
      r.buyerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.buyerCompany.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusTab === 'all' || r.status === statusTab;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadgeClass = (status: RFQOrder['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-50 text-amber-700 border border-amber-200';
      case 'discussion':
        return 'bg-blue-50 text-blue-700 border border-blue-200';
      case 'confirmed':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'dispatched':
        return 'bg-purple-50 text-purple-700 border border-purple-200';
    }
  };

  const getStatusLabel = (status: RFQOrder['status']) => {
    switch (status) {
      case 'pending':
        return 'Pending Quote';
      case 'discussion':
        return 'In Discussion';
      case 'confirmed':
        return 'Confirmed';
      case 'dispatched':
        return 'Dispatched';
    }
  };  return (
    <DashboardLayout navigationItems={navigationItems}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-[#1f2937] dark:text-white tracking-tight">
              B2B Orders & RFQs
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              Process incoming dealer quotations, track order pipelines, and communicate with corporate buyers.
            </p>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex flex-wrap gap-1.5 p-1 rounded-2xl bg-[#fff6e6] dark:bg-slate-950 border border-[#f3d9a7] dark:border-slate-800 max-w-fit">
            {(['all', 'pending', 'discussion', 'confirmed', 'dispatched'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setStatusTab(tab)}
                className={`rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                  statusTab === tab
                    ? 'bg-white dark:bg-slate-900 text-[#1f2937] dark:text-slate-100 shadow-md border border-[#f3d9a7]/30 dark:border-slate-800'
                    : 'text-slate-550 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white'
                }`}
              >
                {tab === 'all' ? 'All RFQs' : getStatusLabel(tab)}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative min-w-[280px]">
            <input
              type="text"
              placeholder="Search RFQs, Buyers, Products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-2xl border border-[#f3d9a7] dark:border-slate-800 bg-[#fff6e6] dark:bg-slate-950 pl-10 pr-4 py-2.5 text-sm text-[#1f2937] dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-550 focus:outline-none focus:ring-2 focus:ring-accent-500 transition-all font-bold"
            />
            <span className="absolute left-3.5 top-3.5 text-slate-500 text-sm">🔍</span>
          </div>
        </div>

        {/* Main grid / List */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          
          {/* RFQ List Section */}
          <div className="xl:col-span-2 space-y-4">
            
            {/* Mobile Stack (Cards) */}
            <div className="block xl:hidden space-y-3">
              {filteredRfqs.length === 0 ? (
                <Card className="rounded-3xl border border-dashed border-[#f3d9a7] dark:border-slate-800 p-10 text-center text-slate-500 bg-white dark:bg-slate-900">
                  No matching RFQs or orders found.
                </Card>
              ) : (
                filteredRfqs.map((rfq) => (
                  <Card 
                    key={rfq.id} 
                    onClick={() => setSelectedRfq(rfq)}
                    className={`p-4 border border-[#f3d9a7] dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3 shadow-sm cursor-pointer hover:border-[#FAB12F] transition-all ${
                      selectedRfq?.id === rfq.id ? 'ring-1 ring-[#FAB12F]' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 font-semibold">{rfq.id}</span>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${getStatusBadgeClass(rfq.status)}`}>
                        {getStatusLabel(rfq.status)}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-sm font-black text-slate-850 dark:text-white leading-snug">{rfq.productName}</h4>
                      <p className="text-[11px] text-slate-650 dark:text-slate-350 font-bold mt-1">👤 {rfq.buyerName} • {rfq.buyerCompany}</p>
                    </div>

                    <div className="flex items-baseline justify-between pt-2 border-t border-slate-100 dark:border-slate-800/60 text-xs font-semibold">
                      <span className="text-slate-500">Volume: {rfq.quantity} {rfq.unit}</span>
                      <span className="text-sm font-black text-[#1f2937] dark:text-white">₹{rfq.totalValue.toLocaleString('en-IN')}</span>
                    </div>
                  </Card>
                ))
              )}
            </div>

            {/* Desktop Table View */}
            <Card className="hidden xl:block rounded-3xl border border-[#f3d9a7] dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl space-y-4 overflow-hidden">
              <h3 className="text-lg font-bold text-[#1f2937] dark:text-white mb-2">Active RFQs</h3>
              {filteredRfqs.length === 0 ? (
                <div className="text-center py-16 space-y-3">
                  <p className="text-3xl">📋</p>
                  <p className="text-slate-500 text-sm font-medium">No matching RFQs or orders found.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#f3d9a7] dark:border-slate-800 text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                        <th className="pb-3">RFQ ID</th>
                        <th className="pb-3">Buyer & Company</th>
                        <th className="pb-3">Product Required</th>
                        <th className="pb-3 text-center">Qty / Vol</th>
                        <th className="pb-3 text-right">Total Price</th>
                        <th className="pb-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f3d9a7]/60 dark:divide-slate-800/40">
                      {filteredRfqs.map((rfq) => (
                        <tr
                          key={rfq.id}
                          onClick={() => setSelectedRfq(rfq)}
                          className={`group cursor-pointer hover:bg-[#fff6e6]/60 dark:hover:bg-slate-800/35 transition-colors ${
                            selectedRfq?.id === rfq.id ? 'bg-[#fff6e6]/40 dark:bg-slate-800/20' : ''
                          }`}
                        >
                          <td className="py-4 font-mono text-xs text-slate-500 group-hover:text-amber-600 font-semibold transition-colors">
                            {rfq.id}
                          </td>
                          <td className="py-4">
                            <div className="font-bold text-[#1f2937] dark:text-white text-sm">{rfq.buyerName}</div>
                            <div className="text-xs text-slate-500 font-semibold">{rfq.buyerCompany}</div>
                          </td>
                          <td className="py-4">
                            <div className="font-bold text-slate-650 dark:text-slate-300 text-sm">{rfq.productName}</div>
                          </td>
                          <td className="py-4 text-center font-black text-sm text-slate-650 dark:text-slate-350">
                            {rfq.quantity} <span className="text-xs font-normal text-slate-500">{rfq.unit}</span>
                          </td>
                          <td className="py-4 text-right font-black text-sm text-slate-800 dark:text-white">
                            ₹{rfq.totalValue.toLocaleString('en-IN')}
                          </td>
                          <td className="py-4 text-center">
                            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getStatusBadgeClass(rfq.status)}`}>
                              {getStatusLabel(rfq.status)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>

          {/* Side Inspection Drawer */}
          <div className="xl:col-span-1 space-y-4">
            {selectedRfq ? (
              <Card className="rounded-3xl border border-[#f3d9a7] dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl space-y-6">
                <div>
                  <span className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">RFQ Inspection</span>
                  <h3 className="text-xl font-bold text-[#1f2937] dark:text-white mt-1">{selectedRfq.id}</h3>
                  <div className="mt-2">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getStatusBadgeClass(selectedRfq.status)}`}>
                      {getStatusLabel(selectedRfq.status)}
                    </span>
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-4 text-sm">
                  <div className="p-4 rounded-2xl border border-[#f3d9a7] dark:border-slate-800 bg-[#fff6e6] dark:bg-slate-950">
                    <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Buyer Information</p>
                    <p className="text-[#1f2937] dark:text-white font-bold mt-1 text-base">{selectedRfq.buyerName}</p>
                    <p className="text-slate-500 font-medium text-xs">{selectedRfq.buyerCompany}</p>
                  </div>

                  <div className="p-4 rounded-2xl border border-[#f3d9a7] dark:border-slate-800 bg-[#fff6e6] dark:bg-slate-950">
                    <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Requested Line Item</p>
                    <p className="text-slate-650 dark:text-slate-350 font-bold mt-1">{selectedRfq.productName}</p>
                    <div className="flex justify-between text-xs text-slate-500 mt-1">
                      <span>Volume:</span>
                      <span className="font-bold text-[#1f2937] dark:text-white">{selectedRfq.quantity} {selectedRfq.unit}</span>
                    </div>
                    {selectedRfq.targetPrice && (
                      <div className="flex justify-between text-xs text-slate-500 mt-0.5">
                        <span>Target Price:</span>
                        <span className="font-bold text-[#1f2937] dark:text-white">₹{selectedRfq.targetPrice}/unit</span>
                      </div>
                    )}
                    <div className="flex justify-between text-xs text-slate-500 border-t border-[#f3d9a7] dark:border-slate-800 pt-1.5 mt-1.5">
                      <span>Pipeline Value:</span>
                      <span className="font-bold text-amber-600">₹{selectedRfq.totalValue.toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  {selectedRfq.notes && (
                    <div className="p-4 rounded-2xl border border-[#f3d9a7] dark:border-slate-800 bg-[#fff6e6] dark:bg-slate-950">
                      <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Buyer Specifications</p>
                      <p className="text-slate-650 dark:text-slate-350 mt-1 text-xs leading-relaxed font-mono whitespace-pre-line">{selectedRfq.notes}</p>
                    </div>
                  )}
                </div>

                {/* RFQ Action Forms */}
                {selectedRfq.status === 'pending' && (
                  <form onSubmit={handleSubmitQuote} className="p-4 rounded-2xl border border-dashed border-[#f3d9a7] dark:border-slate-800 bg-[#fff6e6]/50 dark:bg-slate-950/30 space-y-4">
                    <p className="text-xs font-bold text-[#1f2937] dark:text-white uppercase tracking-widest">Submit B2B Quote</p>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-slate-500">Quotation Rate (Per unit)</label>
                      <input
                        type="number"
                        placeholder="₹ Amount"
                        value={quotationPrice}
                        onChange={(e) => setQuotationPrice(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full rounded-xl border border-[#f3d9a7] dark:border-slate-800 bg-[#fff6e6] dark:bg-slate-950 px-3 py-2 text-xs text-[#1f2937] dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-accent-500 font-bold"
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full rounded-xl py-2 bg-[#FAB12F] text-slate-950 text-xs font-bold">
                      Send Counter-Quotation
                    </Button>
                  </form>
                )}

                {/* Discussion or confirmed actions */}
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      const text = encodeURIComponent(`Hello ${selectedRfq.buyerName}, I would like to discuss RFQ ${selectedRfq.id} for "${selectedRfq.productName}".`);
                      window.open(`https://wa.me/${selectedRfq.whatsappNumber}?text=${text}`, '_blank');
                    }}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl border border-emerald-800 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-400 font-bold hover:bg-emerald-950/80 transition-all duration-300 shadow-md"
                  >
                    💬 WhatsApp Buyer Directly
                  </button>

                  <div className="flex gap-2">
                    {selectedRfq.status === 'discussion' && (
                      <button
                        onClick={() => handleUpdateStatus(selectedRfq.id, 'confirmed')}
                        className="flex-1 rounded-2xl border border-emerald-800 bg-emerald-500 text-slate-950 font-black text-xs py-2.5 hover:shadow-[0_0_12px_rgba(16,185,129,0.3)] transition-all duration-300"
                      >
                        Confirm Order ✓
                      </button>
                    )}
                    {selectedRfq.status === 'confirmed' && (
                      <button
                        onClick={() => handleUpdateStatus(selectedRfq.id, 'dispatched')}
                        className="flex-1 rounded-2xl border border-purple-800 bg-purple-500 text-slate-950 font-black text-xs py-2.5 hover:shadow-[0_0_12px_rgba(139,92,246,0.3)] transition-all duration-300"
                      >
                        Mark Dispatched 🚛
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="rounded-3xl border border-[#f3d9a7] dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-center py-24 text-slate-500 shadow-xl">
                <p className="text-2xl">👉</p>
                <p className="text-xs font-semibold mt-2">Select any RFQ from the table to view buyer specs, submit counter-quotes, and dispatch orders.</p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

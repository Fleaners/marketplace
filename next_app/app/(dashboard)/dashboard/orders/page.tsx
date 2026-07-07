'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { navigationItems } from '@/lib/navigation';

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
    try {
      const stored = localStorage.getItem('marketplace_rfqs');
      if (stored) {
        setRfqs(JSON.parse(stored));
      } else {
        const defaultRfqs: RFQOrder[] = [
          {
            id: 'RFQ-2026-001',
            buyerName: 'Ramesh Kumar',
            buyerCompany: 'Om Sree Enterprises',
            productName: 'Industrial Water Pump',
            quantity: 4,
            unit: 'Pieces',
            targetPrice: 13500,
            totalValue: 54000,
            createdAt: '2026-07-02T10:30:00Z',
            status: 'pending',
            whatsappNumber: '919876543210',
            notes: 'Need standard GST invoice. Require delivery to Nagpur warehouse.',
          },
          {
            id: 'RFQ-2026-002',
            buyerName: 'Ananya Sen',
            buyerCompany: 'Apex Builders & Co',
            productName: 'Heavy Duty Adhesive Sealant',
            quantity: 50,
            unit: 'Pieces',
            targetPrice: 420,
            totalValue: 21000,
            createdAt: '2026-07-01T14:22:00Z',
            status: 'discussion',
            whatsappNumber: '919876543210',
            notes: 'Looking for a recurring monthly bulk supply contract. Please quote wholesale rate.',
          },
          {
            id: 'RFQ-2026-003',
            buyerName: 'Vijay Patel',
            buyerCompany: 'Gujarat Power Grid',
            productName: 'Copper Core Grounding Wire',
            quantity: 500,
            unit: 'Meters',
            targetPrice: 1150,
            totalValue: 575000,
            createdAt: '2026-06-29T11:05:00Z',
            status: 'confirmed',
            whatsappNumber: '919876543210',
            notes: 'Order confirmed with 10% advance deposit paid via UPI.',
          },
          {
            id: 'RFQ-2026-004',
            buyerName: 'Amit Sharma',
            buyerCompany: 'Sharma Metal Works',
            productName: 'Brass Coupling Joints (1/2 Inch)',
            quantity: 200,
            unit: 'Pieces',
            targetPrice: 80,
            totalValue: 16000,
            createdAt: '2026-06-25T09:15:00Z',
            status: 'dispatched',
            whatsappNumber: '919876543210',
            notes: 'Dispatched via SafeExpress. Tracking ID: EXP-998822.',
          },
        ];
        localStorage.setItem('marketplace_rfqs', JSON.stringify(defaultRfqs));
        setRfqs(defaultRfqs);
      }
    } catch (e) {
      console.error('Failed to load RFQs from storage', e);
    }
  }, []);

  const saveRfqsToStorage = (updated: RFQOrder[]) => {
    setRfqs(updated);
    localStorage.setItem('marketplace_rfqs', JSON.stringify(updated));
  };

  const handleUpdateStatus = (id: string, nextStatus: RFQOrder['status']) => {
    const updated = rfqs.map((r) => {
      if (r.id === id) {
        return { ...r, status: nextStatus };
      }
      return r;
    });
    saveRfqsToStorage(updated);
    if (selectedRfq && selectedRfq.id === id) {
      setSelectedRfq({ ...selectedRfq, status: nextStatus });
    }
  };

  const handleSubmitQuote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRfq || !quotationPrice) return;

    const priceNum = Number(quotationPrice);
    const updated = rfqs.map((r) => {
      if (r.id === selectedRfq.id) {
        return {
          ...r,
          status: 'discussion' as const,
          targetPrice: priceNum,
          totalValue: priceNum * r.quantity,
          notes: `${r.notes || ''}\n[Quotation Submitted: ₹${priceNum}/unit on ${new Date().toLocaleDateString()}]`,
        };
      }
      return r;
    });

    saveRfqsToStorage(updated);
    setSelectedRfq(null);
    setQuotationPrice('');
    alert('Quotation submitted successfully! Initiating discussion with the buyer.');
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
  };

  return (
    <DashboardLayout navigationItems={navigationItems}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
              B2B Orders & RFQs
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Process incoming dealer quotations, track order pipelines, and communicate with corporate buyers.
            </p>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex flex-wrap gap-1.5 p-1 rounded-2xl bg-[#fff6e6] border border-[#f3d9a7]/60 max-w-fit">
            {(['all', 'pending', 'discussion', 'confirmed', 'dispatched'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setStatusTab(tab)}
                className={`rounded-xl px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-all duration-300 ${
                  statusTab === tab
                    ? 'bg-white text-[#1f2937] shadow-lg'
                    : 'text-slate-500 hover:text-slate-700'
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
              className="w-full rounded-2xl border border-[#f3d9a7] bg-[#fff6e6] pl-10 pr-4 py-2.5 text-sm text-[#1f2937] placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-accent-500 transition-all"
            />
            <span className="absolute left-3.5 top-3.5 text-slate-500 text-sm">🔍</span>
          </div>
        </div>

        {/* Main grid / List */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* RFQ List Section */}
          <Card className="xl:col-span-2 rounded-3xl border border-[#f3d9a7] bg-white p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-[#1f2937] mb-2">Active RFQs</h3>

            {filteredRfqs.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <p className="text-3xl">📋</p>
                <p className="text-slate-500 text-sm font-medium">No matching RFQs or orders found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#f3d9a7] text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                      <th className="pb-3">RFQ ID</th>
                      <th className="pb-3">Buyer & Company</th>
                      <th className="pb-3">Product Required</th>
                      <th className="pb-3 text-center">Qty / Vol</th>
                      <th className="pb-3 text-right">Total Price</th>
                      <th className="pb-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f3d9a7]/60">
                    {filteredRfqs.map((rfq) => (
                      <tr
                        key={rfq.id}
                        onClick={() => setSelectedRfq(rfq)}
                        className={`group cursor-pointer hover:bg-[#fff6e6] transition-colors ${
                          selectedRfq?.id === rfq.id ? 'bg-[#fff6e6]' : ''
                        }`}
                      >
                        <td className="py-4 font-mono text-xs text-slate-500 group-hover:text-amber-600 font-semibold transition-colors">
                          {rfq.id}
                        </td>
                        <td className="py-4">
                          <div className="font-semibold text-[#1f2937] text-sm">{rfq.buyerName}</div>
                          <div className="text-xs text-slate-500 font-medium">{rfq.buyerCompany}</div>
                        </td>
                        <td className="py-4">
                          <div className="font-semibold text-slate-600 text-sm">{rfq.productName}</div>
                        </td>
                        <td className="py-4 text-center font-bold text-sm text-slate-500">
                          {rfq.quantity} <span className="text-xs font-normal text-slate-500">{rfq.unit}</span>
                        </td>
                        <td className="py-4 text-right font-bold text-sm text-slate-700">
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

          {/* Side Inspection Drawer */}
          <div className="xl:col-span-1 space-y-4">
            {selectedRfq ? (
              <Card className="rounded-3xl border border-[#f3d9a7] bg-white p-6 shadow-xl space-y-6">
                <div>
                  <span className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">RFQ Inspection</span>
                  <h3 className="text-xl font-bold text-[#1f2937] mt-1">{selectedRfq.id}</h3>
                  <div className="mt-2">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getStatusBadgeClass(selectedRfq.status)}`}>
                      {getStatusLabel(selectedRfq.status)}
                    </span>
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-4 text-sm">
                  <div className="p-4 rounded-2xl border border-[#f3d9a7] bg-[#fff6e6]">
                    <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Buyer Information</p>
                    <p className="text-[#1f2937] font-bold mt-1 text-base">{selectedRfq.buyerName}</p>
                    <p className="text-slate-500 font-medium text-xs">{selectedRfq.buyerCompany}</p>
                  </div>

                  <div className="p-4 rounded-2xl border border-[#f3d9a7] bg-[#fff6e6]">
                    <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Requested Line Item</p>
                    <p className="text-slate-600 font-bold mt-1">{selectedRfq.productName}</p>
                    <div className="flex justify-between text-xs text-slate-500 mt-1">
                      <span>Volume:</span>
                      <span className="font-bold text-[#1f2937]">{selectedRfq.quantity} {selectedRfq.unit}</span>
                    </div>
                    {selectedRfq.targetPrice && (
                      <div className="flex justify-between text-xs text-slate-500 mt-0.5">
                        <span>Target Price:</span>
                        <span className="font-bold text-[#1f2937]">₹{selectedRfq.targetPrice}/unit</span>
                      </div>
                    )}
                    <div className="flex justify-between text-xs text-slate-500 border-t border-[#f3d9a7] pt-1.5 mt-1.5">
                      <span>Pipeline Value:</span>
                      <span className="font-bold text-amber-600">₹{selectedRfq.totalValue.toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  {selectedRfq.notes && (
                    <div className="p-4 rounded-2xl border border-[#f3d9a7] bg-[#fff6e6]">
                      <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Buyer Specifications</p>
                      <p className="text-slate-600 mt-1 text-xs leading-relaxed font-mono whitespace-pre-line">{selectedRfq.notes}</p>
                    </div>
                  )}
                </div>

                {/* RFQ Action Forms */}
                {selectedRfq.status === 'pending' && (
                  <form onSubmit={handleSubmitQuote} className="p-4 rounded-2xl border border-dashed border-[#f3d9a7] bg-[#fff6e6]/50 space-y-4">
                    <p className="text-xs font-bold text-[#1f2937] uppercase tracking-widest">Submit B2B Quote</p>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-slate-500">Quotation Rate (Per unit)</label>
                      <input
                        type="number"
                        placeholder="₹ Amount"
                        value={quotationPrice}
                        onChange={(e) => setQuotationPrice(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full rounded-xl border border-[#f3d9a7] bg-[#fff6e6] px-3 py-2 text-xs text-[#1f2937] focus:outline-none focus:ring-1 focus:ring-accent-500"
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full rounded-xl py-2 bg-[#FAB12F] text-[#1f2937] text-xs font-bold">
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
                        className="flex-1 rounded-2xl border border-emerald-800 bg-emerald-500 text-slate-950 font-bold text-xs py-2.5 hover:shadow-[0_0_12px_rgba(16,185,129,0.3)] transition-all duration-300"
                      >
                        Confirm Order ✓
                      </button>
                    )}
                    {selectedRfq.status === 'confirmed' && (
                      <button
                        onClick={() => handleUpdateStatus(selectedRfq.id, 'dispatched')}
                        className="flex-1 rounded-2xl border border-purple-800 bg-purple-500 text-[#1f2937] font-bold text-xs py-2.5 hover:shadow-[0_0_12px_rgba(139,92,246,0.3)] transition-all duration-300"
                      >
                        Mark Dispatched 🚛
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="rounded-3xl border border-[#f3d9a7] bg-white p-6 text-center py-24 text-slate-500 shadow-xl">
                <p className="text-2xl">👉</p>
                <p className="text-xs font-medium mt-2">Select any RFQ from the table to view buyer specs, submit counter-quotes, and dispatch orders.</p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

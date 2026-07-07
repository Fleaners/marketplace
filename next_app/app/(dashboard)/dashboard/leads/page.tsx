'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout';
import { Card } from '@/components/ui/Card';
import { navigationItems } from '@/lib/navigation';

interface LeadLog {
  id: string;
  productName: string;
  sku: string;
  buyerCity: string;
  buyerState: string;
  clickedAt: string;
  channel: 'WhatsApp Inquiry' | 'Direct Call' | 'Catalog Share';
  status: 'contacted' | 'uncontacted';
  buyerPhone: string;
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<LeadLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    try {
      const stored = localStorage.getItem('marketplace_leads');
      if (stored) {
        setLeads(JSON.parse(stored));
      } else {
        const defaultLeads: LeadLog[] = [
          {
            id: 'LD-101',
            productName: 'Industrial Water Pump',
            sku: 'WP-IND-100',
            buyerCity: 'Nagpur',
            buyerState: 'Maharashtra',
            clickedAt: '2026-07-03T18:45:00Z',
            channel: 'WhatsApp Inquiry',
            status: 'contacted',
            buyerPhone: '919876543210',
          },
          {
            id: 'LD-102',
            productName: 'Heavy Duty Adhesive Sealant',
            sku: 'AD-HD-450',
            buyerCity: 'Surat',
            buyerState: 'Gujarat',
            clickedAt: '2026-07-03T14:20:00Z',
            channel: 'WhatsApp Inquiry',
            status: 'contacted',
            buyerPhone: '919876543210',
          },
          {
            id: 'LD-103',
            productName: 'Copper Core Grounding Wire',
            sku: 'EL-CC-GND',
            buyerCity: 'Chennai',
            buyerState: 'Tamil Nadu',
            clickedAt: '2026-07-02T11:10:00Z',
            channel: 'Direct Call',
            status: 'uncontacted',
            buyerPhone: '919876543210',
          },
          {
            id: 'LD-104',
            productName: 'Industrial Water Pump',
            sku: 'WP-IND-100',
            buyerCity: 'Mumbai',
            buyerState: 'Maharashtra',
            clickedAt: '2026-07-01T09:30:00Z',
            channel: 'Catalog Share',
            status: 'contacted',
            buyerPhone: '919876543210',
          },
          {
            id: 'LD-105',
            productName: 'Brass Coupling Joints (1/2 Inch)',
            sku: 'HW-BCJ-12',
            buyerCity: 'Ahmedabad',
            buyerState: 'Gujarat',
            clickedAt: '2026-06-28T16:05:00Z',
            channel: 'WhatsApp Inquiry',
            status: 'uncontacted',
            buyerPhone: '919876543210',
          },
        ];
        localStorage.setItem('marketplace_leads', JSON.stringify(defaultLeads));
        setLeads(defaultLeads);
      }
    } catch (e) {
      console.error('Failed to load leads from storage', e);
    }
  }, []);

  const saveLeadsToStorage = (updated: LeadLog[]) => {
    setLeads(updated);
    localStorage.setItem('marketplace_leads', JSON.stringify(updated));
  };

  const toggleLeadStatus = (id: string) => {
    const updated = leads.map((l) => {
      if (r_id_match(l.id, id)) {
        return { ...l, status: l.status === 'contacted' ? 'uncontacted' as const : 'contacted' as const };
      }
      return l;
    });
    saveLeadsToStorage(updated);
  };

  const r_id_match = (id1: string, id2: string) => id1 === id2;

  const filteredLeads = leads.filter((l) => {
    return (
      l.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.buyerCity.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.buyerState.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.channel.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <DashboardLayout navigationItems={navigationItems}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
              Inquiry Leads & WhatsApp Logs
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Analyze incoming buyer clicks on B2B listing catalog cards and direct connection referrals.
            </p>
          </div>
        </div>

        {/* Quick analytics card summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="rounded-3xl border border-[#f3d9a7] bg-white p-5 space-y-1">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total Verified Clicks</p>
            <p className="text-2xl font-black text-[#1f2937]">{leads.length} contacts</p>
            <p className="text-[11px] text-emerald-400 font-bold">↗ +18% active trend this week</p>
          </Card>
          <Card className="rounded-3xl border border-[#f3d9a7] bg-white p-5 space-y-1">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Awaiting Contact</p>
            <p className="text-2xl font-black text-amber-400">
              {leads.filter((l) => l.status === 'uncontacted').length} leads
            </p>
            <p className="text-[11px] text-slate-500">Unanswered inquiry follow-ups</p>
          </Card>
          <Card className="rounded-3xl border border-[#f3d9a7] bg-white p-5 space-y-1">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Top Sourcing Region</p>
            <p className="text-2xl font-black text-amber-600">Maharashtra</p>
            <p className="text-[11px] text-slate-500">45% total interest footprint</p>
          </Card>
        </div>

        {/* Filters and search row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="text-lg font-bold text-[#1f2937]">Connection Referrals Log</h3>
          <div className="relative min-w-[280px]">
            <input
              type="text"
              placeholder="Filter by Product, City, Channel..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-2xl border border-[#f3d9a7] bg-[#fff6e6] pl-10 pr-4 py-2 text-sm text-[#1f2937] placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-accent-500 transition-all"
            />
            <span className="absolute left-3.5 top-3 text-slate-500 text-sm">🔍</span>
          </div>
        </div>

        {/* Lead entries list card */}
        <Card className="rounded-3xl border border-[#f3d9a7] bg-white p-6 shadow-xl">
          {filteredLeads.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <p className="text-2xl">📱</p>
              <p className="text-xs font-semibold mt-2">No connection leads logs registered yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#f3d9a7] text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                    <th className="pb-3">Timestamp</th>
                    <th className="pb-3">Product Name</th>
                    <th className="pb-3">Buyer Geographic Area</th>
                    <th className="pb-3">Action Sourced</th>
                    <th className="pb-3 text-center">Status Tracking</th>
                    <th className="pb-3 text-right">CTA Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f3d9a7]/60">
                  {filteredLeads.map((l) => (
                    <tr key={l.id} className="group hover:bg-[#fff6e6]/50 transition-colors">
                      <td className="py-4 text-xs font-mono text-slate-500 font-semibold">
                        {new Date(l.clickedAt).toLocaleString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-4">
                        <div className="font-semibold text-[#1f2937] text-sm">{l.productName}</div>
                        <div className="text-[10px] font-mono text-slate-500">{l.sku}</div>
                      </td>
                      <td className="py-4">
                        <div className="text-slate-600 font-semibold text-sm">{l.buyerCity}</div>
                        <div className="text-xs text-slate-500">{l.buyerState}</div>
                      </td>
                      <td className="py-4">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                            l.channel === 'WhatsApp Inquiry'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : l.channel === 'Direct Call'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-purple-50 text-purple-700 border border-purple-200'
                          }`}
                        >
                          {l.channel}
                        </span>
                      </td>
                      <td className="py-4 text-center">
                        <button
                          onClick={() => toggleLeadStatus(l.id)}
                          className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider border transition-all ${
                            l.status === 'contacted'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-[#fff6e6] text-slate-500 border-[#f3d9a7]'
                          }`}
                        >
                          {l.status === 'contacted' ? '✓ Contacted' : 'Pending Followup'}
                        </button>
                      </td>
                      <td className="py-4 text-right">
                        <button
                          onClick={() => {
                            const text = encodeURIComponent(`Hello, I saw your inquiry for "${l.productName}". How can we assist you?`);
                            window.open(`https://wa.me/${l.buyerPhone}?text=${text}`, '_blank');
                          }}
                          className="rounded-xl bg-[#fff6e6] border border-[#f3d9a7] hover:border-accent-500 px-3 py-1.5 text-xs text-slate-600 hover:text-[#1f2937] font-bold transition-all"
                        >
                          💬 Connect
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}

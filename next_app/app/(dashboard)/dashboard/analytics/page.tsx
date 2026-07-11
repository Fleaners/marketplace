'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout';
import { Card } from '@/components/ui/Card';
import { KPICard } from '@/components/dashboard/KPICard';
import { navigationItems } from '@/lib/navigation';
import { Greeting } from '@/components/dashboard/Greeting';

interface ProductMetric {
  name: string;
  views: number;
  inquiries: number;
  conversion: number;
  status: 'fast' | 'slow' | 'dead';
}

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<'health' | 'sourcing' | 'products'>('health');
  
  const [data, setData] = useState({
    healthScore: 89,
    catalogViews: 3450,
    whatsappConversions: 412,
    avgMoqMatch: '96%',
    pipelineValue: 645000,
    topCustomer: 'Rajesh Electricals (Nagpur)',
    clvAverage: 82000,
    deadStockCount: 1,
    productsList: [
      { name: 'Industrial Water Pump', views: 1840, inquiries: 240, conversion: 13.0, status: 'fast' as const },
      { name: 'Copper Core Grounding Wire', views: 1210, inquiries: 152, conversion: 12.5, status: 'fast' as const },
      { name: 'Brass Coupling Joints (1/2 Inch)', views: 320, inquiries: 18, conversion: 5.6, status: 'slow' as const },
      { name: 'Heavy Duty Adhesive Sealant', views: 80, inquiries: 2, conversion: 2.5, status: 'dead' as const },
    ] as ProductMetric[],
  });

  return (
    <DashboardLayout
      navigationItems={navigationItems}
      user={{ name: 'Gaurav Enterprise', email: 'partner@dealerconnect.in' }}
      topBarProps={{
        pageTitle: 'Analytics OS Dashboard',
        breadcrumbs: [{ label: 'Cockpit', href: '/dashboard' }, { label: 'Analytics' }],
        unreadNotifications: 1,
      }}
    >
      <div className="space-y-6 pb-12">
        {/* Header */}
        <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <Greeting />
            <p className="text-xs text-slate-505 font-bold uppercase tracking-wider mt-1">Real-time Sourcing Metrics & Business Health OS</p>
          </div>

          <div className="flex gap-1.5 bg-[#fff6e6] dark:bg-slate-950 border border-[#f3d9a7] dark:border-slate-800 p-1 rounded-2xl">
            {(['health', 'sourcing', 'products'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                  activeTab === tab
                    ? 'bg-[#FAB12F] text-slate-950 shadow border border-accent-600/10'
                    : 'text-slate-550 dark:text-slate-400 hover:text-[#1f2937] dark:hover:text-white'
                }`}
              >
                {tab === 'health' ? 'Business Health' : tab === 'sourcing' ? 'Sourcing & CLV' : 'Product Sales'}
              </button>
            ))}
          </div>
        </section>

        {/* TAB 1: BUSINESS HEALTH SCORE */}
        {activeTab === 'health' && (
          <div className="grid gap-6 md:grid-cols-2">
            {/* Score card dial */}
            <Card className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl flex flex-col justify-between space-y-6">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-550">Business Operating Health Score</h3>
                <p className="text-xs text-slate-400 mt-1 font-semibold">Gemini composite analyzer rating corporate supplier profile integrity, response velocity, and stock cover.</p>
              </div>

              <div className="flex flex-col items-center py-6">
                <div className="h-32 w-32 rounded-full border-8 border-emerald-500/20 flex items-center justify-center relative">
                  <div className="h-28 w-28 rounded-full border-4 border-dashed border-emerald-500 flex items-center justify-center text-4xl font-black text-slate-850 dark:text-white">
                    {data.healthScore}
                  </div>
                </div>
                <span className="text-xs text-emerald-600 font-extrabold mt-4">✓ Optimal trading status active</span>
              </div>

              <div className="grid gap-3 grid-cols-3 text-center text-xs">
                <div className="p-2 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 rounded-xl">
                  <span className="text-[9px] text-slate-450 uppercase block font-bold">Profile GST</span>
                  <span className="font-extrabold text-slate-750 dark:text-slate-250">Verified</span>
                </div>
                <div className="p-2 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 rounded-xl">
                  <span className="text-[9px] text-slate-450 uppercase block font-bold">Inquiry Cover</span>
                  <span className="font-extrabold text-slate-750 dark:text-slate-250">98%</span>
                </div>
                <div className="p-2 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 rounded-xl">
                  <span className="text-[9px] text-slate-450 uppercase block font-bold">Stock Outages</span>
                  <span className="font-extrabold text-rose-500">0%</span>
                </div>
              </div>
            </Card>

            {/* AI insights recommendations */}
            <Card className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl space-y-4">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-550">AI Sourcing Growth Directives</h3>
                <p className="text-xs text-slate-400 mt-1 font-semibold">Automated directives based on real-time pipeline valuations.</p>
              </div>

              <div className="space-y-3.5 text-xs font-semibold">
                <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 text-amber-600 rounded-2xl leading-relaxed">
                  📢 **GST Compliance Boost**: Your catalog has **96%** GST rates set. Standardizing the remaining 4% to 18% HSN slots will lift search listing priority count by 15% next week.
                </div>
                <div className="p-3.5 bg-blue-500/10 border border-blue-500/20 text-blue-600 rounded-2xl leading-relaxed">
                  ⚙️ **Inbound Sourcing Alert**: Industrial Water Pump safety stocks are approaching MOQ safety ceilings. Initiate a restocking PO from Kirloskar Pump Division today.
                </div>
                <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 text-slate-500 rounded-2xl leading-relaxed">
                  💡 **Dead Stock Recourse**: Heavy Duty Adhesive Sealant has registered zero clicks for 14 days. Create a bundled promotional offer with copper wiring reels.
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* TAB 2: SOURCING DEMOGRAPHICS & CLV */}
        {activeTab === 'sourcing' && (
          <div className="space-y-6">
            {/* KPI statistics */}
            <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
              <Card className="rounded-3xl border border-slate-200 p-5 space-y-1 bg-white dark:bg-slate-900 shadow-sm">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Total Catalog Views</span>
                <span className="text-xl font-black text-slate-850 dark:text-white">+{data.catalogViews}</span>
              </Card>
              <Card className="rounded-3xl border border-slate-200 p-5 space-y-1 bg-white dark:bg-slate-900 shadow-sm">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">WhatsApp Lead Clicks</span>
                <span className="text-xl font-black text-emerald-600">{data.whatsappConversions}</span>
              </Card>
              <Card className="rounded-3xl border border-slate-200 p-5 space-y-1 bg-white dark:bg-slate-900 shadow-sm">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Average Customer CLV</span>
                <span className="text-xl font-black text-blue-500">₹{data.clvAverage.toLocaleString()}</span>
              </Card>
              <Card className="rounded-3xl border border-slate-200 p-5 space-y-1 bg-white dark:bg-slate-900 shadow-sm">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Top Trade Partner</span>
                <span className="text-sm font-black text-slate-900 dark:text-white truncate block">{data.topCustomer}</span>
              </Card>
            </div>

            {/* Geographical Footprint and leads volume */}
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl space-y-4">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-550">Geographical Footprint (Maharashtra Leads)</h3>
                  <p className="text-xs text-slate-400 mt-1">Statewise corporate client distribution footprint.</p>
                </div>
                <div className="space-y-2 text-xs font-semibold">
                  <div className="flex justify-between items-center p-2 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 rounded-xl">
                    <span>Nagpur, MH</span>
                    <span className="text-amber-500">45% share</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 rounded-xl">
                    <span>Pune, MH</span>
                    <span className="text-blue-500">30% share</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 rounded-xl">
                    <span>Surat, GJ</span>
                    <span className="text-slate-500">25% share</span>
                  </div>
                </div>
              </Card>

              <Card className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl space-y-4">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-550">Sourcing Conversion Summary</h3>
                  <p className="text-xs text-slate-400 mt-1">Lead acquisition parameters calculated dynamically.</p>
                </div>
                <div className="space-y-3.5 text-xs text-slate-650 dark:text-slate-350">
                  <p className="leading-relaxed">📈 Overall conversion lift is up by **+15.2%** this month compared to previous periods.</p>
                  <p className="leading-relaxed">🎯 Google Ads traffic converts at **14.8%**, while Meta Business broadcasts show a CTR of **4.8%**.</p>
                  <p className="leading-relaxed">💼 Direct RFQ submissions convert at **82%** on follow-ups via WhatsApp logs.</p>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* TAB 3: PRODUCT & CATEGORY ANALYTICS */}
        {activeTab === 'products' && (
          <Card className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl space-y-4">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-550">Product Performance Matrix</h3>
              <p className="text-xs text-slate-400 mt-1">Product listing views, WhatsApp click conversions, and dead stock classifiers.</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Product listing</th>
                    <th className="py-3 px-4 text-center">Views</th>
                    <th className="py-3 px-4 text-center">Conversions</th>
                    <th className="py-3 px-4 text-right">Conversion CTR (%)</th>
                    <th className="py-3 px-4 text-center">Moving Velocity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 dark:divide-slate-800 font-semibold text-slate-800 dark:text-slate-200">
                  {data.productsList.map((prod, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                      <td className="py-4 px-4 font-black">{prod.name}</td>
                      <td className="py-4 px-4 text-center">{prod.views}</td>
                      <td className="py-4 px-4 text-center text-emerald-600">{prod.inquiries} clicks</td>
                      <td className="py-4 px-4 text-right text-amber-500">{prod.conversion}%</td>
                      <td className="py-4 px-4 text-center">
                        <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                          prod.status === 'fast'
                            ? 'bg-emerald-500/10 text-emerald-600'
                            : prod.status === 'slow'
                            ? 'bg-amber-500/10 text-amber-600'
                            : 'bg-rose-500/10 text-rose-500 animate-pulse'
                        }`}>
                          {prod.status === 'fast' ? 'Fast Moving' : prod.status === 'slow' ? 'Slow Moving' : 'Dead Stock'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

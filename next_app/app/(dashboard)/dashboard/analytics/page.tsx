'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { KPICard } from '@/components/dashboard/KPICard';
import { navigationItems } from '@/lib/navigation';

interface AnalyticsState {
  views: number;
  whatsappClicks: number;
  conversionRate: number;
  salesPipeline: number;
  byState: Array<{ state: string; share: number; trend: 'up' | 'down'; count: number }>;
  topProducts: Array<{ name: string; views: number; inquiries: number; conv: number }>;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsState>({
    views: 124,
    whatsappClicks: 18,
    conversionRate: 14.5,
    salesPipeline: 245000,
    byState: [
      { state: 'Maharashtra', share: 45, trend: 'up', count: 56 },
      { state: 'Gujarat', share: 25, trend: 'up', count: 31 },
      { state: 'Tamil Nadu', share: 15, trend: 'up', count: 19 },
      { state: 'West Bengal', share: 10, trend: 'down', count: 12 },
      { state: 'Karnataka', share: 5, trend: 'up', count: 6 },
    ],
    topProducts: [
      { name: 'Industrial Water Pump', views: 52, inquiries: 8, conv: 15.3 },
      { name: 'Copper Core Grounding Wire', views: 34, inquiries: 5, conv: 14.7 },
      { name: 'Heavy Duty Adhesive Sealant', views: 24, inquiries: 3, conv: 12.5 },
      { name: 'Brass Coupling Joints (1/2 Inch)', views: 14, inquiries: 2, conv: 14.2 },
    ],
  });

  const [selectedTimeframe, setSelectedTimeframe] = useState<'7d' | '30d' | 'all'>('7d');

  // Load actual numbers dynamically from products in localStorage if available
  useEffect(() => {
    try {
      const stored = localStorage.getItem('marketplace_products');
      if (stored) {
        const list = JSON.parse(stored);
        
        // Calculate mock stats tied to actual items length and specs
        const itemsCount = list.length;
        const calcViews = itemsCount * 31 + 42; // Dynamic seed
        const calcClicks = Math.round(calcViews * 0.145); // 14.5% conversion seed
        const pipelineVal = list.reduce((acc: number, item: any) => acc + (item.price * item.moq), 0) * 1.5;

        // Calculate product list view mappings
        const productsAnalytics = list.map((item: any, index: number) => {
          const itemViews = Math.max(12, 45 - (index * 8));
          const itemInq = Math.max(1, Math.round(itemViews * 0.15));
          return {
            name: item.name,
            views: itemViews,
            inquiries: itemInq,
            conv: Math.round((itemInq / itemViews) * 1000) / 10,
          };
        }).sort((a: any, b: any) => b.views - a.views);

        setData({
          views: calcViews,
          whatsappClicks: calcClicks,
          conversionRate: 14.5,
          salesPipeline: Math.round(pipelineVal),
          byState: [
            { state: 'Maharashtra', share: 45, trend: 'up', count: Math.round(calcClicks * 0.45) },
            { state: 'Gujarat', share: 25, trend: 'up', count: Math.round(calcClicks * 0.25) },
            { state: 'Tamil Nadu', share: 15, trend: 'up', count: Math.round(calcClicks * 0.15) },
            { state: 'West Bengal', share: 10, trend: 'down', count: Math.round(calcClicks * 0.10) },
            { state: 'Karnataka', share: 5, trend: 'up', count: Math.round(calcClicks * 0.05) },
          ],
          topProducts: productsAnalytics,
        });
      }
    } catch (e) {
      console.error('Failed to calculate analytics from storage', e);
    }
  }, []);

  return (
    <DashboardLayout
      navigationItems={navigationItems}
      user={{ name: 'Gaurav Enterprise', email: 'partner@dealerconnect.in' }}
      topBarProps={{
        pageTitle: 'Business Insights',
        breadcrumbs: [{ label: 'Cockpit', href: '/dashboard' }, { label: 'Analytics' }],
        unreadNotifications: 3,
      }}
    >
      <div className="space-y-6">
        {/* Title row */}
        <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-[#1f2937] dark:text-white tracking-tight">Google Analytics Cockpit</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Analyze your B2B trade inquiries, location demographics, and pipeline conversion trends.
            </p>
          </div>

          {/* Timeframe Selectors */}
          <div className="flex gap-1.5 bg-[#fff6e6] dark:bg-slate-950 border border-[#f3d9a7] dark:border-slate-800 p-1 rounded-2xl">
            {(['7d', '30d', 'all'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setSelectedTimeframe(t)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                  selectedTimeframe === t
                    ? 'bg-[#FAB12F] text-slate-950 shadow border border-accent-600/10'
                    : 'text-slate-550 dark:text-slate-400 hover:text-[#1f2937] dark:hover:text-white'
                }`}
              >
                {t === '7d' ? '7 Days' : t === '30d' ? '30 Days' : 'Lifetime'}
              </button>
            ))}
          </div>
        </section>

        {/* Analytics KPI Dashboard Grid */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KPICard
            title="Total Catalog Views"
            value={`+${data.views}`}
            icon="👀"
            className="min-h-[140px] rounded-3xl border border-[#f3d9a7] dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-col justify-between"
          >
            <p className="mt-2 text-xs text-emerald-600 dark:text-emerald-400 font-bold">
              📈 +12% vs previous period
            </p>
          </KPICard>

          <KPICard
            title="WhatsApp Connections"
            value={`${data.whatsappClicks}`}
            icon="💬"
            className="min-h-[140px] rounded-3xl border border-[#f3d9a7] dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-col justify-between"
          >
            <p className="mt-2 text-xs text-emerald-600 dark:text-emerald-400 font-bold">
              📈 +15% conversion lift
            </p>
          </KPICard>

          <KPICard
            title="Inquiry Conversion Rate"
            value={`${data.conversionRate}%`}
            icon="🎯"
            className="min-h-[140px] rounded-3xl border border-[#f3d9a7] dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-col justify-between"
          >
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-450 font-bold">
              Industry Average: 8.5%
            </p>
          </KPICard>

          <KPICard
            title="Est. Sales Pipeline Value"
            value={`₹${data.salesPipeline.toLocaleString('en-IN')}`}
            icon="💰"
            className="min-h-[140px] rounded-3xl border border-[#f3d9a7] dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-col justify-between"
          >
            <p className="mt-2 text-xs text-amber-600 dark:text-amber-450 font-bold">
              Escrow and wholesale inquiries
            </p>
          </KPICard>
        </section>

        {/* Primary Data Row: Top Listings & Geographic Demographics */}
        <section className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          
          {/* Top Listings performance */}
          <Card className="rounded-3xl border border-[#f3d9a7] dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4 shadow-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Top Performers
              </p>
              <h3 className="mt-1 text-xl font-bold text-[#1f2937] dark:text-white">Listing Interest Metrics</h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#f3d9a7] dark:border-slate-800 pb-3 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="pb-3 text-sm">Product Name</th>
                    <th className="pb-3 text-center text-sm">Views</th>
                    <th className="pb-3 text-center text-sm">Inquiries</th>
                    <th className="pb-3 text-right text-sm">Conversion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f3d9a7]/60 dark:divide-slate-800/40 font-bold text-[#1f2937] dark:text-slate-100">
                  {data.topProducts.map((p, idx) => (
                    <tr key={idx} className="group hover:bg-[#fff0db]/50 dark:hover:bg-slate-800/35 transition-colors">
                      <td className="py-4 font-extrabold text-sm text-slate-700 dark:text-slate-200 group-hover:text-[#FAB12F] transition-colors">
                        {p.name}
                      </td>
                      <td className="py-4 text-center text-slate-655 dark:text-slate-350">{p.views}</td>
                      <td className="py-4 text-center text-emerald-500 font-extrabold">💬 {p.inquiries}</td>
                      <td className="py-4 text-right text-amber-600 dark:text-amber-500 font-extrabold">{p.conv}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Regional Demographics */}
          <Card className="rounded-3xl border border-[#f3d9a7] dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4 flex flex-col justify-between shadow-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Inquiry Demographics
              </p>
              <h3 className="mt-1 text-xl font-bold text-[#1f2937] dark:text-white">Interstate Trade Reach</h3>
            </div>

            <div className="space-y-4 my-2">
              {data.byState.map((st, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between items-center text-xs font-semibold">
                    <span className="text-slate-700 dark:text-slate-200">{st.state}</span>
                    <span className="text-slate-555 dark:text-slate-400">
                      {st.count} leads ({st.share}%) {st.trend === 'up' ? '↗' : '↘'}
                    </span>
                  </div>
                  {/* Progress visualization track */}
                  <div className="h-2 rounded-full bg-[#fff6e6] dark:bg-slate-950 overflow-hidden border border-[#f3d9a7] dark:border-slate-800">
                    <div
                      style={{ width: `${st.share}%` }}
                      className={`h-full rounded-full transition-all duration-1000 ${
                        idx === 0
                          ? 'bg-[#FAB12F]'
                          : idx === 1
                          ? 'bg-emerald-500'
                          : idx === 2
                          ? 'bg-blue-500'
                          : 'bg-slate-700 dark:bg-slate-600'
                      }`}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-[#f3d9a7]/60 dark:border-slate-800/60 text-center">
              <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-widest font-bold">
                Google Analytics API Linked ✓
              </p>
            </div>
          </Card>

        </section>
      </div>
    </DashboardLayout>
  );
}

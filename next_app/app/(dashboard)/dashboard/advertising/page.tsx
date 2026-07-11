'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { navigationItems } from '@/lib/navigation';
import { Greeting } from '@/components/dashboard/Greeting';

interface AdChannel {
  id: string;
  name: string;
  icon: string;
  connected: boolean;
  status: 'connected' | 'disconnected' | 'connecting';
  type: string;
  clicks: number;
  spent: number;
  conversions: number;
}

export default function AdvertisingPage() {
  const [activeTab, setActiveTab] = useState<'channels' | 'copywriter' | 'roi'>('channels');
  const [channels, setChannels] = useState<AdChannel[]>([
    { id: 'meta', name: 'Meta Ads & Facebook', icon: '🔵', connected: true, status: 'connected', type: 'Social PPC', clicks: 1240, spent: 18000, conversions: 84 },
    { id: 'google', name: 'Google Ads & Merchant', icon: '🌐', connected: true, status: 'connected', type: 'Search / Shopping', clicks: 2310, spent: 32000, conversions: 192 },
    { id: 'instagram', name: 'Instagram Business Profile', icon: '📸', connected: false, status: 'disconnected', type: 'Social Commerce', clicks: 0, spent: 0, conversions: 0 },
    { id: 'linkedin', name: 'LinkedIn Professional Ads', icon: '💼', connected: false, status: 'disconnected', type: 'B2B Leads', clicks: 0, spent: 0, conversions: 0 },
    { id: 'youtube', name: 'YouTube Video Ads', icon: '🎥', connected: false, status: 'disconnected', type: 'Video Campaigns', clicks: 0, spent: 0, conversions: 0 },
  ]);

  // AI copywriter state
  const [targetProduct, setTargetProduct] = useState('Industrial Water Pump');
  const [copyType, setCopyType] = useState<'Google Ad' | 'FB Caption' | 'SEO Meta' | 'Email Newsletter'>('Google Ad');
  const [generatedOutput, setGeneratedOutput] = useState<{ title: string; desc: string; keywords: string } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Connection flow
  const handleToggleChannel = (id: string) => {
    setChannels((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          if (c.connected) {
            return { ...c, connected: false, status: 'disconnected', spent: 0, clicks: 0, conversions: 0 };
          } else {
            return { ...c, connected: true, status: 'connected', spent: 1000, clicks: 80, conversions: 4 };
          }
        }
        return c;
      })
    );
  };

  // AI Copy Generation
  const handleGenerateCopy = () => {
    setIsGenerating(true);
    setGeneratedOutput(null);
    setTimeout(() => {
      let output = { title: '', desc: '', keywords: '' };
      if (copyType === 'Google Ad') {
        output = {
          title: `Bulk ${targetProduct} Wholesale | GST Invoice & Fast Shipping`,
          desc: `Buy verified high-quality ${targetProduct} directly from Indian manufacturers. Low MOQ, transparent bulk pricing, and secure shipping to Maharashtra & Gujarat. Get an instant RFQ quotation online today!`,
          keywords: `${targetProduct.toLowerCase()} wholesale, bulk ${targetProduct.toLowerCase()}, ${targetProduct.toLowerCase()} distributor, certified ${targetProduct.toLowerCase()}`,
        };
      } else if (copyType === 'FB Caption') {
        output = {
          title: `💼 Looking for high-performance wholesale ${targetProduct}?`,
          desc: `Upgrade your trade procurement with Gaurav Enterprises! We offer verified GSTIN invoices, flexible MOQs, and direct support on WhatsApp. Check our full catalog online and request quotes instantly. 🚀`,
          keywords: `b2b business, industrial supplies, ${targetProduct.toLowerCase()}`,
        };
      } else if (copyType === 'SEO Meta') {
        output = {
          title: `Buy ${targetProduct} Wholesale - Gaurav Enterprises`,
          desc: `Looking for bulk ${targetProduct}? Access technical specifications, HSN tax slabs, and custom wholesale pricing. Request instant quotes from certified distributors.`,
          keywords: `${targetProduct.toLowerCase()} india, bulk industrial sourcing`,
        };
      } else {
        output = {
          title: `Exclusive Wholesale Deal: Certified ${targetProduct} inside!`,
          desc: `Dear Partner,\n\nWe have just refreshed our warehouse safety stock of ${targetProduct}. Grab special wholesale pricing with verified GST compliance on all orders finalized this week. Reply on WhatsApp to secure delivery slots.`,
          keywords: `B2B Newsletter, Sourcing Alert`,
        };
      }
      setGeneratedOutput(output);
      setIsGenerating(false);
    }, 1200);
  };

  const totalSpent = channels.reduce((acc, c) => acc + c.spent, 0);
  const totalClicks = channels.reduce((acc, c) => acc + c.clicks, 0);
  const totalConvs = channels.reduce((acc, c) => acc + c.conversions, 0);
  const averageCtr = totalClicks > 0 ? '4.8%' : '0%';
  const roas = totalSpent > 0 ? (totalConvs * 14500 / totalSpent).toFixed(1) + 'x' : '0x';

  return (
    <DashboardLayout
      navigationItems={navigationItems}
      user={{ name: 'Gaurav Enterprise', email: 'partner@dealerconnect.in' }}
      topBarProps={{
        pageTitle: 'Marketing OS Control',
        breadcrumbs: [{ label: 'Cockpit', href: '/dashboard' }, { label: 'Marketing' }],
        unreadNotifications: 1,
      }}
    >
      <div className="space-y-6 pb-12">
        {/* Header */}
        <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <Greeting />
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">Multi-Channel Ads Center & AI Copywriter</p>
          </div>

          <div className="flex gap-1.5 bg-[#fff6e6] dark:bg-slate-950 border border-[#f3d9a7] dark:border-slate-800 p-1 rounded-2xl">
            {(['channels', 'copywriter', 'roi'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                  activeTab === tab
                    ? 'bg-[#FAB12F] text-slate-950 shadow border border-accent-600/10'
                    : 'text-slate-550 dark:text-slate-400 hover:text-[#1f2937] dark:hover:text-white'
                }`}
              >
                {tab === 'channels' ? 'Channels Hub' : tab === 'copywriter' ? 'AI Ads Copywriter' : 'Campaign ROI'}
              </button>
            ))}
          </div>
        </section>

        {/* TAB 1: CHANNELS HUB */}
        {activeTab === 'channels' && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {channels.map((chan) => (
              <Card key={chan.id} className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-col justify-between space-y-4 shadow-xl">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{chan.icon}</span>
                    <div>
                      <h4 className="font-black text-sm text-slate-850 dark:text-white">{chan.name}</h4>
                      <p className="text-[10px] text-slate-450 uppercase tracking-wider font-extrabold">{chan.type}</p>
                    </div>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                    chan.connected ? 'bg-emerald-500/10 text-emerald-600' : 'bg-slate-500/10 text-slate-400'
                  }`}>
                    {chan.status}
                  </span>
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-800/40 text-xs font-semibold">
                  <span className="text-slate-500">Ad Sync Connection</span>
                  <button
                    onClick={() => handleToggleChannel(chan.id)}
                    className={`rounded-xl px-3 py-1.5 font-black text-[10px] uppercase shadow-sm transition-all ${
                      chan.connected
                        ? 'bg-rose-600 text-white hover:bg-rose-700'
                        : 'bg-[#FAB12F] text-slate-950 hover:bg-[#e09e1b]'
                    }`}
                  >
                    {chan.connected ? 'Disconnect' : 'Connect Hub'}
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* TAB 2: AI ADS COPYWRITER */}
        {activeTab === 'copywriter' && (
          <div className="grid gap-6 md:grid-cols-2">
            {/* Input Form */}
            <Card className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl space-y-5">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-550">Gemini Sourcing Marketing Generator</h3>
                <p className="text-xs text-slate-400 mt-1">Select a catalog product and generate copy for target channels instantly.</p>
              </div>

              <div className="space-y-4 text-xs font-semibold">
                <div className="space-y-1">
                  <label className="text-slate-500">Target Product</label>
                  <select value={targetProduct} onChange={(e) => setTargetProduct(e.target.value)} className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 p-2.5">
                    <option value="Industrial Water Pump">Industrial Water Pump</option>
                    <option value="Copper Core Grounding Wire">Copper Core Grounding Wire</option>
                    <option value="Brass Coupling Joints">Brass Coupling Joints (1/2 Inch)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-500">Asset Target Format</label>
                  <div className="grid gap-2 grid-cols-2">
                    {(['Google Ad', 'FB Caption', 'SEO Meta', 'Email Newsletter'] as const).map((type) => (
                      <button
                        key={type}
                        onClick={() => setCopyType(type)}
                        className={`rounded-xl p-2.5 font-bold transition-all border ${
                          copyType === type
                            ? 'border-[#FAB12F] bg-[#fff6e6] text-[#FAB12F]'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-600'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleGenerateCopy}
                  disabled={isGenerating}
                  className="w-full rounded-2xl bg-[#FAB12F] text-slate-950 font-black py-3 text-center shadow-md hover:bg-[#e09e1b] transition-all disabled:opacity-50"
                >
                  {isGenerating ? 'Generating Sourcing Assets...' : 'Generate Marketing Assets'}
                </button>
              </div>
            </Card>

            {/* Generated Copy Output */}
            <Card className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl space-y-4 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-550">AI Creative Output</h3>
                <p className="text-xs text-slate-400 mt-1">High conversion asset draft ready for campaign deployment.</p>
              </div>

              {generatedOutput ? (
                <div className="border border-slate-150 dark:border-slate-800 p-5 rounded-2xl bg-[#fefefe] dark:bg-slate-950 text-xs font-semibold text-slate-800 dark:text-slate-200 space-y-3.5 shadow-inner">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Generated Header / Subject</span>
                    <p className="font-black text-sm text-slate-900 dark:text-white mt-1">{generatedOutput.title}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Body Copy / Meta Description</span>
                    <p className="text-slate-655 dark:text-slate-350 leading-relaxed font-normal mt-1 whitespace-pre-line">{generatedOutput.desc}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Target Keywords / Hashtags</span>
                    <p className="text-blue-500 font-mono text-[10px] mt-1">{generatedOutput.keywords}</p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800/40 text-right">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`${generatedOutput.title}\n\n${generatedOutput.desc}`);
                        alert('Copied to clipboard!');
                      }}
                      className="rounded-xl bg-[#FAB12F] text-slate-950 font-black px-3.5 py-1.5 text-[10px] shadow-sm"
                    >
                      📋 Copy Asset
                    </button>
                  </div>
                </div>
              ) : (
                <div className="border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center text-slate-500 text-xs my-auto">
                  {isGenerating ? (
                    <div className="flex flex-col items-center gap-3">
                      <svg className="animate-spin h-5 w-5 text-amber-500" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Gemini is compiling competitive keywords and HSN data...</span>
                    </div>
                  ) : (
                    'Select format options and run the generator to preview results.'
                  )}
                </div>
              )}
            </Card>
          </div>
        )}

        {/* TAB 3: CAMPAIGN ROI ANALYTICS */}
        {activeTab === 'roi' && (
          <div className="space-y-6">
            {/* ROI Metrics summary */}
            <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
              <Card className="rounded-3xl border border-slate-200 dark:border-slate-800 p-5 space-y-1 bg-white dark:bg-slate-900 shadow-sm">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Total Spent</span>
                <span className="text-xl font-black text-slate-850 dark:text-white">₹{totalSpent.toLocaleString('en-IN')}</span>
              </Card>
              <Card className="rounded-3xl border border-slate-200 dark:border-slate-800 p-5 space-y-1 bg-white dark:bg-slate-900 shadow-sm">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Total Ad Clicks</span>
                <span className="text-xl font-black text-blue-500">{totalClicks}</span>
              </Card>
              <Card className="rounded-3xl border border-slate-200 dark:border-slate-800 p-5 space-y-1 bg-white dark:bg-slate-900 shadow-sm">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Conversions Generated</span>
                <span className="text-xl font-black text-emerald-600">{totalConvs}</span>
              </Card>
              <Card className="rounded-3xl border border-slate-200 dark:border-slate-800 p-5 space-y-1 bg-white dark:bg-slate-900 shadow-sm">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Estimated ROAS</span>
                <span className="text-xl font-black text-amber-500">{roas}</span>
              </Card>
            </div>

            {/* Channels breakdown */}
            <Card className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl space-y-4">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-550">Network CPC Performance Breakdown</h3>
                <p className="text-xs text-slate-400 mt-1">Detailed marketing return-on-investment parameters per connected channel feed.</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
                      <th className="py-3 px-4">Channel Partner</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Spent (₹)</th>
                      <th className="py-3 px-4 text-right">Clicks</th>
                      <th className="py-3 px-4 text-right">Average CPC</th>
                      <th className="py-3 px-4 text-right">Conversions</th>
                      <th className="py-3 px-4 text-right">Acquisition Cost (CPA)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 dark:divide-slate-800 font-semibold text-slate-800 dark:text-slate-200">
                    {channels.filter(c => c.connected).map((chan) => {
                      const cpc = chan.clicks > 0 ? (chan.spent / chan.clicks).toFixed(1) : '0';
                      const cpa = chan.conversions > 0 ? (chan.spent / chan.conversions).toFixed(1) : '0';
                      return (
                        <tr key={chan.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                          <td className="py-4 px-4 font-black flex items-center gap-2">
                            <span className="text-xl">{chan.icon}</span>
                            <span>{chan.name}</span>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <span className="bg-emerald-500/10 text-emerald-600 font-black uppercase text-[9px] px-2 py-0.5 rounded-full">active</span>
                          </td>
                          <td className="py-4 px-4 text-right font-bold">₹{chan.spent.toLocaleString()}</td>
                          <td className="py-4 px-4 text-right">{chan.clicks}</td>
                          <td className="py-4 px-4 text-right text-amber-600">₹{cpc}</td>
                          <td className="py-4 px-4 text-right text-emerald-600">{chan.conversions}</td>
                          <td className="py-4 px-4 text-right font-black">₹{cpa}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

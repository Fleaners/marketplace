'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { navigationItems } from '@/lib/navigation';

interface AdvertisingConnection {
  id: string;
  name: string;
  logo: string;
  connected: boolean;
  status: 'connected' | 'disconnected' | 'connecting';
  channelType: string;
  lastSync: string;
}

interface ProductItem {
  id: string;
  name: string;
  price: number;
  stock: number;
  moq: number;
  category: string;
}

export default function AdvertisingPage() {
  const [activeTab, setActiveTab] = useState<'channels' | 'campaigns' | 'seo'>('channels');
  const [connections, setConnections] = useState<AdvertisingConnection[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [authProgress, setAuthProgress] = useState(0);
  const [authStep, setAuthStep] = useState('');
  
  // Initial channels configuration
  const initialChannels: AdvertisingConnection[] = [
    { id: 'meta', name: 'Meta Business & Facebook', logo: '🔵', connected: false, status: 'disconnected', channelType: 'Social Commerce', lastSync: 'Never' },
    { id: 'instagram', name: 'Instagram Business Shop', logo: '📸', connected: false, status: 'disconnected', channelType: 'Social Shopping', lastSync: 'Never' },
    { id: 'google_ads', name: 'Google Ads & Keywords', logo: '🌐', connected: false, status: 'disconnected', channelType: 'Search / PPC', lastSync: 'Never' },
    { id: 'google_merchant', name: 'Google Merchant Center', logo: '🛒', connected: false, status: 'disconnected', channelType: 'Product Feeds', lastSync: 'Never' },
    { id: 'google_business', name: 'Google Business Profile', logo: '📍', connected: false, status: 'disconnected', channelType: 'Local Directories', lastSync: 'Never' },
    { id: 'youtube', name: 'YouTube Video Ads', logo: '🎥', connected: false, status: 'disconnected', channelType: 'Video Reach', lastSync: 'Never' },
    { id: 'linkedin', name: 'LinkedIn Professional Ads', logo: '💼', connected: false, status: 'disconnected', channelType: 'B2B Professional', lastSync: 'Never' },
    { id: 'pinterest', name: 'Pinterest Catalog Pinning', logo: '📌', connected: false, status: 'disconnected', channelType: 'Visual Discovery', lastSync: 'Never' },
    { id: 'x_ads', name: 'X (Twitter) Feed Ads', logo: '🐦', connected: false, status: 'disconnected', channelType: 'Direct Feed', lastSync: 'Never' },
    { id: 'whatsapp_ads', name: 'WhatsApp Business Broadcast', logo: '💬', connected: false, status: 'disconnected', channelType: 'Direct Chat Leads', lastSync: 'Never' },
  ];

  // Load state and products
  useEffect(() => {
    try {
      // Load connections from LocalStorage
      const savedConnections = localStorage.getItem('marketplace_advertising_connections');
      if (savedConnections) {
        setConnections(JSON.parse(savedConnections));
      } else {
        setConnections(initialChannels);
      }

      // Load active catalog products
      const stored = localStorage.getItem('marketplace_products');
      if (stored) {
        setProducts(JSON.parse(stored));
      } else {
        const defaultProducts: ProductItem[] = [
          { id: '1', name: 'Industrial Water Pump', price: 14500, stock: 12, moq: 2, category: 'Industrial' },
          { id: '2', name: 'Copper Core Grounding Wire', price: 1200, stock: 4, moq: 5, category: 'Electrical' },
          { id: '3', name: 'Brass Coupling Joints (1/2 Inch)', price: 85, stock: 15, moq: 20, category: 'Hardware' }
        ];
        setProducts(defaultProducts);
      }
    } catch (e) {
      console.error('Failed to load Advertising Center storage', e);
    }
  }, []);

  // Save connections back to LocalStorage
  const saveConnections = (updatedList: AdvertisingConnection[]) => {
    setConnections(updatedList);
    localStorage.setItem('marketplace_advertising_connections', JSON.stringify(updatedList));
  };

  // Connect flow simulator (OAuth setup)
  const triggerConnect = (id: string) => {
    setConnectingId(id);
    setAuthProgress(10);
    setAuthStep('Redirecting to secure OAuth portal...');
  };

  useEffect(() => {
    if (connectingId === null) return;

    const interval = setInterval(() => {
      setAuthProgress((prev) => {
        const next = prev + 15;
        if (next >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            // Mark connected
            const updated = connections.map((conn) => {
              if (conn.id === connectingId) {
                return {
                  ...conn,
                  connected: true,
                  status: 'connected' as const,
                  lastSync: new Date().toLocaleDateString('en-IN', { hour: '2-digit', minute: '2-digit' }),
                };
              }
              return conn;
            });
            saveConnections(updated);
            setConnectingId(null);
            setAuthProgress(0);
            setAuthStep('');
          }, 600);
          return 100;
        }

        // Simulating OAuth security validation steps
        if (next < 35) {
          setAuthStep('Validating API Credentials and Scope Permissions...');
        } else if (next < 65) {
          setAuthStep('Authorizing secure token handshakes...');
        } else if (next < 90) {
          setAuthStep('Saving encrypted access and refresh tokens to vault...');
        }
        return next;
      });
    }, 450);

    return () => clearInterval(interval);
  }, [connectingId]);

  // Disconnect flow
  const handleDisconnect = (id: string) => {
    const updated = connections.map((conn) => {
      if (conn.id === id) {
        return {
          ...conn,
          connected: false,
          status: 'disconnected' as const,
          lastSync: 'Never',
        };
      }
      return conn;
    });
    saveConnections(updated);
  };

  const activeConnectionsCount = connections.filter((c) => c.connected).length;

  // Dynamic Keyword Generator from Products
  const generatedKeywords = React.useMemo(() => {
    if (products.length === 0) return ['Wholesale B2B Supplier', 'Indian Retail Trade', 'Wholesale Market India'];
    const list: string[] = [];
    products.forEach((p) => {
      const name = p.name.split('(')[0].trim();
      list.push(`${name} Wholesale`);
      list.push(`Bulk ${name} Manufacturer`);
      list.push(`${name} GST Invoice India`);
    });
    return list.slice(0, 10);
  }, [products]);

  // Dynamic recommendations
  const dynamicBudget = products.length * 1500 + 5000;

  return (
    <DashboardLayout
      navigationItems={navigationItems}
      user={{ name: 'Gaurav Enterprise', email: 'partner@dealerconnect.in' }}
      topBarProps={{
        pageTitle: 'Advertising Hub',
        breadcrumbs: [{ label: 'Cockpit', href: '/dashboard' }, { label: 'Advertising' }],
        unreadNotifications: 1,
      }}
    >
      <div className="space-y-6">
        
        {/* Title row */}
        <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-[#1f2937] dark:text-white tracking-tight">📢 Advertising & Campaigns Center</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Securely connect B2B search, local directory maps, and social marketplace advertising channels.
            </p>
          </div>

          {/* Module Tabs */}
          <div className="flex gap-1 bg-[#fff6e6] dark:bg-slate-950 border border-[#f3d9a7] dark:border-slate-800 p-1 rounded-2xl">
            {(['channels', 'campaigns', 'seo'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                  activeTab === tab
                    ? 'bg-[#FAB12F] text-slate-950 shadow border border-accent-600/10'
                    : 'text-slate-550 dark:text-slate-400 hover:text-[#1f2937] dark:hover:text-white'
                }`}
              >
                {tab === 'channels' ? 'Channels' : tab === 'campaigns' ? 'Campaign Metrics' : 'SEO & Keywords'}
              </button>
            ))}
          </div>
        </section>

        {/* Tab 1: Channels */}
        {activeTab === 'channels' && (
          <div className="space-y-6">
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {connections.map((conn) => (
                <Card
                  key={conn.id}
                  className="rounded-3xl border border-[#f3d9a7] dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-all min-h-[200px]"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-3xl">{conn.logo}</div>
                      <span
                        className={`inline-flex items-center text-2xs font-extrabold px-2.5 py-0.5 rounded-full border ${
                          conn.connected
                            ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-405 border-emerald-205 dark:border-emerald-800/40'
                            : 'bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-405 border-slate-205 dark:border-slate-800/40'
                        }`}
                      >
                        {conn.connected ? '● CONNECTED' : '● DISCONNECTED'}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100">{conn.name}</h3>
                      <p className="text-2xs font-bold text-slate-400 dark:text-slate-450 uppercase tracking-wider">{conn.channelType}</p>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between gap-4">
                    <span className="text-2xs font-bold text-slate-500 dark:text-slate-400">
                      Sync: <span className="font-extrabold">{conn.lastSync}</span>
                    </span>

                    {conn.connected ? (
                      <div className="flex gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => triggerConnect(conn.id)}
                          className="rounded-xl px-2 py-1 text-2xs font-bold border-[#f3d9a7] dark:border-slate-800 hover:bg-[#fff0db] dark:hover:bg-slate-850"
                        >
                          Reconnect
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDisconnect(conn.id)}
                          className="rounded-xl px-2 py-1 text-2xs font-bold bg-rose-500 hover:bg-rose-600 text-white"
                        >
                          Disconnect
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => triggerConnect(conn.id)}
                        className="rounded-xl px-3 py-1 text-2xs font-black bg-[#FAB12F] hover:bg-[#e09e1b] text-slate-900 border border-[#f3d9a7]/30"
                      >
                        Connect Channel
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </section>
          </div>
        )}

        {/* Tab 2: Campaigns */}
        {activeTab === 'campaigns' && (
          <div className="space-y-6">
            {activeConnectionsCount === 0 ? (
              <Card className="rounded-3xl border border-[#f3d9a7] dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center space-y-4">
                <div className="text-4xl">🔌</div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">No Advertising Channels Connected</h3>
                <p className="text-sm text-slate-505 dark:text-slate-400 max-w-md mx-auto">
                  Connect your business profiles (Google Ads, Meta Shop, or WhatsApp Campaigns) under the Channels tab to sync campaign data.
                </p>
                <Button
                  variant="primary"
                  onClick={() => setActiveTab('channels')}
                  className="rounded-xl bg-[#FAB12F] text-slate-950 font-extrabold"
                >
                  Go to Channels
                </Button>
              </Card>
            ) : (
              <div className="space-y-6">
                
                {/* Campaigns KPI Header */}
                <div className="grid gap-4 sm:grid-cols-3">
                  <Card className="rounded-3xl border border-[#f3d9a7] dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
                    <p className="text-2xs font-extrabold uppercase tracking-wider text-slate-405 dark:text-slate-400">Total Ad Budget Active</p>
                    <strong className="text-2xl font-black text-slate-800 dark:text-white">₹{dynamicBudget.toLocaleString('en-IN')} /mo</strong>
                    <p className="text-3xs text-slate-400 dark:text-slate-500 mt-1">Spread across {activeConnectionsCount} connected channel(s)</p>
                  </Card>
                  <Card className="rounded-3xl border border-[#f3d9a7] dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
                    <p className="text-2xs font-extrabold uppercase tracking-wider text-slate-405 dark:text-slate-400">Impressions (Est.)</p>
                    <strong className="text-2xl font-black text-slate-800 dark:text-white">42,500</strong>
                    <p className="text-3xs text-emerald-500 font-bold mt-1">📈 +18% search click-through rate</p>
                  </Card>
                  <Card className="rounded-3xl border border-[#f3d9a7] dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
                    <p className="text-2xs font-extrabold uppercase tracking-wider text-slate-405 dark:text-slate-400">Ad Click-Throughs</p>
                    <strong className="text-2xl font-black text-slate-800 dark:text-white">1,240</strong>
                    <p className="text-3xs text-emerald-500 font-bold mt-1">📈 Avg. B2B Cost-Per-Click: ₹12.50</p>
                  </Card>
                </div>

                {/* Recommendations Grid */}
                <div className="grid gap-6 md:grid-cols-2">
                  
                  {/* Budget Recommendations */}
                  <Card className="rounded-3xl border border-[#f3d9a7] dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
                    <h3 className="text-base font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
                      💡 Smart Budget Advisory
                    </h3>
                    <div className="space-y-3">
                      <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-slate-950 border border-amber-205 dark:border-slate-850">
                        <h4 className="text-xs font-bold text-amber-800 dark:text-amber-500">Optimized Recommended Budget</h4>
                        <p className="text-xl font-black text-slate-900 dark:text-white mt-1">₹{Math.round(dynamicBudget * 1.2).toLocaleString('en-IN')} /mo</p>
                        <p className="text-3xs text-slate-505 dark:text-slate-400 mt-1">Increasing spending by 20% on Google Ads is estimated to double impressions for high-margin catalog items.</p>
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-2xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Top Performing Bid Targets</h4>
                        <ul className="text-xs text-slate-655 dark:text-slate-350 space-y-1.5">
                          {products.slice(0, 3).map((p) => (
                            <li key={p.id} className="flex justify-between font-medium">
                              <span>🎯 {p.name}</span>
                              <span className="font-extrabold text-[#FAB12F]">Est. Conv: 14.2%</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </Card>

                  {/* Traffic Channels Summary */}
                  <Card className="rounded-3xl border border-[#f3d9a7] dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
                    <h3 className="text-base font-extrabold text-slate-800 dark:text-white">📊 Estimated Traffic Share</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-slate-700 dark:text-slate-205">Google Search & Ads</span>
                        <div className="w-1/2 bg-slate-100 dark:bg-slate-950 h-2 rounded-full overflow-hidden">
                          <div className="bg-blue-505 h-full rounded-full" style={{ width: '45%' }} />
                        </div>
                        <span className="font-extrabold text-slate-700 dark:text-slate-200">45%</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-slate-700 dark:text-slate-205">Meta / Instagram Shops</span>
                        <div className="w-1/2 bg-slate-100 dark:bg-slate-950 h-2 rounded-full overflow-hidden">
                          <div className="bg-pink-500 h-full rounded-full" style={{ width: '30%' }} />
                        </div>
                        <span className="font-extrabold text-slate-700 dark:text-slate-200">30%</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-slate-700 dark:text-slate-205">WhatsApp Broadcasts</span>
                        <div className="w-1/2 bg-slate-100 dark:bg-slate-950 h-2 rounded-full overflow-hidden">
                          <div className="bg-emerald-500 h-full rounded-full" style={{ width: '20%' }} />
                        </div>
                        <span className="font-extrabold text-slate-700 dark:text-slate-200">20%</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-slate-700 dark:text-slate-205">Other Direct Hits</span>
                        <div className="w-1/2 bg-slate-100 dark:bg-slate-950 h-2 rounded-full overflow-hidden">
                          <div className="bg-amber-505 h-full rounded-full" style={{ width: '5%' }} />
                        </div>
                        <span className="font-extrabold text-slate-700 dark:text-slate-200">5%</span>
                      </div>
                    </div>
                  </Card>

                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: SEO */}
        {activeTab === 'seo' && (
          <div className="grid gap-6 md:grid-cols-2">
            
            {/* Keywords */}
            <Card className="rounded-3xl border border-[#f3d9a7] dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-800 dark:text-white">🔑 Auto-Suggested SEO Keywords</h3>
                <p className="text-3xs text-slate-400 dark:text-slate-450 mt-0.5">High-intent search queries generated directly from your catalog list.</p>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                {generatedKeywords.map((kw, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center text-xs font-bold px-3 py-1 rounded-xl bg-amber-50 dark:bg-slate-950 text-amber-700 dark:text-amber-400 border border-amber-100/50 dark:border-slate-800 hover:bg-amber-100 dark:hover:bg-slate-850 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                  >
                    🔍 {kw}
                  </span>
                ))}
              </div>
            </Card>

            {/* Catalog SEO Score */}
            <Card className="rounded-3xl border border-[#f3d9a7] dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-800 dark:text-white">📈 SEO Index Analysis</h3>
                <p className="text-3xs text-slate-400 dark:text-slate-450 mt-0.5">Automated title and HSN compliance checks score.</p>
              </div>
              
              <div className="flex items-center gap-6">
                <div className="relative h-20 w-20 rounded-full border-4 border-emerald-500 flex items-center justify-center bg-emerald-50/50 dark:bg-emerald-950/20">
                  <span className="text-lg font-black text-emerald-600 dark:text-emerald-450">88%</span>
                </div>
                <div className="flex-1 space-y-1 text-xs">
                  <p className="font-extrabold text-slate-750 dark:text-slate-200">SEO Quality Score: <span className="text-emerald-500">EXCELLENT</span></p>
                  <p className="text-slate-505 dark:text-slate-400">Your products have highly search-optimized descriptive text. Add volume-tiered wholesale pricing to increase index rankings by up to 15%.</p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 space-y-2">
                <h4 className="text-2xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Automated Recommendations</h4>
                <ul className="text-xs text-slate-655 dark:text-slate-350 space-y-1.5">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500">✓</span>
                    <span>All products include specific size or specification dimensions.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500">✓</span>
                    <span>GST number is present in profile (displays Trust Badges).</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-550">⚠️</span>
                    <span>Ensure target WhatsApp broadcast templates mention your delivery timelines.</span>
                  </li>
                </ul>
              </div>
            </Card>

          </div>
        )}

      </div>

      {/* OAuth Progress Overlay Modal */}
      {connectingId !== null && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="max-w-md w-full rounded-3xl border border-[#f3d9a7] dark:border-slate-800 bg-white dark:bg-slate-900 p-8 space-y-6 shadow-2xl animate-fade-in">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#FAB12F]" />
              <div>
                <h3 className="text-lg font-extrabold text-slate-800 dark:text-white">Secure Channel Handshake</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Connecting account token scopes securely</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="w-full bg-slate-100 dark:bg-slate-955 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-[#FAB12F] h-full rounded-full transition-all duration-300"
                  style={{ width: `${authProgress}%` }}
                />
              </div>
              <p className="text-2xs font-bold text-center text-slate-600 dark:text-slate-350 animate-pulse">{authStep}</p>
            </div>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
}

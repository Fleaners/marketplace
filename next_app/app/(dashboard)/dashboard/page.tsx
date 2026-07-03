'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout';
import { KPICard } from '@/components/dashboard/KPICard';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { navigationItems } from '@/lib/navigation';

// Mock business state that synchronizes with localStorage
interface DashboardState {
  sellerName: string;
  buyerReachThisWeek: number;
  viewsCount: number;
  whatsappInquiries: number;
  lowStockCount: number;
  topProduct: string;
  totalProducts: number;
}

export default function DashboardPage() {
  const router = useRouter();
  
  // Local state for seller cockpit
  const [state, setState] = React.useState<DashboardState>({
    sellerName: 'Gaurav Enterprise',
    buyerReachThisWeek: 18,
    viewsCount: 124,
    whatsappInquiries: 18,
    lowStockCount: 3,
    topProduct: 'Industrial Water Pump',
    totalProducts: 8
  });

  // AI chat system state
  const [aiMessage, setAiMessage] = React.useState('');
  const [chatLog, setChatLog] = React.useState<Array<{ sender: 'user' | 'ai'; text: string }>>([
    { sender: 'ai', text: 'Namaste! I can assist you with pricing, inventory forecasting, and GST calculation. Ask me anything about your products!' }
  ]);

  // Load business statistics from local storage if available to keep state persistent
  React.useEffect(() => {
    try {
      const storedProducts = localStorage.getItem('marketplace_products');
      let productsList = [];
      if (storedProducts) {
        productsList = JSON.parse(storedProducts);
      } else {
        // Seed default products if empty
        const defaultProducts = [
          { id: '1', name: 'Industrial Water Pump', category: 'Industrial', price: 14500, stock: 15, moq: 2, sku: 'WP-IND-100', unit: 'Pieces', gst: true, delivery: '2-3 days', tags: ['Pumps', 'Heavy Duty'], whatsapp: '919876543210' },
          { id: '2', name: 'Heavy Duty Adhesive Sealant', category: 'Industrial', price: 450, stock: 3, moq: 10, sku: 'AD-HD-450', unit: 'Pieces', gst: true, delivery: 'Next day', tags: ['Adhesives', 'Hardware'], whatsapp: '919876543210' },
          { id: '3', name: 'Copper Core Grounding Wire', category: 'Electrical', price: 1200, stock: 25, moq: 5, sku: 'EL-CC-GND', unit: 'Meters', gst: true, delivery: '3-5 days', tags: ['Electrical', 'Wiring'], whatsapp: '919876543210' },
          { id: '4', name: 'Brass Coupling Joints (1/2 Inch)', category: 'Hardware', price: 85, stock: 2, moq: 20, sku: 'HW-BCJ-12', unit: 'Pieces', gst: false, delivery: '2-4 days', tags: ['Plumbing', 'Brass'], whatsapp: '919876543210' },
        ];
        localStorage.setItem('marketplace_products', JSON.stringify(defaultProducts));
        productsList = defaultProducts;
      }

      // Read profile
      const storedProfile = localStorage.getItem('marketplace_seller_profile');
      let profileName = 'Gaurav Enterprise';
      if (storedProfile) {
        const profile = JSON.parse(storedProfile);
        profileName = profile.businessName || 'Gaurav Enterprise';
      }

      // Calculate low stock dynamically
      const lowStockItems = productsList.filter((p: any) => Number(p.stock) <= Number(p.moq));
      
      // Calculate top product based on price/views mock
      const topProd = productsList.length > 0 ? productsList[0].name : 'Industrial Water Pump';

      setState(prev => ({
        ...prev,
        sellerName: profileName,
        lowStockCount: lowStockItems.length,
        topProduct: topProd,
        totalProducts: productsList.length
      }));
    } catch (e) {
      console.error('Failed to load dashboard state:', e);
    }
  }, []);

  const handleAddProductClick = () => {
    router.push('/dashboard/products/?new=true');
  };

  const handleLogout = () => {
    // Standard logout redirection to landing buyer view
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiMessage.trim()) return;

    const userText = aiMessage;
    setChatLog(prev => [...prev, { sender: 'user', text: userText }]);
    setAiMessage('');

    // Custom simulated elite B2B AI Assistant responses
    setTimeout(() => {
      let aiText = `I have analyzed your inquiries. It looks like buyers from Pune are asking about bulk orders of ${state.topProduct}. I recommend keeping at least 5 more units in stock.`;
      
      const query = userText.toLowerCase();
      if (query.includes('stock') || query.includes('inventory') || query.includes('low')) {
        aiText = `You currently have ${state.lowStockCount} items running below their minimum order quantity (MOQ). I highly suggest initiating a restock order for those items today to prevent missing inquiries.`;
      } else if (query.includes('whatsapp') || query.includes('inquiry') || query.includes('leads')) {
        aiText = `Your WhatsApp inquiry count is up by 15% this week! ${state.whatsappInquiries} buyers initiated direct connections. Ensure your contact number is up-to-date in your Profile.`;
      } else if (query.includes('gst') || query.includes('tax')) {
        aiText = `GST-enabled products receive up to 40% more trust clicks from registered trade buyers. You can toggle "GST Applicable" directly in the Add Product form!`;
      } else if (query.includes('price') || query.includes('discount')) {
        aiText = `Based on competitive trends for ${state.topProduct}, a volume discount of 5% on orders exceeding 50 units would attract 3x more wholesale buyers.`;
      }

      setChatLog(prev => [...prev, { sender: 'ai', text: aiText }]);
    }, 800);
  };

  const recentInquiries = [
    { buyer: 'Rajesh Electricals', location: 'Mumbai, MH', time: '1h ago', message: 'Interested in Copper Grounding Wire' },
    { buyer: 'Siddharth Pumps Ltd', location: 'Kolkata, WB', time: '4h ago', message: 'Inquiry on Wholesale Water Pumps' },
    { buyer: 'Amit Engineering', location: 'Pune, MH', time: '1d ago', message: 'Requesting quotation for 50 pieces' },
  ];

  return (
    <DashboardLayout
      navigationItems={navigationItems}
      user={{ name: state.sellerName, email: 'partner@dealerconnect.in' }}
      onLogout={handleLogout}
      topBarProps={{
        pageTitle: 'Business Cockpit',
        breadcrumbs: [{ label: 'Home', href: '/' }, { label: 'Cockpit' }],
        unreadNotifications: 3,
        onAddProduct: handleAddProductClick,
      }}
    >
      <div className="space-y-6">
        
        {/* Welcome Header */}
        <section className="rounded-[32px] bg-gradient-to-r from-accent-500/10 via-slate-900 to-slate-950 border border-slate-800 p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent-400">Merchant Cockpit</p>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
              Welcome back, {state.sellerName} 👋
            </h1>
            <p className="text-base text-slate-300 font-medium">
              Your business reached <span className="text-accent-400 font-bold">+{state.buyerReachThisWeek} new buyers</span> this week.
            </p>
          </div>
          <div>
            <Button
              variant="primary"
              size="lg"
              onClick={handleAddProductClick}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              }
              className="rounded-2xl shadow-[0_12px_30px_-6px_rgba(255,149,0,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
              data-testid="add-product-btn"
            >
              Add Product
            </Button>
          </div>
        </section>

        {/* Quick Metrics Grid */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          
          <KPICard
            title="People Interested"
            value={`+${state.viewsCount}`}
            icon="👀"
            className="min-h-[140px] rounded-3xl border border-slate-800 bg-slate-950 p-6 flex flex-col justify-between"
          >
            <p className="mt-2 text-xs text-slate-400 font-medium">Product detail page views</p>
          </KPICard>

          <KPICard
            title="WhatsApp Inquiries"
            value={`${state.whatsappInquiries}`}
            icon="💬"
            className="min-h-[140px] rounded-3xl border border-slate-800 bg-slate-950 p-6 flex flex-col justify-between"
          >
            <p className="mt-2 text-xs text-emerald-400 font-semibold flex items-center gap-1">
              <span>●</span> Direct buyer contacts initiated
            </p>
          </KPICard>

          <KPICard
            title="Products Running Low"
            value={`${state.lowStockCount}`}
            icon="⚠️"
            className={`min-h-[140px] rounded-3xl border p-6 flex flex-col justify-between ${
              state.lowStockCount > 0 
                ? 'border-amber-500/20 bg-amber-500/5 text-amber-300' 
                : 'border-slate-800 bg-slate-950 text-white'
            }`}
          >
            <p className="mt-2 text-xs text-slate-400 font-medium">Items near or below MOQ</p>
          </KPICard>

          <KPICard
            title="Top Product"
            value={state.topProduct}
            icon="🏆"
            className="min-h-[140px] rounded-3xl border border-slate-800 bg-slate-950 p-6 flex flex-col justify-between"
          >
            <p className="mt-2 text-xs text-slate-400 font-medium truncate">Generated most interest</p>
          </KPICard>

        </section>

        {/* Primary Row: Lead Inbox & AI Assistant */}
        <section className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          
          {/* Active Inquiries Card */}
          <Card className="rounded-3xl border border-slate-800 bg-slate-950 p-6 space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-900 pb-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Live Inquiries</p>
                  <h3 className="mt-1 text-xl font-bold text-white">Direct WhatsApp Contacts</h3>
                </div>
                <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  Active Connection
                </span>
              </div>

              <div className="divide-y divide-slate-900 mt-4">
                {recentInquiries.map((inq, idx) => (
                  <div key={idx} className="flex items-start justify-between py-4 gap-4 hover:bg-slate-900/10 px-2 rounded-2xl transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-white">{inq.buyer}</h4>
                        <span className="text-[10px] bg-slate-900 text-slate-400 px-2 py-0.5 rounded-full font-medium">{inq.location}</span>
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-1 italic">"{inq.message}"</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-slate-500 font-medium whitespace-nowrap">{inq.time}</span>
                      <div className="mt-1">
                        <a 
                          href={`https://wa.me/919876543210?text=Hello%20${encodeURIComponent(inq.buyer)},%20thank%20you%20for%20reaching%20out%20on%20DealerConnect.`}
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-[11px] font-semibold text-accent-400 hover:text-accent-300 transition-colors"
                        >
                          Chat Live →
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="pt-4 border-t border-slate-900">
              <Button 
                variant="secondary" 
                className="w-full justify-center rounded-2xl text-slate-300"
                onClick={() => router.push('/dashboard/profile')}
              >
                Configure WhatsApp Settings
              </Button>
            </div>
          </Card>

          {/* AI Assistant Chat Box */}
          <Card className="rounded-3xl border border-slate-800 bg-slate-950 p-6 flex flex-col h-[400px] justify-between">
            <div>
              <div className="flex items-center gap-2.5 border-b border-slate-900 pb-4">
                <div className="h-8 w-8 rounded-2xl bg-gradient-to-br from-accent-500 to-slate-800 flex items-center justify-center text-xs">
                  🤖
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">AI Business Advisor</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Real-time marketplace insights</p>
                </div>
              </div>
            </div>

            {/* Message Area */}
            <div className="flex-1 overflow-y-auto my-4 space-y-3 px-1 scrollbar-thin scrollbar-thumb-slate-800">
              {chatLog.map((chat, idx) => (
                <div 
                  key={idx} 
                  className={`flex ${chat.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] rounded-[20px] px-4 py-2.5 text-xs font-medium leading-relaxed ${
                    chat.sender === 'user' 
                      ? 'bg-accent-500 text-slate-950 rounded-br-none' 
                      : 'bg-slate-900 text-slate-200 rounded-bl-none border border-slate-800'
                  }`}>
                    {chat.text}
                  </div>
                </div>
              ))}
            </div>

            {/* Input Form */}
            <form onSubmit={handleSendMessage} className="flex gap-2 border-t border-slate-900 pt-3">
              <input
                type="text"
                placeholder="Ask about inventory, GST benefits..."
                value={aiMessage}
                onChange={(e) => setAiMessage(e.target.value)}
                className="flex-1 rounded-2xl bg-slate-900 border border-slate-800 px-4 py-2.5 text-xs text-white focus:outline-none focus:border-accent-500 transition-colors placeholder:text-slate-500"
              />
              <button 
                type="submit"
                className="h-10 w-10 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 flex items-center justify-center text-slate-200 transition-all duration-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </form>
          </Card>

        </section>
      </div>
    </DashboardLayout>
  );
}

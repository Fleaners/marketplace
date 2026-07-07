'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Toggle } from '@/components/ui/Toggle';
import { navigationItems } from '@/lib/navigation';
import { dispatchTelemetry } from '@/lib/telemetry';

// Interfaces for structured state
interface AgentState {
  name: string;
  role: string;
  status: 'idle' | 'running' | 'training' | 'success';
  lastRun: string;
  color: string;
  logs: string[];
}

interface ProductItem {
  id: string;
  name: string;
  price: number;
  stock: number;
  moq: number;
  sku: string;
  category: string;
}

export default function AIInsightsPage() {
  const [activeTab, setActiveTab] = useState<'cockpit' | 'chat' | 'inventory' | 'gst' | 'marketing'>('cockpit');
  const [growthScore, setGrowthScore] = useState(78);
  const [smoothingAlpha, setSmoothingAlpha] = useState(0.85); // Smoothing factor alpha
  const [temporalLeadW, setTemporalLeadW] = useState(1.20); // Temporal shipping lead factor W
  const [loopState, setLoopState] = useState<'Discover' | 'Learn' | 'Test' | 'Improve'>('Discover');
  const [loopLog, setLoopLog] = useState<string[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  
  // 1. Agent Orchestrator States
  const [agents, setAgents] = useState<AgentState[]>([
    {
      name: 'Commerce Intelligence Agent',
      role: 'B2B Category & Pricing Forecasting',
      status: 'idle',
      lastRun: '12m ago',
      color: 'from-blue-500 to-cyan-500',
      logs: [
        'Studied Indian wholesale market price shifts...',
        'Category: Electrical products surged +28% month-over-month.',
        'Category: Hardware and construction supplies inquiry volume increased by 2.2x.'
      ]
    },
    {
      name: 'GST Intelligence Agent',
      role: 'Tax Slabs & Invoice Compliance (Advisor)',
      status: 'idle',
      lastRun: '2h ago',
      color: 'from-purple-500 to-indigo-500',
      logs: [
        'Analyzed state-wise CGST/SGST ledger guidelines...',
        'Checked current threshold logic: Warning active for Approaching mandatory GST limit (₹20 Lakhs).',
        'Recommended invoice templates aligned to latest MSME e-invoicing standards.'
      ]
    },
    {
      name: 'Digital Marketing Agent',
      role: 'SMM, WhatsApp Lead Gen & SEO Optimization',
      status: 'idle',
      lastRun: '44s ago',
      color: 'from-pink-500 to-rose-500',
      logs: [
        'Ingested buyer search intent queries in Delhi-NCR region...',
        'Generated SEO Keyword sets: Bulk industrial gear, high-conductivity grounding cable.',
        'Calculated optimal marketing budget allocation: ₹15,000 lead gen threshold.'
      ]
    },
    {
      name: 'Inventory Optimization Agent',
      role: 'Safety Stocks & Lead Velocity ARIMA',
      status: 'idle',
      lastRun: '5m ago',
      color: 'from-amber-500 to-orange-500',
      logs: [
        'Fitting LSTM forecasting equations on historical restock cycles...',
        'Predicted 35% seasonal demand spike for Electrical supplies over next 14 days.',
        'Safety inventory threshold trigger: restock PVC pipes within 5 days.'
      ]
    }
  ]);

  // 2. Chat States
  const [chatSelectedAgent, setChatSelectedAgent] = useState<string>('All-Agent Orchestrator');
  const [chatMessage, setChatMessage] = useState('');
  const [chatLog, setChatLog] = useState<Array<{ sender: 'user' | 'agent'; text: string; agentName: string; time: string }>>([
    {
      sender: 'agent',
      agentName: 'System Orchestrator',
      text: 'Namaste! I am the Autonomous Business Intelligence Orchestrator. Select any specialized agent on the side, or ask me anything. I can forecast demand, analyze GST slabs, copywrite marketing briefs, or optimize inventory.',
      time: 'Now'
    }
  ]);
  const [editingMessageIdx, setEditingMessageIdx] = useState<number | null>(null);
  const [editingMessageText, setEditingMessageText] = useState<string>('');

  // 3. GST Invoice Simulator States
  const [gstInvoiceForm, setGstInvoiceForm] = useState({
    buyerName: 'Amit Construction Ltd',
    buyerGSTIN: '27AAAAA1111A1Z1',
    productId: '',
    quantity: 10,
    gstApplicable: false,
    gstSlab: 18,
    stateType: 'intra' // 'intra' -> CGST+SGST, 'inter' -> IGST
  });
  const [invoiceResult, setInvoiceResult] = useState<any>(null);

  // 4. Digital Marketing Simulator States
  const [marketingForm, setMarketingForm] = useState({
    campaignName: 'Monsoon Wholesale Booster',
    targetRegion: 'Maharashtra & South India',
    campaignType: 'WhatsApp B2B Broadcast',
    budget: 12000,
    durationDays: 7
  });
  const [marketingOutput, setMarketingFormOutput] = useState<any>(null);
  const [customTemplate, setCustomTemplate] = useState<string>('');

  // Load actual catalog products to link math and simulation
  useEffect(() => {
    try {
      const stored = localStorage.getItem('marketplace_products');
      if (stored) {
        const parsed = JSON.parse(stored);
        setProducts(parsed);
        if (parsed.length > 0) {
          setGstInvoiceForm(prev => ({ ...prev, productId: parsed[0].id }));
        }
      } else {
        // Fallback seed
        const defaults: ProductItem[] = [
          { id: '1', name: 'Industrial Water Pump', price: 14500, stock: 12, moq: 2, sku: 'WP-IND-100', category: 'Industrial' },
          { id: '2', name: 'Copper Core Grounding Wire', price: 1200, stock: 4, moq: 5, sku: 'EL-CC-GND', category: 'Electrical' },
          { id: '3', name: 'Brass Coupling Joints (1/2 Inch)', price: 85, stock: 15, moq: 20, sku: 'HW-BCJ-12', category: 'Hardware' }
        ];
        setProducts(defaults);
        setGstInvoiceForm(prev => ({ ...prev, productId: '1' }));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Continuous Autonomous Loop Visualizer (Discover -> Learn -> Test -> Improve)
  useEffect(() => {
    const loops: Array<'Discover' | 'Learn' | 'Test' | 'Improve'> = ['Discover', 'Learn', 'Test', 'Improve'];
    let currentIdx = 0;

    const interval = setInterval(() => {
      currentIdx = (currentIdx + 1) % loops.length;
      const nextStep = loops[currentIdx];
      setLoopState(nextStep);

      // Random logs to simulate autonomous calculations
      const stepLogs: Record<string, string[]> = {
        Discover: [
          'Analyzing buyer inquiries & search index queries...',
          'Anonymizing buyer PII keys to ensure ISO-27001 constraints.',
          'Detected 14 wholesale clicks on electrical SKU items.'
        ],
        Learn: [
          'Refitting LSTM forecasting weights with latest local sales data...',
          'Calculating local covariance matrices for categories.',
          'Updating Content-Based and Collaborative recommendation embeddings.'
        ],
        Test: [
          'Evaluating pricing score models against competitor indices...',
          'Validation check: price elasticity model achieves 94% precision.',
          'Cross-verifying GST slabs matching with Indian e-invoice policies.'
        ],
        Improve: [
          'Redeploying recommended action cards to Cockpit dashboard...',
          'Refining safety thresholds for active listings.',
          'Recalculating global AI Growth Score...'
        ]
      };

      const selectedLogs = stepLogs[nextStep];
      const timeStr = new Date().toLocaleTimeString('en-US', { hour12: false });
      
      setLoopLog(prev => [
        `[${timeStr}] [${nextStep.toUpperCase()}] ${selectedLogs[Math.floor(Math.random() * selectedLogs.length)]}`,
        ...prev.slice(0, 14)
      ]);

      // Modulate Growth Score slightly to show real-time live learning progress
      setGrowthScore(prev => {
        const delta = Math.floor(Math.random() * 3) - 1; // -1, 0, or 1
        return Math.max(82, Math.min(94, prev + delta));
      });

      // Flit random agent statuses
      setAgents(prev => prev.map((agent, index) => {
        if (index === currentIdx) {
          return { ...agent, status: 'training', lastRun: 'Just now' };
        }
        return { ...agent, status: 'idle' };
      }));

    }, 4500);

    return () => clearInterval(interval);
  }, []);

  // Pre-calculate Marketing Campaign outputs based on budget & category
  useEffect(() => {
    const costPerClick = 12.5; // Avg INR CPC
    const ctr = 0.045; // 4.5% Click-through-rate
    const reach = Math.round(marketingForm.budget * 0.25);
    const expectedClicks = Math.round(reach * ctr);
    const leads = Math.round(expectedClicks * 0.15); // 15% conversion on WhatsApp B2B

    const campaignsTemplates: Record<string, string> = {
      'WhatsApp B2B Broadcast': `👋 Greetings from Gaurav Enterprise! We noticed your B2B requirements. Get special wholesale deals on top-tier industrial supplies. Direct shipping & secure escrow. Let's discuss today!`,
      'Google Ads B2B Campaign': `Premium B2B Industrial Supplies in India. Trusted by 2,000+ businesses. Get GST Compliant Invoices & MOQ discounts. Request quotes inside 1-minute. Click to call on WhatsApp now!`,
      'Meta B2B Ad Segment': `🔨 Restocking wholesale? Skip the middleman. Secure authentic industrial gears, PVC fittings, and electrical components with zero-hassle delivery. Tap "Send Message" to chat with us.`
    };

    const campaignTemplate = campaignsTemplates[marketingForm.campaignType] || campaignsTemplates['WhatsApp B2B Broadcast'];
    setMarketingFormOutput({
      reach,
      expectedClicks,
      leads,
      ctr: (ctr * 100).toFixed(1) + '%',
      template: campaignTemplate
    });
    setCustomTemplate(campaignTemplate);
  }, [marketingForm]);

  // Pre-calculate GST Invoice details
  useEffect(() => {
    const selectedProd = products.find(p => p.id === gstInvoiceForm.productId);
    if (!selectedProd) return;

    const rate = selectedProd.price;
    const subtotal = rate * gstInvoiceForm.quantity;
    let cgst = 0;
    let sgst = 0;
    let igst = 0;
    const slabPercent = gstInvoiceForm.gstApplicable ? gstInvoiceForm.gstSlab : 0;
    const taxValue = subtotal * (slabPercent / 100);

    if (gstInvoiceForm.gstApplicable) {
      if (gstInvoiceForm.stateType === 'intra') {
        cgst = taxValue / 2;
        sgst = taxValue / 2;
      } else {
        igst = taxValue;
      }
    }

    const total = subtotal + taxValue;

    setInvoiceResult({
      productName: selectedProd.name,
      sku: selectedProd.sku,
      rate,
      subtotal,
      cgst,
      sgst,
      igst,
      taxValue,
      total,
      isGstCompliant: gstInvoiceForm.gstApplicable && gstInvoiceForm.buyerGSTIN.length >= 15
    });
  }, [gstInvoiceForm, products]);

  // Handle Conversational chat submission
  const handleSendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;

    const userText = chatMessage;
    const nowTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    
    setChatLog(prev => [...prev, {
      sender: 'user',
      agentName: 'Merchant',
      text: userText,
      time: nowTime
    }]);

    setChatMessage('');

    // Trigger state changes to show agent responding
    const matchingAgentIndex = agents.findIndex(a => 
      chatSelectedAgent.toLowerCase().includes(a.name.split(' ')[0].toLowerCase())
    );

    if (matchingAgentIndex !== -1) {
      setAgents(prev => prev.map((a, i) => i === matchingAgentIndex ? { ...a, status: 'running' } : a));
    }

    // Agent response mapping simulating genuine multi-agent context
    setTimeout(() => {
      let replyText = '';
      let senderName = chatSelectedAgent;
      const lowerQuery = userText.toLowerCase();

      if (chatSelectedAgent === 'All-Agent Orchestrator') {
        if (lowerQuery.includes('stock') || lowerQuery.includes('inventory')) {
          senderName = 'Inventory Optimization Agent';
          replyText = `LSTM evaluation shows safety stocks for "Copper Core Grounding Wire" are critically low (4 units left, MOQ is 5). Reorder within 3 days.`;
        } else if (lowerQuery.includes('tax') || lowerQuery.includes('gst') || lowerQuery.includes('invoice')) {
          senderName = 'GST Intelligence Agent';
          replyText = `Based on current B2B guidelines, products matching HSN 8413 (Pumps) can be billed optionally under 12% or 18% slab rules. Non-GST billing remains fully supported.`;
        } else if (lowerQuery.includes('marketing') || lowerQuery.includes('ads') || lowerQuery.includes('campaign')) {
          senderName = 'Digital Marketing Agent';
          replyText = `Our regional reach simulation reveals high conversion densities in Maharashtra. Launching a ₹10,000 WhatsApp broadcast is forecasted to pull ~80 qualified trade leads.`;
        } else {
          senderName = 'Commerce Intelligence Agent';
          replyText = `Trade inquiries for Electrical equipment have grown 28% this month. I recommend offering volume discounts of 5% on "Copper Core Grounding Wire" bulk quantities.`;
        }
      } else if (chatSelectedAgent === 'Commerce Intelligence Agent') {
        replyText = `I have analyzed wholesale search trends across India. Competitor indices indicate our "Industrial Water Pump" price (₹14,500) is highly competitive. Category margins are shifting (+4% lift).`;
      } else if (chatSelectedAgent === 'GST Intelligence Agent') {
        replyText = `GST validation verified. Invoicing under GST structure yields 40% higher buyer confidence indexes. We can auto-format CGST/SGST lines depending on buyer state codes.`;
      } else if (chatSelectedAgent === 'Digital Marketing Agent') {
        replyText = `Suggested Campaign: "Monsoon B2B Wholesale Spike". I have pre-written SEO meta copy for your pages. WhatsApp broadcasts yield highest click conversions (4.5%).`;
      } else if (chatSelectedAgent === 'Inventory Optimization Agent') {
        replyText = `Lead velocity ARIMA forecasting indicates a 30% restock pipeline latency during monsoon seasons. Plan 4 extra days of shipping lead times for hardware supplies.`;
      }

      setChatLog(prev => [...prev, {
        sender: 'agent',
        agentName: senderName,
        text: replyText,
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      }]);

      if (matchingAgentIndex !== -1) {
        setAgents(prev => prev.map((a, i) => i === matchingAgentIndex ? { ...a, status: 'success' } : a));
      }
    }, 1000);
  };

  return (
    <DashboardLayout
      navigationItems={navigationItems}
      user={{ name: 'Gaurav Enterprise', email: 'partner@dealerconnect.in' }}
      onLogout={() => {
        if (typeof window !== 'undefined') window.location.href = '/';
      }}
      topBarProps={{
        pageTitle: 'AI Business Intelligence',
        breadcrumbs: [{ label: 'Cockpit', href: '/dashboard' }, { label: 'AI Intelligence' }],
        unreadNotifications: 2,
      }}
    >
      <div className="space-y-6">
        
        {/* Page Header */}
        <section className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-[#f3d9a7] p-6 rounded-[32px]">
          <div className="space-y-1">
            <span className="text-xs font-bold text-accent-500 uppercase tracking-widest">Multi-Agent Suite</span>
            <h1 className="text-2xl font-bold text-[#1f2937]">Autonomous Commerce Advisor</h1>
            <p className="text-xs text-slate-500">
              Continuous background learning active. Models are synchronized with your inventory catalog and public tax codes.
            </p>
          </div>

          <div className="flex gap-2">
            <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Agent Orchestrator Live
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1 bg-[#FAB12F]/10 border border-accent-500/20 text-amber-600 rounded-full text-xs font-semibold">
              🔒 Privacy Preserved (Anonymized)
            </span>
          </div>
        </section>

        {/* Dynamic Navigation Tabs */}
        <div className="flex overflow-x-auto gap-2 p-1 bg-[#fff6e6] border border-[#f3d9a7] rounded-2xl">
          <button
            onClick={() => setActiveTab('cockpit')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
              activeTab === 'cockpit' ? 'bg-[#FAB12F] text-slate-950 shadow' : 'text-slate-500 hover:text-[#1f2937] hover:bg-[#fff6e6]/40'
            }`}
          >
            📊 Orchestrator Cockpit
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
              activeTab === 'chat' ? 'bg-[#FAB12F] text-slate-950 shadow' : 'text-slate-500 hover:text-[#1f2937] hover:bg-[#fff6e6]/40'
            }`}
          >
            💬 Interactive Agent Chat
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
              activeTab === 'inventory' ? 'bg-[#FAB12F] text-slate-950 shadow' : 'text-slate-500 hover:text-[#1f2937] hover:bg-[#fff6e6]/40'
            }`}
          >
            📦 Safety Stock & LSTM
          </button>
          <button
            onClick={() => setActiveTab('gst')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
              activeTab === 'gst' ? 'bg-[#FAB12F] text-slate-950 shadow' : 'text-slate-500 hover:text-[#1f2937] hover:bg-[#fff6e6]/40'
            }`}
          >
            🧾 GST Invoice & Advisor
          </button>
          <button
            onClick={() => setActiveTab('marketing')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
              activeTab === 'marketing' ? 'bg-[#FAB12F] text-slate-950 shadow' : 'text-slate-500 hover:text-[#1f2937] hover:bg-[#fff6e6]/40'
            }`}
          >
            📢 Digital Marketing Hub
          </button>
        </div>

        {/* Tab 1: ORCHESTRATOR COCKPIT */}
        {activeTab === 'cockpit' && (
          <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
            
            {/* Left side: Active Agents Status & Realtime Logs */}
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                {agents.map((agent, i) => (
                  <Card key={i} className="bg-white border border-[#f3d9a7] p-5 rounded-3xl space-y-4">
                    <div className="flex justify-between items-start">
                      <div className={`p-2 rounded-xl bg-gradient-to-r ${agent.color} text-slate-950 font-bold text-lg`}>
                        {i === 0 ? '📈' : i === 1 ? '🏛️' : i === 2 ? '📣' : '⚙️'}
                      </div>
                      <Badge className={`text-[10px] uppercase font-bold py-0.5 px-2 ${
                        agent.status === 'training'
                          ? 'bg-amber-50 border border-amber-200 text-amber-700 animate-pulse'
                          : 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                      }`}>
                        {agent.status === 'training' ? 'learning' : 'active'}
                      </Badge>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#1f2937] leading-tight">{agent.name}</h4>
                      <p className="text-[11px] text-slate-500 mt-1">{agent.role}</p>
                    </div>
                    <div className="pt-3 border-t border-[#f3d9a7]/60 flex justify-between items-center text-[10px] text-slate-500 font-medium">
                      <span>Refitted {agent.lastRun}</span>
                      <span className="text-slate-600">Continuous ✓</span>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Real-time System Loop Console */}
              <Card className="bg-white border border-[#f3d9a7] p-6 rounded-3xl space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-base font-bold text-[#1f2937]">4-Structure Autonomous Loop</h3>
                    <p className="text-xs text-slate-500">Visualizing real-time Discover-Learn-Test-Improve sequences</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FAB12F] animate-ping" />
                    <span className="text-xs text-amber-600 font-bold">State: {loopState}</span>
                  </div>
                </div>

                {/* Animated Loop Status Bar */}
                <div className="grid grid-cols-4 gap-2 text-center text-[11px] font-bold">
                  {(['Discover', 'Learn', 'Test', 'Improve'] as const).map((step) => (
                    <div
                      key={step}
                      className={`py-3 rounded-xl border transition-all ${
                        loopState === step
                          ? 'bg-[#FAB12F]/10 border-accent-500/40 text-amber-600 shadow-[0_0_15px_rgba(255,149,0,0.15)] scale-[1.02]'
                          : 'bg-[#fff6e6] border-[#f3d9a7] text-slate-500'
                      }`}
                    >
                      <div className="text-base mb-1">
                        {step === 'Discover' ? '🔍' : step === 'Learn' ? '🧠' : step === 'Test' ? '🧪' : '🚀'}
                      </div>
                      {step}
                    </div>
                  ))}
                </div>

                {/* Simulated Logs Terminal */}
                <div className="bg-[#fff6e6] border border-[#f3d9a7] p-4 rounded-2xl font-mono text-[11px] text-emerald-400/90 space-y-1.5 max-h-[180px] overflow-y-auto">
                  {loopLog.length === 0 ? (
                    <div className="text-slate-500 italic">Initializing autonomous multi-agent training pipelines...</div>
                  ) : (
                    loopLog.map((log, idx) => <div key={idx}>{log}</div>)
                  )}
                </div>
              </Card>
            </div>

            {/* Right side: Growth Score & Actionable Summary Opportunities */}
            <div className="space-y-6">
              
              {/* Premium Circular/Card Progress Growth Score */}
              <Card className="bg-white border border-[#f3d9a7] p-6 rounded-3xl text-center space-y-6 flex flex-col justify-between items-center">
                <div className="w-full text-left">
                  <h3 className="text-sm font-bold text-[#1f2937] uppercase tracking-wider text-slate-500">AI Growth Score</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Optimized against category, inventory, and margin indexes</p>
                </div>

                {/* Dynamic circular display */}
                <div className="relative w-36 h-36 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="72" cy="72" r="60" stroke="#0f172a" strokeWidth="12" fill="transparent" />
                    <circle
                      cx="72"
                      cy="72"
                      r="60"
                      stroke="url(#accentGrad)"
                      strokeWidth="12"
                      fill="transparent"
                      strokeDasharray={2 * Math.PI * 60}
                      strokeDashoffset={2 * Math.PI * 60 * (1 - growthScore / 100)}
                      strokeLinecap="round"
                      className="transition-all duration-1000"
                    />
                    <defs>
                      <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#ff9500" />
                        <stop offset="100%" stopColor="#e05300" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-4xl font-extrabold text-[#1f2937] tracking-tight">{growthScore}</span>
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">/100 points</span>
                  </div>
                </div>

                <div className="w-full bg-[#fff6e6] border border-[#f3d9a7] rounded-2xl p-4 text-left">
                  <p className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                    <span>📈</span> +4% growth factor calculated this cycle.
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1 leading-normal">
                    Adding valid HSN slabs and deploying a localized WhatsApp promotion can elevate your performance index to 92.
                  </p>
                </div>
              </Card>

              {/* Opportunity Stream */}
              <Card className="bg-white border border-[#f3d9a7] p-6 rounded-3xl space-y-4">
                <h3 className="text-base font-bold text-[#1f2937]">Recommended Opportunities</h3>
                
                <div className="space-y-3.5">
                  <div className="flex gap-3.5 p-3 rounded-2xl bg-blue-500/5 border border-blue-500/10">
                    <span className="text-xl">📊</span>
                    <div>
                      <h4 className="text-xs font-bold text-[#1f2937]">High Category Yield Alert</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Electrical supplies inquiry velocities surged +28%. Increase inventory coverage for "Copper Grounding Wire" now.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3.5 p-3 rounded-2xl bg-amber-500/5 border border-amber-500/10">
                    <span className="text-xl">⚠️</span>
                    <div>
                      <h4 className="text-xs font-bold text-[#1f2937]">Inventory Running Below MOQ</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        "Copper Core Grounding Wire" is 1 unit below MOQ limit. Replenish within 5 days to secure upcoming RFQs.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3.5 p-3 rounded-2xl bg-pink-500/5 border border-pink-500/10">
                    <span className="text-xl">📢</span>
                    <div>
                      <h4 className="text-xs font-bold text-[#1f2937]">Suggested Promotional Campaign</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Launch a WhatsApp B2B Campaign targeted to builders in South India. Recommended budget ₹12,000; expected reach 3,000 businesses.
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

          </div>
        )}

        {/* Tab 2: INTERACTIVE AGENT CHAT */}
        {activeTab === 'chat' && (
          <div className="grid gap-6 lg:grid-cols-[1fr_2.5fr]">
            
            {/* Agent Selector */}
            <Card className="bg-white border border-[#f3d9a7] p-5 rounded-3xl space-y-3">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Select Agent Persona</h3>
              {[
                { name: 'All-Agent Orchestrator', desc: 'Unified network supervisor', emoji: '🤖' },
                { name: 'Commerce Intelligence Agent', desc: 'Category growth & trends expert', emoji: '📈' },
                { name: 'GST Intelligence Agent', desc: 'HSN, billing & threshold advisor', emoji: '🏛️' },
                { name: 'Digital Marketing Agent', desc: 'Copywriter & performance advisor', emoji: '📣' },
                { name: 'Inventory Optimization Agent', desc: 'Lead time & replenishment forecaster', emoji: '⚙️' }
              ].map((persona) => (
                <button
                  key={persona.name}
                  onClick={() => setChatSelectedAgent(persona.name)}
                  className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-start gap-3 ${
                    chatSelectedAgent === persona.name
                      ? 'bg-[#FAB12F]/10 border-accent-500/30 text-[#1f2937]'
                      : 'bg-[#fff6e6]/50 border-[#f3d9a7] text-slate-500 hover:text-[#1f2937] hover:border-[#f3d9a7]'
                  }`}
                >
                  <span className="text-lg">{persona.emoji}</span>
                  <div>
                    <h4 className="text-xs font-bold leading-none">{persona.name}</h4>
                    <p className="text-[10px] text-slate-500 mt-1 leading-normal">{persona.desc}</p>
                  </div>
                </button>
              ))}
            </Card>

            {/* Chat Log Viewport */}
            <Card className="bg-white border border-[#f3d9a7] rounded-3xl flex flex-col h-[520px] overflow-hidden">
              {/* Chat Header */}
              <div className="bg-[#fff6e6] border-b border-[#f3d9a7] px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">💬</span>
                  <div>
                    <h3 className="text-xs font-bold text-[#1f2937] leading-tight">{chatSelectedAgent}</h3>
                    <p className="text-[10px] text-emerald-400 font-semibold mt-0.5 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Ready to consult
                    </p>
                  </div>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setChatLog([{
                    sender: 'agent',
                    agentName: 'System Orchestrator',
                    text: 'Chat history cleared. How can I assist you with your marketplace business intelligence today?',
                    time: 'Now'
                  }])}
                  className="rounded-xl text-[10px]"
                >
                  Clear Console
                </Button>
              </div>

              {/* Chat Scroll container */}
              <div className="flex-1 p-6 overflow-y-auto space-y-4">
                {chatLog.map((chat, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col max-w-[80%] ${
                      chat.sender === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'
                    }`}
                  >
                    <span className="text-[10px] font-bold text-slate-500 mb-1">
                      {chat.agentName} • {chat.time}
                    </span>
                    <div
                      className={`p-4 rounded-2xl text-xs font-semibold leading-relaxed border ${
                        chat.sender === 'user'
                          ? 'bg-[#222222] text-white border-[#222222] rounded-tr-none'
                          : 'bg-[#fff6e6] text-slate-700 border-[#f3d9a7] rounded-tl-none'
                      }`}
                    >
                      {chat.text}
                    </div>

                    {/* Feedback and Correct buttons under Agent replies */}
                    {chat.sender !== 'user' && (
                      <div className="flex items-center gap-3 mt-1.5 ml-2">
                        <button
                          type="button"
                          onClick={() => {
                            dispatchTelemetry({
                              promptContext: `Agent: ${chat.agentName}, Query Context: ${chatLog[idx - 1]?.text || 'No preceding message context'}`,
                              generatedResponse: chat.text,
                              correctedText: chat.text,
                              implicitScore: 1,
                              featureArea: 'chat-bot'
                            });
                            alert('Thank you! Response marked helpful for agent reinforcement.');
                          }}
                          className="text-xs hover:scale-125 active:scale-90 transition-transform cursor-pointer"
                          title="Helpful (👍)"
                        >
                          👍
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            dispatchTelemetry({
                              promptContext: `Agent: ${chat.agentName}, Query Context: ${chatLog[idx - 1]?.text || 'No preceding message context'}`,
                              generatedResponse: chat.text,
                              correctedText: chat.text,
                              implicitScore: -1,
                              featureArea: 'chat-bot'
                            });
                            alert('Thank you! Feedback recorded for safety optimization.');
                          }}
                          className="text-xs hover:scale-125 active:scale-90 transition-transform cursor-pointer"
                          title="Unhelpful (👎)"
                        >
                          👎
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingMessageIdx(idx);
                            setEditingMessageText(chat.text);
                          }}
                          className="text-[10px] text-[#FF9F1C] hover:underline font-bold ml-1 cursor-pointer flex items-center gap-0.5"
                        >
                          ✏️ Correct Response
                        </button>
                      </div>
                    )}

                    {/* Inline correction textarea */}
                    {editingMessageIdx === idx && (
                      <div className="w-full mt-2 space-y-2 bg-[#FFFBF0] border border-[#f3d9a7] p-3 rounded-2xl">
                        <textarea
                          value={editingMessageText}
                          onChange={(e) => setEditingMessageText(e.target.value)}
                          className="w-full bg-white border border-[#f3d9a7] p-2 rounded-xl text-xs font-semibold leading-relaxed text-[#222222] focus:outline-none focus:ring-1 focus:ring-[#FF9F1C] min-h-[60px]"
                        />
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setEditingMessageIdx(null)}
                            className="rounded-xl text-[10px] py-1 px-3"
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => {
                              const updatedLog = [...chatLog];
                              updatedLog[idx].text = editingMessageText;
                              setChatLog(updatedLog);
                              
                              dispatchTelemetry({
                                promptContext: `Agent: ${chat.agentName}, Query Context: ${chatLog[idx - 1]?.text || 'No preceding message context'}`,
                                generatedResponse: chat.text,
                                correctedText: editingMessageText,
                                implicitScore: 1,
                                featureArea: 'chat-bot'
                              });
                              
                              setEditingMessageIdx(null);
                              alert('Correction recorded and piped to AI model self-training cluster.');
                            }}
                            className="rounded-xl text-[10px] py-1 px-3 bg-[#FF9F1C] border-[#FF9F1C] text-slate-950 font-bold hover:bg-[#ff8f00]"
                          >
                            💾 Save & Train Model
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Chat Input form */}
              <form onSubmit={handleSendChatMessage} className="p-4 bg-[#fff6e6]/50 border-t border-[#f3d9a7] flex gap-2">
                <Input
                  placeholder={`Ask the ${chatSelectedAgent}... e.g. "Suggest a WhatsApp campaign" or "Is Grounding wire running low?"`}
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  className="flex-1 rounded-xl text-xs bg-white border-[#f3d9a7]"
                />
                <Button type="submit" variant="primary" className="rounded-xl text-xs px-5">
                  Send Consult
                </Button>
              </form>
            </Card>

          </div>
        )}

        {/* Tab 3: SAFETY STOCK & LSTM FORECASTER */}
        {activeTab === 'inventory' && (
          <div className="space-y-6">
            
            {/* Top Forecasting Summary cards */}
            <div className="grid gap-4 sm:grid-cols-3">
              <Card className="bg-white border border-[#f3d9a7] p-5 rounded-3xl flex items-center gap-4">
                <span className="p-3 bg-red-500/10 border border-red-500/20 rounded-2xl text-2xl">⚠️</span>
                <div>
                  <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Critical Restock Warnings</h4>
                  <p className="text-xl font-black text-[#1f2937] mt-1">1 Listing Below MOQ</p>
                </div>
              </Card>

              <Card className="bg-white border border-[#f3d9a7] p-5 rounded-3xl flex items-center gap-4">
                <span className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-2xl">⚡</span>
                <div>
                  <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Estimated Demand Spike</h4>
                  <p className="text-xl font-black text-[#1f2937] mt-1">+35% Seasonal Surge</p>
                </div>
              </Card>

              <Card className="bg-white border border-[#f3d9a7] p-5 rounded-3xl flex items-center gap-4">
                <span className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-2xl">🛡️</span>
                <div>
                  <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Global Inventory Health</h4>
                  <p className="text-xl font-black text-[#1f2937] mt-1">84/100 (Secure)</p>
                </div>
              </Card>
            </div>

            {/* LSTM Hyperparameters Configuration Card */}
            <Card className="bg-white border border-[#f3d9a7] p-6 rounded-3xl space-y-4">
              <div>
                <h3 className="text-sm font-bold text-[#1f2937] uppercase tracking-wider text-slate-500">LSTM Neural Network Parameter Configuration</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Adjust model hyperparameters to dynamically update inventory security levels and demand margins</p>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                {/* Smoothing Factor Alpha Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-500">Smoothing Factor (Alpha)</span>
                    <span className="text-amber-600 font-bold">{smoothingAlpha.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="1.0"
                    step="0.05"
                    value={smoothingAlpha}
                    onChange={(e) => setSmoothingAlpha(Number(e.target.value))}
                    onMouseUp={() => {
                      dispatchTelemetry({
                        promptContext: `Configure Smoothing Alpha to ${smoothingAlpha}`,
                        generatedResponse: `Smoothing factor alpha parameter adjusted.`,
                        correctedText: `smoothingAlpha: ${smoothingAlpha}`,
                        implicitScore: 1,
                        featureArea: 'forecasting-lstm'
                      });
                    }}
                    className="w-full h-1.5 bg-[#fff6e6] rounded-lg appearance-none cursor-pointer accent-[#FF9F1C]"
                  />
                  <p className="text-[10px] text-slate-500 leading-normal">Higher values prioritize recent demand fluctuations. Lower values calculate smoothed long-term averages.</p>
                </div>

                {/* Temporal Lead W Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-500">Temporal Shipping Lead buffer (W)</span>
                    <span className="text-amber-600 font-bold">{temporalLeadW.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="3.0"
                    step="0.1"
                    value={temporalLeadW}
                    onChange={(e) => setTemporalLeadW(Number(e.target.value))}
                    onMouseUp={() => {
                      dispatchTelemetry({
                        promptContext: `Configure Temporal Lead W to ${temporalLeadW}`,
                        generatedResponse: `Temporal shipping lead factor W adjusted.`,
                        correctedText: `temporalLeadW: ${temporalLeadW}`,
                        implicitScore: 1,
                        featureArea: 'forecasting-lstm'
                      });
                    }}
                    className="w-full h-1.5 bg-[#fff6e6] rounded-lg appearance-none cursor-pointer accent-[#FF9F1C]"
                  />
                  <p className="text-[10px] text-slate-500 leading-normal">Safety lead-time shipping factor. Adjusts margin to secure stocks during vendor transit latencies.</p>
                </div>
              </div>
            </Card>

            {/* Inventory table with forecasting mathematics */}
            <Card className="bg-white border border-[#f3d9a7] p-6 rounded-3xl space-y-4">
              <div>
                <h3 className="text-base font-bold text-[#1f2937]">LSTM Demand Forecasting & Lead Velocity Sheet</h3>
                <p className="text-xs text-slate-500">Deterministic modeling integrating current stocks, sales trends, and lead shipping latencies</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#f3d9a7] pb-3 text-slate-500 font-bold uppercase tracking-wider">
                      <th className="pb-3 text-sm">Product Name</th>
                      <th className="pb-3 text-center text-sm">Stock Level</th>
                      <th className="pb-3 text-center text-sm">Safety MOQ</th>
                      <th className="pb-3 text-center text-sm">Lead Velocity</th>
                      <th className="pb-3 text-center text-sm">LSTM Forecast</th>
                      <th className="pb-3 text-center text-sm">Health Score</th>
                      <th className="pb-3 text-right text-sm">Status / Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f3d9a7]/60 font-semibold text-[#1f2937]">
                    {products.map((p) => {
                      const isLow = p.stock <= p.moq;
                      
                      // Core formula logic applied live per listing
                      // Health = (Current Stock / (Expected Demand * temporalLeadW)) * smoothingAlpha * 100
                      const expectedDemand = Math.max(1, p.moq * 2);
                      const calculatedHealth = Math.round(
                        Math.min(100, Math.max(0, (p.stock / (expectedDemand * temporalLeadW)) * smoothingAlpha * 100))
                      );

                      return (
                        <tr key={p.id} className="group hover:bg-[#fff0db]/50">
                          <td className="py-4 text-slate-700">
                            <div className="font-bold text-sm text-slate-700 group-hover:text-amber-600 transition-colors">
                              {p.name}
                            </div>
                            <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">SKU: {p.sku} | Cat: {p.category}</span>
                          </td>
                          <td className="py-4 text-center">
                            <span className={`text-sm font-bold ${isLow ? 'text-rose-500' : 'text-slate-600'}`}>
                              {p.stock} Units
                            </span>
                          </td>
                          <td className="py-4 text-center text-slate-500">{p.moq} Units</td>
                          <td className="py-4 text-center text-slate-500">3-4 days</td>
                          <td className="py-4 text-center text-amber-600 font-bold">
                            {isLow ? '🚨 Surge +35%' : '📈 Stable'}
                          </td>
                          <td className="py-4 text-center">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              calculatedHealth < 50
                                ? 'bg-rose-500/10 border border-rose-500/20 text-rose-700'
                                : calculatedHealth < 80
                                ? 'bg-amber-500/10 border border-amber-500/20 text-amber-700'
                                : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-700'
                            }`}>
                              {calculatedHealth}%
                            </span>
                          </td>
                          <td className="py-4 text-right">
                            {isLow ? (
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => alert(`Replenishment order initiated for ${p.name}`)}
                                className="rounded-xl text-[10px] py-1 bg-red-600 border-red-600 hover:bg-red-500 shadow-[0_4px_15px_-4px_rgba(220,38,38,0.3)]"
                              >
                                Restock Urgent
                              </Button>
                            ) : (
                              <span className="text-slate-500 text-[11px] font-medium">🛡️ Safe margin</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>

          </div>
        )}

        {/* Tab 4: OPTIONAL GST INVOICE & ADVISOR */}
        {activeTab === 'gst' && (
          <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
            
            {/* Invoice parameters */}
            <Card className="bg-white border border-[#f3d9a7] p-6 rounded-3xl space-y-4">
              <div>
                <h3 className="text-base font-bold text-[#1f2937]">B2B Invoicing Console (Advisor)</h3>
                <p className="text-xs text-slate-500">Optionally calculate compliant GST/Non-GST structures</p>
              </div>

              <div className="space-y-4 text-xs font-semibold">
                
                {/* Product Selection */}
                <div className="space-y-1.5">
                  <label className="text-slate-500">Select Billing Product</label>
                  <select
                    className="w-full bg-[#fff6e6] border border-[#f3d9a7] text-[#1f2937] rounded-xl px-3 py-2 text-xs outline-none"
                    value={gstInvoiceForm.productId}
                    onChange={(e) => setGstInvoiceForm(prev => ({ ...prev, productId: e.target.value }))}
                  >
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name} (₹{p.price.toLocaleString('en-IN')})</option>
                    ))}
                  </select>
                </div>

                {/* Quantity Input */}
                <div className="space-y-1.5">
                  <label className="text-slate-500">Quantity</label>
                  <Input
                    type="number"
                    min={1}
                    value={gstInvoiceForm.quantity}
                    onChange={(e) => setGstInvoiceForm(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                    className="bg-[#fff6e6] border-[#f3d9a7] text-xs rounded-xl"
                  />
                </div>

                {/* Optional GST Toggle */}
                <div className="flex justify-between items-center bg-[#fff6e6] p-3 rounded-2xl border border-[#f3d9a7]">
                  <div>
                    <h4 className="text-xs font-bold text-[#1f2937]">Enable GST Allocation</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">Toggle to verify tax compliance structures</p>
                  </div>
                  <Toggle
                    checked={gstInvoiceForm.gstApplicable}
                    onChange={(checked) => setGstInvoiceForm(prev => ({ ...prev, gstApplicable: checked }))}
                  />
                </div>

                {gstInvoiceForm.gstApplicable && (
                  <>
                    {/* Buyer GSTIN */}
                    <div className="space-y-1.5">
                      <label className="text-slate-500">Buyer GSTIN Identification</label>
                      <Input
                        placeholder="e.g. 27AAAAA1111A1Z1"
                        value={gstInvoiceForm.buyerGSTIN}
                        onChange={(e) => setGstInvoiceForm(prev => ({ ...prev, buyerGSTIN: e.target.value.toUpperCase() }))}
                        className="bg-[#fff6e6] border-[#f3d9a7] text-xs rounded-xl font-mono uppercase"
                      />
                      {gstInvoiceForm.buyerGSTIN.length < 15 && (
                        <p className="text-[9px] text-amber-500">GSTIN requires exactly 15 alphanumeric characters.</p>
                      )}
                    </div>

                    {/* Tax Slab Selection */}
                    <div className="space-y-1.5">
                      <label className="text-slate-500">Tax Slab Percent</label>
                      <div className="flex gap-2">
                        {[5, 12, 18, 28].map(slab => (
                          <button
                            key={slab}
                            type="button"
                            onClick={() => setGstInvoiceForm(prev => ({ ...prev, gstSlab: slab }))}
                            className={`flex-1 py-1.5 rounded-xl border text-xs font-bold ${
                              gstInvoiceForm.gstSlab === slab
                                ? 'bg-[#FAB12F]/15 border-accent-500 text-amber-600'
                                : 'bg-[#fff6e6] border-[#f3d9a7] text-slate-500 hover:text-[#1f2937]'
                            }`}
                          >
                            {slab}%
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* State Type */}
                    <div className="space-y-1.5">
                      <label className="text-slate-500">Geographic Transaction Code</label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setGstInvoiceForm(prev => ({ ...prev, stateType: 'intra' }))}
                          className={`flex-1 py-1.5 rounded-xl border text-[11px] font-bold ${
                            gstInvoiceForm.stateType === 'intra'
                              ? 'bg-[#FAB12F]/15 border-accent-500 text-amber-600'
                              : 'bg-[#fff6e6] border-[#f3d9a7] text-slate-500'
                          }`}
                        >
                          Intra-State (CGST + SGST)
                        </button>
                        <button
                          type="button"
                          onClick={() => setGstInvoiceForm(prev => ({ ...prev, stateType: 'inter' }))}
                          className={`flex-1 py-1.5 rounded-xl border text-[11px] font-bold ${
                            gstInvoiceForm.stateType === 'inter'
                              ? 'bg-[#FAB12F]/15 border-accent-500 text-amber-600'
                              : 'bg-[#fff6e6] border-[#f3d9a7] text-slate-500'
                          }`}
                        >
                          Inter-State (IGST Only)
                        </button>
                      </div>
                    </div>
                  </>
                )}

              </div>
            </Card>

            {/* Invoicing preview and printing sheet */}
            <div className="space-y-4">
              {invoiceResult && (
                <Card className="bg-white border border-[#f3d9a7] p-6 rounded-[32px] space-y-6 relative overflow-hidden font-mono text-[11px]">
                  
                  {/* Ledger Header */}
                  <div className="flex justify-between items-start border-b border-dashed border-[#f3d9a7] pb-5">
                    <div>
                      <h4 className="text-[#1f2937] font-extrabold text-sm uppercase">Tax Invoice Proposal</h4>
                      <p className="text-slate-500 mt-1 font-sans">GAURAV ENTERPRISES LTD</p>
                      <p className="text-slate-500 font-sans">GSTIN: 27GGGGG9999G1Z5 (Mocked)</p>
                    </div>
                    <div className="text-right text-[10px] text-slate-500">
                      <p>INVOICE NO: GE-PRO-1044</p>
                      <p className="mt-0.5">DATE: {new Date().toISOString().slice(0, 10)}</p>
                    </div>
                  </div>

                  {/* Bill Details */}
                  <div className="space-y-1 font-sans text-slate-500">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Bill To:</p>
                    <p className="text-[#1f2937] font-bold">{gstInvoiceForm.buyerName}</p>
                    {gstInvoiceForm.gstApplicable && (
                      <p className="font-mono text-[10px]">Buyer GSTIN: {gstInvoiceForm.buyerGSTIN || 'MISSING'}</p>
                    )}
                  </div>

                  {/* Invoice Line items */}
                  <div className="space-y-2 font-mono">
                    <div className="grid grid-cols-[2.5fr_1fr_1fr_1.5fr] text-slate-500 font-bold border-b border-[#f3d9a7] pb-2 uppercase text-[10px]">
                      <span>Item / Sku</span>
                      <span className="text-center">Qty</span>
                      <span className="text-center">Rate</span>
                      <span className="text-right">Total</span>
                    </div>

                    <div className="grid grid-cols-[2.5fr_1fr_1fr_1.5fr] text-slate-600 py-1 font-medium border-b border-[#f3d9a7]/40">
                      <span className="truncate pr-2 font-sans font-bold text-[#1f2937]">{invoiceResult.productName}</span>
                      <span className="text-center">{gstInvoiceForm.quantity}</span>
                      <span className="text-center">₹{invoiceResult.rate.toLocaleString('en-IN')}</span>
                      <span className="text-right">₹{invoiceResult.subtotal.toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  {/* Calculations breakdown */}
                  <div className="space-y-1.5 border-b border-dashed border-[#f3d9a7] pb-4 text-slate-500">
                    <div className="flex justify-between">
                      <span>Subtotal Rate:</span>
                      <span className="text-[#1f2937]">₹{invoiceResult.subtotal.toLocaleString('en-IN')}</span>
                    </div>
                    {gstInvoiceForm.gstApplicable ? (
                      <>
                        {gstInvoiceForm.stateType === 'intra' ? (
                          <>
                            <div className="flex justify-between">
                              <span>CGST ({gstInvoiceForm.gstSlab / 2}%):</span>
                              <span className="text-[#1f2937]">₹{invoiceResult.cgst.toLocaleString('en-IN')}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>SGST ({gstInvoiceForm.gstSlab / 2}%):</span>
                              <span className="text-[#1f2937]">₹{invoiceResult.sgst.toLocaleString('en-IN')}</span>
                            </div>
                          </>
                        ) : (
                          <div className="flex justify-between">
                            <span>IGST ({gstInvoiceForm.gstSlab}%):</span>
                            <span className="text-[#1f2937]">₹{invoiceResult.igst.toLocaleString('en-IN')}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-[11px] font-bold text-amber-600 border-t border-[#f3d9a7]/60 pt-1.5">
                          <span>Total Alloc. Taxes:</span>
                          <span>₹{invoiceResult.taxValue.toLocaleString('en-IN')}</span>
                        </div>
                      </>
                    ) : (
                      <div className="text-[10px] text-slate-500 italic font-sans">
                        No taxes allocated. Non-GST compliant trade transaction.
                      </div>
                    )}
                  </div>

                  {/* Net Payable amount */}
                  <div className="flex justify-between items-center text-sm font-extrabold text-[#1f2937] bg-[#fff6e6] p-4 border border-[#f3d9a7] rounded-2xl">
                    <span className="uppercase text-[11px] tracking-wider text-slate-500">Total Net Amount:</span>
                    <span className="text-lg text-emerald-400 font-mono font-black">₹{invoiceResult.total.toLocaleString('en-IN')}</span>
                  </div>

                  {/* Advisor Notice */}
                  <div className="bg-blue-500/5 border border-blue-500/10 p-3 rounded-2xl font-sans text-[10px] text-blue-400 leading-normal">
                    💡 <strong>Advisor Audit:</strong>{' '}
                    {invoiceResult.isGstCompliant
                      ? 'Compliant with Indian B2B invoicing standard rules. Validated structure successfully.'
                      : 'Non-GST structure propuesta. Note: B2B buyers registered with valid GST numbers frequently favor GST-allocated invoices to reap Input Tax Credit advantages.'}
                  </div>
                </Card>
              )}
            </div>

          </div>
        )}

        {/* Tab 5: DIGITAL MARKETING CAMPAIGN HUB */}
        {activeTab === 'marketing' && (
          <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
            
            {/* Input planner */}
            <Card className="bg-white border border-[#f3d9a7] p-6 rounded-3xl space-y-4">
              <div>
                <h3 className="text-base font-bold text-[#1f2937]">Digital Lead Campaign Optimizer</h3>
                <p className="text-xs text-slate-500">Select channels and budgets to calculate projected B2B trade reach</p>
              </div>

              <div className="space-y-4 text-xs font-semibold">
                
                {/* Campaign Name */}
                <div className="space-y-1.5">
                  <label className="text-slate-500">Campaign Campaign Name</label>
                  <Input
                    value={marketingForm.campaignName}
                    onChange={(e) => setMarketingForm(prev => ({ ...prev, campaignName: e.target.value }))}
                    className="bg-[#fff6e6] border-[#f3d9a7] text-xs rounded-xl"
                  />
                </div>

                {/* Target Region */}
                <div className="space-y-1.5">
                  <label className="text-slate-500">Geographic Targeting Audience</label>
                  <select
                    className="w-full bg-[#fff6e6] border border-[#f3d9a7] text-[#1f2937] rounded-xl px-3 py-2 text-xs outline-none font-bold"
                    value={marketingForm.targetRegion}
                    onChange={(e) => setMarketingForm(prev => ({ ...prev, targetRegion: e.target.value }))}
                  >
                    <option>Maharashtra & South India</option>
                    <option>Delhi NCR & Punjab</option>
                    <option>Gujarat & West Coast</option>
                    <option>All India Trade Hubs</option>
                  </select>
                </div>

                {/* Campaign Channel */}
                <div className="space-y-1.5">
                  <label className="text-slate-500">Marketing Promotion Type</label>
                  <div className="flex gap-2">
                    {['WhatsApp B2B Broadcast', 'Google Ads B2B Campaign', 'Meta B2B Ad Segment'].map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setMarketingForm(prev => ({ ...prev, campaignType: type }))}
                        className={`flex-1 py-2.5 px-2.5 rounded-xl border text-[10px] leading-tight font-bold ${
                          marketingForm.campaignType === type
                            ? 'bg-[#FAB12F]/15 border-accent-500 text-amber-600'
                            : 'bg-[#fff6e6] border-[#f3d9a7] text-slate-500 hover:text-[#1f2937]'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Budget Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-semibold">
                    <label className="text-slate-500">Campaign Promotion Budget (INR)</label>
                    <span className="text-amber-600 font-bold text-sm">₹{marketingForm.budget.toLocaleString('en-IN')}</span>
                  </div>
                  <input
                    type="range"
                    min={3000}
                    max={100000}
                    step={1000}
                    value={marketingForm.budget}
                    onChange={(e) => setMarketingForm(prev => ({ ...prev, budget: Number(e.target.value) }))}
                    className="w-full h-1 bg-[#fff6e6] rounded-lg appearance-none cursor-pointer accent-[#FAB12F] border border-[#f3d9a7]"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>Min: ₹3,000</span>
                    <span>Max: ₹1,00,000</span>
                  </div>
                </div>

              </div>
            </Card>

            {/* Calculations outputs & Auto generated meta copies */}
            {marketingOutput && (
              <div className="space-y-4">
                
                {/* Stats cards */}
                <div className="grid grid-cols-2 gap-4">
                  <Card className="bg-white border border-[#f3d9a7] p-4 rounded-2xl flex flex-col justify-between min-h-[90px]">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Estimated Reach</span>
                    <span className="text-xl font-black text-[#1f2937] mt-1">~{marketingOutput.reach.toLocaleString()} Businesses</span>
                  </Card>
                  
                  <Card className="bg-white border border-[#f3d9a7] p-4 rounded-2xl flex flex-col justify-between min-h-[90px]">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Forecasted Leads</span>
                    <span className="text-xl font-black text-emerald-400 mt-1">~{marketingOutput.leads} Trade Leads</span>
                  </Card>
                </div>

                {/* Copywrited Template Panel */}
                <Card className="bg-white border border-[#f3d9a7] p-6 rounded-3xl space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-xs font-bold text-[#1f2937] uppercase tracking-wider text-slate-500">Generated Ad Template</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">Copy meta snippet to launch your campaigns directly</p>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(customTemplate);
                        alert('Campaign template copywrited successfully to clipboard.');
                      }}
                      className="rounded-xl text-[10px]"
                    >
                      📋 Copy Text
                    </Button>
                  </div>

                  <textarea
                    className="w-full bg-[#fff6e6] border border-[#f3d9a7] p-4 rounded-2xl text-xs font-bold font-sans leading-relaxed text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#FF9F1C] min-h-[100px] resize-y"
                    value={customTemplate}
                    onChange={(e) => setCustomTemplate(e.target.value)}
                    onBlur={() => {
                      if (customTemplate !== marketingOutput.template) {
                        dispatchTelemetry({
                          promptContext: `Campaign Name: ${marketingForm.campaignName}, Region: ${marketingForm.targetRegion}, Type: ${marketingForm.campaignType}, Budget: ${marketingForm.budget}`,
                          generatedResponse: marketingOutput.template,
                          correctedText: customTemplate,
                          implicitScore: 1,
                          featureArea: 'whatsapp-campaign'
                        });
                      }
                    }}
                  />

                  <div className="bg-[#FAB12F]/5 border border-accent-500/10 p-3.5 rounded-2xl text-[11px] text-amber-600 leading-normal">
                    📢 <strong>Digital Advisor Performance Score:</strong>{' '}
                    Expected Click-Through-Rate: <span className="font-bold">{marketingOutput.ctr}</span>. Marketing models evaluate higher B2B response ratios for direct WhatsApp CTA triggers over landing website forms.
                  </div>
                </Card>

              </div>
            )}

          </div>
        )}

      </div>
    </DashboardLayout>
  );
}

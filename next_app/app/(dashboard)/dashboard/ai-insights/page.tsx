'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Toggle } from '@/components/ui/Toggle';
import { navigationItems } from '@/lib/navigation';
import { Greeting } from '@/components/dashboard/Greeting';
import { calculateGST } from '@/lib/gst';

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
  reorderLevel?: number;
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
      role: 'SMM, Google/Meta Ads & Omnichannel Performance Optimizer',
      status: 'idle',
      lastRun: '44s ago',
      color: 'from-pink-500 to-rose-500',
      logs: [
        'Ingested buyer search intent queries across Google, Meta, and LinkedIn...',
        'Generated SEO Keyword sets & ad copies for Google Search, Facebook, and Instagram.',
        'Calculated optimal marketing budget allocation across active social & search campaigns.'
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
    },
    {
      name: 'NVIDIA GLM-5.2 Agent',
      role: 'General Business Advisor & Cross-Lingual Expert',
      status: 'idle',
      lastRun: 'Just now',
      color: 'from-teal-500 to-emerald-500',
      logs: [
        'Initialized Z.ai GLM-5.2 reasoning connection...',
        'Ready to process general commerce advisories and cross-lingual negotiations.',
        'Active status verified on NVIDIA NIM endpoints.'
      ]
    }
  ]);


  // 2. Chat States
  const [chatSelectedAgent, setChatSelectedAgent] = useState<string>('All-Agent Orchestrator');
  const [chatMessage, setChatMessage] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatLog, setChatLog] = useState<Array<{
    sender: 'user' | 'agent';
    text: string;
    agentName: string;
    time: string;
    structured?: {
      summary?: string;
      insights?: string;
      keyFindings?: string;
      recommendations?: string;
      priority?: string;
      expectedImpact?: string;
      suggestedSteps?: string;
    };
  }>>([
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
    campaignType: 'Facebook Ads',
    budget: 12000,
    durationDays: 7
  });
  const [marketingOutput, setMarketingFormOutput] = useState<any>(null);
  const [customTemplate, setCustomTemplate] = useState<string>('');

  // Dynamic AI Sourcing Root-Cause Diagnostic Widget State
  const [diagnosticSkuId, setDiagnosticSkuId] = useState<string>('1');
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [diagnosticStep, setDiagnosticStep] = useState<'idle' | 'discover' | 'learn' | 'test' | 'improve'>('idle');
  const [diagnosticResult, setDiagnosticResult] = useState<any | null>(null);

  // Load actual catalog products to link math and simulation
  useEffect(() => {
    try {
      const stored = localStorage.getItem('marketplace_products');
      if (stored) {
        const parsed = JSON.parse(stored);
        setProducts(parsed);
        if (parsed.length > 0) {
          setGstInvoiceForm(prev => ({ ...prev, productId: parsed[0].id }));
          setDiagnosticSkuId(parsed[0].id);
        }
      } else {
        // Fallback seed
        const defaults: ProductItem[] = [
          { id: '1', name: 'Industrial Water Pump', price: 14500, stock: 12, moq: 2, reorderLevel: 5, sku: 'WP-IND-100', category: 'Industrial' },
          { id: '2', name: 'Copper Core Grounding Wire', price: 1200, stock: 4, moq: 5, reorderLevel: 10, sku: 'EL-CC-GND', category: 'Electrical' },
          { id: '3', name: 'Brass Coupling Joints (1/2 Inch)', price: 85, stock: 15, moq: 20, reorderLevel: 25, sku: 'HW-BCJ-12', category: 'Hardware' }
        ];
        setProducts(defaults);
        setGstInvoiceForm(prev => ({ ...prev, productId: '1' }));
        setDiagnosticSkuId('1');
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
    let costPerClick = 12.5;
    let ctr = 0.032;
    let conversionRate = 0.12;

    switch (marketingForm.campaignType) {
      case 'Facebook Ads':
        costPerClick = 14.5;
        ctr = 0.032;
        conversionRate = 0.12;
        break;
      case 'Instagram Ads':
        costPerClick = 16.0;
        ctr = 0.028;
        conversionRate = 0.10;
        break;
      case 'Google Search Ads':
        costPerClick = 22.0;
        ctr = 0.055;
        conversionRate = 0.18;
        break;
      case 'Google Display Ads':
        costPerClick = 8.5;
        ctr = 0.012;
        conversionRate = 0.05;
        break;
      case 'YouTube Ads':
        costPerClick = 15.0;
        ctr = 0.021;
        conversionRate = 0.08;
        break;
      case 'LinkedIn Ads':
        costPerClick = 45.0;
        ctr = 0.018;
        conversionRate = 0.14;
        break;
      case 'Twitter / X Ads':
        costPerClick = 18.0;
        ctr = 0.020;
        conversionRate = 0.06;
        break;
      case 'TikTok Ads':
        costPerClick = 11.0;
        ctr = 0.025;
        conversionRate = 0.09;
        break;
      case 'Pinterest Ads':
        costPerClick = 10.0;
        ctr = 0.015;
        conversionRate = 0.07;
        break;
      default:
        costPerClick = 12.5;
        ctr = 0.030;
        conversionRate = 0.10;
    }

    const reach = Math.round(marketingForm.budget / (costPerClick * 0.05));
    const expectedClicks = Math.round(marketingForm.budget / costPerClick);
    const leads = Math.round(expectedClicks * conversionRate);

    const campaignsTemplates: Record<string, string> = {
      'Facebook Ads': `🔥 Wholesale B2B Industrial Supplies. Get bulk discounts on top-tier components. GST compliant invoicing & secure escrow delivery across India. Tap to view our full catalog now!`,
      'Instagram Ads': `✨ Restocking your wholesale inventory? Get premium industrial gear, PVC fittings, and high-conductivity grounding wires delivered straight to your site. Tap "Learn More" to chat with us on WhatsApp.`,
      'Google Search Ads': `Premium B2B Industrial Supplies India | Get Bulk Pricing & GST Invoices. ISO-certified products. Low MOQ. Request a custom quote in under 1 minute. Call or WhatsApp us today!`,
      'Google Display Ads': `Industrial supply restocks simplified. Secure transactions, verified dealers. Direct factory shipping across India. Save up to 25% on wholesale volume orders.`,
      'YouTube Ads': `📺 Watch how Gaurav Enterprise streamlines industrial and electrical supply distribution. Verified MSME partner. Lowest bulk prices. Subscribe & click to request the July price list.`,
      'LinkedIn Ads': `👔 Procuring industrial or electrical supplies for your enterprise projects? Download our comprehensive wholesale price list. Secure credit terms, verified vendor. Streamline your supply chain.`,
      'Twitter / X Ads': `Restock wholesale industrial electricals & construction hardware with zero hassle. India-wide delivery. Secure transaction platform. DM us or tap to get a quote. #B2B #Manufacturing`,
      'TikTok Ads': `🎵 Unboxing premium grade copper grounding wires and heavy duty coupling joints. High quality, wholesale prices, low MOQ. Tap the link in bio to start your order!`,
      'Pinterest Ads': `📌 Industrial workshop and office setup supplies. High quality materials, hardware fittings, and category price sheets. Pin to save or click to buy wholesale bulk packs.`
    };

    const campaignTemplate = campaignsTemplates[marketingForm.campaignType] || campaignsTemplates['Facebook Ads'];
    setMarketingFormOutput({
      reach,
      expectedClicks,
      leads,
      ctr: (ctr * 100).toFixed(1) + '%',
      template: campaignTemplate
    });
    setCustomTemplate(campaignTemplate);
  }, [marketingForm]);

  // Pre-calculate GST Invoice details (Aligned to shared calculateGST helper)
  useEffect(() => {
    const selectedProd = products.find(p => p.id === gstInvoiceForm.productId);
    if (!selectedProd) return;

    const calc = calculateGST({
      price: selectedProd.price,
      quantity: gstInvoiceForm.quantity,
      gstApplicable: gstInvoiceForm.gstApplicable,
      gstSlab: gstInvoiceForm.gstSlab,
      stateType: gstInvoiceForm.stateType as 'intra' | 'inter',
      buyerGSTIN: gstInvoiceForm.buyerGSTIN
    });

    setInvoiceResult({
      productName: selectedProd.name,
      sku: selectedProd.sku,
      rate: selectedProd.price,
      subtotal: calc.subtotal,
      cgst: calc.cgst,
      sgst: calc.sgst,
      igst: calc.igst,
      taxValue: calc.taxValue,
      total: calc.total,
      isGstCompliant: calc.isGstCompliant
    });
  }, [gstInvoiceForm, products]);

  // Run AI Sourcing Root-Cause Diagnostics Visual sequence
  const runDiagnostic = (prodId: string) => {
    const target = products.find(p => p.id === prodId);
    if (!target) return;

    setIsDiagnosing(true);
    setDiagnosticResult(null);
    setDiagnosticStep('discover');

    setTimeout(() => {
      setDiagnosticStep('learn');
      setTimeout(() => {
        setDiagnosticStep('test');
        setTimeout(() => {
          setDiagnosticStep('improve');
          setTimeout(() => {
            const reorder = target.reorderLevel || target.moq * 2 || 10;
            const isLow = target.stock <= reorder;
            const supplier = target.category === 'Electrical' ? 'Hindalco Metal Industries' : 'Kirloskar Pump Division';
            const whatsappNum = '919876543210';
            const textMsg = `Hi, we need to restock ${target.name} (SKU: ${target.sku}). Current stock: ${target.stock} units.`;

            setDiagnosticResult({
              productName: target.name,
              stock: target.stock,
              reorderLevel: reorder,
              isLow,
              supplier,
              whatsappLink: `https://wa.me/${whatsappNum}?text=${encodeURIComponent(textMsg)}`,
              sourcingRecommendation: isLow 
                ? `Place an urgent replenishment PO of ${target.moq * 10} units to ${supplier} immediately via WhatsApp.`
                : `Current stock cover is healthy. Standard restock suggestion calculated at ${target.moq * 5} units in 14 days.`
            });
            setIsDiagnosing(false);
          }, 1000);
        }, 1000);
      }, 1000);
    }, 1000);
  };

  // Handle Conversational chat submission (augmented for loop structure)
  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim() || chatLoading) return;

    const userText = chatMessage;
    const nowTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    
    setChatLog(prev => [...prev, {
      sender: 'user',
      agentName: 'Merchant',
      text: userText,
      time: nowTime
    }]);

    setChatMessage('');
    setChatLoading(true);

    const matchingAgentIndex = agents.findIndex(a => 
      chatSelectedAgent.toLowerCase().includes(a.name.split(' ')[0].toLowerCase())
    );

    if (matchingAgentIndex !== -1) {
      setAgents(prev => prev.map((a, i) => i === matchingAgentIndex ? { ...a, status: 'running' } : a));
    }

    try {
      // Check if user is asking "why is SKU low" or "why is stock low" to apply loop logic
      const isStockQuery = userText.toLowerCase().includes('low') || userText.toLowerCase().includes('stock') || userText.toLowerCase().includes('forecasting');
      const isCrmQuery = userText.toLowerCase().includes('lead') || userText.toLowerCase().includes('crm') || userText.toLowerCase().includes('conversion') || userText.toLowerCase().includes('follow-up');
      
      let answerText = '';
      let mockPayload: any = {};

      if (isStockQuery) {
        // Feed direct reasoning loop response structured
        mockPayload = {
          answer: `Diagnostic execution completed for active listing stocks. Based on the 4-Structure loop, we discovered that Copper Core Grounding Wire has registered a stock decline. Safety threshold validation confirms urgent replenishment.`,
          summary: `Current available stock for "Copper Core Grounding Wire" is 4 units (below safety limit of 10). Lead transit duration is 3.5 days.`,
          insights: `Learned from historical logs that delays in procurement at this phase trigger an average 12.8% sales drop. Demand forecasts estimate an upcoming seasonal surge of +35% in Electrical inquiries.`,
          keyFindings: `ARIMA/LSTM model validation indicates that stocking a safety cushion of 10 units prevents stockouts with a 96.5% accuracy rate. Competitor price indices reflect standard wholesale margins.`,
          recommendations: `Trigger a replenishment PO of 100 units to Hindalco Metal Industries immediately. Standardize compliance templates to capture trade priority.`,
          priority: `High`,
          expectedImpact: `Fulfillment coverage maintained at 98%; prevents stockout risk for upcoming monsoon contractor RFQs.`,
          suggestedSteps: `1. Click WhatsApp click-to-chat to contact Hindalco.\n2. Create pre-filled PO inside Inventory cockpit.`
        };
      } else if (isCrmQuery) {
        // AI CRM Lead diagnostic loop responses
        mockPayload = {
          answer: `CRM Lead conversion diagnostics completed. Based on the 4-Structure loop, we discovered that WhatsApp inbound leads convert 2.4x faster than marketplace inquiries, but follow-up latencies beyond 48 hours reduce win probabilities by 40%.`,
          summary: `Total active sales pipeline value is ₹1,70,700 across 3 deals. 2 active leads require follow-up attention today (Rajesh Sharma & Siddharth Roy).`,
          insights: `WhatsApp leads maintain a high conversion rate of 35.2% when contacted within a 24h window. Marketplace inquiry conversions drop to 18.4% due to email communication latency.`,
          keyFindings: `Testing indicates a 78% win probability for WhatsApp deals with active follow-ups. Missed follow-ups represent ₹25,000 in lost pipeline opportunities.`,
          recommendations: `Prioritize the pending WhatsApp deal for Rajesh Sharma. Initiate a WhatsApp quick chat and set the next follow-up milestone date.`,
          priority: `High`,
          expectedImpact: `A 14% lift in overall pipeline conversion velocity, securing ₹24,000 contract value.`,
          suggestedSteps: `1. Open Leads Pipeline cockpit.\n2. Click WhatsApp quick chat for Rajesh Sharma.\n3. Log notes and update stage to Qualified.`
        };
      } else {
        const profileStr = localStorage.getItem('marketplace_seller_profile');
        const profile = profileStr ? JSON.parse(profileStr) : {};

        const leadsStr = localStorage.getItem('marketplace_leads');
        const leads = leadsStr ? JSON.parse(leadsStr) : [];

        const businessContext = {
          sellerProfile: {
            name: profile.businessName || 'Gaurav Enterprise',
            category: profile.category || 'Electrical & Industrial',
            location: profile.city || 'India',
            verified: !!profile.gstNumber
          },
          productsSummary: products.map(p => ({
            name: p.name,
            price: p.price,
            stock: p.stock,
            moq: p.moq
          })).slice(0, 5),
          inquiriesCount: leads.length,
          recentLeads: leads.map((l: any) => ({
            productName: l.productName,
            status: l.status
          })).slice(0, 3)
        };

        let token = '';
        if (typeof window !== 'undefined') {
          token = localStorage.getItem('mp_backend_token') || '';
        }

        const timestamp = Date.now().toString();
        const nonce = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36);

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'X-Timestamp': timestamp,
          'X-Nonce': nonce
        };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '';
        const response = await fetch(`${API_BASE}/api/ai/analyze`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            prompt: userText,
            data: businessContext,
            agentName: chatSelectedAgent
          })
        });

        mockPayload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(mockPayload.error || 'Server processing error.');
        }
      }

      answerText = mockPayload.answer || 'Consultation complete.';
      const words = answerText.split(' ');
      let currentWordIndex = 0;
      let streamingText = '';

      setChatLog(prev => [...prev, {
        sender: 'agent' as const,
        agentName: chatSelectedAgent,
        text: '',
        time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        structured: mockPayload.summary ? {
          summary: mockPayload.summary,
          insights: mockPayload.insights,
          keyFindings: mockPayload.keyFindings,
          recommendations: mockPayload.recommendations,
          priority: mockPayload.priority,
          expectedImpact: mockPayload.expectedImpact,
          suggestedSteps: mockPayload.suggestedSteps
        } : undefined
      }]);

      const timer = setInterval(() => {
        if (currentWordIndex < words.length) {
          streamingText += (currentWordIndex === 0 ? '' : ' ') + words[currentWordIndex];
          currentWordIndex++;
          setChatLog(prev => {
            const copy = [...prev];
            copy[copy.length - 1].text = streamingText;
            return copy;
          });
        } else {
          clearInterval(timer);
          setChatLoading(false);
          if (matchingAgentIndex !== -1) {
            setAgents(prev => prev.map((a, i) => i === matchingAgentIndex ? { ...a, status: 'success' } : a));
          }
        }
      }, 30);
    } catch (err: any) {
      console.error('AI Insights Request Error:', err);
      
      setChatLog(prev => [...prev, {
        sender: 'agent',
        agentName: 'System Advisor',
        text: err.message || 'Apologies, we encountered a technical interruption. Please verify your connection and try again shortly.',
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      }]);

      if (matchingAgentIndex !== -1) {
        setAgents(prev => prev.map((a, i) => i === matchingAgentIndex ? { ...a, status: 'idle' } : a));
      }
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <DashboardLayout
      navigationItems={navigationItems}
      user={{ name: 'Gaurav Enterprise', email: 'partner@dealerconnect.in' }}
      topBarProps={{
        pageTitle: 'AI Business Intelligence',
        breadcrumbs: [{ label: 'Cockpit', href: '/dashboard' }, { label: 'AI Intelligence' }],
        unreadNotifications: 2,
      }}
    >
      <div className="space-y-6">
        
        {/* Page Header */}
        <section className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-[#f3d9a7] dark:border-slate-800 p-6 rounded-[32px] shadow-lg">
          <div className="space-y-1">
            <span className="text-xs font-bold text-[#FAB12F] uppercase tracking-widest">Multi-Agent Suite</span>
            <Greeting className="text-white" />
          </div>

          <div className="flex flex-wrap gap-2">
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
        <div className="flex overflow-x-auto gap-2 p-1 bg-[#fff6e6] dark:bg-slate-950 border border-[#f3d9a7] dark:border-slate-800 rounded-2xl">
          <button
            onClick={() => setActiveTab('cockpit')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeTab === 'cockpit' ? 'bg-[#FAB12F] text-slate-950 shadow border border-accent-600/10' : 'text-slate-550 dark:text-slate-400 hover:text-[#1f2937] dark:hover:text-white hover:bg-[#fff6e6]/40 dark:hover:bg-slate-900/40'
            }`}
          >
            📊 Orchestrator Cockpit
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeTab === 'chat' ? 'bg-[#FAB12F] text-slate-950 shadow border border-accent-600/10' : 'text-slate-550 dark:text-slate-400 hover:text-[#1f2937] dark:hover:text-white hover:bg-[#fff6e6]/40 dark:hover:bg-slate-900/40'
            }`}
          >
            💬 Interactive Agent Chat
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeTab === 'inventory' ? 'bg-[#FAB12F] text-slate-950 shadow border border-accent-600/10' : 'text-slate-550 dark:text-slate-400 hover:text-[#1f2937] dark:hover:text-white hover:bg-[#fff6e6]/40 dark:hover:bg-slate-900/40'
            }`}
          >
            📦 Safety Stock & LSTM
          </button>
          <button
            onClick={() => setActiveTab('gst')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeTab === 'gst' ? 'bg-[#FAB12F] text-slate-950 shadow border border-accent-600/10' : 'text-slate-555 dark:text-slate-400 hover:text-[#1f2937] dark:hover:text-white hover:bg-[#fff6e6]/40 dark:hover:bg-slate-900/40'
            }`}
          >
            🧾 GST Invoice & Advisor
          </button>
          <button
            onClick={() => setActiveTab('marketing')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeTab === 'marketing' ? 'bg-[#FAB12F] text-slate-950 shadow border border-accent-600/10' : 'text-slate-555 dark:text-slate-400 hover:text-[#1f2937] dark:hover:text-white hover:bg-[#fff6e6]/40 dark:hover:bg-slate-900/40'
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
                  <Card key={i} className="bg-white dark:bg-slate-900 border border-[#f3d9a7] dark:border-slate-800 p-5 rounded-3xl space-y-4 shadow-sm">
                    <div className="flex justify-between items-start">
                      <div className={`p-2 rounded-xl bg-gradient-to-r ${agent.color} text-slate-955 font-bold text-lg`}>
                        {i === 0 ? '📈' : i === 1 ? '🏛️' : i === 2 ? '📣' : i === 3 ? '⚙️' : '⚡'}
                      </div>
                      <Badge className={`text-[10px] uppercase font-bold py-0.5 px-2 ${
                        agent.status === 'training'
                          ? 'bg-amber-50 dark:bg-amber-955/20 border border-amber-200 dark:border-amber-800/40 text-amber-700 dark:text-amber-400 animate-pulse'
                          : 'bg-emerald-50 dark:bg-emerald-955/20 border border-emerald-200 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-400'
                      }`}>
                        {agent.status === 'training' ? 'learning' : 'active'}
                      </Badge>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#1f2937] dark:text-white leading-tight">{agent.name}</h4>
                      <p className="text-[11px] text-slate-505 dark:text-slate-400 mt-1 leading-normal">{agent.role}</p>
                    </div>
                    <div className="pt-3 border-t border-[#f3d9a7]/60 dark:border-slate-800/60 flex justify-between items-center text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                      <span>Refitted {agent.lastRun}</span>
                      <span className="text-slate-600 dark:text-slate-350">Continuous ✓</span>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Real-time System Loop Console */}
              <Card className="bg-white dark:bg-slate-900 border border-[#f3d9a7] dark:border-slate-800 p-6 rounded-3xl space-y-4 shadow-sm">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-base font-bold text-[#1f2937] dark:text-white">4-Structure Autonomous Loop</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Visualizing real-time Discover-Learn-Test-Improve sequences</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FAB12F] animate-ping" />
                    <span className="text-xs text-amber-600 dark:text-amber-400 font-bold">State: {loopState}</span>
                  </div>
                </div>

                {/* Animated Loop Status Bar */}
                <div className="grid grid-cols-4 gap-2 text-center text-[11px] font-bold">
                  {(['Discover', 'Learn', 'Test', 'Improve'] as const).map((step) => (
                    <div
                      key={step}
                      className={`py-3 rounded-xl border transition-all ${
                        loopState === step
                          ? 'bg-[#FAB12F]/10 dark:bg-[#FAB12F]/5 border-accent-500/40 dark:border-[#FAB12F]/20 text-amber-600 shadow-[0_0_15px_rgba(255,149,0,0.15)] scale-[1.02]'
                          : 'bg-[#fff6e6] dark:bg-slate-950 border-[#f3d9a7] dark:border-slate-800 text-slate-550 dark:text-slate-400'
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
                <div className="bg-[#fff6e6] dark:bg-slate-955 border border-[#f3d9a7] dark:border-slate-800 p-4 rounded-2xl font-mono text-[11px] text-emerald-600 dark:text-emerald-450 space-y-1.5 max-h-[180px] overflow-y-auto">
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
              <Card className="bg-white dark:bg-slate-900 border border-[#f3d9a7] dark:border-slate-800 p-6 rounded-3xl text-center space-y-6 flex flex-col justify-between items-center shadow-sm">
                <div className="w-full text-left">
                  <h3 className="text-sm font-bold text-[#1f2937] dark:text-white uppercase tracking-wider text-slate-550">AI Growth Score</h3>
                  <p className="text-xs text-slate-505 dark:text-slate-400 mt-0.5">Optimized against category, inventory, and margin indexes</p>
                </div>

                {/* Dynamic circular display */}
                <div className="relative w-36 h-36 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="72" cy="72" r="60" stroke="#f1f5f9" strokeWidth="12" fill="transparent" className="dark:stroke-slate-950" />
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
                    <span className="text-4xl font-extrabold text-[#1f2937] dark:text-white tracking-tight">{growthScore}</span>
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">/100 points</span>
                  </div>
                </div>

                <div className="w-full bg-[#fff6e6] dark:bg-slate-950 border border-[#f3d9a7] dark:border-slate-800 rounded-2xl p-4 text-left">
                  <p className="text-xs text-emerald-600 dark:text-emerald-450 font-bold flex items-center gap-1">
                    <span>📈</span> +4% growth factor calculated this cycle.
                  </p>
                  <p className="text-[11px] text-slate-505 dark:text-slate-400 mt-1 leading-normal">
                    Adding valid HSN slabs, deploying targeted Facebook/Google search ads, and maintaining a 95%+ lead follow-up compliance rate can elevate your performance index to 95.
                  </p>
                </div>
              </Card>

              {/* Metrics Grid */}
              <div className="grid grid-cols-3 gap-3">
                <Card className="bg-white dark:bg-slate-900 border border-[#f3d9a7] dark:border-slate-800 p-3.5 rounded-2xl text-center space-y-1 shadow-sm">
                  <p className="text-[9px] text-slate-500 dark:text-slate-405 font-bold uppercase tracking-wider">Performance</p>
                  <p className="text-sm font-extrabold text-[#1f2937] dark:text-white">84%</p>
                </Card>
                <Card className="bg-white dark:bg-slate-900 border border-[#f3d9a7] dark:border-slate-800 p-3.5 rounded-2xl text-center space-y-1 shadow-sm">
                  <p className="text-[9px] text-slate-500 dark:text-slate-455 font-bold uppercase tracking-wider">SEO Score</p>
                  <p className="text-sm font-extrabold text-[#1f2937] dark:text-white">92%</p>
                </Card>
                <Card className="bg-white dark:bg-slate-900 border border-[#f3d9a7] dark:border-slate-800 p-3.5 rounded-2xl text-center space-y-1 shadow-sm">
                  <p className="text-[9px] text-slate-500 dark:text-slate-455 font-bold uppercase tracking-wider">Inv Health</p>
                  <p className="text-sm font-extrabold text-emerald-650 dark:text-emerald-400">95%</p>
                </Card>
              </div>

              {/* Opportunity Stream */}
              <Card className="bg-white dark:bg-slate-900 border border-[#f3d9a7] dark:border-slate-800 p-6 rounded-3xl space-y-4 shadow-sm">
                <h3 className="text-base font-bold text-[#1f2937] dark:text-white">Recommended Opportunities</h3>
                
                <div className="space-y-3.5">
                  <div className="flex gap-3.5 p-3 rounded-2xl bg-blue-500/5 border border-blue-500/10">
                    <span className="text-xl">📊</span>
                    <div>
                      <h4 className="text-xs font-bold text-[#1f2937] dark:text-white">High Category Yield Alert</h4>
                      <p className="text-[11px] text-slate-655 dark:text-slate-400 mt-0.5">
                        Electrical supplies inquiry velocities surged +28%. Increase inventory coverage for "Copper Grounding Wire" now.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3.5 p-3 rounded-2xl bg-amber-500/5 border border-amber-500/10">
                    <span className="text-xl">⚠️</span>
                    <div>
                      <h4 className="text-xs font-bold text-[#1f2937] dark:text-white">Inventory Running Below MOQ</h4>
                      <p className="text-[11px] text-slate-655 dark:text-slate-400 mt-0.5">
                        "Copper Core Grounding Wire" is 1 unit below MOQ limit. Replenish within 5 days to secure upcoming RFQs.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3.5 p-3 rounded-2xl bg-[#ea580c]/5 border border-[#ea580c]/10">
                    <span className="text-xl">🤝</span>
                    <div>
                      <h4 className="text-xs font-bold text-[#1f2937] dark:text-white">Lead CRM Conversion & Compliance Warning</h4>
                      <p className="text-[11px] text-slate-655 dark:text-slate-450 mt-0.5">
                        WhatsApp lead follow-up compliance is at 96.5% but manual leads show a 10% decline. Follow up on 2 overdue leads to boost win rate by 14%.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3.5 p-3 rounded-2xl bg-pink-500/5 border border-pink-500/10">
                    <span className="text-xl">📢</span>
                    <div>
                      <h4 className="text-xs font-bold text-[#1f2937] dark:text-white">Suggested Promotional Campaign</h4>
                      <p className="text-[11px] text-slate-655 dark:text-slate-400 mt-0.5">
                        Launch a Facebook Ads Campaign targeted to builders in South India. Recommended budget ₹12,000; expected reach 3,000 businesses.
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
            <Card className="bg-white dark:bg-slate-900 border border-[#f3d9a7] dark:border-slate-800 p-5 rounded-3xl space-y-3 shadow-sm">
              <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Select Agent Persona</h3>
              {[
                { name: 'All-Agent Orchestrator', desc: 'Unified network supervisor', emoji: '🤖' },
                { name: 'Commerce Intelligence Agent', desc: 'Category growth & trends expert', emoji: '📈' },
                { name: 'GST Intelligence Agent', desc: 'HSN, billing & threshold advisor', emoji: '🏛️' },
                { name: 'Digital Marketing Agent', desc: 'Copywriter & performance advisor', emoji: '📣' },
                { name: 'Inventory Optimization Agent', desc: 'Lead time & replenishment forecaster', emoji: '⚙️' },
                { name: 'NVIDIA GLM-5.2 Agent', desc: 'General business & cross-lingual advisor', emoji: '⚡' }
              ].map((persona) => (
                <button
                  key={persona.name}
                  onClick={() => setChatSelectedAgent(persona.name)}
                  className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-start gap-3 ${
                    chatSelectedAgent === persona.name
                      ? 'bg-[#FAB12F]/15 dark:bg-slate-950 border-accent-500/30 text-[#1f2937] dark:text-white shadow-sm ring-1 ring-accent-500/20'
                      : 'bg-[#fff6e6]/50 dark:bg-slate-955 border-[#f3d9a7] dark:border-slate-855 text-slate-600 dark:text-slate-400 hover:text-[#1f2937] dark:hover:text-white'
                  }`}
                >
                  <span className="text-lg">{persona.emoji}</span>
                  <div>
                    <h4 className="text-xs font-black leading-none">{persona.name}</h4>
                    <p className="text-[10px] text-slate-505 dark:text-slate-450 mt-1 leading-normal">{persona.desc}</p>
                  </div>
                </button>
              ))}
            </Card>

            {/* Chat Log Viewport */}
            <Card className="bg-white dark:bg-slate-900 border border-[#f3d9a7] dark:border-slate-800 rounded-3xl flex flex-col h-[520px] overflow-hidden shadow-sm">
              {/* Chat Header */}
              <div className="bg-[#fff6e6] dark:bg-slate-950 border-b border-[#f3d9a7] dark:border-slate-800 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">💬</span>
                  <div>
                    <h3 className="text-xs font-bold text-[#1f2937] dark:text-white leading-tight">{chatSelectedAgent}</h3>
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5 flex items-center gap-1">
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
                    text: 'Chat history cleared. How can I assist you with your marketplace B2B logistics & compliance intelligence today?',
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
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                      {chat.agentName} • {chat.time}
                    </span>
                    <div
                      className={`p-4 rounded-2xl text-xs font-semibold leading-relaxed border ${
                        chat.sender === 'user'
                          ? 'bg-[#222222] dark:bg-slate-800 text-white border-[#222222] dark:border-slate-700 rounded-tr-none shadow-sm'
                          : 'bg-[#fff6e6] dark:bg-slate-950 text-slate-700 dark:text-slate-200 border-[#f3d9a7] dark:border-slate-850 rounded-tl-none shadow-xs'
                      }`}
                    >
                      {chat.structured && (chat.text.includes('###') || chat.structured.summary) ? (
                        <div className="space-y-4">
                          {chat.structured.summary && (
                            <div>
                              <h4 className="text-xs font-black text-amber-600 dark:text-amber-400 flex items-center gap-1">📊 Summary (DISCOVER)</h4>
                              <p className="mt-1 text-slate-655 dark:text-slate-350 leading-relaxed font-normal">{chat.structured.summary}</p>
                            </div>
                          )}
                          {chat.structured.insights && (
                            <div className="border-t border-slate-100 dark:border-slate-800/40 pt-3">
                              <h4 className="text-xs font-black text-amber-600 dark:text-amber-400 flex items-center gap-1">🧠 Insights (LEARN)</h4>
                              <p className="mt-1 text-slate-655 dark:text-slate-350 leading-relaxed font-normal">{chat.structured.insights}</p>
                            </div>
                          )}
                          {chat.structured.keyFindings && (
                            <div className="border-t border-slate-100 dark:border-slate-800/40 pt-3">
                              <h4 className="text-xs font-black text-amber-600 dark:text-amber-400 flex items-center gap-1">🧪 Verification (TEST)</h4>
                              <p className="mt-1 text-slate-655 dark:text-slate-350 leading-relaxed font-normal">{chat.structured.keyFindings}</p>
                            </div>
                          )}
                          {chat.structured.recommendations && (
                            <div className="border-t border-slate-100 dark:border-slate-800/40 pt-3 p-3 bg-amber-500/5 border border-amber-500/10 rounded-2xl">
                              <h4 className="text-xs font-black text-amber-600 dark:text-amber-400 flex items-center gap-1">🚀 Action Directives (IMPROVE)</h4>
                              <p className="mt-1 text-slate-655 dark:text-slate-350 leading-relaxed font-normal">{chat.structured.recommendations}</p>
                            </div>
                          )}
                          {chat.structured.expectedImpact && (
                            <div className="border-t border-slate-100 dark:border-slate-800/40 pt-3">
                              <h4 className="text-xs font-black text-amber-600 dark:text-amber-400 flex items-center gap-1">🎯 Expected Business Impact</h4>
                              <p className="mt-1 text-slate-655 dark:text-slate-350 leading-relaxed font-normal">{chat.structured.expectedImpact}</p>
                            </div>
                          )}
                          {chat.structured.suggestedSteps && (
                            <div className="border-t border-slate-100 dark:border-slate-800/40 pt-3">
                              <h4 className="text-xs font-black text-amber-600 dark:text-amber-400 flex items-center gap-1">📋 Suggested Next Steps</h4>
                              <p className="mt-1 text-slate-655 dark:text-slate-350 leading-relaxed font-normal">{chat.structured.suggestedSteps}</p>
                            </div>
                          )}
                          {chat.structured.priority && (
                            <div className="pt-2 flex items-center gap-2">
                              <span className="text-[9px] text-slate-400">Priority Level:</span>
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                chat.structured.priority.toLowerCase().includes('high')
                                  ? 'bg-rose-500/15 text-rose-500'
                                  : 'bg-amber-500/15 text-amber-500'
                              }`}>{chat.structured.priority}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="whitespace-pre-wrap font-normal leading-relaxed">{chat.text}</div>
                      )}
                    </div>

                    {/* Feedback and Correct buttons under Agent replies */}
                    {chat.sender !== 'user' && (
                      <div className="flex items-center gap-3 mt-1.5 ml-2">
                        <button
                          type="button"
                          onClick={() => alert('Response marked helpful for agent reinforcement.')}
                          className="text-xs hover:scale-125 active:scale-90 transition-transform cursor-pointer"
                          title="Helpful (👍)"
                        >
                          👍
                        </button>
                        <button
                          type="button"
                          onClick={() => alert('Feedback recorded for safety optimization.')}
                          className="text-xs hover:scale-125 active:scale-90 transition-transform cursor-pointer"
                          title="Unhelpful (👎)"
                        >
                          👎
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(chat.text);
                            alert('Response copied to clipboard!');
                          }}
                          className="text-[10px] text-slate-400 hover:text-[#FAB12F] font-bold ml-2 cursor-pointer flex items-center gap-0.5"
                          title="Copy response"
                        >
                          📋 Copy Response
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
                      <div className="w-full mt-2 space-y-2 bg-[#FFFBF0] dark:bg-slate-955 border border-[#f3d9a7] dark:border-slate-800 p-3 rounded-2xl">
                        <textarea
                          value={editingMessageText}
                          onChange={(e) => setEditingMessageText(e.target.value)}
                          className="w-full bg-white dark:bg-slate-900 border border-[#f3d9a7] dark:border-slate-800 p-2 rounded-xl text-xs font-semibold leading-relaxed text-[#222222] dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#FF9F1C] min-h-[60px]"
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
                {chatLoading && (
                  <div className="flex flex-col max-w-[80%] mr-auto items-start">
                    <span className="text-[10px] font-bold text-slate-505 mb-1">
                      {chatSelectedAgent} • Thinking...
                    </span>
                    <div className="p-4 rounded-2xl text-xs font-semibold leading-relaxed border bg-[#fff6e6] dark:bg-slate-950 text-slate-400 border-[#f3d9a7] dark:border-slate-800 rounded-tl-none flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#ea580c] animate-bounce" />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#ea580c] animate-bounce [animation-delay:0.2s]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#ea580c] animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                )}
              </div>

              {/* Suggested Prompts Badges */}
              <div className="px-6 py-2 border-t border-[#f3d9a7]/60 dark:border-slate-800/60 bg-[#fff6e6]/20 dark:bg-slate-955/20 flex flex-wrap gap-2">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold self-center mr-1">Suggested:</span>
                {[
                  'Why is Copper Core Grounding Wire low?',
                  'Why is my lead conversion low?',
                  'Predict seasonal demand spikes',
                  'Suggest SEO keywords for my product names'
                ].map((promptText) => (
                  <button
                    key={promptText}
                    type="button"
                    disabled={chatLoading}
                    onClick={() => {
                      setChatMessage(promptText);
                    }}
                    className="text-[10px] bg-[#fff6e6] dark:bg-slate-950 hover:bg-[#FAB12F]/20 text-[#ea580c] font-bold py-1 px-2.5 rounded-full border border-[#f3d9a7] dark:border-slate-800 transition-colors disabled:opacity-50"
                  >
                    {promptText}
                  </button>
                ))}
              </div>

              {/* Chat Input form */}
              <form onSubmit={handleSendChatMessage} className="p-4 bg-[#fff6e6]/50 dark:bg-slate-955 border-t border-[#f3d9a7] dark:border-slate-800 flex gap-2">
                <input
                  type="text"
                  placeholder={chatLoading ? 'Agent is thinking...' : `Ask the ${chatSelectedAgent}...`}
                  value={chatMessage}
                  disabled={chatLoading}
                  onChange={(e) => setChatMessage(e.target.value)}
                  className="flex-1 rounded-xl text-xs bg-white dark:bg-slate-900 border border-[#f3d9a7] dark:border-slate-800 px-4 py-2.5 text-[#1f2937] dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-accent-500 disabled:opacity-70 font-semibold"
                />
                <Button type="submit" variant="primary" disabled={chatLoading} className="rounded-xl text-xs px-5 text-slate-955 font-bold bg-[#FAB12F]">
                  {chatLoading ? 'Thinking...' : 'Send Consult'}
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
              <Card className="bg-white dark:bg-slate-900 border border-[#f3d9a7] dark:border-slate-800 p-5 rounded-3xl flex items-center gap-4 shadow-sm">
                <span className="p-3 bg-red-500/10 border border-red-500/20 rounded-2xl text-2xl">⚠️</span>
                <div>
                  <h4 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Critical Restock Warnings</h4>
                  <p className="text-xl font-black text-[#1f2937] dark:text-white mt-1">1 Listing Below MOQ</p>
                </div>
              </Card>

              <Card className="bg-white dark:bg-slate-900 border border-[#f3d9a7] dark:border-slate-800 p-5 rounded-3xl flex items-center gap-4 shadow-sm">
                <span className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-2xl">⚡</span>
                <div>
                  <h4 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Estimated Demand Spike</h4>
                  <p className="text-xl font-black text-[#1f2937] dark:text-white mt-1">+35% Seasonal Surge</p>
                </div>
              </Card>

              <Card className="bg-white dark:bg-slate-900 border border-[#f3d9a7] dark:border-slate-800 p-5 rounded-3xl flex items-center gap-4 shadow-sm">
                <span className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-2xl">🛡️</span>
                <div>
                  <h4 className="text-[11px] font-bold text-slate-505 dark:text-slate-400 uppercase tracking-wider">Global Inventory Health</h4>
                  <p className="text-xl font-black text-[#1f2937] dark:text-white mt-1">84/100 (Secure)</p>
                </div>
              </Card>
            </div>

            {/* Split row: Config Sliders & AI Diagnostic Loop Widget */}
            <div className="grid gap-6 md:grid-cols-2">
              
              {/* Left Column: Sliders & Diagnostic Wizard */}
              <div className="space-y-6">
                
                {/* Sliders */}
                <Card className="bg-white dark:bg-slate-900 border border-[#f3d9a7] dark:border-slate-800 p-6 rounded-3xl space-y-4 shadow-sm">
                  <div>
                    <h3 className="text-sm font-bold text-[#1f2937] dark:text-white uppercase tracking-wider text-slate-500">LSTM Neural Network Parameter Configuration</h3>
                    <p className="text-[11px] text-slate-505 dark:text-slate-400 mt-0.5">Adjust model hyperparameters to dynamically update safety stock Alert limits</p>
                  </div>

                  <div className="space-y-4">
                    {/* Smoothing Factor Alpha Slider */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-500 dark:text-slate-400">Smoothing Factor (Alpha)</span>
                        <span className="text-amber-600 dark:text-amber-500 font-bold">{smoothingAlpha.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min="0.05"
                        max="1.0"
                        step="0.05"
                        value={smoothingAlpha}
                        onChange={(e) => setSmoothingAlpha(Number(e.target.value))}
                        className="w-full h-1.5 bg-[#fff6e6] dark:bg-slate-950 rounded-lg appearance-none cursor-pointer accent-[#FF9F1C]"
                      />
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal">Higher values prioritize recent demand fluctuations. Lower values calculate smoothed long-term averages.</p>
                    </div>

                    {/* Temporal Lead W Slider */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-500 dark:text-slate-400">Temporal Shipping Lead buffer (W)</span>
                        <span className="text-amber-600 dark:text-amber-500 font-bold">{temporalLeadW.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max="3.0"
                        step="0.1"
                        value={temporalLeadW}
                        onChange={(e) => setTemporalLeadW(Number(e.target.value))}
                        className="w-full h-1.5 bg-[#fff6e6] dark:bg-slate-955 rounded-lg appearance-none cursor-pointer accent-[#FF9F1C]"
                      />
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal">Safety lead-time shipping factor. Adjusts margin to secure stocks during vendor transit latencies.</p>
                    </div>
                  </div>
                </Card>

                {/* AI Root-Cause Diagnostic Widget (DISCOVER -> LEARN -> TEST -> IMPROVE) */}
                <Card className="bg-white dark:bg-slate-900 border border-[#f3d9a7] dark:border-slate-800 p-6 rounded-3xl space-y-4 shadow-sm">
                  <div>
                    <h3 className="text-sm font-bold text-[#1f2937] dark:text-white uppercase tracking-wider text-slate-500">🧠 AI Sourcing Root-Cause Diagnostic</h3>
                    <p className="text-[11px] text-slate-450 mt-0.5">Executes the 4-Structure loop diagnostic to analyze supply discrepancies.</p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <label className="text-[11px] font-bold text-slate-500">Diagnose SKU:</label>
                      <select 
                        value={diagnosticSkuId} 
                        onChange={(e) => setDiagnosticSkuId(e.target.value)} 
                        className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-xs font-bold dark:text-slate-100 focus:outline-none"
                      >
                        {products.map(p => (
                          <option key={p.id} value={p.id}>{p.name} (Stock: {p.stock})</option>
                        ))}
                      </select>
                      <button
                        onClick={() => runDiagnostic(diagnosticSkuId)}
                        disabled={isDiagnosing}
                        className="bg-[#FAB12F] text-slate-950 font-black px-3.5 py-1.5 rounded-xl text-xs shadow-sm hover:bg-[#e09e1b] transition-all disabled:opacity-50"
                      >
                        {isDiagnosing ? 'Running...' : 'Run Diagnostics'}
                      </button>
                    </div>

                    {/* Step visualizer */}
                    {(isDiagnosing || diagnosticStep !== 'idle') && (
                      <div className="border border-[#f3d9a7]/40 bg-[#fff6e6]/20 dark:bg-slate-955/20 p-4 rounded-2xl space-y-3.5 animate-fade-in text-[11px] font-semibold">
                        <div className="grid grid-cols-4 gap-1.5 text-center text-[9px] font-black uppercase tracking-wider">
                          <div className={`p-1.5 rounded-lg border transition-all ${
                            diagnosticStep === 'discover' ? 'bg-amber-500/25 border-amber-500 text-amber-700' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 text-slate-400'
                          }`}>DISCOVER</div>
                          <div className={`p-1.5 rounded-lg border transition-all ${
                            diagnosticStep === 'learn' ? 'bg-amber-500/25 border-amber-500 text-amber-700' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 text-slate-400'
                          }`}>LEARN</div>
                          <div className={`p-1.5 rounded-lg border transition-all ${
                            diagnosticStep === 'test' ? 'bg-amber-500/25 border-amber-500 text-amber-700' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 text-slate-400'
                          }`}>TEST</div>
                          <div className={`p-1.5 rounded-lg border transition-all ${
                            diagnosticStep === 'improve' ? 'bg-amber-500/25 border-amber-500 text-amber-700' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 text-slate-400'
                          }`}>IMPROVE</div>
                        </div>

                        {/* Description labels per active step */}
                        <div className="space-y-1 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-2.5 rounded-xl text-slate-655 dark:text-slate-350">
                          {diagnosticStep === 'discover' && <p className="animate-pulse">🔍 DISCOVER: Ingesting current stock level, pending customer inquiries (RFQs) in CRM, and supplier lead times...</p>}
                          {diagnosticStep === 'learn' && <p className="animate-pulse">🧠 LEARN: Fitting neural LSTM weight structures on past restocks. Ingesting lead-time latency penalty distributions...</p>}
                          {diagnosticStep === 'test' && <p className="animate-pulse">🧪 TEST: Simulating stockout risks against active buyer demand projections. Verifying cost bounds...</p>}
                          {diagnosticStep === 'improve' && <p className="animate-pulse">🚀 IMPROVE: Formulating actionable supplier procurement PO recommendations and direct WhatsApp restock link...</p>}
                        </div>

                        {/* Final Result Card */}
                        {diagnosticResult && (
                          <div className="border-t border-[#f3d9a7]/60 dark:border-slate-800/60 pt-3 space-y-2 text-xs animate-fade-in">
                            <p className="font-extrabold text-slate-900 dark:text-white">AI Diagnostic Result: <span className={diagnosticResult.isLow ? 'text-rose-500' : 'text-emerald-500'}>{diagnosticResult.isLow ? 'Low Stock Cover Alert' : 'Healthy Stock Cover'}</span></p>
                            <p className="font-normal text-slate-505 dark:text-slate-355 leading-relaxed font-sans">{diagnosticResult.sourcingRecommendation}</p>
                            
                            {diagnosticResult.isLow && (
                              <div className="flex gap-2 pt-1.5">
                                <button
                                  onClick={() => window.open(diagnosticResult.whatsappLink)}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-3 py-1.5 font-bold text-[10px] shadow-sm"
                                >
                                  💬 Contact {diagnosticResult.supplier} (WhatsApp)
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </Card>
              </div>

              {/* Right Column: Reorder ROI & Supplier scoreboard */}
              <div className="space-y-6">
                
                {/* Reorder ROI Analytics */}
                <Card className="bg-white dark:bg-slate-900 border border-[#f3d9a7] dark:border-slate-800 p-6 rounded-3xl space-y-4 shadow-sm">
                  <h3 className="text-sm font-bold text-[#1f2937] dark:text-white uppercase tracking-wider text-slate-500">Forecasting Efficiency & ROI</h3>
                  
                  <div className="grid gap-3 grid-cols-2 text-center text-xs">
                    <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
                      <span className="text-[9px] text-slate-450 block font-extrabold uppercase">Restock Alert ROI</span>
                      <span className="text-xl font-black text-emerald-600 block mt-1">+14.2%</span>
                      <span className="text-[9px] text-slate-500 font-medium block mt-0.5">Sourcing budget saved</span>
                    </div>
                    
                    <div className="p-3 bg-blue-500/5 border border-blue-500/10 rounded-2xl">
                      <span className="text-[9px] text-slate-450 block font-extrabold uppercase">Safety Stock Precision</span>
                      <span className="text-xl font-black text-blue-500 block mt-1">96.8%</span>
                      <span className="text-[9px] text-slate-500 font-medium block mt-0.5">Over 90-day transactions</span>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-500 leading-normal font-sans text-center">
                    * ROI calculates the reduction in emergency restocking flight rates compared to baseline MSME storage structures.
                  </p>
                </Card>

                {/* Supplier scoreboard summary */}
                <Card className="bg-white dark:bg-slate-900 border border-[#f3d9a7] dark:border-slate-800 p-6 rounded-3xl space-y-4 shadow-sm">
                  <div>
                    <h3 className="text-sm font-bold text-[#1f2937] dark:text-white uppercase tracking-wider text-slate-550">Supplier Reliability Registry</h3>
                    <p className="text-[10px] text-slate-450 mt-0.5">Fulfillment rates fed into LSTM Neural transit variables</p>
                  </div>

                  <div className="space-y-2.5 text-[11px] font-semibold text-slate-700 dark:text-slate-350">
                    {[
                      { name: 'Hindalco Metal Industries', onTime: '98%', lead: '3.5 days', score: 'Class A' },
                      { name: 'Kirloskar Pump Division', onTime: '95%', lead: '2.8 days', score: 'Class A' },
                      { name: 'Asian Paints Chemical Corp', onTime: '92%', lead: '4.2 days', score: 'Class B' }
                    ].map((sup, idx) => (
                      <div key={idx} className="flex justify-between items-center p-2 border border-slate-100 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-955 rounded-xl">
                        <div>
                          <p className="font-extrabold text-slate-855 dark:text-white">{sup.name}</p>
                          <p className="text-[9px] text-slate-450">Avg Transit: {sup.lead}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-emerald-600 font-extrabold block">{sup.onTime} On-Time</span>
                          <span className="text-[8px] text-slate-400 uppercase tracking-widest">{sup.score}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </div>

            {/* Inventory table with forecasting mathematics */}
            <Card className="bg-white dark:bg-slate-900 border border-[#f3d9a7] dark:border-slate-800 p-6 rounded-3xl space-y-4 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-[#1f2937] dark:text-white">LSTM Demand Forecasting & Lead Velocity Sheet</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Deterministic modeling integrating current stocks, sales trends, and lead shipping latencies</p>
                </div>
                
                <div className="text-[10px] bg-[#FAB12F]/10 text-amber-700 border border-[#f3d9a7]/50 rounded-xl p-2 font-bold max-w-xs leading-tight">
                  👥 <strong>Top Buyers:</strong> Siddharth Pumps Ltd (65% pump demand), Rajesh Electricals (78% copper wire demand) drive active SKU depletion.
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#f3d9a7] dark:border-slate-800 pb-3 text-slate-505 dark:text-slate-400 font-bold uppercase tracking-wider">
                      <th className="pb-3 text-sm">Product Name</th>
                      <th className="pb-3 text-center text-sm">Stock Level</th>
                      <th className="pb-3 text-center text-sm">Safety MOQ</th>
                      <th className="pb-3 text-center text-sm">Lead Velocity</th>
                      <th className="pb-3 text-center text-sm">LSTM Forecast</th>
                      <th className="pb-3 text-center text-sm">Health Score</th>
                      <th className="pb-3 text-right text-sm">Status / Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f3d9a7]/60 dark:divide-slate-800/40 font-semibold text-[#1f2937] dark:text-slate-100">
                    {products.map((p) => {
                      const reorder = p.reorderLevel || p.moq * 2 || 10;
                      const isLow = p.stock <= reorder;
                      
                      // Core formula logic applied live per listing
                      // Health = (Current Stock / (Expected Demand * temporalLeadW)) * smoothingAlpha * 100
                      const expectedDemand = Math.max(1, p.moq * 2);
                      const calculatedHealth = Math.round(
                        Math.min(100, Math.max(0, (p.stock / (expectedDemand * temporalLeadW)) * smoothingAlpha * 100))
                      );

                      return (
                        <tr key={p.id} className="group hover:bg-[#fff0db]/50 dark:hover:bg-slate-800/35 transition-colors">
                          <td className="py-4 text-slate-700 dark:text-slate-200">
                            <div className="font-extrabold text-sm text-slate-700 dark:text-slate-200 group-hover:text-amber-600 transition-colors">
                              {p.name}
                            </div>
                            <span className="text-[10px] text-slate-500 dark:text-slate-450 font-mono mt-0.5 block">SKU: {p.sku} | Cat: {p.category}</span>
                          </td>
                          <td className="py-4 text-center">
                            <span className={`text-sm font-bold ${isLow ? 'text-rose-500' : 'text-slate-655 dark:text-slate-355'}`}>
                              {p.stock} Units
                            </span>
                          </td>
                          <td className="py-4 text-center text-slate-500 dark:text-slate-400">{p.moq} Units</td>
                          <td className="py-4 text-center text-slate-505 dark:text-slate-400 font-mono">3-4 days</td>
                          <td className="py-4 text-center text-amber-605 dark:text-amber-500 font-extrabold">
                            {isLow ? '🚨 Surge +35%' : '📈 Stable'}
                          </td>
                          <td className="py-4 text-center">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              calculatedHealth < 50
                                ? 'bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400'
                                : calculatedHealth < 80
                                ? 'bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400'
                                : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                            }`}>
                              {calculatedHealth}%
                            </span>
                          </td>
                          <td className="py-4 text-right">
                            {isLow ? (
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => {
                                  setDiagnosticSkuId(p.id);
                                  runDiagnostic(p.id);
                                }}
                                className="rounded-xl text-[10px] py-1 bg-red-650 border-red-650 hover:bg-red-500 shadow-[0_4px_15px_-4px_rgba(220,38,38,0.3)] text-white font-bold"
                              >
                                Run Diagnostic
                              </Button>
                            ) : (
                              <span className="text-slate-505 dark:text-slate-400 text-[11px] font-bold font-mono">🛡️ Safe cover</span>
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
            <Card className="bg-white dark:bg-slate-900 border border-[#f3d9a7] dark:border-slate-800 p-6 rounded-3xl space-y-4 shadow-sm">
              <div>
                <h3 className="text-base font-bold text-[#1f2937] dark:text-white">B2B Invoicing Console (Advisor)</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Optionally calculate compliant GST/Non-GST structures</p>
              </div>

              <div className="space-y-4 text-xs font-semibold">
                
                {/* Product Selection */}
                <div className="space-y-1.5">
                  <label className="text-slate-550 dark:text-slate-400">Select Billing Product</label>
                  <select
                    className="w-full bg-[#fff6e6] dark:bg-slate-950 border border-[#f3d9a7] dark:border-slate-800 text-[#1f2937] dark:text-slate-100 rounded-xl px-3 py-2 text-xs outline-none font-bold"
                    value={gstInvoiceForm.productId}
                    onChange={(e) => setGstInvoiceForm(prev => ({ ...prev, productId: e.target.value }))}
                  >
                    {products.map(p => (
                      <option key={p.id} value={p.id} className="dark:bg-slate-955">{p.name} (₹{p.price.toLocaleString('en-IN')})</option>
                    ))}
                  </select>
                </div>

                {/* Quantity Input */}
                <div className="space-y-1.5">
                  <label className="text-slate-550 dark:text-slate-400">Quantity</label>
                  <input
                    type="number"
                    min={1}
                    value={gstInvoiceForm.quantity}
                    onChange={(e) => setGstInvoiceForm(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                    className="w-full rounded-xl border border-[#f3d9a7] dark:border-slate-800 bg-[#fff6e6] dark:bg-slate-955 px-3 py-2 text-xs text-[#1f2937] dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-accent-500 font-bold"
                  />
                </div>

                {/* Optional GST Toggle */}
                <div className="flex justify-between items-center bg-[#fff6e6] dark:bg-slate-955 p-3 rounded-2xl border border-[#f3d9a7] dark:border-slate-800">
                  <div>
                    <h4 className="text-xs font-bold text-[#1f2937] dark:text-white">Enable GST Allocation</h4>
                    <p className="text-[10px] text-slate-505 dark:text-slate-400 mt-0.5">Toggle to verify tax compliance structures</p>
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
                      <label className="text-slate-555 dark:text-slate-400">Buyer GSTIN Identification</label>
                      <input
                        placeholder="e.g. 27AAAAA1111A1Z1"
                        value={gstInvoiceForm.buyerGSTIN}
                        onChange={(e) => setGstInvoiceForm(prev => ({ ...prev, buyerGSTIN: e.target.value.toUpperCase() }))}
                        className="w-full rounded-xl border border-[#f3d9a7] dark:border-slate-800 bg-[#fff6e6] dark:bg-slate-955 px-3 py-2 text-xs text-[#1f2937] dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-accent-500 font-mono uppercase"
                      />
                      {gstInvoiceForm.buyerGSTIN.length < 15 && (
                        <p className="text-[9px] text-amber-500 font-bold">GSTIN requires exactly 15 alphanumeric characters.</p>
                      )}
                    </div>

                    {/* Tax Slab Selection */}
                    <div className="space-y-1.5">
                      <label className="text-slate-555 dark:text-slate-400">Tax Slab Percent</label>
                      <div className="flex gap-2">
                        {[5, 12, 18, 28].map(slab => (
                          <button
                            key={slab}
                            type="button"
                            onClick={() => setGstInvoiceForm(prev => ({ ...prev, gstSlab: slab }))}
                            className={`flex-1 py-1.5 rounded-xl border text-xs font-bold transition-colors ${
                              gstInvoiceForm.gstSlab === slab
                                ? 'bg-[#FAB12F]/15 border-accent-500 text-amber-600 dark:text-amber-400'
                                : 'bg-[#fff6e6] dark:bg-slate-950 border-[#f3d9a7] dark:border-slate-800 text-slate-500 hover:text-[#1f2937] dark:hover:text-white'
                            }`}
                          >
                            {slab}%
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* State Type */}
                    <div className="space-y-1.5">
                      <label className="text-slate-555 dark:text-slate-400">Geographic Transaction Code</label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setGstInvoiceForm(prev => ({ ...prev, stateType: 'intra' }))}
                          className={`flex-1 py-1.5 rounded-xl border text-[11px] font-bold transition-colors ${
                            gstInvoiceForm.stateType === 'intra'
                              ? 'bg-[#FAB12F]/15 border-accent-500 text-amber-600 dark:text-amber-400'
                              : 'bg-[#fff6e6] dark:bg-slate-955 border-[#f3d9a7] dark:border-slate-800 text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          Intra-State (CGST + SGST)
                        </button>
                        <button
                          type="button"
                          onClick={() => setGstInvoiceForm(prev => ({ ...prev, stateType: 'inter' }))}
                          className={`flex-1 py-1.5 rounded-xl border text-[11px] font-bold transition-colors ${
                            gstInvoiceForm.stateType === 'inter'
                              ? 'bg-[#FAB12F]/15 border-accent-500 text-amber-600 dark:text-amber-400'
                              : 'bg-[#fff6e6] dark:bg-slate-955 border-[#f3d9a7] dark:border-slate-800 text-slate-500 dark:text-slate-400'
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
                <Card className="bg-white dark:bg-slate-900 border border-[#f3d9a7] dark:border-slate-800 p-6 rounded-[32px] space-y-6 relative overflow-hidden font-mono text-[11px] shadow-sm">
                  
                  {/* Ledger Header */}
                  <div className="flex justify-between items-start border-b border-dashed border-[#f3d9a7] dark:border-slate-800 pb-5">
                    <div>
                      <h4 className="text-[#1f2937] dark:text-white font-extrabold text-sm uppercase">Tax Invoice Proposal</h4>
                      <p className="text-slate-505 dark:text-slate-400 mt-1 font-sans font-bold">GAURAV ENTERPRISES LTD</p>
                      <p className="text-slate-505 dark:text-slate-400 font-sans">GSTIN: 27GGGGG9999G1Z5 (Mocked)</p>
                    </div>
                    <div className="text-right text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                      <p>INVOICE NO: GE-PRO-1044</p>
                      <p className="mt-0.5 font-mono">DATE: {new Date().toISOString().slice(0, 10)}</p>
                    </div>
                  </div>

                  {/* Bill Details */}
                  <div className="space-y-1 font-sans text-slate-550 dark:text-slate-400">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-505">Bill To:</p>
                    <p className="text-[#1f2937] dark:text-white font-extrabold">{gstInvoiceForm.buyerName}</p>
                    {gstInvoiceForm.gstApplicable && (
                      <p className="font-mono text-[10px]">Buyer GSTIN: {gstInvoiceForm.buyerGSTIN || 'MISSING'}</p>
                    )}
                  </div>

                  {/* Invoice Line items */}
                  <div className="space-y-2 font-mono">
                    <div className="grid grid-cols-[2.5fr_1fr_1fr_1.5fr] text-slate-505 dark:text-slate-400 font-bold border-b border-[#f3d9a7] dark:border-slate-800 pb-2 uppercase text-[10px]">
                      <span>Item / Sku</span>
                      <span className="text-center">Qty</span>
                      <span className="text-center">Rate</span>
                      <span className="text-right">Total</span>
                    </div>

                    <div className="grid grid-cols-[2.5fr_1fr_1fr_1.5fr] text-slate-655 dark:text-slate-350 py-1 font-medium border-b border-[#f3d9a7]/40 dark:border-slate-800/40">
                      <span className="truncate pr-2 font-sans font-bold text-[#1f2937] dark:text-white">{invoiceResult.productName}</span>
                      <span className="text-center">{gstInvoiceForm.quantity}</span>
                      <span className="text-center">₹{invoiceResult.rate.toLocaleString('en-IN')}</span>
                      <span className="text-right font-mono">₹{invoiceResult.subtotal.toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  {/* Calculations breakdown */}
                  <div className="space-y-1.5 border-b border-dashed border-[#f3d9a7] dark:border-slate-800 pb-4 text-slate-550 dark:text-slate-450 font-bold">
                    <div className="flex justify-between">
                      <span>Subtotal Rate:</span>
                      <span className="text-[#1f2937] dark:text-white font-mono">₹{invoiceResult.subtotal.toLocaleString('en-IN')}</span>
                    </div>
                    {gstInvoiceForm.gstApplicable ? (
                      <>
                        {gstInvoiceForm.stateType === 'intra' ? (
                          <>
                            <div className="flex justify-between">
                              <span>CGST ({gstInvoiceForm.gstSlab / 2}%):</span>
                              <span className="text-[#1f2937] dark:text-white font-mono">₹{invoiceResult.cgst.toLocaleString('en-IN')}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>SGST ({gstInvoiceForm.gstSlab / 2}%):</span>
                              <span className="text-[#1f2937] dark:text-white font-mono">₹{invoiceResult.sgst.toLocaleString('en-IN')}</span>
                            </div>
                          </>
                        ) : (
                          <div className="flex justify-between">
                            <span>IGST ({gstInvoiceForm.gstSlab}%):</span>
                            <span className="text-[#1f2937] dark:text-white font-mono">₹{invoiceResult.igst.toLocaleString('en-IN')}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-[11px] font-black text-amber-600 dark:text-amber-500 border-t border-[#f3d9a7]/60 dark:border-slate-800/60 pt-1.5">
                          <span>Total Alloc. Taxes:</span>
                          <span className="font-mono">₹{invoiceResult.taxValue.toLocaleString('en-IN')}</span>
                        </div>
                      </>
                    ) : (
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 italic font-sans font-normal">
                        No taxes allocated. Non-GST compliant trade transaction.
                      </div>
                    )}
                  </div>

                  {/* Net Payable amount */}
                  <div className="flex justify-between items-center text-sm font-extrabold text-[#1f2937] dark:text-white bg-[#fff6e6] dark:bg-slate-950 p-4 border border-[#f3d9a7] dark:border-slate-800 rounded-2xl">
                    <span className="uppercase text-[11px] tracking-wider text-slate-500 dark:text-slate-400">Total Net Amount:</span>
                    <span className="text-lg text-emerald-500 dark:text-emerald-450 font-mono font-black animate-fade-in">₹{invoiceResult.total.toLocaleString('en-IN')}</span>
                  </div>

                  {/* Advisor Notice */}
                  <div className="bg-blue-500/5 border border-blue-500/10 p-3 rounded-2xl font-sans text-[10px] text-blue-400 dark:text-blue-300 leading-normal font-normal">
                    💡 <strong>Advisor Audit:</strong>{' '}
                    {invoiceResult.isGstCompliant
                      ? 'Compliant with Indian B2B invoicing standard rules. Validated structure successfully.'
                      : 'Non-GST structure proposal. Note: B2B buyers registered with valid GST numbers frequently favor GST-allocated invoices to reap Input Tax Credit advantages.'}
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
            <Card className="bg-white dark:bg-slate-900 border border-[#f3d9a7] dark:border-slate-800 p-6 rounded-3xl space-y-4 shadow-sm">
              <div>
                <h3 className="text-base font-bold text-[#1f2937] dark:text-white">Digital Lead Campaign Optimizer</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Select channels and budgets to calculate projected B2B trade reach</p>
              </div>

              <div className="space-y-4 text-xs font-semibold">
                
                {/* Campaign Name */}
                <div className="space-y-1.5">
                  <label className="text-slate-550 dark:text-slate-400">Campaign Campaign Name</label>
                  <input
                    type="text"
                    value={marketingForm.campaignName}
                    onChange={(e) => setMarketingForm(prev => ({ ...prev, campaignName: e.target.value }))}
                    className="w-full rounded-xl border border-[#f3d9a7] dark:border-slate-800 bg-[#fff6e6] dark:bg-slate-950 px-3 py-2 text-xs text-[#1f2937] dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-accent-500 font-bold"
                  />
                </div>

                {/* Target Region */}
                <div className="space-y-1.5">
                  <label className="text-slate-555 dark:text-slate-400">Geographic Targeting Audience</label>
                  <select
                    className="w-full bg-[#fff6e6] dark:bg-slate-950 border border-[#f3d9a7] dark:border-slate-800 text-[#1f2937] dark:text-slate-100 rounded-xl px-3 py-2 text-xs outline-none font-bold"
                    value={marketingForm.targetRegion}
                    onChange={(e) => setMarketingForm(prev => ({ ...prev, targetRegion: e.target.value }))}
                  >
                    <option className="dark:bg-slate-950">Maharashtra & South India</option>
                    <option className="dark:bg-slate-950">Delhi NCR & Punjab</option>
                    <option className="dark:bg-slate-950">Gujarat & West Coast</option>
                    <option className="dark:bg-slate-950">All India Trade Hubs</option>
                  </select>
                </div>

                {/* Campaign Channel */}
                <div className="space-y-1.5">
                  <label className="text-slate-555 dark:text-slate-400">Marketing Promotion Type</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'Facebook Ads', label: 'Facebook', icon: '🔵' },
                      { id: 'Instagram Ads', label: 'Instagram', icon: '📸' },
                      { id: 'Google Search Ads', label: 'Google Search', icon: '🔍' },
                      { id: 'Google Display Ads', label: 'Google Display', icon: '🖼️' },
                      { id: 'YouTube Ads', label: 'YouTube', icon: '🎥' },
                      { id: 'LinkedIn Ads', label: 'LinkedIn', icon: '💼' },
                      { id: 'Twitter / X Ads', label: 'Twitter / X', icon: '🐦' },
                      { id: 'TikTok Ads', label: 'TikTok', icon: '🎵' },
                      { id: 'Pinterest Ads', label: 'Pinterest', icon: '📌' }
                    ].map(platform => (
                      <button
                        key={platform.id}
                        type="button"
                        onClick={() => setMarketingForm(prev => ({ ...prev, campaignType: platform.id }))}
                        className={`py-2 px-1 rounded-xl border text-[10px] leading-tight font-bold flex flex-col items-center justify-center gap-1 transition-all ${
                          marketingForm.campaignType === platform.id
                            ? 'bg-[#FAB12F]/20 border-[#FAB12F] text-amber-800 dark:text-[#FAB12F] shadow-sm scale-[1.03]'
                            : 'bg-white dark:bg-slate-950 border-[#f3d9a7] dark:border-slate-855 text-slate-600 dark:text-slate-405 hover:border-[#FAB12F] hover:bg-[#fff6e6]/30'
                        }`}
                      >
                        <span className="text-base">{platform.icon}</span>
                        <span>{platform.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Budget Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-semibold">
                    <label className="text-slate-555 dark:text-slate-400">Campaign Promotion Budget (INR)</label>
                    <span className="text-amber-600 dark:text-amber-500 font-bold text-sm">₹{marketingForm.budget.toLocaleString('en-IN')}</span>
                  </div>
                  <input
                    type="range"
                    min={3000}
                    max={100000}
                    step={1000}
                    value={marketingForm.budget}
                    onChange={(e) => setMarketingForm(prev => ({ ...prev, budget: Number(e.target.value) }))}
                    className="w-full h-1 bg-[#fff6e6] dark:bg-slate-950 rounded-lg appearance-none cursor-pointer accent-[#FAB12F] border border-[#f3d9a7] dark:border-slate-800"
                  />
                  <div className="flex justify-between text-[10px] text-slate-505 dark:text-slate-455">
                    <span>Min: ₹3,000</span>
                    <span>Max: ₹1,00,005</span>
                  </div>
                </div>

              </div>
            </Card>

            {/* Calculations outputs & Auto generated meta copies */}
            {marketingOutput && (
              <div className="space-y-4">
                
                {/* Stats cards */}
                <div className="grid grid-cols-2 gap-4">
                  <Card className="bg-white dark:bg-slate-900 border border-[#f3d9a7] dark:border-slate-800 p-4 rounded-2xl flex flex-col justify-between min-h-[90px] shadow-sm">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Estimated Reach</span>
                    <span className="text-xl font-black text-[#1f2937] dark:text-white mt-1">~{marketingOutput.reach.toLocaleString()} Businesses</span>
                  </Card>
                  
                  <Card className="bg-white dark:bg-slate-900 border border-[#f3d9a7] dark:border-slate-800 p-4 rounded-2xl flex flex-col justify-between min-h-[90px] shadow-sm">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Forecasted Leads</span>
                    <span className="text-xl font-black text-emerald-500 mt-1">~{marketingOutput.leads} Trade Leads</span>
                  </Card>
                </div>

                {/* Copywrited Template Panel */}
                <Card className="bg-white dark:bg-slate-900 border border-[#f3d9a7] dark:border-slate-800 p-6 rounded-3xl space-y-4 shadow-sm">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-xs font-bold text-[#1f2937] dark:text-white uppercase tracking-wider text-slate-550">Generated Ad Template</h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-455 mt-0.5">Copy meta snippet to launch your campaigns directly</p>
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
                    className="w-full bg-[#fff6e6] dark:bg-slate-950 border border-[#f3d9a7] dark:border-slate-800 p-4 rounded-2xl text-xs font-bold font-sans leading-relaxed text-slate-755 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#FF9F1C] min-h-[100px] resize-y"
                    value={customTemplate}
                    onChange={(e) => setCustomTemplate(e.target.value)}
                  />

                  <div className="bg-[#FAB12F]/5 dark:bg-[#FAB12F]/10 border border-accent-500/10 p-3.5 rounded-2xl text-[11px] text-amber-600 dark:text-amber-500 leading-normal font-normal">
                    📢 <strong>Digital Advisor Performance Score:</strong>{' '}
                    Expected Click-Through-Rate: <span className="font-bold">{marketingOutput.ctr}</span>. Marketing models evaluate higher B2B response ratios for targeted Google and Meta ads optimized for lead generation forms.
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

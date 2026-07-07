'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { navigationItems } from '@/lib/navigation';

interface SellerProfile {
  businessName: string;
  contactPerson: string;
  whatsappNumber: string;
  email: string;
  gstin: string;
  address: string;
  // Trust Toggles
  gstVerified: boolean;
  msmeRegistered: boolean;
  verifiedSupplier: boolean;
  buyerProtectionActive: boolean;
  whatsappConnected: boolean;
  // Dynamic checklist steps
  checklist: Record<string, boolean>;
}

const CHECKLIST_ITEMS = [
  { id: 'business_details', label: 'Complete Business Profile Info', description: 'Provide registered business name, contact, and office address.' },
  { id: 'whatsapp_setup', label: 'Configure Core WhatsApp Integration', description: 'Enable direct click-to-chat inquiry linkages on all catalogs.' },
  { id: 'gstin_entry', label: 'Verify Indian GSTIN Number (Optional)', description: 'Enable trade buyer tax benefits and secure premium trust banners.' },
  { id: 'add_products', label: 'Upload at least 3 Active Products', description: 'Populate your catalog to begin receiving B2B trade inquiries.' },
  { id: 'warehouse_address', label: 'Specify Physical Warehouse Location', description: 'Ensure reliable logistics and freight estimations for buyers.' },
  { id: 'msme_reg', label: 'Submit MSME Certificate / Udyam registration', description: 'Unlock official MSME status label on our national business directory.' },
  { id: 'buyer_protect', label: 'Opt-in to Trade Buyer Protection program', description: 'Guarantee timely fulfillment and elevate trust with trade partners.' },
  { id: 'payment_setup', label: 'Configure Bank Account / UPI Routing', description: 'Provide details to settle bulk escrow transactions and payouts.' },
  { id: 'logo_branding', label: 'Upload High-Res Brand Logo & Banner', description: 'Establish premium brand identity on mobile and catalog details.' },
  { id: 'first_deal', label: 'Complete Onboarding Onboarding Checklist', description: 'Ready to connect and secure wholesale purchase agreements.' },
];

export default function ProfilePage() {
  const [profile, setProfile] = useState<SellerProfile>({
    businessName: 'Gaurav Enterprise',
    contactPerson: 'Gaurav Patel',
    whatsappNumber: '919876543210',
    email: 'partner@dealerconnect.in',
    gstin: '27AAAAA0000A1Z5',
    address: 'Plot 42, GIDC Industrial Estate, Sector 2, Gandhinagar, Gujarat - 382010',
    gstVerified: true,
    msmeRegistered: true,
    verifiedSupplier: false,
    buyerProtectionActive: false,
    whatsappConnected: true,
    checklist: {
      business_details: true,
      whatsapp_setup: true,
      gstin_entry: true,
      add_products: true,
      warehouse_address: true,
      msme_reg: true,
      buyer_protect: false,
      payment_setup: false,
      logo_branding: false,
      first_deal: false,
    },
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load state from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('marketplace_seller_profile');
      if (stored) {
        setProfile(JSON.parse(stored));
      } else {
        localStorage.setItem('marketplace_seller_profile', JSON.stringify(profile));
      }
    } catch (e) {
      console.error('Failed to load seller profile', e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save profile state helper
  const saveProfile = (updatedProfile: SellerProfile) => {
    setProfile(updatedProfile);
    localStorage.setItem('marketplace_seller_profile', JSON.stringify(updatedProfile));
  };

  // Field change handler
  const handleFieldChange = (field: keyof SellerProfile, value: any) => {
    const updated = {
      ...profile,
      [field]: value,
    };
    saveProfile(updated);
  };

  // Handle checklist item check toggle
  const handleChecklistItemToggle = (itemId: string) => {
    const updatedChecklist = {
      ...profile.checklist,
      [itemId]: !profile.checklist[itemId],
    };
    
    // Automatically match badge states to checklist items for high-fidelity response
    let updatedGstVerified = profile.gstVerified;
    let updatedMsmeRegistered = profile.msmeRegistered;
    let updatedBuyerProtect = profile.buyerProtectionActive;
    let updatedWhatsappConn = profile.whatsappConnected;

    if (itemId === 'gstin_entry') updatedGstVerified = updatedChecklist[itemId];
    if (itemId === 'msme_reg') updatedMsmeRegistered = updatedChecklist[itemId];
    if (itemId === 'buyer_protect') updatedBuyerProtect = updatedChecklist[itemId];
    if (itemId === 'whatsapp_setup') updatedWhatsappConn = updatedChecklist[itemId];

    const updatedProfile = {
      ...profile,
      checklist: updatedChecklist,
      gstVerified: updatedGstVerified,
      msmeRegistered: updatedMsmeRegistered,
      buyerProtectionActive: updatedBuyerProtect,
      whatsappConnected: updatedWhatsappConn,
    };

    saveProfile(updatedProfile);
  };

  // Save CTA handler
  const handleSaveCTA = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
 
    setTimeout(() => {
      setIsSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }, 600);
  };

  // Calculate onboarding progress dynamics
  const totalSteps = CHECKLIST_ITEMS.length;
  const completedSteps = Object.values(profile.checklist).filter(Boolean).length;
  const completionPercentage = Math.round((completedSteps / totalSteps) * 100);

  // SVG circular properties
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (completionPercentage / 100) * circumference;

  return (
    <DashboardLayout
      navigationItems={navigationItems}
      user={{ name: profile.businessName, email: profile.email }}
      onLogout={() => {
        if (typeof window !== 'undefined') window.location.href = '/';
      }}
      topBarProps={{
        pageTitle: 'Seller Profile',
        breadcrumbs: [{ label: 'Cockpit', href: '/dashboard' }, { label: 'Profile Settings' }],
        unreadNotifications: 3,
      }}
    >
      <div className="space-y-6">
        
        {/* Onboarding Progress Segment */}
        <section className="rounded-[32px] bg-gradient-to-r from-[#FAB12F]/10 via-[#fff0db] to-[#fff6e6] border border-[#f3d9a7] p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-3 text-center md:text-left flex-1">
            <span className="rounded-full bg-[#FAB12F]/10 px-3.5 py-1 text-xs font-bold text-amber-600 border border-accent-500/15">
              🚀 Setup Checklist
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1f2937]">
              Complete Onboarding Milestones
            </h2>
            <p className="text-sm text-slate-600 max-w-xl leading-relaxed">
              Verify your physical warehouse address, input optional tax GSTIN info, and activate Buyer Protection to unlock premium search visibility and trade features.
            </p>
          </div>

          {/* Responsive SVG Circular Progress Circle */}
          <div className="flex items-center gap-4 bg-white/80 border border-[#f3d9a7] px-6 py-4 rounded-3xl backdrop-blur-md">
            <div className="relative h-24 w-24">
              <svg className="h-full w-full transform -rotate-90">
                {/* Background Ring */}
                <circle
                  cx="48"
                  cy="48"
                  r={radius}
                  strokeWidth="8"
                  stroke="currentColor"
                  fill="transparent"
                  className="text-slate-300"
                />
                {/* Active Ring */}
                <circle
                  cx="48"
                  cy="48"
                  r={radius}
                  strokeWidth="8"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="transparent"
                  className="text-accent-500 transition-all duration-700 ease-in-out"
                />
              </svg>
              {/* Text indicator inside circle */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-black text-[#1f2937]">{completionPercentage}%</span>
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Done</span>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                Cockpit Score
              </p>
              <p className="text-base font-extrabold text-[#1f2937] mt-0.5">
                {completedSteps} of {totalSteps} verified
              </p>
              <p className="text-xs font-medium text-amber-600 mt-1">
                {completionPercentage >= 80 ? '🔥 Elite Seller Grade' : '⏳ Action Required'}
              </p>
            </div>
          </div>
        </section>

        {/* Dynamic Trust Badges Area */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {/* Badge 1: GST Status */}
          <div
            className={`rounded-2xl border p-4 flex flex-col items-center justify-center text-center space-y-2 transition-all duration-300 ${
              profile.gstVerified
                ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400'
                : 'border-[#f3d9a7] bg-white/40 text-slate-500'
            }`}
          >
            <span className="text-2xl">{profile.gstVerified ? '🛡️' : 'ℹ️'}</span>
            <div className="space-y-0.5">
              <p className="text-xs font-extrabold uppercase tracking-wider">
                {profile.gstVerified ? 'GST Verified' : 'GST Not Added'}
              </p>
              <p className="text-[10px] text-slate-500 font-medium">
                {profile.gstVerified ? 'B2B Tax Credit' : 'Optional'}
              </p>
            </div>
          </div>

          {/* Badge 2: MSME Certified */}
          <div
            className={`rounded-2xl border p-4 flex flex-col items-center justify-center text-center space-y-2 transition-all duration-300 ${
              profile.msmeRegistered
                ? 'border-blue-500/20 bg-blue-500/5 text-blue-400'
                : 'border-[#f3d9a7] bg-white text-slate-500'
            }`}
          >
            <span className="text-2xl">{profile.msmeRegistered ? '🏭' : '⏳'}</span>
            <div className="space-y-0.5">
              <p className="text-xs font-extrabold uppercase tracking-wider">MSME Status</p>
              <p className="text-[10px] text-slate-500 font-medium">National Directory</p>
            </div>
          </div>

          {/* Badge 3: Verified Supplier */}
          <div
            className={`rounded-2xl border p-4 flex flex-col items-center justify-center text-center space-y-2 transition-all duration-300 ${
              profile.verifiedSupplier
                ? 'border-accent-500/20 bg-[#FAB12F]/5 text-amber-600'
                : 'border-[#f3d9a7] bg-white text-slate-500'
            }`}
          >
            <span className="text-2xl">✨</span>
            <div className="space-y-0.5">
              <p className="text-xs font-extrabold uppercase tracking-wider">Premium Badge</p>
              <p className="text-[10px] text-slate-500 font-medium">Top Rank Search</p>
            </div>
          </div>

          {/* Badge 4: Buyer Protection */}
          <div
            className={`rounded-2xl border p-4 flex flex-col items-center justify-center text-center space-y-2 transition-all duration-300 ${
              profile.buyerProtectionActive
                ? 'border-purple-500/20 bg-purple-500/5 text-purple-400'
                : 'border-[#f3d9a7] bg-white text-slate-500'
            }`}
          >
            <span className="text-2xl">{profile.buyerProtectionActive ? '🤝' : '🔒'}</span>
            <div className="space-y-0.5">
              <p className="text-xs font-extrabold uppercase tracking-wider">Buyer Protection</p>
              <p className="text-[10px] text-slate-500 font-medium">Escrow Trust Shield</p>
            </div>
          </div>

          {/* Badge 5: WhatsApp Connect */}
          <div
            className={`rounded-2xl border p-4 flex flex-col items-center justify-center text-center space-y-2 transition-all duration-300 ${
              profile.whatsappConnected
                ? 'border-teal-500/20 bg-teal-500/5 text-teal-400'
                : 'border-[#f3d9a7] bg-white text-slate-500'
            }`}
          >
            <span className="text-2xl">{profile.whatsappConnected ? '💬' : '🔌'}</span>
            <div className="space-y-0.5">
              <p className="text-xs font-extrabold uppercase tracking-wider">WhatsApp Link</p>
              <p className="text-[10px] text-slate-500 font-medium">Direct Click-to-Chat</p>
            </div>
          </div>
        </section>

        {/* Primary Row: Onboarding list & Core form details */}
        <section className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          
          {/* Setup Checklist Progress */}
          <Card className="rounded-3xl border border-[#f3d9a7] bg-white p-6 space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Setup Progress
              </p>
              <h3 className="mt-1 text-xl font-bold text-[#1f2937]">Interactive Onboarding</h3>
              <p className="text-xs text-slate-500 mt-1">
                Toggle completed steps below to instantly calculate your cockpit grade score and synchronize badges.
              </p>
            </div>

            <div className="divide-y divide-[#f3d9a7] overflow-y-auto max-h-[500px] scrollbar-thin scrollbar-thumb-slate-900 pr-1">
              {CHECKLIST_ITEMS.map((item) => {
                const isChecked = !!profile.checklist[item.id];
                return (
                  <div
                    key={item.id}
                    onClick={() => handleChecklistItemToggle(item.id)}
                    className="flex items-start gap-3 py-3.5 cursor-pointer hover:bg-[#fff0db]/50 px-2 rounded-2xl transition-colors group"
                  >
                    <div className="pt-0.5">
                      <div
                        className={`h-5 w-5 rounded-md border flex items-center justify-center transition-all ${
                          isChecked
                            ? 'bg-[#FAB12F] border-accent-500 text-slate-950 scale-105'
                            : 'border-[#f3d9a7] bg-[#fff6e6] group-hover:border-slate-700'
                        }`}
                      >
                        {isChecked && (
                          <svg className="w-3.5 h-3.5 font-bold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <h4
                        className={`text-xs font-bold leading-tight transition-colors ${
                          isChecked ? 'text-slate-500 line-through' : 'text-[#1f2937] group-hover:text-amber-600'
                        }`}
                      >
                        {item.label}
                      </h4>
                      <p className="text-[10px] leading-relaxed text-slate-500">{item.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Physical Information profile Editor */}
          <Card className="rounded-3xl border border-[#f3d9a7] bg-white p-6 flex flex-col justify-between">
            <form onSubmit={handleSaveCTA} className="space-y-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Business Cockpit Setup
                </p>
                <h3 className="mt-1 text-xl font-bold text-[#1f2937]">Merchant Core Directory</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Configure verification parameters visible to trade partners on DealerConnect.
                </p>
              </div>

              {saveSuccess && (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 p-3 text-[11px] font-semibold uppercase tracking-wider">
                  ✓ Core directory profile updated and synced successfully!
                </div>
              )}

              <div className="space-y-4">
                {/* Business Name Field */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600">Registered Business Name</label>
                  <input
                    type="text"
                    value={profile.businessName}
                    onChange={(e) => handleFieldChange('businessName', e.target.value)}
                    className="w-full rounded-2xl bg-[#fff6e6] border border-[#f3d9a7] px-4 py-3 text-sm text-[#1f2937] focus:outline-none focus:border-accent-500 transition-colors"
                  />
                </div>

                {/* Primary Contacts */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600">Contact Person Name</label>
                    <input
                      type="text"
                      value={profile.contactPerson}
                      onChange={(e) => handleFieldChange('contactPerson', e.target.value)}
                      className="w-full rounded-2xl bg-[#fff6e6] border border-[#f3d9a7] px-4 py-3 text-sm text-[#1f2937] focus:outline-none focus:border-accent-500 transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600">WhatsApp Inquiry Number</label>
                    <input
                      type="text"
                      value={profile.whatsappNumber}
                      onChange={(e) => handleFieldChange('whatsappNumber', e.target.value)}
                      className="w-full rounded-2xl bg-[#fff6e6] border border-[#f3d9a7] px-4 py-3 text-sm text-[#1f2937] focus:outline-none focus:border-accent-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Email Address & GSTIN Code */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600">Business E-mail Address</label>
                    <input
                      type="email"
                      value={profile.email}
                      onChange={(e) => handleFieldChange('email', e.target.value)}
                      className="w-full rounded-2xl bg-[#fff6e6] border border-[#f3d9a7] px-4 py-3 text-sm text-[#1f2937] focus:outline-none focus:border-accent-500 transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600">GSTIN / VAT Tax Registration Code</label>
                    <input
                      type="text"
                      value={profile.gstin}
                      onChange={(e) => handleFieldChange('gstin', e.target.value)}
                      className="w-full rounded-2xl bg-[#fff6e6] border border-[#f3d9a7] px-4 py-3 text-sm text-[#1f2937] focus:outline-none focus:border-accent-500 transition-colors uppercase font-mono"
                    />
                  </div>
                </div>

                {/* Warehouse Location address */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600">Primary Physical Address / Warehouse Location</label>
                  <textarea
                    rows={3}
                    value={profile.address}
                    onChange={(e) => handleFieldChange('address', e.target.value)}
                    className="w-full rounded-2xl bg-[#fff6e6] border border-[#f3d9a7] px-4 py-3 text-sm text-[#1f2937] focus:outline-none focus:border-accent-500 transition-colors leading-relaxed"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-[#f3d9a7]/60">
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isSaving}
                  className="w-full justify-center rounded-2xl font-bold bg-[#FAB12F] text-slate-950 shadow-[0_12px_30px_-6px_rgba(255,149,0,0.3)]"
                >
                  {isSaving ? 'Updating Directories...' : 'Save Directory Information'}
                </Button>
              </div>
            </form>
          </Card>

        </section>
      </div>
    </DashboardLayout>
  );
}

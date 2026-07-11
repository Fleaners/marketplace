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
  pan: string;
  address: string;
  state: string;
  pincode: string;
  // Trust Toggles
  gstVerified: boolean;
  gstStatus: string;
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
  { id: 'first_deal', label: 'Complete Onboarding Checklist', description: 'Ready to connect and secure wholesale purchase agreements.' },
];

function validateGSTIN(gstin: string) {
  gstin = gstin.trim().toUpperCase();
  if (gstin.length !== 15) {
    return { valid: false, message: 'GSTIN must be exactly 15 characters long.' };
  }

  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[0-9A-Z]{1}[0-9A-Z]{1}$/;
  if (!gstinRegex.test(gstin)) {
    return { valid: false, message: 'Invalid GSTIN format. Expected format like 27AAAAA0000A1Z5.' };
  }

  const stateCode = parseInt(gstin.substring(0, 2), 10);
  if ((stateCode < 1 || stateCode > 38) && stateCode !== 97) {
    return { valid: false, message: 'Invalid State Code (first 2 digits). Must be between 01 and 38, or 97.' };
  }

  const pan = gstin.substring(2, 12);
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  if (!panRegex.test(pan)) {
    return { valid: false, message: 'Invalid PAN structure inside GSTIN.' };
  }

  const charList = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const val = charList.indexOf(gstin[i]);
    const factor = (i % 2 === 0) ? 1 : 2;
    let product = val * factor;
    product = Math.floor(product / 36) + (product % 36);
    sum += product;
  }
  const checkDigit = (36 - (sum % 36)) % 36;
  const expectedChar = charList[checkDigit];
  if (gstin[14] !== expectedChar) {
    return { valid: false, message: `GSTIN Checksum validation failed. Expected final character: ${expectedChar}.` };
  }

  return { valid: true, gstin };
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<SellerProfile>({
    businessName: 'Gaurav Enterprise',
    contactPerson: 'Gaurav Patel',
    whatsappNumber: '919876543210',
    email: 'partner@dealerconnect.in',
    gstin: '27AAAAA0000A1Z5',
    pan: 'AAAAA0000A',
    address: 'Plot 42, GIDC Industrial Estate, Sector 2, Gandhinagar',
    state: 'Gujarat',
    pincode: '382010',
    gstVerified: true,
    gstStatus: 'verified',
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
  const [validationError, setValidationError] = useState('');

  // Initial load from unified profile cache & API
  useEffect(() => {
    const loadProfile = async () => {
      let storedProfile: any = null;
      try {
        const stored = localStorage.getItem('marketplace_seller_profile');
        if (stored) {
          storedProfile = JSON.parse(stored);
        }
      } catch (e) {
        console.error('Failed to load local storage profile', e);
      }

      try {
        const { getFirebaseServices } = require('@/lib/firebase');
        const services = await getFirebaseServices();
        const curUser = services?.auth?.currentUser;
        if (curUser) {
          const token = await curUser.getIdToken();
          const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '';
          const response = await fetch(`${API_BASE}/api/business/profile`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          if (response.ok) {
            const data = await response.json();
            const mappedProfile: SellerProfile = {
              businessName: data.shop_name || storedProfile?.businessName || 'Gaurav Enterprise',
              contactPerson: data.owner_name || storedProfile?.contactPerson || 'Gaurav Patel',
              whatsappNumber: data.whatsapp_number || storedProfile?.whatsappNumber || '919876543210',
              email: data.email || storedProfile?.email || 'partner@dealerconnect.in',
              gstin: data.gstNumber || storedProfile?.gstin || '',
              pan: data.pan || storedProfile?.pan || '',
              address: data.address || storedProfile?.address || '',
              state: data.state || storedProfile?.state || '',
              pincode: data.pincode || storedProfile?.pincode || '',
              gstVerified: !!data.gstVerified,
              gstStatus: data.gstStatus || 'unprovided',
              msmeRegistered: data.msmeRegistered || storedProfile?.msmeRegistered || false,
              verifiedSupplier: data.verifiedSupplier || storedProfile?.verifiedSupplier || false,
              buyerProtectionActive: data.buyerProtectionActive || storedProfile?.buyerProtectionActive || false,
              whatsappConnected: data.whatsappConnected || storedProfile?.whatsappConnected || false,
              checklist: data.checklist || storedProfile?.checklist || {
                business_details: true,
                whatsapp_setup: true,
                gstin_entry: false,
                add_products: true,
                warehouse_address: true,
                msme_reg: false,
                buyer_protect: false,
                payment_setup: false,
                logo_branding: false,
                first_deal: false,
              }
            };
            setProfile(mappedProfile);
            localStorage.setItem('marketplace_seller_profile', JSON.stringify(mappedProfile));
            return;
          }
        }
      } catch (err) {
        console.warn('Could not load profile from API, fallback to local storage:', err);
      }

      if (storedProfile) {
        setProfile(storedProfile);
      }
    };

    loadProfile();
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

  // Save CTA handler with API synchronization & verification
  const handleSaveCTA = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    setValidationError('');

    // Field Validations
    if (!profile.businessName.trim()) {
      setValidationError('Business Name is mandatory.');
      setIsSaving(false);
      return;
    }
    if (!profile.contactPerson.trim()) {
      setValidationError('Owner Name (Contact Person) is mandatory.');
      setIsSaving(false);
      return;
    }
    if (!profile.address.trim()) {
      setValidationError('Business Address is mandatory.');
      setIsSaving(false);
      return;
    }
    if (!profile.state.trim()) {
      setValidationError('State is mandatory.');
      setIsSaving(false);
      return;
    }
    if (!profile.pincode.trim()) {
      setValidationError('Pincode is mandatory.');
      setIsSaving(false);
      return;
    }
    if (!profile.whatsappNumber.trim()) {
      setValidationError('WhatsApp Sourcing Contact Number is mandatory.');
      setIsSaving(false);
      return;
    }

    // Optional GSTIN structural validation
    if (profile.gstin.trim().length > 0) {
      const gstinVal = validateGSTIN(profile.gstin);
      if (!gstinVal.valid) {
        setValidationError(gstinVal.message || 'Invalid GST number.');
        setIsSaving(false);
        return;
      }
    }

    try {
      let token = '';
      const { getFirebaseServices } = require('@/lib/firebase');
      const services = await getFirebaseServices();
      const curUser = services?.auth?.currentUser;
      if (curUser) {
        token = await curUser.getIdToken();
      }

      const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '';
      const response = await fetch(`${API_BASE}/api/business/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          shopName: profile.businessName,
          email: profile.email,
          description: '',
          gstNumber: profile.gstin,
          ownerName: profile.contactPerson,
          pan: profile.pan,
          address: profile.address,
          state: profile.state,
          pincode: profile.pincode,
          whatsappNumber: profile.whatsappNumber
        })
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to update seller directory profile.');
      }

      // Sync state with returned backend details (which contains generated verification status)
      const updatedProfile: SellerProfile = {
        ...profile,
        gstin: payload.gstNumber || '',
        gstStatus: payload.gstStatus || 'unprovided',
        gstVerified: !!payload.gstVerified,
        pan: payload.pan || '',
        address: payload.address || '',
        state: payload.state || '',
        pincode: payload.pincode || '',
      };
      
      saveProfile(updatedProfile);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      console.error('Profile Save Error:', err);
      setValidationError(err.message || 'Network interruption. Profile not synchronized.');
    } finally {
      setIsSaving(false);
    }
  };

  const totalSteps = CHECKLIST_ITEMS.length;
  const completedSteps = Object.values(profile.checklist).filter(Boolean).length;
  const completionPercentage = Math.round((completedSteps / totalSteps) * 100);

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
        <section className="rounded-[32px] bg-gradient-to-r from-[#FAB12F]/10 via-[#fff0db] to-[#fff6e6] dark:from-slate-900 dark:via-indigo-950/20 dark:to-slate-950 border border-[#f3d9a7] dark:border-slate-800 p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
          <div className="space-y-3 text-center md:text-left flex-1">
            <span className="rounded-full bg-[#FAB12F]/10 px-3.5 py-1 text-xs font-bold text-amber-600 border border-accent-500/15">
              🚀 Setup Checklist
            </span>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-[#1f2937] dark:text-white">
              Complete Onboarding Milestones
            </h2>
            <p className="text-sm text-slate-650 dark:text-slate-400 max-w-xl leading-relaxed">
              Verify your physical warehouse address, input optional tax GSTIN info, and activate Buyer Protection to unlock premium search visibility and trade features.
            </p>
          </div>

          {/* Responsive SVG Circular Progress Circle */}
          <div className="flex items-center gap-4 bg-white/80 dark:bg-slate-900/80 border border-[#f3d9a7] dark:border-slate-800 px-6 py-4 rounded-3xl backdrop-blur-md shadow-sm">
            <div className="relative h-24 w-24">
              <svg className="h-full w-full transform -rotate-90">
                <circle
                  cx="48"
                  cy="48"
                  r={radius}
                  strokeWidth="8"
                  stroke="currentColor"
                  fill="transparent"
                  className="text-slate-200 dark:text-slate-800"
                />
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
                  className="text-accent-550 dark:text-[#FAB12F] transition-all duration-700 ease-in-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-black text-[#1f2937] dark:text-white">{completionPercentage}%</span>
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Done</span>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                Cockpit Score
              </p>
              <p className="text-base font-extrabold text-[#1f2937] dark:text-white mt-0.5">
                {completedSteps} of {totalSteps} verified
              </p>
              <p className="text-xs font-medium text-amber-600 mt-1">
                {completionPercentage >= 80 ? '🔥 Elite Seller Grade' : '⏳ Action Required'}
              </p>
            </div>
          </div>
        </section>

        {/* Dynamic Trust Badges Area */}
        <section className="grid gap-4 grid-cols-2 lg:grid-cols-5">
          {/* Badge 1: GST Verification Status */}
          <div
            title={profile.gstStatus === 'verified' ? 'This seller has a verified GST registration.' : ''}
            className={`rounded-2xl border p-4 flex flex-col items-center justify-center text-center space-y-2 transition-all duration-300 relative group cursor-pointer ${
              profile.gstStatus === 'verified'
                ? 'border-[#FAB12F] bg-blue-50/80 dark:bg-blue-955/20 text-[#FAB12F] shadow-sm font-semibold'
                : profile.gstStatus === 'pending'
                ? 'border-amber-400 bg-amber-50/50 dark:bg-amber-955/10 text-amber-600'
                : 'border-[#f3d9a7] dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500'
            }`}
          >
            <span className="text-2xl">
              {profile.gstStatus === 'verified' ? '🏅' : profile.gstStatus === 'pending' ? '⏳' : 'ℹ️'}
            </span>
            <div className="space-y-0.5">
              <p className="text-xs font-extrabold uppercase tracking-wider">
                {profile.gstStatus === 'verified' ? '✓ GST Verified' : profile.gstStatus === 'pending' ? 'Pending Verification' : 'GST Optional'}
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                {profile.gstStatus === 'verified' ? 'B2B Tax Credit' : profile.gstStatus === 'pending' ? 'Reviewing' : 'No Badge'}
              </p>
            </div>
            {profile.gstStatus === 'verified' && (
              <div className="absolute bottom-full mb-2 hidden group-hover:block bg-[#1f2937] dark:bg-slate-950 text-white text-[10px] p-2 rounded-lg shadow-lg w-48 text-center z-10">
                This seller has a verified GST registration.
              </div>
            )}
          </div>

          {/* Badge 2: MSME Certified */}
          <div
            className={`rounded-2xl border p-4 flex flex-col items-center justify-center text-center space-y-2 transition-all duration-300 ${
              profile.msmeRegistered
                ? 'border-blue-500/20 bg-blue-500/5 dark:bg-blue-950/20 text-blue-400'
                : 'border-[#f3d9a7] dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500'
            }`}
          >
            <span className="text-2xl">{profile.msmeRegistered ? '🏭' : '⏳'}</span>
            <div className="space-y-0.5">
              <p className="text-xs font-extrabold uppercase tracking-wider">MSME Status</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">National Directory</p>
            </div>
          </div>

          {/* Badge 3: Verified Supplier */}
          <div
            className={`rounded-2xl border p-4 flex flex-col items-center justify-center text-center space-y-2 transition-all duration-300 ${
              profile.verifiedSupplier
                ? 'border-accent-500/20 bg-[#FAB12F]/5 dark:bg-[#FAB12F]/10 text-amber-600'
                : 'border-[#f3d9a7] dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500'
            }`}
          >
            <span className="text-2xl">✨</span>
            <div className="space-y-0.5">
              <p className="text-xs font-extrabold uppercase tracking-wider">Premium Badge</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Top Rank Search</p>
            </div>
          </div>

          {/* Badge 4: Buyer Protection */}
          <div
            className={`rounded-2xl border p-4 flex flex-col items-center justify-center text-center space-y-2 transition-all duration-300 ${
              profile.buyerProtectionActive
                ? 'border-purple-500/20 bg-purple-500/5 dark:bg-purple-950/20 text-purple-400'
                : 'border-[#f3d9a7] dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500'
            }`}
          >
            <span className="text-2xl">{profile.buyerProtectionActive ? '🤝' : '🔒'}</span>
            <div className="space-y-0.5">
              <p className="text-xs font-extrabold uppercase tracking-wider">Buyer Protection</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Escrow Trust Shield</p>
            </div>
          </div>

          {/* Badge 5: WhatsApp Connect */}
          <div
            className={`rounded-2xl border p-4 flex flex-col items-center justify-center text-center space-y-2 transition-all duration-300 ${
              profile.whatsappConnected
                ? 'border-teal-500/20 bg-teal-500/5 dark:bg-teal-950/20 text-teal-400'
                : 'border-[#f3d9a7] dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500'
            }`}
          >
            <span className="text-2xl">{profile.whatsappConnected ? '💬' : '🔌'}</span>
            <div className="space-y-0.5">
              <p className="text-xs font-extrabold uppercase tracking-wider">WhatsApp Link</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Direct Click-to-Chat</p>
            </div>
          </div>
        </section>

        {/* Primary Row: Onboarding list & Core form details */}
        <section className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          
          {/* Setup Checklist Progress */}
          <Card className="rounded-3xl border border-[#f3d9a7] dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Setup Progress
              </p>
              <h3 className="mt-1 text-xl font-bold text-[#1f2937] dark:text-white">Interactive Onboarding</h3>
              <p className="text-xs text-slate-500 mt-1">
                Toggle completed steps below to instantly calculate your cockpit grade score and synchronize badges.
              </p>
            </div>

            <div className="divide-y divide-[#f3d9a7] dark:divide-slate-800 overflow-y-auto max-h-[500px] scrollbar-thin scrollbar-thumb-slate-900 pr-1">
              {CHECKLIST_ITEMS.map((item) => {
                const isChecked = !!profile.checklist[item.id];
                return (
                  <div
                    key={item.id}
                    onClick={() => handleChecklistItemToggle(item.id)}
                    className="flex items-start gap-3 py-3.5 cursor-pointer hover:bg-[#fff0db]/50 dark:hover:bg-slate-800/40 px-2 rounded-2xl transition-colors group"
                  >
                    <div className="pt-0.5">
                      <div
                        className={`h-5 w-5 rounded-md border flex items-center justify-center transition-all ${
                          isChecked
                            ? 'bg-[#FAB12F] border-accent-500 text-slate-955 scale-105'
                            : 'border-[#f3d9a7] dark:border-slate-800 bg-[#fff6e6] dark:bg-slate-950 group-hover:border-slate-700 dark:group-hover:border-slate-600'
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
                          isChecked ? 'text-slate-500 line-through' : 'text-[#1f2937] dark:text-white group-hover:text-amber-600'
                        }`}
                      >
                        {item.label}
                      </h4>
                      <p className="text-[10px] leading-relaxed text-slate-505 dark:text-slate-400">{item.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Physical Information profile Editor */}
          <Card className="rounded-3xl border border-[#f3d9a7] dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-col justify-between">
            <form onSubmit={handleSaveCTA} className="space-y-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Business Cockpit Setup
                </p>
                <h3 className="mt-1 text-xl font-bold text-[#1f2937] dark:text-white">Merchant Core Directory</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Configure verification parameters visible to trade partners on DealerConnect.
                </p>
              </div>

              {saveSuccess && (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 p-3 text-[11px] font-semibold uppercase tracking-wider animate-pulse">
                  ✓ Core directory profile updated and synced successfully!
                </div>
              )}

              {validationError && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/5 text-red-500 p-3 text-[11px] font-semibold uppercase tracking-wider">
                  ⚠️ {validationError}
                </div>
              )}

              <div className="space-y-4">
                {/* Business Name Field */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Registered Business Name (Mandatory)</label>
                  <input
                    type="text"
                    value={profile.businessName}
                    onChange={(e) => handleFieldChange('businessName', e.target.value)}
                    className="w-full rounded-2xl bg-[#fff6e6] dark:bg-slate-950 border border-[#f3d9a7] dark:border-slate-800 px-4 py-3 text-sm text-[#1f2937] dark:text-slate-105 focus:outline-none focus:border-accent-500 transition-colors font-semibold"
                    required
                  />
                </div>

                {/* Primary Contacts */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Owner Name (Mandatory)</label>
                    <input
                      type="text"
                      value={profile.contactPerson}
                      onChange={(e) => handleFieldChange('contactPerson', e.target.value)}
                      className="w-full rounded-2xl bg-[#fff6e6] dark:bg-slate-950 border border-[#f3d9a7] dark:border-slate-800 px-4 py-3 text-sm text-[#1f2937] dark:text-slate-105 focus:outline-none focus:border-accent-500 transition-colors"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">WhatsApp Number (Mandatory)</label>
                    <input
                      type="text"
                      placeholder="e.g. 919876543210"
                      value={profile.whatsappNumber}
                      onChange={(e) => handleFieldChange('whatsappNumber', e.target.value)}
                      className="w-full rounded-2xl bg-[#fff6e6] dark:bg-slate-950 border border-[#f3d9a7] dark:border-slate-800 px-4 py-3 text-sm text-[#1f2937] dark:text-slate-105 focus:outline-none focus:border-accent-500 transition-colors font-mono"
                      required
                    />
                  </div>
                </div>

                {/* Email Address & GSTIN Code */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Business E-mail Address</label>
                    <input
                      type="email"
                      value={profile.email}
                      onChange={(e) => handleFieldChange('email', e.target.value)}
                      className="w-full rounded-2xl bg-[#fff6e6] dark:bg-slate-950 border border-[#f3d9a7] dark:border-slate-800 px-4 py-3 text-sm text-[#1f2937] dark:text-slate-105 focus:outline-none focus:border-accent-500 transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">GSTIN Code (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. 27AAAAA0000A1Z5"
                      value={profile.gstin}
                      onChange={(e) => handleFieldChange('gstin', e.target.value.toUpperCase())}
                      className="w-full rounded-2xl bg-[#fff6e6] dark:bg-slate-950 border border-[#f3d9a7] dark:border-slate-800 px-4 py-3 text-sm text-[#1f2937] dark:text-slate-105 focus:outline-none focus:border-accent-500 transition-colors uppercase font-mono"
                    />
                  </div>
                </div>

                {/* PAN Code & State */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">PAN Code (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. AAAAA0000A"
                      maxLength={10}
                      value={profile.pan}
                      onChange={(e) => handleFieldChange('pan', e.target.value.toUpperCase())}
                      className="w-full rounded-2xl bg-[#fff6e6] dark:bg-slate-950 border border-[#f3d9a7] dark:border-slate-800 px-4 py-3 text-sm text-[#1f2937] dark:text-slate-105 focus:outline-none focus:border-accent-500 transition-colors uppercase font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">State (Mandatory)</label>
                    <input
                      type="text"
                      placeholder="e.g. Gujarat"
                      value={profile.state}
                      onChange={(e) => handleFieldChange('state', e.target.value)}
                      className="w-full rounded-2xl bg-[#fff6e6] dark:bg-slate-950 border border-[#f3d9a7] dark:border-slate-800 px-4 py-3 text-sm text-[#1f2937] dark:text-slate-105 focus:outline-none focus:border-accent-500 transition-colors"
                      required
                    />
                  </div>
                </div>

                {/* Pincode & Warehouse Address */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-1 space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Pincode (Mandatory)</label>
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="382010"
                      value={profile.pincode}
                      onChange={(e) => handleFieldChange('pincode', e.target.value.replace(/\D/g, ''))}
                      className="w-full rounded-2xl bg-[#fff6e6] dark:bg-slate-950 border border-[#f3d9a7] dark:border-slate-800 px-4 py-3 text-sm text-[#1f2937] dark:text-slate-105 focus:outline-none focus:border-accent-500 transition-colors font-mono"
                      required
                    />
                  </div>

                  <div className="col-span-2 space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Business Address (Mandatory)</label>
                    <input
                      type="text"
                      placeholder="Plot 42, GIDC Industrial Estate, Sector 2"
                      value={profile.address}
                      onChange={(e) => handleFieldChange('address', e.target.value)}
                      className="w-full rounded-2xl bg-[#fff6e6] dark:bg-slate-950 border border-[#f3d9a7] dark:border-slate-800 px-4 py-3 text-sm text-[#1f2937] dark:text-slate-105 focus:outline-none focus:border-accent-500 transition-colors"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-[#f3d9a7]/60 dark:border-slate-800/60">
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isSaving}
                  className="w-full justify-center rounded-2xl font-bold bg-[#FAB12F] text-slate-950 shadow-[0_12px_30px_-6px_rgba(255,149,0,0.3)] hover:bg-[#FAB12F]/90 transition-colors disabled:opacity-50"
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

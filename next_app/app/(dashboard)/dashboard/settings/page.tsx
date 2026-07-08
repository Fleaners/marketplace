'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { navigationItems } from '@/lib/navigation';

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

export default function SettingsPage() {
  const router = useRouter();

  // State fields
  const [businessName, setBusinessName] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [category, setCategory] = useState('');
  const [deliveryRange, setDeliveryRange] = useState('All India');
  const [upiAddress, setUpiAddress] = useState('');
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [whatsappAlerts, setWhatsappAlerts] = useState(true);
  
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Initial load from unified profile cache
  useEffect(() => {
    try {
      const stored = localStorage.getItem('mp_user');
      if (stored) {
        const u = JSON.parse(stored);
        setBusinessName(u.businessName || u.name || '');
        setGstNumber(u.gstNumber || u.gstin || '');
        setWhatsappNumber(u.whatsappNumber || u.mobileNumber || '');
        setCategory(u.category || 'Industrial');
        setDeliveryRange(u.deliveryRange || 'All India');
        setUpiAddress(u.upiAddress || '');
        setEmailAlerts(u.emailAlerts !== false);
        setWhatsappAlerts(u.whatsappAlerts !== false);
      }
    } catch (e) {
      console.error('Failed to load profile settings from local cache', e);
    }
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMsg('');

    // Optional GSTIN verification
    if (gstNumber.trim().length > 0) {
      const val = validateGSTIN(gstNumber);
      if (!val.valid) {
        alert(val.message);
        setIsSaving(false);
        return;
      }
    }

    try {
      // API call to sync backend
      let token = '';
      try {
        const { getFirebaseServices } = require('@/lib/firebase');
        const services = await getFirebaseServices();
        const curUser = services?.auth?.currentUser;
        if (curUser) {
          token = await curUser.getIdToken();
        }
      } catch (err) {
        console.warn('Could not get id token:', err);
      }

      if (token) {
        const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '';
        const response = await fetch(`${API_BASE}/api/business/profile`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            shopName: businessName.trim(),
            gstNumber: gstNumber.trim(),
            whatsappNumber: whatsappNumber.trim(),
            category
          })
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.error || 'Failed to sync to business profile api.');
        }
      }

      const stored = localStorage.getItem('mp_user');
      const u = stored ? JSON.parse(stored) : {};

      const updatedUser = {
        ...u,
        businessName: businessName.trim(),
        name: businessName.trim(), // Keep uniform for greetings
        gstNumber: gstNumber.trim(),
        gstin: gstNumber.trim(),
        whatsappNumber: whatsappNumber.trim(),
        category,
        deliveryRange,
        upiAddress: upiAddress.trim(),
        emailAlerts,
        whatsappAlerts,
        onboardingComplete: true,
        onboardingCompleted: true,
      };

      // Dual cache update
      localStorage.setItem('mp_user', JSON.stringify(updatedUser));
      localStorage.setItem('marketplace_user_profile', JSON.stringify(updatedUser)); // backup key

      // Async Firestore sync if firebase is ready
      if (typeof window !== 'undefined' && (window as any).firebase && (window as any).firebase.apps?.length) {
        const db = (window as any).firebase.firestore();
        const auth = (window as any).firebase.auth();
        const curUser = auth.currentUser;
        if (curUser) {
          db.collection('users')
            .doc(curUser.uid)
            .set(updatedUser, { merge: true })
            .then(() => console.log('Firestore profile synced successfully.'))
            .catch((err: any) => console.warn('Firestore sync failed', err));
        }
      }

      // Trigger tracking event
      if (typeof window !== 'undefined' && (window as any).trackEvent) {
        (window as any).trackEvent('profile_update', { source: 'dashboard_settings' });
      }

      setSuccessMsg('Business settings updated successfully!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (error: any) {
      console.error('Failed to save settings', error);
      alert(error.message || 'An error occurred while saving configuration details.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout navigationItems={navigationItems}>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
            Business Settings
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Manage your verified corporate supplier profile, instant advance payment targets, and alert notifications.
          </p>
        </div>

        {successMsg && (
          <div className="rounded-2xl border border-emerald-800 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-400 font-bold transition-all animate-fade-in">
            ✓ {successMsg}
          </div>
        )}

        <form onSubmit={handleSaveSettings} className="space-y-6">
          {/* Card 1: Supplier Profile */}
          <Card className="rounded-3xl border border-[#f3d9a7] bg-white p-6 sm:p-8 space-y-4">
            <h3 className="text-base font-bold text-[#1f2937] uppercase tracking-wider border-b border-[#f3d9a7] pb-2.5">
              Verified Corporate Identity
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Business Name</label>
                <input
                  type="text"
                  placeholder="e.g. Om Sree Industries"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full rounded-2xl border border-[#f3d9a7] bg-[#fff6e6] px-4 py-3 text-sm text-[#1f2937] placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-accent-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">GSTIN Number</label>
                <input
                  type="text"
                  placeholder="e.g. 27AAAAA1111A1Z1"
                  value={gstNumber}
                  onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                  className="w-full rounded-2xl border border-[#f3d9a7] bg-[#fff6e6] px-4 py-3 text-sm text-[#1f2937] placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-accent-500 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">WhatsApp Number</label>
                <input
                  type="text"
                  placeholder="e.g. 919876543210"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  className="w-full rounded-2xl border border-[#f3d9a7] bg-[#fff6e6] px-4 py-3 text-sm text-[#1f2937] placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-accent-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sourcing Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-2xl border border-[#f3d9a7] bg-[#fff6e6] px-4 py-3 text-sm text-[#1f2937] focus:outline-none focus:ring-2 focus:ring-accent-500"
                >
                  <option value="Industrial">Industrial</option>
                  <option value="Electrical">Electrical</option>
                  <option value="Hardware">Hardware</option>
                  <option value="Chemicals">Chemicals</option>
                  <option value="Packaging">Packaging</option>
                  <option value="Safety Components">Safety Components</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Card 2: Fulfillment & Payments */}
          <Card className="rounded-3xl border border-[#f3d9a7] bg-white p-6 sm:p-8 space-y-4">
            <h3 className="text-base font-bold text-[#1f2937] uppercase tracking-wider border-b border-[#f3d9a7] pb-2.5">
              Fulfillment & Payment Channels
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Delivery Range</label>
                <select
                  value={deliveryRange}
                  onChange={(e) => setDeliveryRange(e.target.value)}
                  className="w-full rounded-2xl border border-[#f3d9a7] bg-[#fff6e6] px-4 py-3 text-sm text-[#1f2937] focus:outline-none focus:ring-2 focus:ring-accent-500"
                >
                  <option value="All India">All India</option>
                  <option value="Interstate Only">Interstate Only</option>
                  <option value="Intrastate Only">Intrastate Only</option>
                  <option value="Local (Within City)">Local (Within City)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Advance UPI Address</label>
                <input
                  type="text"
                  placeholder="e.g. company@ybl (for B2B invoice advance)"
                  value={upiAddress}
                  onChange={(e) => setUpiAddress(e.target.value)}
                  className="w-full rounded-2xl border border-[#f3d9a7] bg-[#fff6e6] px-4 py-3 text-sm text-[#1f2937] placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-accent-500 font-mono"
                />
              </div>
            </div>
          </Card>

          {/* Card 3: Alert Configuration */}
          <Card className="rounded-3xl border border-[#f3d9a7] bg-white p-6 sm:p-8 space-y-4">
            <h3 className="text-base font-bold text-[#1f2937] uppercase tracking-wider border-b border-[#f3d9a7] pb-2.5">
              Alert Hooks & Notifications
            </h3>

            <div className="space-y-4 text-sm font-medium">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[#1f2937]">WhatsApp Inquiry Alerts</p>
                  <p className="text-slate-500 text-xs mt-0.5">Receive real-time notifications on WhatsApp when buyers open catalog referrals.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={whatsappAlerts}
                    onChange={(e) => setWhatsappAlerts(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-300 after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#FAB12F] peer-checked:after:bg-white" />
                </label>
              </div>

              <div className="flex items-center justify-between border-t border-[#f3d9a7] pt-4">
                <div>
                  <p className="text-[#1f2937]">Weekly Email Reports</p>
                  <p className="text-slate-500 text-xs mt-0.5">Get a weekly audit digest of Google Analytics Views, WhatsApp counts, and low-stock alerts.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={emailAlerts}
                    onChange={(e) => setEmailAlerts(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-300 after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#FAB12F] peer-checked:after:bg-white" />
                </label>
              </div>
            </div>
          </Card>

          {/* Form Action Row */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              variant="secondary"
              type="button"
              onClick={() => router.push('/dashboard')}
              className="rounded-xl"
            >
              Discard Changes
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="rounded-xl px-6 bg-gradient-to-r from-accent-500 to-accent-600 text-[#1f2937] font-bold hover:shadow-[0_0_24px_rgba(30,144,255,0.3)] transition-all"
            >
              {isSaving ? 'Saving Preferences...' : 'Save Settings'}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}

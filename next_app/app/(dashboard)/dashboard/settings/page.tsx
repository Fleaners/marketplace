'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { navigationItems } from '@/lib/navigation';
import { Greeting } from '@/components/dashboard/Greeting';

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

interface FinancialTransaction {
  id: string;
  type: 'Revenue' | 'Expense' | 'GST Liability';
  desc: string;
  amount: number;
  hsn?: string;
  gstCollected?: number;
  date: string;
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'profile' | 'finance'>('profile');

  // Business profile state
  const [businessName, setBusinessName] = useState('Gaurav Enterprise');
  const [gstNumber, setGstNumber] = useState('27AAAAA0000A1Z5');
  const [whatsappNumber, setWhatsappNumber] = useState('919876543210');
  const [category, setCategory] = useState('Industrial');
  const [deliveryRange, setDeliveryRange] = useState('All India');
  const [upiAddress, setUpiAddress] = useState('gaurav@upi');
  
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Finance OS state
  const [finances, setFinances] = useState<FinancialTransaction[]>([
    { id: 'TX-201', type: 'Revenue', desc: 'Sourcing Lead: 15x water pumps fulfilled', amount: 217500, hsn: '8413-7010', gstCollected: 39150, date: '2026-07-08' },
    { id: 'TX-202', type: 'Expense', desc: 'Inbound PO: Copper Core Grounding Wire restock', amount: 240000, hsn: '8544-4920', gstCollected: 0, date: '2026-07-09' },
    { id: 'TX-203', type: 'GST Liability', desc: 'Q2 GST IGST filing liabilities', amount: 39150, gstCollected: 0, date: '2026-07-10' },
  ]);

  // Finance item builders
  const [finType, setFinType] = useState<'Revenue' | 'Expense' | 'GST Liability'>('Revenue');
  const [finDesc, setFinDesc] = useState('');
  const [finAmount, setFinAmount] = useState(5000);
  const [finHsn, setFinHsn] = useState('');
  const [finGst, setFinGst] = useState(900);

  // Initial load
  useEffect(() => {
    try {
      const stored = localStorage.getItem('mp_user');
      if (stored) {
        const u = JSON.parse(stored);
        setBusinessName(u.businessName || u.name || 'Gaurav Enterprise');
        setGstNumber(u.gstNumber || u.gstin || '27AAAAA0000A1Z5');
        setWhatsappNumber(u.whatsappNumber || u.mobileNumber || '919876543210');
        setCategory(u.category || 'Industrial');
        setDeliveryRange(u.deliveryRange || 'All India');
        setUpiAddress(u.upiAddress || 'gaurav@upi');
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMsg('');

    if (gstNumber.trim().length > 0) {
      const val = validateGSTIN(gstNumber);
      if (!val.valid) {
        alert(val.message);
        setIsSaving(false);
        return;
      }
    }

    try {
      const updatedUser = {
        businessName: businessName.trim(),
        name: businessName.trim(),
        gstNumber: gstNumber.trim(),
        gstin: gstNumber.trim(),
        whatsappNumber: whatsappNumber.trim(),
        category,
        deliveryRange,
        upiAddress: upiAddress.trim(),
        gstVerified: gstNumber.trim().length > 0,
      };

      localStorage.setItem('mp_user', JSON.stringify(updatedUser));
      setSuccessMsg('Business settings updated successfully!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (error: any) {
      alert(error.message || 'An error occurred.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddTransactionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newTx: FinancialTransaction = {
      id: `TX-${Math.floor(100 + Math.random() * 900)}`,
      type: finType,
      desc: finDesc,
      amount: finAmount,
      hsn: finHsn || undefined,
      gstCollected: finType === 'Revenue' ? finGst : 0,
      date: new Date().toISOString().split('T')[0],
    };
    setFinances([newTx, ...finances]);
    setFinDesc('');
    setFinHsn('');
    alert('Financial ledger transaction recorded.');
  };

  const handleExportLedger = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(finances, null, 2));
    const a = document.createElement('a');
    a.setAttribute('href', dataStr);
    a.setAttribute('download', 'finance_ledger_export.json');
    a.click();
  };

  // Calculations
  const revenueTotal = finances.filter(f => f.type === 'Revenue').reduce((acc, f) => acc + f.amount, 0);
  const expenseTotal = finances.filter(f => f.type === 'Expense').reduce((acc, f) => acc + f.amount, 0);
  const gstLiabilityTotal = finances.reduce((acc, f) => acc + (f.gstCollected || 0), 0);
  const profitMargin = revenueTotal > 0 ? (((revenueTotal - expenseTotal) / revenueTotal) * 100).toFixed(1) + '%' : '0%';

  return (
    <DashboardLayout
      navigationItems={navigationItems}
      user={{ name: businessName, email: 'partner@dealerconnect.in' }}
      topBarProps={{
        pageTitle: 'Finance & Profile OS',
        breadcrumbs: [{ label: 'Cockpit', href: '/dashboard' }, { label: 'Settings' }],
        unreadNotifications: 0,
      }}
    >
      <div className="max-w-4xl mx-auto space-y-6 pb-12">
        {/* Header */}
        <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <Greeting />
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">Configure Sourcing Profile & Financial Books</p>
          </div>

          <div className="flex gap-1 bg-[#fff6e6] dark:bg-slate-950 border border-[#f3d9a7] dark:border-slate-800 p-1 rounded-2xl">
            {(['profile', 'finance'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                  activeTab === tab
                    ? 'bg-[#FAB12F] text-slate-950 shadow border border-accent-600/10'
                    : 'text-slate-550 dark:text-slate-400 hover:text-[#1f2937] dark:hover:text-white'
                }`}
              >
                {tab === 'profile' ? 'Business Profile' : 'Finance OS'}
              </button>
            ))}
          </div>
        </section>

        {successMsg && (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-500 p-4 text-xs font-black uppercase tracking-wider flex items-center gap-2 animate-fade-in shadow-inner">
            <span>✓</span> {successMsg}
          </div>
        )}

        {/* TAB 1: BUSINESS PROFILE SETTINGS */}
        {activeTab === 'profile' && (
          <Card className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl space-y-6">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-550">Verified Supplier Profile</h3>
              <p className="text-xs text-slate-400 mt-1 font-semibold">Ensure legal business identity compliance before capturing buyer sourcing RFQs.</p>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4 text-xs font-semibold">
              <div className="grid gap-4 grid-cols-2">
                <div className="space-y-1">
                  <label className="text-slate-500">Corporate Business Name</label>
                  <input type="text" required value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 p-2.5" />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-500">15-Digit GSTIN Number</label>
                  <input type="text" required value={gstNumber} onChange={(e) => setGstNumber(e.target.value)} className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 p-2.5 font-mono" />
                </div>
              </div>

              <div className="grid gap-4 grid-cols-3">
                <div className="space-y-1">
                  <label className="text-slate-500">WhatsApp Contact</label>
                  <input type="text" required value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 p-2.5" />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-500">Primary Product Category</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 p-2.5">
                    <option value="Industrial">Industrial</option>
                    <option value="Electrical">Electrical</option>
                    <option value="Hardware">Hardware</option>
                    <option value="Chemicals">Chemicals</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-slate-500">UPI ID for B2B Payments</label>
                  <input type="text" required value={upiAddress} onChange={(e) => setUpiAddress(e.target.value)} className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 p-2.5" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-500">Logistics Delivery Radius Coverage</label>
                <select value={deliveryRange} onChange={(e) => setDeliveryRange(e.target.value)} className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 p-2.5">
                  <option value="Local Area Only">Local Area Only</option>
                  <option value="State Wide">State Wide</option>
                  <option value="All India">All India (National Sourcing)</option>
                </select>
              </div>

              <button type="submit" disabled={isSaving} className="w-full rounded-2xl bg-[#FAB12F] text-slate-950 font-black py-3 text-center shadow-md">
                {isSaving ? 'Verifying checksum credentials...' : 'Verify & Sync Profile'}
              </button>
            </form>
          </Card>
        )}

        {/* TAB 2: FINANCE OS LEDGERS */}
        {activeTab === 'finance' && (
          <div className="space-y-6">
            {/* Finance dashboard KPIs */}
            <div className="grid gap-4 grid-cols-2 md:grid-cols-4 animate-fade-in">
              <Card className="rounded-3xl border border-slate-200 p-5 space-y-1 bg-white dark:bg-slate-900 shadow-sm">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">GST Collected (Q3)</span>
                <span className="text-xl font-black text-blue-600">₹{gstLiabilityTotal.toLocaleString()}</span>
              </Card>
              <Card className="rounded-3xl border border-slate-200 p-5 space-y-1 bg-white dark:bg-slate-900 shadow-sm">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Net Expenses</span>
                <span className="text-xl font-black text-rose-500">₹{expenseTotal.toLocaleString()}</span>
              </Card>
              <Card className="rounded-3xl border border-slate-200 p-5 space-y-1 bg-white dark:bg-slate-900 shadow-sm">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Revenue Collected</span>
                <span className="text-xl font-black text-emerald-600">₹{revenueTotal.toLocaleString()}</span>
              </Card>
              <Card className="rounded-3xl border border-slate-200 p-5 space-y-1 bg-white dark:bg-slate-900 shadow-sm">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">B2B Margin</span>
                <span className="text-xl font-black text-amber-500">{profitMargin}</span>
              </Card>
            </div>

            {/* Input Form & List */}
            <div className="grid gap-6 md:grid-cols-[1.5fr_1fr]">
              {/* Ledger transaction registry list */}
              <Card className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider text-slate-550">Financial Ledger</h3>
                    <p className="text-xs text-slate-400 mt-1">Transaction entries, HSN taxes, and gross revenues.</p>
                  </div>
                  <button
                    onClick={handleExportLedger}
                    className="rounded-xl border border-slate-200 bg-white text-slate-700 px-3 py-2 text-xs font-bold"
                  >
                    📥 Export Ledger
                  </button>
                </div>

                <div className="space-y-3">
                  {finances.map((tx) => (
                    <div key={tx.id} className="p-3.5 rounded-2xl border border-slate-150 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 text-xs flex justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${
                            tx.type === 'Revenue' ? 'bg-emerald-500/10 text-emerald-600' : tx.type === 'Expense' ? 'bg-rose-500/10 text-rose-500' : 'bg-blue-500/10 text-blue-500'
                          }`}>{tx.type}</span>
                          <span className="text-[10px] font-mono text-slate-400">{tx.id}</span>
                        </div>
                        <p className="font-extrabold text-slate-850 dark:text-white mt-1">{tx.desc}</p>
                        {tx.hsn && <p className="text-[10px] text-slate-450 mt-0.5">HSN Code: {tx.hsn}</p>}
                      </div>
                      <div className="text-right shrink-0 flex flex-col justify-between">
                        <span className="font-black text-slate-900 dark:text-white">₹{tx.amount.toLocaleString()}</span>
                        {tx.gstCollected ? (
                          <span className="text-[9px] text-blue-500 font-bold">GST Collection: ₹{tx.gstCollected}</span>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Add Transaction form */}
              <Card className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl space-y-4">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-550">Record Transaction</h3>
                  <p className="text-xs text-slate-400 mt-1">Manually log direct wire deposits, cash payments, or custom business expenses.</p>
                </div>

                <form onSubmit={handleAddTransactionSubmit} className="space-y-3 text-xs font-semibold">
                  <div className="space-y-1">
                    <label className="text-slate-500">Transaction Type</label>
                    <select value={finType} onChange={(e) => setFinType(e.target.value as any)} className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 p-2.5">
                      <option value="Revenue">Revenue Collected</option>
                      <option value="Expense">Business Expense</option>
                      <option value="GST Liability">Tax Duty Filing</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-500">Description</label>
                    <input type="text" required value={finDesc} onChange={(e) => setFinDesc(e.target.value)} placeholder="e.g. Courier charges" className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 p-2.5" />
                  </div>
                  <div className="grid gap-3 grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-slate-500">Transaction Value (₹)</label>
                      <input type="number" required value={finAmount} onChange={(e) => setFinAmount(Number(e.target.value))} className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 p-2.5 text-right font-mono" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-slate-500">GST Collected (₹)</label>
                      <input type="number" disabled={finType !== 'Revenue'} value={finGst} onChange={(e) => setFinGst(Number(e.target.value))} className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 p-2.5 text-right font-mono disabled:opacity-55" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-500">Linked HSN Code</label>
                    <input type="text" value={finHsn} onChange={(e) => setFinHsn(e.target.value)} placeholder="e.g. 8413-7010" className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 p-2.5" />
                  </div>
                  <button type="submit" className="w-full rounded-2xl bg-[#FAB12F] text-slate-950 font-black py-2.5 text-center shadow-md">Add Transaction</button>
                </form>
              </Card>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

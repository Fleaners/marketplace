'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout';
import { Card } from '@/components/ui/Card';
import { navigationItems } from '@/lib/navigation';
import { Greeting } from '@/components/dashboard/Greeting';

interface Lead {
  id: string;
  customerName: string;
  businessName?: string;
  productName: string;
  value: number;
  location: string;
  status: 'uncontacted' | 'contacted' | 'proposal' | 'won' | 'lost';
  date: string;
  phone: string;
  notes?: string;
}

interface CRMContact {
  id: string;
  name: string;
  businessName: string;
  type: 'Customer' | 'Supplier' | 'Dealer' | 'Wholesaler' | 'Retailer';
  phone: string;
  email: string;
  location: string;
  notes: string;
  followUpDate?: string;
}

interface InvoiceItem {
  name: string;
  hsn: string;
  price: number;
  qty: number;
  gstRate: number; // e.g. 18
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [activeTab, setActiveTab] = useState<'pipeline' | 'crm' | 'invoicing'>('pipeline');
  const [searchQuery, setSearchQuery] = useState('');
  
  // CRM state
  const [contacts, setContacts] = useState<CRMContact[]>([
    { id: 'c-1', name: 'Rajesh Sharma', businessName: 'Rajesh Electricals', type: 'Dealer', phone: '919876543210', email: 'rajesh@rajeshelectricals.in', location: 'Nagpur, MH', notes: 'Interested in bulk copper core wires.', followUpDate: '2026-07-15' },
    { id: 'c-2', name: 'Siddharth Roy', businessName: 'Siddharth Pumps Ltd', type: 'Customer', phone: '919876543210', email: 'siddharth@roy-pumps.com', location: 'Kolkata, WB', notes: 'Regular buyer of water pumps.', followUpDate: '2026-07-18' },
    { id: 'c-3', name: 'Amit Desai', businessName: 'Desai Hardware Store', type: 'Retailer', phone: '919876543210', email: 'amit@desaihardware.com', location: 'Pune, MH', notes: 'Requires fast delivery for joint couplings.', followUpDate: '2026-07-12' },
  ]);

  // Invoice generator state
  const [invoiceType, setInvoiceType] = useState<'GST Invoice' | 'Quotation' | 'Purchase Order'>('GST Invoice');
  const [invoiceNumber, setInvoiceNumber] = useState('INV-2026-0001');
  const [invoiceCustomer, setInvoiceCustomer] = useState('Rajesh Electricals');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([
    { name: 'Industrial Water Pump', hsn: '8413-7010', price: 14500, qty: 2, gstRate: 18 },
  ]);

  // Invoice form builders
  const [newItemName, setNewItemName] = useState('Industrial Water Pump');
  const [newItemHsn, setNewItemHsn] = useState('8413-7010');
  const [newItemPrice, setNewItemPrice] = useState(14500);
  const [newItemQty, setNewItemQty] = useState(2);
  const [newItemGst, setNewItemGst] = useState(18);

  const [generatedPdfData, setGeneratedPdfData] = useState<any | null>(null);

  // CRM Contact builders
  const [contactName, setContactName] = useState('');
  const [contactBusiness, setContactBusiness] = useState('');
  const [contactType, setContactType] = useState<'Customer' | 'Supplier' | 'Dealer' | 'Wholesaler' | 'Retailer'>('Customer');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactLocation, setContactLocation] = useState('');
  const [contactNotes, setContactNotes] = useState('');
  const [contactFollowUp, setContactFollowUp] = useState('');

  // Initial Seed
  useEffect(() => {
    try {
      const stored = localStorage.getItem('marketplace_leads');
      if (stored) {
        setLeads(JSON.parse(stored));
      } else {
        const defaultLeads: Lead[] = [
          { id: 'LD-101', customerName: 'Rajesh Sharma', businessName: 'Rajesh Electricals', productName: 'Copper Core Grounding Wire', value: 24000, location: 'Nagpur, MH', status: 'contacted', date: '2026-07-09', phone: '919876543210', notes: 'Wants delivery by Friday.' },
          { id: 'LD-102', customerName: 'Siddharth Roy', businessName: 'Siddharth Pumps Ltd', productName: 'Industrial Water Pump', value: 145000, location: 'Kolkata, WB', status: 'proposal', date: '2026-07-10', phone: '919876543210', notes: 'Sent quotation with 5% discount.' },
          { id: 'LD-103', customerName: 'Amit Desai', businessName: 'Desai Hardware Store', productName: 'Brass Coupling Joints (1/2 Inch)', value: 1700, location: 'Pune, MH', status: 'uncontacted', date: '2026-07-11', phone: '919876543210' },
        ];
        localStorage.setItem('marketplace_leads', JSON.stringify(defaultLeads));
        setLeads(defaultLeads);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const saveLeads = (list: Lead[]) => {
    setLeads(list);
    localStorage.setItem('marketplace_leads', JSON.stringify(list));
  };

  const handleUpdateStatus = (id: string, newStatus: Lead['status']) => {
    const updated = leads.map((l) => (l.id === id ? { ...l, status: newStatus } : l));
    saveLeads(updated);
  };

  // Add CRM Contact
  const handleAddContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newContact: CRMContact = {
      id: `c-${Date.now()}`,
      name: contactName,
      businessName: contactBusiness,
      type: contactType,
      phone: contactPhone,
      email: contactEmail,
      location: contactLocation,
      notes: contactNotes,
      followUpDate: contactFollowUp || undefined,
    };
    setContacts([newContact, ...contacts]);
    
    // Clear form
    setContactName('');
    setContactBusiness('');
    setContactPhone('');
    setContactEmail('');
    setContactLocation('');
    setContactNotes('');
    setContactFollowUp('');
    alert('Contact successfully added to CRM Registry.');
  };

  // Invoice Items
  const handleAddItemToInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    const newItem: InvoiceItem = {
      name: newItemName,
      hsn: newItemHsn,
      price: newItemPrice,
      qty: newItemQty,
      gstRate: newItemGst,
    };
    setInvoiceItems([...invoiceItems, newItem]);
  };

  const handleRemoveInvoiceItem = (index: number) => {
    setInvoiceItems(invoiceItems.filter((_, idx) => idx !== index));
  };

  // Calculate totals
  const subTotal = invoiceItems.reduce((acc, item) => acc + (item.price * item.qty), 0);
  const gstTotal = invoiceItems.reduce((acc, item) => acc + ((item.price * item.qty) * (item.gstRate / 100)), 0);
  const grandTotal = subTotal + gstTotal;

  const handleGenerateInvoice = () => {
    setGeneratedPdfData({
      type: invoiceType,
      invoiceNo: invoiceNumber,
      customer: invoiceCustomer,
      date: invoiceDate,
      items: invoiceItems,
      subTotal,
      gstTotal,
      grandTotal,
    });
    // Auto increment serial invoice number
    const prefix = invoiceNumber.split('-').slice(0, -1).join('-');
    const currentNum = parseInt(invoiceNumber.split('-').pop() || '1', 10);
    const nextNum = String(currentNum + 1).padStart(4, '0');
    setInvoiceNumber(`${prefix}-${nextNum}`);
  };

  return (
    <DashboardLayout
      navigationItems={navigationItems}
      user={{ name: 'Gaurav Enterprise', email: 'partner@dealerconnect.in' }}
      topBarProps={{
        pageTitle: 'Sales & CRM OS',
        breadcrumbs: [{ label: 'Cockpit', href: '/dashboard' }, { label: 'Sales OS' }],
        unreadNotifications: 2,
      }}
    >
      <div className="space-y-6 pb-12">
        {/* Header */}
        <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <Greeting />
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">Enterprise Pipeline, CRM & GST Billing System</p>
          </div>

          <div className="flex gap-1.5 bg-[#fff6e6] dark:bg-slate-950 border border-[#f3d9a7] dark:border-slate-800 p-1 rounded-2xl">
            {(['pipeline', 'crm', 'invoicing'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                  activeTab === tab
                    ? 'bg-[#FAB12F] text-slate-950 shadow border border-accent-600/10'
                    : 'text-slate-550 dark:text-slate-400 hover:text-[#1f2937] dark:hover:text-white'
                }`}
              >
                {tab === 'pipeline' ? 'Sales Pipeline' : tab === 'crm' ? 'CRM Relationships' : 'GST Invoice & PDF'}
              </button>
            ))}
          </div>
        </section>

        {/* TAB 1: SALES FUNNEL PIPELINE */}
        {activeTab === 'pipeline' && (
          <div className="space-y-6">
            {/* Sales funnel indicators */}
            <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
              <Card className="rounded-3xl border border-slate-200 dark:border-slate-800 p-5 space-y-1 bg-white dark:bg-slate-900 shadow-sm">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Estimated Pipeline Value</span>
                <span className="text-xl font-black text-slate-850 dark:text-white">₹{leads.reduce((acc, l) => acc + l.value, 0).toLocaleString('en-IN')}</span>
              </Card>
              <Card className="rounded-3xl border border-slate-200 dark:border-slate-800 p-5 space-y-1 bg-white dark:bg-slate-900 shadow-sm">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Closed Won Contracts</span>
                <span className="text-xl font-black text-emerald-600">₹{leads.filter(l => l.status === 'won').reduce((acc, l) => acc + l.value, 0).toLocaleString('en-IN')}</span>
              </Card>
              <Card className="rounded-3xl border border-slate-200 dark:border-slate-800 p-5 space-y-1 bg-white dark:bg-slate-900 shadow-sm">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Active Proposals Sent</span>
                <span className="text-xl font-black text-blue-500">{leads.filter(l => l.status === 'proposal').length} quotes</span>
              </Card>
              <Card className="rounded-3xl border border-slate-200 dark:border-slate-800 p-5 space-y-1 bg-white dark:bg-slate-900 shadow-sm">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Average Conversion Lift</span>
                <span className="text-xl font-black text-[#FAB12F]">18.4%</span>
              </Card>
            </div>

            {/* Kanban Columns */}
            <div className="grid gap-4 md:grid-cols-5 overflow-x-auto pb-4">
              {(['uncontacted', 'contacted', 'proposal', 'won', 'lost'] as const).map((col) => {
                const colLeads = leads.filter((l) => l.status === col);
                return (
                  <div key={col} className="min-w-[200px] rounded-3xl bg-slate-50 dark:bg-slate-950 p-4 border border-slate-200 dark:border-slate-850 space-y-3.5">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800">
                      <span className="text-xs font-black uppercase tracking-wider text-slate-550 dark:text-slate-400">
                        {col === 'uncontacted' ? '📥 New Leads' : col === 'contacted' ? '📞 Contacted' : col === 'proposal' ? '📝 Proposal' : col === 'won' ? '🎉 Won' : '❌ Lost'}
                      </span>
                      <span className="text-[10px] bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-full font-bold">{colLeads.length}</span>
                    </div>

                    <div className="space-y-2">
                      {colLeads.map((lead) => (
                        <Card key={lead.id} className="p-3.5 border border-slate-150 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-sm text-xs space-y-2 hover:shadow transition-shadow">
                          <div>
                            <h4 className="font-black text-slate-850 dark:text-white truncate">{lead.businessName || lead.customerName}</h4>
                            <p className="text-[9px] text-slate-400">{lead.productName}</p>
                          </div>
                          <div className="flex justify-between items-baseline pt-1 border-t border-slate-100 dark:border-slate-800/40">
                            <span className="font-extrabold text-slate-700 dark:text-slate-350">₹{lead.value.toLocaleString('en-IN')}</span>
                            <span className="text-[9px] text-slate-400">{lead.location}</span>
                          </div>

                          <div className="flex justify-between items-center gap-1.5 pt-1.5">
                            <select
                              value={lead.status}
                              onChange={(e) => handleUpdateStatus(lead.id, e.target.value as any)}
                              className="w-full rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 py-1 text-[9px] text-slate-650"
                            >
                              <option value="uncontacted">New Lead</option>
                              <option value="contacted">Contacted</option>
                              <option value="proposal">Proposal</option>
                              <option value="won">Won</option>
                              <option value="lost">Lost</option>
                            </select>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: CRM RELATIONSHIPS */}
        {activeTab === 'crm' && (
          <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
            {/* Contacts registry list */}
            <Card className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl space-y-4">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-550">Relationship Directory</h3>
                <p className="text-xs text-slate-400 mt-1">Manage dealers, wholesalers, retailers, and core buyer profiles.</p>
              </div>

              <div className="space-y-3">
                {contacts.map((contact) => (
                  <div key={contact.id} className="p-4 rounded-2xl border border-slate-150 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 text-xs flex justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-black text-sm text-slate-850 dark:text-white">{contact.businessName}</h4>
                        <span className="bg-amber-500/10 text-[#FAB12F] text-[9px] font-bold px-2 py-0.5 rounded-full">{contact.type}</span>
                      </div>
                      <p className="text-slate-450 font-semibold">{contact.name} • {contact.phone} • {contact.email}</p>
                      <p className="text-slate-500 font-normal leading-relaxed mt-1">{contact.notes}</p>
                    </div>
                    <div className="text-right shrink-0 flex flex-col justify-between">
                      <span className="text-[10px] text-slate-400">{contact.location}</span>
                      {contact.followUpDate && (
                        <span className="text-[9px] text-amber-600 font-bold bg-amber-500/5 border border-amber-500/15 p-1 rounded-lg">📅 Follow up: {contact.followUpDate}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Add Contact Form */}
            <Card className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl space-y-4">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-550">Add CRM Relationship</h3>
                <p className="text-xs text-slate-400 mt-1">Store newly generated trade buyer or logistics contact profiles.</p>
              </div>

              <form onSubmit={handleAddContactSubmit} className="space-y-3 text-xs font-semibold">
                <div className="space-y-1">
                  <label className="text-slate-500">Contact Person Name</label>
                  <input type="text" required value={contactName} onChange={(e) => setContactName(e.target.value)} className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 p-2.5" />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-500">Business Company Name</label>
                  <input type="text" required value={contactBusiness} onChange={(e) => setContactBusiness(e.target.value)} className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 p-2.5" />
                </div>
                <div className="grid gap-3 grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-slate-500">Type Segment</label>
                    <select value={contactType} onChange={(e) => setContactType(e.target.value as any)} className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 p-2.5">
                      <option value="Customer">Customer</option>
                      <option value="Supplier">Supplier</option>
                      <option value="Dealer">Dealer</option>
                      <option value="Wholesaler">Wholesaler</option>
                      <option value="Retailer">Retailer</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-500">Follow-up Date</label>
                    <input type="date" value={contactFollowUp} onChange={(e) => setContactFollowUp(e.target.value)} className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 p-2.5" />
                  </div>
                </div>
                <div className="grid gap-3 grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-slate-500">Mobile Phone</label>
                    <input type="text" required value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 p-2.5" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-500">Email Address</label>
                    <input type="email" required value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 p-2.5" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-slate-500">Location City, State</label>
                  <input type="text" required value={contactLocation} onChange={(e) => setContactLocation(e.target.value)} placeholder="e.g. Pune, MH" className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 p-2.5" />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-500">Relationship Notes</label>
                  <textarea rows={2} required value={contactNotes} onChange={(e) => setContactNotes(e.target.value)} className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 p-2.5 resize-none" />
                </div>
                <button type="submit" className="w-full rounded-2xl bg-[#FAB12F] text-slate-950 font-black py-2.5 text-center shadow-md">Add Contact</button>
              </form>
            </Card>
          </div>
        )}

        {/* TAB 3: GST INVOICE & QUOTATION PDF HUB */}
        {activeTab === 'invoicing' && (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Invoice Form Builder */}
            <Card className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl space-y-4">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-550">GST Invoice & Quotation Hub</h3>
                <p className="text-xs text-slate-400 mt-1">Generate dynamic tax compliant commercial documents in real-time.</p>
              </div>

              <div className="space-y-3.5 text-xs font-semibold">
                <div className="grid gap-3 grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-slate-500">Document Type</label>
                    <select value={invoiceType} onChange={(e) => setInvoiceType(e.target.value as any)} className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 p-2.5">
                      <option value="GST Invoice">GST Invoice</option>
                      <option value="Quotation">Commercial Quotation</option>
                      <option value="Purchase Order">Purchase Order</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-500">Serial Document No.</label>
                    <input type="text" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 p-2.5" />
                  </div>
                </div>

                <div className="grid gap-3 grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-slate-500">Recipient Client / Merchant</label>
                    <input type="text" value={invoiceCustomer} onChange={(e) => setInvoiceCustomer(e.target.value)} className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 p-2.5" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-500">Billing Date</label>
                    <input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 p-2.5" />
                  </div>
                </div>

                {/* Items Add form block */}
                <form onSubmit={handleAddItemToInvoice} className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-2xl space-y-2">
                  <span className="text-[10px] text-slate-450 uppercase font-black tracking-wider block">Add Line Item</span>
                  <div className="grid gap-2 grid-cols-2">
                    <input type="text" placeholder="Item Name" value={newItemName} onChange={(e) => setNewItemName(e.target.value)} className="rounded-lg bg-white dark:bg-slate-900 border border-slate-200 p-2 text-xs" />
                    <input type="text" placeholder="HSN Code" value={newItemHsn} onChange={(e) => setNewItemHsn(e.target.value)} className="rounded-lg bg-white dark:bg-slate-900 border border-slate-200 p-2 text-xs" />
                  </div>
                  <div className="grid gap-2 grid-cols-4">
                    <input type="number" placeholder="Price" value={newItemPrice} onChange={(e) => setNewItemPrice(Number(e.target.value))} className="rounded-lg bg-white dark:bg-slate-900 border border-slate-200 p-2 text-xs text-right" />
                    <input type="number" placeholder="Qty" value={newItemQty} onChange={(e) => setNewItemQty(Number(e.target.value))} className="rounded-lg bg-white dark:bg-slate-900 border border-slate-200 p-2 text-xs text-center" />
                    <select value={newItemGst} onChange={(e) => setNewItemGst(Number(e.target.value))} className="rounded-lg bg-white dark:bg-slate-900 border border-slate-200 p-2 text-xs">
                      <option value={5}>5% GST</option>
                      <option value={12}>12% GST</option>
                      <option value={18}>18% GST</option>
                      <option value={28}>28% GST</option>
                    </select>
                    <button type="submit" className="rounded-lg bg-[#FAB12F] text-slate-950 font-black text-center text-xs">Add</button>
                  </div>
                </form>

                {/* Items in invoice */}
                <div className="space-y-2">
                  <span className="text-[10px] text-slate-450 uppercase tracking-widest block font-black border-b pb-1">Current Invoice Items</span>
                  {invoiceItems.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center p-2 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-850">
                      <div>
                        <p className="font-extrabold text-slate-800 dark:text-slate-200">{item.name} ({item.hsn})</p>
                        <p className="text-[10px] text-slate-400">Qty: {item.qty} • Price: ₹{item.price} • GST: {item.gstRate}%</p>
                      </div>
                      <button onClick={() => handleRemoveInvoiceItem(idx)} className="text-rose-500 font-bold hover:text-rose-600 px-2">✕</button>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleGenerateInvoice}
                  disabled={invoiceItems.length === 0}
                  className="w-full rounded-2xl bg-[#FAB12F] text-slate-950 font-black py-3 text-center shadow-md hover:bg-[#e09e1b] transition-all disabled:opacity-50"
                >
                  Generate Document
                </button>
              </div>
            </Card>

            {/* Document PDF Live Preview Frame */}
            <Card className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl space-y-4">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-550">Dynamic B2B PDF Preview</h3>
                <p className="text-xs text-slate-400 mt-1">Direct corporate billing layout preview.</p>
              </div>

              {generatedPdfData ? (
                <div className="border border-slate-200 dark:border-slate-800 p-5 rounded-2xl bg-[#fefefe] dark:bg-slate-950 text-xs font-semibold text-slate-800 dark:text-slate-100 space-y-4 shadow-inner">
                  {/* Document Header */}
                  <div className="flex justify-between border-b pb-3 text-[11px] text-slate-500 font-extrabold">
                    <div>
                      <h4 className="font-black text-sm text-amber-600">GAURAV ENTERPRISES</h4>
                      <p>GSTIN: 27AAAAA0000A1Z5</p>
                      <p>Pune, Maharashtra</p>
                    </div>
                    <div className="text-right">
                      <h4 className="font-black text-sm uppercase text-slate-900 dark:text-white">{generatedPdfData.type}</h4>
                      <p>No: {generatedPdfData.invoiceNo}</p>
                      <p>Date: {generatedPdfData.date}</p>
                    </div>
                  </div>

                  {/* Recipient info */}
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Billed To:</span>
                    <p className="font-black text-[12px] text-slate-900 dark:text-white">{generatedPdfData.customer}</p>
                  </div>

                  {/* Table */}
                  <table className="w-full text-left text-[11px] border-collapse">
                    <thead>
                      <tr className="border-b text-slate-500 font-bold uppercase">
                        <th className="pb-1.5">Description</th>
                        <th className="pb-1.5 text-center">HSN</th>
                        <th className="pb-1.5 text-center">Qty</th>
                        <th className="pb-1.5 text-right">Price</th>
                        <th className="pb-1.5 text-right">GST</th>
                        <th className="pb-1.5 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {generatedPdfData.items.map((it: any, i: number) => (
                        <tr key={i} className="border-b">
                          <td className="py-2 font-black">{it.name}</td>
                          <td className="py-2 text-center text-slate-500">{it.hsn}</td>
                          <td className="py-2 text-center">{it.qty}</td>
                          <td className="py-2 text-right">₹{it.price}</td>
                          <td className="py-2 text-right text-blue-500">{it.gstRate}%</td>
                          <td className="py-2 text-right font-black">₹{(it.price * it.qty).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Bottom total calculation */}
                  <div className="space-y-1.5 text-right pt-3 border-t text-[11px] text-slate-500">
                    <p>Subtotal: <span className="text-slate-900 dark:text-white font-extrabold">₹{generatedPdfData.subTotal.toLocaleString()}</span></p>
                    <p>IGST Tax Total: <span className="text-slate-900 dark:text-white font-extrabold">₹{generatedPdfData.gstTotal.toLocaleString()}</span></p>
                    <p className="text-[12px] font-black text-slate-900 dark:text-white border-t pt-1.5">
                      Grand Total: ₹{generatedPdfData.grandTotal.toLocaleString()}
                    </p>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2 justify-end pt-4 border-t border-dashed">
                    <button
                      onClick={() => window.print()}
                      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-extrabold px-3 py-2 text-[10px]"
                    >
                      🖨️ Print
                    </button>
                    <button
                      onClick={() => {
                        const jsonStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(generatedPdfData, null, 2));
                        const a = document.createElement('a');
                        a.setAttribute('href', jsonStr);
                        a.setAttribute('download', `${generatedPdfData.invoiceNo}.json`);
                        a.click();
                      }}
                      className="rounded-xl bg-emerald-600 text-white font-extrabold px-3 py-2 text-[10px]"
                    >
                      📥 Download
                    </button>
                  </div>
                </div>
              ) : (
                <div className="border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center text-slate-500 text-xs">
                  Generate invoice or quotation using the builder form on the left.
                </div>
              )}
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

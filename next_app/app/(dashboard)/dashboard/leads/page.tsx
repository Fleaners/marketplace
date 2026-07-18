'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout';
import { Card } from '@/components/ui/Card';
import { navigationItems } from '@/lib/navigation';
import { Greeting } from '@/components/dashboard/Greeting';
import { calculateGST } from '@/lib/gst';

interface ActivityLog {
  type: 'note' | 'stage_change' | 'whatsapp' | 'call' | 'conversion';
  text: string;
  date: string;
}

interface Lead {
  id: string;
  customerName: string;
  businessName?: string;
  productName: string;
  value: number;
  location: string;
  status: 'new' | 'contacted' | 'qualified' | 'negotiation' | 'won' | 'lost';
  date: string;
  phone: string;
  email?: string;
  source: 'Marketplace' | 'RFQ' | 'WhatsApp' | 'Referral' | 'Manual';
  notes?: string;
  assignedTo?: string;
  lastContact?: string;
  followUpDate?: string;
  followUpNote?: string;
  converted?: boolean;
  timeline: ActivityLog[];
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
  gstRate: number;
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [contacts, setContacts] = useState<CRMContact[]>([]);
  const [activeTab, setActiveTab] = useState<'pipeline' | 'crm' | 'invoicing'>('pipeline');
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<'all' | 'new' | 'followup' | 'won' | 'lost'>('all');
  const [sortField, setSortField] = useState<'customerName' | 'value' | 'date' | 'source'>('customerName');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Modals & Details State
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isAddLeadModalOpen, setIsAddLeadModalOpen] = useState(false);
  const [newNoteText, setNewNoteText] = useState('');
  const [newNoteType, setNewNoteType] = useState<ActivityLog['type']>('note');

  // Lead Form builders
  const [formName, setFormName] = useState('');
  const [formBusiness, setFormBusiness] = useState('');
  const [formProduct, setFormProduct] = useState('Copper Core Grounding Wire');
  const [formValue, setFormValue] = useState(5000);
  const [formLocation, setFormLocation] = useState('Mumbai, MH');
  const [formPhone, setFormPhone] = useState('919876543210');
  const [formEmail, setFormEmail] = useState('');
  const [formSource, setFormSource] = useState<Lead['source']>('Manual');
  const [formAssigned, setFormAssigned] = useState('Anil Kumar');
  const [formNotes, setFormNotes] = useState('');

  // CRM Contact builders
  const [contactName, setContactName] = useState('');
  const [contactBusiness, setContactBusiness] = useState('');
  const [contactType, setContactType] = useState<'Customer' | 'Supplier' | 'Dealer' | 'Wholesaler' | 'Retailer'>('Customer');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactLocation, setContactLocation] = useState('');
  const [contactNotes, setContactNotes] = useState('');
  const [contactFollowUp, setContactFollowUp] = useState('');

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
  const [invoiceStateType, setInvoiceStateType] = useState<'intra' | 'inter'>('intra');
  const [generatedPdfData, setGeneratedPdfData] = useState<any | null>(null);

  // Initial Seed
  useEffect(() => {
    try {
      // Load Leads
      const storedLeads = localStorage.getItem('marketplace_leads');
      if (storedLeads) {
        try {
          const parsed = JSON.parse(storedLeads);
          const migrated: Lead[] = parsed.map((l: any) => {
            const status = (l.status || 'new').toLowerCase() as Lead['status'];
            return {
              id: l.id || `LD-${Date.now()}-${Math.random()}`,
              customerName: l.customerName || l.businessName || 'Valued Lead',
              businessName: l.businessName || '',
              productName: l.productName || 'General SKU Product',
              value: Number(l.value) || 0,
              location: l.location || 'India',
              status: ['new', 'contacted', 'qualified', 'negotiation', 'won', 'lost'].includes(status) ? status : 'new',
              date: l.date || new Date().toISOString().split('T')[0],
              phone: l.phone || '919876543210',
              email: l.email || '',
              source: l.source || 'Marketplace',
              notes: l.notes || '',
              assignedTo: l.assignedTo || 'Anil Kumar',
              lastContact: l.lastContact || l.date || new Date().toISOString().split('T')[0],
              followUpDate: l.followUpDate || '',
              followUpNote: l.followUpNote || '',
              converted: !!l.converted,
              timeline: Array.isArray(l.timeline) ? l.timeline : [
                { type: 'note', text: 'Legacy lead imported into CRM.', date: l.date || new Date().toISOString().split('T')[0] }
              ]
            };
          });
          setLeads(migrated);
          localStorage.setItem('marketplace_leads', JSON.stringify(migrated));
        } catch (err) {
          console.error('Failed to parse legacy leads, seeding defaults:', err);
          const defaultLeads: Lead[] = [
            {
              id: 'LD-101',
              customerName: 'Rajesh Sharma',
              businessName: 'Rajesh Electricals',
              productName: 'Copper Core Grounding Wire',
              value: 24000,
              location: 'Nagpur, MH',
              status: 'contacted',
              date: '2026-07-09',
              phone: '919876543210',
              source: 'WhatsApp',
              email: 'rajesh@rajeshelectricals.in',
              assignedTo: 'Anil Kumar',
              lastContact: '2026-07-15',
              followUpDate: new Date().toISOString().split('T')[0],
              followUpNote: 'Discuss price discount for bulk buy.',
              timeline: [
                { type: 'note', text: 'Lead created from WhatsApp click-to-chat.', date: '2026-07-09' },
                { type: 'whatsapp', text: 'Inquired about copper wire wholesale prices.', date: '2026-07-10' },
                { type: 'stage_change', text: 'Stage updated from New to Contacted.', date: '2026-07-12' },
                { type: 'note', text: 'Sent catalog & price list.', date: '2026-07-15' }
              ]
            },
            {
              id: 'LD-102',
              customerName: 'Siddharth Roy',
              businessName: 'Siddharth Pumps Ltd',
              productName: 'Industrial Water Pump',
              value: 145000,
              location: 'Kolkata, WB',
              status: 'negotiation',
              date: '2026-07-10',
              phone: '919876543210',
              source: 'Marketplace',
              email: 'siddharth@roy-pumps.com',
              assignedTo: 'Priya Sharma',
              lastContact: '2026-07-16',
              followUpDate: new Date().toISOString().split('T')[0],
              followUpNote: 'Follow up on the final quote proposal.',
              timeline: [
                { type: 'note', text: 'Lead captured from marketplace quote request.', date: '2026-07-10' },
                { type: 'call', text: 'Called to discuss pump specifications.', date: '2026-07-11' },
                { type: 'stage_change', text: 'Stage updated to Qualified.', date: '2026-07-13' },
                { type: 'stage_change', text: 'Stage updated to Negotiation (Sent proposal with 5% discount).', date: '2026-07-16' }
              ]
            },
            {
              id: 'LD-103',
              customerName: 'Amit Desai',
              businessName: 'Desai Hardware Store',
              productName: 'Brass Coupling Joints (1/2 Inch)',
              value: 1700,
              location: 'Pune, MH',
              status: 'new',
              date: '2026-07-11',
              phone: '919876543210',
              source: 'Referral',
              email: 'amit@desaihardware.com',
              assignedTo: 'Anil Kumar',
              followUpDate: '2026-07-25',
              followUpNote: 'Send catalog next week.',
              timeline: [
                { type: 'note', text: 'Referral logged from Connection Referral Network.', date: '2026-07-11' }
              ]
            }
          ];
          setLeads(defaultLeads);
          localStorage.setItem('marketplace_leads', JSON.stringify(defaultLeads));
        }
      } else {
        const defaultLeads: Lead[] = [
          {
            id: 'LD-101',
            customerName: 'Rajesh Sharma',
            businessName: 'Rajesh Electricals',
            productName: 'Copper Core Grounding Wire',
            value: 24000,
            location: 'Nagpur, MH',
            status: 'contacted',
            date: '2026-07-09',
            phone: '919876543210',
            source: 'WhatsApp',
            email: 'rajesh@rajeshelectricals.in',
            assignedTo: 'Anil Kumar',
            lastContact: '2026-07-15',
            followUpDate: new Date().toISOString().split('T')[0],
            followUpNote: 'Discuss price discount for bulk buy.',
            timeline: [
              { type: 'note', text: 'Lead created from WhatsApp click-to-chat.', date: '2026-07-09' },
              { type: 'whatsapp', text: 'Inquired about copper wire wholesale prices.', date: '2026-07-10' },
              { type: 'stage_change', text: 'Stage updated from New to Contacted.', date: '2026-07-12' },
              { type: 'note', text: 'Sent catalog & price list.', date: '2026-07-15' }
            ]
          },
          {
            id: 'LD-102',
            customerName: 'Siddharth Roy',
            businessName: 'Siddharth Pumps Ltd',
            productName: 'Industrial Water Pump',
            value: 145000,
            location: 'Kolkata, WB',
            status: 'negotiation',
            date: '2026-07-10',
            phone: '919876543210',
            source: 'Marketplace',
            email: 'siddharth@roy-pumps.com',
            assignedTo: 'Priya Sharma',
            lastContact: '2026-07-16',
            followUpDate: new Date().toISOString().split('T')[0],
            followUpNote: 'Follow up on the final quote proposal.',
            timeline: [
              { type: 'note', text: 'Lead captured from marketplace quote request.', date: '2026-07-10' },
              { type: 'call', text: 'Called to discuss pump specifications.', date: '2026-07-11' },
              { type: 'stage_change', text: 'Stage updated to Qualified.', date: '2026-07-13' },
              { type: 'stage_change', text: 'Stage updated to Negotiation (Sent proposal with 5% discount).', date: '2026-07-16' }
            ]
          },
          {
            id: 'LD-103',
            customerName: 'Amit Desai',
            businessName: 'Desai Hardware Store',
            productName: 'Brass Coupling Joints (1/2 Inch)',
            value: 1700,
            location: 'Pune, MH',
            status: 'new',
            date: '2026-07-11',
            phone: '919876543210',
            source: 'Referral',
            email: 'amit@desaihardware.com',
            assignedTo: 'Anil Kumar',
            followUpDate: '2026-07-25',
            followUpNote: 'Send catalog next week.',
            timeline: [
              { type: 'note', text: 'Referral logged from Connection Referral Network.', date: '2026-07-11' }
            ]
          }
        ];
        localStorage.setItem('marketplace_leads', JSON.stringify(defaultLeads));
        setLeads(defaultLeads);
      }

      // Load Contacts
      const storedContacts = localStorage.getItem('marketplace_crm_contacts');
      if (storedContacts) {
        setContacts(JSON.parse(storedContacts));
      } else {
        const defaultContacts: CRMContact[] = [
          { id: 'c-1', name: 'Rajesh Sharma', businessName: 'Rajesh Electricals', type: 'Dealer', phone: '919876543210', email: 'rajesh@rajeshelectricals.in', location: 'Nagpur, MH', notes: 'Interested in bulk copper core wires.', followUpDate: '2026-07-15' },
          { id: 'c-2', name: 'Sid Roy', businessName: 'Siddharth Pumps Ltd', type: 'Customer', phone: '919876543210', email: 'siddharth@roy-pumps.com', location: 'Kolkata, WB', notes: 'Regular buyer of water pumps.', followUpDate: '2026-07-18' },
        ];
        localStorage.setItem('marketplace_crm_contacts', JSON.stringify(defaultContacts));
        setContacts(defaultContacts);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const saveLeads = (list: Lead[]) => {
    setLeads(list);
    localStorage.setItem('marketplace_leads', JSON.stringify(list));
  };

  const saveContacts = (list: CRMContact[]) => {
    setContacts(list);
    localStorage.setItem('marketplace_crm_contacts', JSON.stringify(list));
  };

  // Drag & Drop handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetStatus: Lead['status']) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    handleUpdateStatus(id, targetStatus);
  };

  const handleUpdateStatus = (id: string, newStatus: Lead['status']) => {
    const updated = leads.map((l) => {
      if (l.id === id) {
        if (l.status === newStatus) return l;
        const now = new Date().toISOString().split('T')[0];
        const log: ActivityLog = {
          type: 'stage_change',
          text: `Stage changed from ${l.status.toUpperCase()} to ${newStatus.toUpperCase()}.`,
          date: now
        };
        const u = {
          ...l,
          status: newStatus,
          lastContact: now,
          timeline: [...l.timeline, log]
        };
        if (selectedLead && selectedLead.id === id) {
          setSelectedLead(u);
        }
        return u;
      }
      return l;
    });
    saveLeads(updated);
  };

  // Lead Form Submit (Manual Capture Sourcing)
  const handleAddLeadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newLead: Lead = {
      id: `LD-${Date.now()}`,
      customerName: formName,
      businessName: formBusiness || undefined,
      productName: formProduct,
      value: Number(formValue) || 0,
      location: formLocation,
      status: 'new',
      date: new Date().toISOString().split('T')[0],
      phone: formPhone,
      email: formEmail || undefined,
      source: formSource,
      notes: formNotes || undefined,
      assignedTo: formAssigned,
      timeline: [
        { type: 'note', text: `Lead created manually with source: ${formSource}.`, date: new Date().toISOString().split('T')[0] }
      ]
    };

    saveLeads([newLead, ...leads]);
    setIsAddLeadModalOpen(false);
    // Reset Form
    setFormName('');
    setFormBusiness('');
    setFormValue(5000);
    setFormLocation('Mumbai, MH');
    setFormPhone('919876543210');
    setFormEmail('');
    setFormSource('Manual');
    setFormNotes('');
  };

  // Convert to Customer (unified link, no duplicates)
  const handleConvertToCustomer = (lead: Lead) => {
    // Check if customer already exists in contacts list
    const exists = contacts.find(c => c.phone === lead.phone || (lead.email && c.email === lead.email));
    
    if (exists) {
      alert(`Customer record already exists for ${lead.customerName} (${exists.businessName}). Linked successfully.`);
    } else {
      const newContact: CRMContact = {
        id: `c-${Date.now()}`,
        name: lead.customerName,
        businessName: lead.businessName || lead.customerName,
        type: 'Customer',
        phone: lead.phone,
        email: lead.email || '',
        location: lead.location,
        notes: lead.notes || `Converted from Lead ID ${lead.id}. Product interest: ${lead.productName}.`,
        followUpDate: lead.followUpDate
      };
      const updatedContacts = [newContact, ...contacts];
      saveContacts(updatedContacts);
      alert(`Unified Customer profile successfully created for ${lead.customerName}.`);
    }

    const updatedLeads = leads.map(l => {
      if (l.id === lead.id) {
        const u = {
          ...l,
          converted: true,
          timeline: [...l.timeline, {
            type: 'conversion' as const,
            text: 'Lead converted to unified CRM customer registry record.',
            date: new Date().toISOString().split('T')[0]
          }]
        };
        setSelectedLead(u);
        return u;
      }
      return l;
    });
    saveLeads(updatedLeads);
  };

  // Add note/activity log to lead timeline
  const handleAddTimelineActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead || !newNoteText.trim()) return;

    const log: ActivityLog = {
      type: newNoteType,
      text: newNoteText,
      date: new Date().toISOString().split('T')[0]
    };

    const updatedLeads = leads.map(l => {
      if (l.id === selectedLead.id) {
        const u = {
          ...l,
          lastContact: new Date().toISOString().split('T')[0],
          timeline: [...l.timeline, log]
        };
        setSelectedLead(u);
        return u;
      }
      return l;
    });

    saveLeads(updatedLeads);
    setNewNoteText('');
  };

  // Update lead follow-up details
  const handleUpdateFollowUp = (date: string, note: string) => {
    if (!selectedLead) return;
    const updatedLeads = leads.map(l => {
      if (l.id === selectedLead.id) {
        const u = {
          ...l,
          followUpDate: date || undefined,
          followUpNote: note || undefined
        };
        setSelectedLead(u);
        return u;
      }
      return l;
    });
    saveLeads(updatedLeads);
    alert('Follow-up schedule updated.');
  };

  // Add CRM Contact manually
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
    saveContacts([newContact, ...contacts]);
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

  // Invoice Items Builder
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

  const handleGenerateInvoice = () => {
    // Call the centralized gst calculation helper
    const totals = invoiceItems.reduce((acc, item) => {
      const calc = calculateGST({
        price: item.price,
        quantity: item.qty,
        gstApplicable: true,
        gstSlab: item.gstRate,
        stateType: invoiceStateType
      });
      return {
        subTotal: acc.subTotal + calc.subtotal,
        gstTotal: acc.gstTotal + calc.taxValue,
        grandTotal: acc.grandTotal + calc.total
      };
    }, { subTotal: 0, gstTotal: 0, grandTotal: 0 });

    setGeneratedPdfData({
      type: invoiceType,
      invoiceNo: invoiceNumber,
      customer: invoiceCustomer,
      date: invoiceDate,
      items: invoiceItems,
      subTotal: totals.subTotal,
      gstTotal: totals.gstTotal,
      grandTotal: totals.grandTotal,
    });

    const prefix = invoiceNumber.split('-').slice(0, -1).join('-');
    const currentNum = parseInt(invoiceNumber.split('-').pop() || '1', 10);
    const nextNum = String(currentNum + 1).padStart(4, '0');
    setInvoiceNumber(`${prefix}-${nextNum}`);
  };

  // Nudge check for follow-ups due today or earlier
  const todayStr = new Date().toISOString().split('T')[0];
  const followUpDueLeads = leads.filter(l => 
    l.status !== 'won' && 
    l.status !== 'lost' && 
    l.followUpDate && 
    l.followUpDate <= todayStr
  );

  // Search & Filter Pipeline/List Leads
  const processedLeads = leads.filter((l) => {
    const matchesSearch = 
      (l.customerName || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
      (l.businessName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.productName || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesStage = true;
    if (stageFilter === 'new') {
      matchesStage = l.status === 'new';
    } else if (stageFilter === 'followup') {
      matchesStage = l.status !== 'won' && l.status !== 'lost' && !!l.followUpDate && l.followUpDate <= todayStr;
    } else if (stageFilter === 'won') {
      matchesStage = l.status === 'won';
    } else if (stageFilter === 'lost') {
      matchesStage = l.status === 'lost';
    }

    return matchesSearch && matchesStage;
  });

  // Sorting
  const sortedLeads = [...processedLeads].sort((a, b) => {
    let comp = 0;
    if (sortField === 'customerName') {
      comp = (a.customerName || '').localeCompare(b.customerName || '');
    } else if (sortField === 'value') {
      comp = (a.value || 0) - (b.value || 0);
    } else if (sortField === 'date') {
      comp = (a.date || '').localeCompare(b.date || '');
    } else if (sortField === 'source') {
      comp = (a.source || '').localeCompare(b.source || '');
    }
    return sortOrder === 'asc' ? comp : -comp;
  });

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Helper for consistent status color coding
  const getStageStyle = (status: Lead['status']) => {
    switch (status) {
      case 'won':
        return { border: 'border-l-4 border-emerald-500', text: 'text-emerald-600', badge: 'bg-emerald-500/10 text-emerald-600' };
      case 'lost':
        return { border: 'border-l-4 border-rose-500', text: 'text-rose-500', badge: 'bg-rose-500/10 text-rose-600' };
      case 'new':
        return { border: 'border-l-4 border-blue-500', text: 'text-blue-500', badge: 'bg-blue-500/10 text-blue-600' };
      default:
        return { border: 'border-l-4 border-amber-500', text: 'text-amber-500', badge: 'bg-amber-500/10 text-amber-600' };
    }
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

          <div className="flex gap-1.5 bg-[#fff6e6] dark:bg-slate-950 border border-[#f3d9a7] dark:border-slate-800 p-1 rounded-2xl shrink-0">
            {(['pipeline', 'crm', 'invoicing'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                  activeTab === tab
                    ? 'bg-[#FAB12F] text-slate-950 shadow border border-accent-600/10'
                    : 'text-slate-550 dark:text-slate-400 hover:text-[#1f2937] dark:hover:text-white'
                }`}
              >
                {tab === 'pipeline' ? 'Leads Pipeline' : tab === 'crm' ? 'CRM Relationships' : 'GST Invoice Hub'}
              </button>
            ))}
          </div>
        </section>

        {/* Nudge Banner for follow-ups */}
        {activeTab === 'pipeline' && followUpDueLeads.length > 0 && (
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 text-amber-700 p-4 text-xs font-black uppercase tracking-wider flex items-center gap-2.5 animate-fade-in shadow-inner">
            <span>🔔</span> Nudge: {followUpDueLeads.length} leads require follow-up attention today. Open a lead card to update follow-up schedules.
          </div>
        )}

        {/* TAB 1: SALES FUNNEL PIPELINE CRM */}
        {activeTab === 'pipeline' && (
          <div className="space-y-4">
            
            {/* Search, filters and pipeline controls */}
            <Card className="rounded-3xl border border-[#f3d9a7] dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                  <span className="absolute inset-y-0 left-3 flex items-center text-slate-500 text-sm">🔍</span>
                  <input
                    type="text"
                    placeholder="Search leads by customer, business, product..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 pl-10 pr-4 py-2.5 text-xs text-slate-850 dark:text-slate-200 focus:outline-none focus:border-[#FAB12F] transition-all"
                  />
                </div>

                {/* Controls */}
                <div className="flex flex-wrap items-center gap-3">
                  {/* View Mode Toggle */}
                  <div className="flex bg-[#fff6e6] dark:bg-slate-950 p-1 border border-[#f3d9a7] dark:border-slate-800 rounded-xl">
                    <button 
                      onClick={() => setViewMode('kanban')} 
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'kanban' ? 'bg-[#FAB12F] text-slate-950 font-black' : 'text-slate-500 hover:text-slate-850 dark:hover:text-white'}`}
                    >
                      📊 Kanban
                    </button>
                    <button 
                      onClick={() => setViewMode('list')} 
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'list' ? 'bg-[#FAB12F] text-slate-950 font-black' : 'text-slate-500 hover:text-slate-850 dark:hover:text-white'}`}
                    >
                      📋 List
                    </button>
                  </div>

                  <button
                    onClick={() => setIsAddLeadModalOpen(true)}
                    className="rounded-xl bg-[#FAB12F] text-slate-950 font-black px-4 py-2.5 text-xs shadow-md hover:bg-[#e09e1b] transition-all"
                  >
                    + Add Lead
                  </button>
                </div>
              </div>

              {/* Flat pills filters */}
              <div className="flex flex-wrap gap-1.5 border-t border-slate-100 dark:border-slate-850 pt-3">
                {([
                  { id: 'all', label: 'All Leads' },
                  { id: 'new', label: 'New Inbox' },
                  { id: 'followup', label: 'Follow-Up Due' },
                  { id: 'won', label: 'Won Contracts' },
                  { id: 'lost', label: 'Lost / Churned' }
                ] as const).map((filter) => (
                  <button
                    key={filter.id}
                    onClick={() => setStageFilter(filter.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                      stageFilter === filter.id
                        ? 'bg-slate-950 dark:bg-white text-white dark:text-slate-950 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-955 text-slate-450 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </Card>

            {/* PIPELINE KANBAN VIEW */}
            {viewMode === 'kanban' && (
              <div className="grid gap-4 md:grid-cols-6 overflow-x-auto pb-4">
                {(['new', 'contacted', 'qualified', 'negotiation', 'won', 'lost'] as const).map((col) => {
                  const colLeads = sortedLeads.filter((l) => l.status === col);
                  const colValue = colLeads.reduce((acc, l) => acc + l.value, 0);

                  return (
                    <div 
                      key={col} 
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, col)}
                      className="min-w-[210px] rounded-3xl bg-slate-50 dark:bg-slate-955/50 p-4 border border-slate-200 dark:border-slate-850 space-y-3.5 flex flex-col min-h-[450px]"
                    >
                      {/* Header */}
                      <div className="flex justify-between items-start pb-2 border-b border-slate-200 dark:border-slate-800">
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-550 dark:text-slate-400">
                            {col === 'new' ? '📥 New' : col === 'contacted' ? '📞 Contact' : col === 'qualified' ? '🛡️ Qualify' : col === 'negotiation' ? '📝 Negotiation' : col === 'won' ? '🎉 Won' : '❌ Lost'}
                          </span>
                          <span className="text-[9px] text-slate-400 block font-semibold mt-0.5">₹{colValue.toLocaleString('en-IN')}</span>
                        </div>
                        <span className="text-[10px] bg-slate-200 dark:bg-slate-850 px-2 py-0.5 rounded-full font-bold">{colLeads.length}</span>
                      </div>

                      {/* Leads list */}
                      <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[500px]">
                        {colLeads.length === 0 ? (
                          <div className="h-full flex items-center justify-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl py-12 text-center text-slate-400 text-[10px] italic">
                            Drag deals here
                          </div>
                        ) : (
                          colLeads.map((lead) => {
                            const stageStyle = getStageStyle(lead.status);
                            const isFollowUpOverdue = lead.followUpDate && lead.followUpDate <= todayStr && lead.status !== 'won' && lead.status !== 'lost';
                            return (
                              <Card
                                key={lead.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, lead.id)}
                                onClick={() => setSelectedLead(lead)}
                                className={`p-3.5 bg-white dark:bg-slate-900 rounded-2xl shadow-sm text-xs space-y-2 hover:shadow-md transition-shadow cursor-pointer relative ${stageStyle.border} ${
                                  isFollowUpOverdue ? 'ring-1 ring-amber-400' : 'border-slate-150 dark:border-slate-800'
                                }`}
                              >
                                <div className="flex justify-between items-start gap-1">
                                  <h4 className="font-black text-slate-850 dark:text-white truncate max-w-[120px]">{lead.businessName || lead.customerName}</h4>
                                  <span className="text-[8px] bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-1.5 py-0.5 rounded font-black uppercase text-slate-500">{lead.source}</span>
                                </div>
                                <p className="text-[9px] text-slate-400 font-semibold truncate">{lead.productName}</p>
                                
                                <div className="flex justify-between items-baseline pt-1.5 border-t border-slate-100 dark:border-slate-800/40 text-[9px]">
                                  <span className="font-extrabold text-slate-700 dark:text-slate-300">₹{lead.value.toLocaleString('en-IN')}</span>
                                  <span className="text-slate-400 font-medium">{lead.location.split(',')[0]}</span>
                                </div>

                                {isFollowUpOverdue && (
                                  <div className="text-[8px] font-black text-amber-600 bg-amber-50 dark:bg-amber-955/20 p-1 rounded border border-amber-200/50 mt-1 uppercase text-center animate-pulse">
                                    ⚠️ Action Due
                                  </div>
                                )}
                              </Card>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ALTERNATIVE LIST VIEW */}
            {viewMode === 'list' && (
              <Card className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
                      <tr>
                        <th onClick={() => toggleSort('customerName')} className="py-4 px-5 cursor-pointer hover:text-slate-700">Client / Company Name {sortField === 'customerName' && (sortOrder === 'asc' ? '▲' : '▼')}</th>
                        <th className="py-4 px-5">Product Interest</th>
                        <th onClick={() => toggleSort('source')} className="py-4 px-5 text-center cursor-pointer hover:text-slate-700">Source {sortField === 'source' && (sortOrder === 'asc' ? '▲' : '▼')}</th>
                        <th className="py-4 px-5 text-center">Stage</th>
                        <th onClick={() => toggleSort('value')} className="py-4 px-5 text-right cursor-pointer hover:text-slate-700">Est. Value (₹) {sortField === 'value' && (sortOrder === 'asc' ? '▲' : '▼')}</th>
                        <th onClick={() => toggleSort('date')} className="py-4 px-5 text-center cursor-pointer hover:text-slate-700">Captured Date {sortField === 'date' && (sortOrder === 'asc' ? '▲' : '▼')}</th>
                        <th className="py-4 px-5 text-center">Assigned rep</th>
                        <th className="py-4 px-5 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150 dark:divide-slate-800/80 font-semibold text-slate-800 dark:text-slate-200">
                      {sortedLeads.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="text-center py-12 text-slate-400 font-bold">
                            No deals match the filtering parameters.
                          </td>
                        </tr>
                      ) : (
                        sortedLeads.map((lead) => {
                          const stageStyle = getStageStyle(lead.status);
                          return (
                            <tr key={lead.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">
                              <td className="py-4 px-5">
                                <span onClick={() => setSelectedLead(lead)} className="font-black text-slate-900 dark:text-white hover:text-amber-500 cursor-pointer block">{lead.businessName || lead.customerName}</span>
                                <span className="text-[10px] text-slate-400 block mt-0.5">{lead.customerName}</span>
                              </td>
                              <td className="py-4 px-5 text-slate-700 dark:text-slate-350">{lead.productName}</td>
                              <td className="py-4 px-5 text-center">
                                <span className="text-[10px] bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2 py-0.5 rounded font-black text-slate-500">{lead.source}</span>
                              </td>
                              <td className="py-4 px-5 text-center">
                                <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${stageStyle.badge}`}>
                                  {lead.status}
                                </span>
                              </td>
                              <td className="py-4 px-5 text-right font-black">₹{lead.value.toLocaleString('en-IN')}</td>
                              <td className="py-4 px-5 text-center font-mono text-slate-500">{lead.date}</td>
                              <td className="py-4 px-5 text-center font-bold text-slate-500">{lead.assignedTo || 'Anil Kumar'}</td>
                              <td className="py-4 px-5 text-center">
                                <button 
                                  onClick={() => setSelectedLead(lead)}
                                  className="rounded-lg border border-[#f3d9a7] bg-[#fff6e6] dark:bg-slate-950 text-[#FAB12F] font-bold px-2 py-1 text-[10px] hover:bg-slate-50 dark:hover:bg-slate-800"
                                >
                                  View CRM Specs
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {/* Empty state nudge */}
            {leads.length === 0 && (
              <div className="rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 p-16 text-center space-y-4">
                <span className="text-4xl block">🤝</span>
                <h4 className="text-slate-800 dark:text-white font-black text-sm uppercase">No leads yet</h4>
                <p className="text-slate-500 max-w-sm mx-auto text-xs leading-normal">Leads from marketplace inquiries and WhatsApp click-to-chat will appear here automatically.</p>
                <button
                  onClick={() => setIsAddLeadModalOpen(true)}
                  className="rounded-xl bg-[#FAB12F] text-slate-955 font-black px-4 py-2 text-xs shadow"
                >
                  Create Manual Lead
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: CRM RELATIONSHIPS */}
        {activeTab === 'crm' && (
          <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
            <Card className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl space-y-4">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-550">Relationship Directory</h3>
                <p className="text-xs text-slate-400 mt-1">Manage unified trade customers, suppliers, and dealers without duplicate records.</p>
              </div>

              <div className="space-y-3">
                {contacts.map((contact) => (
                  <div key={contact.id} className="p-4 rounded-2xl border border-slate-150 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-955 text-xs flex justify-between gap-4">
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
                        <span className="text-[9px] text-amber-600 font-bold bg-amber-500/5 border border-amber-500/15 p-1 rounded-lg">📅 Nudge: {contact.followUpDate}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Add Contact form */}
            <Card className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl space-y-4">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-555">Add CRM Relationship</h3>
                <p className="text-xs text-slate-400 mt-1 font-semibold">Store newly generated trade buyer or logistics contact profiles.</p>
              </div>

              <form onSubmit={handleAddContactSubmit} className="space-y-3 text-xs font-semibold">
                <div className="space-y-1">
                  <label className="text-slate-500">Contact Person Name</label>
                  <input type="text" required value={contactName} onChange={(e) => setContactName(e.target.value)} className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 p-2.5 dark:text-slate-100" />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-500">Business Company Name</label>
                  <input type="text" required value={contactBusiness} onChange={(e) => setContactBusiness(e.target.value)} className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 p-2.5 dark:text-slate-100" />
                </div>
                <div className="grid gap-3 grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-slate-505">Type Segment</label>
                    <select value={contactType} onChange={(e) => setContactType(e.target.value as any)} className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 p-2.5 dark:text-slate-100">
                      <option value="Customer">Customer</option>
                      <option value="Supplier">Supplier</option>
                      <option value="Dealer">Dealer</option>
                      <option value="Wholesaler">Wholesaler</option>
                      <option value="Retailer">Retailer</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-505">Follow-up Date</label>
                    <input type="date" value={contactFollowUp} onChange={(e) => setContactFollowUp(e.target.value)} className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 p-2.5 dark:text-slate-100" />
                  </div>
                </div>
                <div className="grid gap-3 grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-slate-500">Mobile Phone</label>
                    <input type="text" required value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 p-2.5 dark:text-slate-100" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-500">Email Address</label>
                    <input type="email" required value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 p-2.5 dark:text-slate-100" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-slate-500">Location City, State</label>
                  <input type="text" required value={contactLocation} onChange={(e) => setContactLocation(e.target.value)} placeholder="e.g. Pune, MH" className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 p-2.5 dark:text-slate-100" />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-500">Relationship Notes</label>
                  <textarea rows={2} required value={contactNotes} onChange={(e) => setContactNotes(e.target.value)} className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 p-2.5 resize-none dark:text-slate-100" />
                </div>
                <button type="submit" className="w-full rounded-2xl bg-[#FAB12F] text-slate-955 font-black py-2.5 text-center shadow-md hover:bg-[#e09e1b] transition-all">Add Relationship</button>
              </form>
            </Card>
          </div>
        )}

        {/* TAB 3: GST INVOICE HUB */}
        {activeTab === 'invoicing' && (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl space-y-4">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-555">GST Invoice & Quotation Hub</h3>
                <p className="text-xs text-slate-400 mt-1">Generate dynamic tax compliant commercial documents in real-time.</p>
              </div>

              <div className="space-y-3.5 text-xs font-semibold">
                <div className="grid gap-3 grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-slate-500">Document Type</label>
                    <select value={invoiceType} onChange={(e) => setInvoiceType(e.target.value as any)} className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 p-2.5 dark:text-slate-100">
                      <option value="GST Invoice">GST Invoice</option>
                      <option value="Quotation">Commercial Quotation</option>
                      <option value="Purchase Order">Purchase Order</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-500">Serial Document No.</label>
                    <input type="text" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 p-2.5 dark:text-slate-100" />
                  </div>
                </div>

                <div className="grid gap-3 grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-slate-500">Recipient Client / Merchant</label>
                    <input type="text" value={invoiceCustomer} onChange={(e) => setInvoiceCustomer(e.target.value)} className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 p-2.5 dark:text-slate-100" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-500">Billing Date</label>
                    <input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 p-2.5 dark:text-slate-100" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-500">Buyer State Code type</label>
                  <select value={invoiceStateType} onChange={(e) => setInvoiceStateType(e.target.value as any)} className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 p-2.5 focus:outline-none dark:text-slate-100">
                    <option value="intra">Intra-State (Maharashtra: CGST + SGST)</option>
                    <option value="inter">Inter-State (IGST Compliant)</option>
                  </select>
                </div>

                {/* Items Add form block */}
                <form onSubmit={handleAddItemToInvoice} className="p-3 bg-slate-50 dark:bg-slate-955 border border-slate-150 dark:border-slate-800 rounded-2xl space-y-2">
                  <span className="text-[10px] text-slate-450 uppercase font-black tracking-wider block">Add Line Item</span>
                  <div className="grid gap-2 grid-cols-2">
                    <input type="text" placeholder="Item Name" value={newItemName} onChange={(e) => setNewItemName(e.target.value)} className="rounded-lg bg-white dark:bg-slate-900 border border-slate-200 p-2 text-xs dark:text-slate-100 dark:border-slate-800" />
                    <input type="text" placeholder="HSN Code" value={newItemHsn} onChange={(e) => setNewItemHsn(e.target.value)} className="rounded-lg bg-white dark:bg-slate-900 border border-slate-200 p-2 text-xs dark:text-slate-100 dark:border-slate-800" />
                  </div>
                  <div className="grid gap-2 grid-cols-4">
                    <input type="number" placeholder="Price" value={newItemPrice} onChange={(e) => setNewItemPrice(Number(e.target.value))} className="rounded-lg bg-white dark:bg-slate-900 border border-slate-200 p-2 text-xs text-right dark:text-slate-100 dark:border-slate-800" />
                    <input type="number" placeholder="Qty" value={newItemQty} onChange={(e) => setNewItemQty(Number(e.target.value))} className="rounded-lg bg-white dark:bg-slate-900 border border-slate-200 p-2 text-xs text-center dark:text-slate-100 dark:border-slate-800" />
                    <select value={newItemGst} onChange={(e) => setNewItemGst(Number(e.target.value))} className="rounded-lg bg-white dark:bg-slate-900 border border-slate-200 p-2 text-xs dark:text-slate-100 dark:border-slate-800">
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
                    <div key={idx} className="flex justify-between items-center p-2 bg-slate-50 dark:bg-slate-955 rounded-xl border border-slate-100 dark:border-slate-850">
                      <div>
                        <p className="font-extrabold text-slate-800 dark:text-slate-200">{item.name} ({item.hsn})</p>
                        <p className="text-[10px] text-slate-450">Qty: {item.qty} • Price: ₹{item.price} • GST: {item.gstRate}%</p>
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
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-555">Dynamic B2B PDF Preview</h3>
                <p className="text-xs text-slate-400 mt-1">Direct corporate billing layout preview.</p>
              </div>

              {generatedPdfData ? (
                <div className="border border-slate-200 dark:border-slate-800 p-5 rounded-2xl bg-[#fefefe] dark:bg-slate-950 text-xs font-semibold text-slate-850 dark:text-slate-100 space-y-4 shadow-inner">
                  {/* Document Header */}
                  <div className="flex justify-between border-b pb-3 text-[11px] text-slate-500 font-extrabold">
                    <div>
                      <h4 className="font-black text-sm text-[#ea580c] dark:text-[#FAB12F]">GAURAV ENTERPRISES</h4>
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
                  <table className="w-full text-left text-[11px] border-collapse font-sans font-medium">
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
                          <td className="py-2 text-center text-slate-500 font-mono">{it.hsn}</td>
                          <td className="py-2 text-center font-mono">{it.qty}</td>
                          <td className="py-2 text-right font-mono">₹{it.price}</td>
                          <td className="py-2 text-right text-blue-500 font-mono">{it.gstRate}%</td>
                          <td className="py-2 text-right font-black font-mono">₹{(it.price * it.qty).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Bottom total calculation */}
                  <div className="space-y-1.5 text-right pt-3 border-t text-[11px] text-slate-500 font-mono">
                    <p>Subtotal: <span className="text-slate-900 dark:text-white font-extrabold">₹{generatedPdfData.subTotal.toLocaleString()}</span></p>
                    <p>{invoiceStateType === 'intra' ? 'CGST+SGST' : 'IGST'} Tax Total: <span className="text-slate-900 dark:text-white font-extrabold">₹{generatedPdfData.gstTotal.toLocaleString()}</span></p>
                    <p className="text-[12px] font-black text-slate-900 dark:text-white border-t pt-1.5">
                      Grand Total: ₹{generatedPdfData.grandTotal.toLocaleString()}
                    </p>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2 justify-end pt-4 border-t border-dashed">
                    <button
                      onClick={() => window.print()}
                      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-350 font-extrabold px-3 py-2 text-[10px]"
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

      {/* Add Lead Modal Overlay */}
      {isAddLeadModalOpen && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-[32px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center pb-2 border-b border-slate-150 dark:border-slate-800">
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Create Manual Lead Profile</h3>
              <button onClick={() => setIsAddLeadModalOpen(false)} className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-500">✕</button>
            </div>

            <form onSubmit={handleAddLeadSubmit} className="space-y-4 text-xs font-semibold">
              <div className="grid gap-4 grid-cols-2">
                <div className="space-y-1">
                  <label className="text-slate-505">Client/Contact Person Name</label>
                  <input type="text" required value={formName} onChange={(e) => setFormName(e.target.value)} className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 p-2.5 focus:outline-none dark:text-slate-100" />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-505">Business Company Name</label>
                  <input type="text" value={formBusiness} onChange={(e) => setFormBusiness(e.target.value)} className="w-full rounded-xl bg-slate-50 dark:bg-slate-955 border border-slate-200 p-2.5 focus:outline-none dark:text-slate-100" />
                </div>
              </div>

              <div className="grid gap-4 grid-cols-2">
                <div className="space-y-1">
                  <label className="text-slate-550">Product Name Interest</label>
                  <select value={formProduct} onChange={(e) => setFormProduct(e.target.value)} className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 p-2.5 focus:outline-none dark:text-slate-100">
                    <option value="Copper Core Grounding Wire">Copper Core Grounding Wire</option>
                    <option value="Industrial Water Pump">Industrial Water Pump</option>
                    <option value="Brass Coupling Joints (1/2 Inch)">Brass Coupling Joints (1/2 Inch)</option>
                    <option value="Heavy Duty Adhesive Sealant">Heavy Duty Adhesive Sealant</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-slate-550">Estimated Contract Value (₹)</label>
                  <input type="number" required value={formValue} onChange={(e) => setFormValue(Number(e.target.value) || 0)} className="w-full rounded-xl bg-slate-50 dark:bg-slate-955 border border-slate-200 p-2.5 focus:outline-none dark:text-slate-100" />
                </div>
              </div>

              <div className="grid gap-4 grid-cols-3">
                <div className="space-y-1">
                  <label className="text-slate-505">Capture Lead Source</label>
                  <select value={formSource} onChange={(e) => setFormSource(e.target.value as any)} className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 p-2.5 focus:outline-none dark:text-slate-100">
                    <option value="Manual">Manual Add (Offline)</option>
                    <option value="Marketplace">Marketplace Inquiry</option>
                    <option value="RFQ">RFQ Proposal</option>
                    <option value="WhatsApp">WhatsApp Inbound</option>
                    <option value="Referral">Connection Referral</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-slate-505">Assigned Rep</label>
                  <input type="text" value={formAssigned} onChange={(e) => setFormAssigned(e.target.value)} className="w-full rounded-xl bg-slate-50 dark:bg-slate-955 border border-slate-200 p-2.5 focus:outline-none dark:text-slate-100" />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-505">Location (City, State)</label>
                  <input type="text" required value={formLocation} onChange={(e) => setFormLocation(e.target.value)} placeholder="e.g. Pune, MH" className="w-full rounded-xl bg-slate-50 dark:bg-slate-955 border border-slate-200 p-2.5 focus:outline-none dark:text-slate-100" />
                </div>
              </div>

              <div className="grid gap-4 grid-cols-2">
                <div className="space-y-1">
                  <label className="text-slate-500">Mobile Phone</label>
                  <input type="text" required value={formPhone} onChange={(e) => setFormPhone(e.target.value)} className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 p-2.5 focus:outline-none dark:text-slate-100" />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-500">Email Address (Optional)</label>
                  <input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 p-2.5 focus:outline-none dark:text-slate-100" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-505">Lead Inbound Description/Notes</label>
                <textarea rows={3} value={formNotes} onChange={(e) => setFormNotes(e.target.value)} className="w-full rounded-xl bg-slate-50 dark:bg-slate-955 border border-slate-200 p-2.5 resize-none dark:text-slate-100 dark:border-slate-800" />
              </div>

              <button type="submit" className="w-full rounded-2xl bg-[#FAB12F] text-slate-950 font-black py-3 text-center shadow-md hover:bg-[#e09e1b] transition-all">Record Lead Profile</button>
            </form>
          </div>
        </div>
      )}

      {/* Upgraded CRM Lead Detail Drawer Overlay (Single-page control panel) */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm overflow-y-auto" onClick={() => setSelectedLead(null)}>
          <div className="w-full max-w-4xl rounded-[32px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto space-y-6" onClick={(e) => e.stopPropagation()}>
            
            {/* Header */}
            <div className="flex justify-between items-center pb-3 border-b border-slate-150 dark:border-slate-800">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider">Lead Record Cockpit: {selectedLead.customerName}</h3>
                <p className="text-xs text-slate-450 mt-1">Lead ID: {selectedLead.id} • Sourced from: <span className="font-bold text-[#FAB12F]">{selectedLead.source}</span></p>
              </div>
              <button onClick={() => setSelectedLead(null)} className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-250 flex items-center justify-center text-xs font-bold text-slate-500">✕</button>
            </div>

            {/* Split content */}
            <div className="grid gap-6 md:grid-cols-2 text-xs">
              
              {/* Left Column: Contact details & Timeline */}
              <div className="space-y-4">
                
                {/* Contact specs */}
                <div className="bg-slate-50/50 dark:bg-slate-950/40 p-4 rounded-3xl border border-slate-150 dark:border-slate-850 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-sm font-black text-slate-900 dark:text-white leading-tight">{selectedLead.businessName || 'Independent buyer'}</h4>
                      <p className="text-slate-450 font-bold mt-1">{selectedLead.customerName} • {selectedLead.location}</p>
                    </div>

                    {/* WhatsApp/Call Actions */}
                    <div className="flex gap-1.5 shrink-0">
                      <button
                        onClick={() => window.open(`https://wa.me/${selectedLead.phone}?text=Hello%20${selectedLead.customerName},%20this%2520is%2520Gaurav%2520Enterprises%2520regarding%2520your%2520inquiry%2520for%2520${selectedLead.productName}...`)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-2.5 py-1.5 font-bold text-[10px] shadow-sm flex items-center gap-1 transition-all"
                      >
                        💬 WhatsApp
                      </button>
                      <a
                        href={`tel:${selectedLead.phone}`}
                        className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-350 hover:bg-slate-50 rounded-xl px-2.5 py-1.5 font-bold text-[10px] shadow-sm flex items-center justify-center transition-all"
                      >
                        📞 Call
                      </a>
                    </div>
                  </div>

                  <div className="grid gap-2 grid-cols-2 pt-2 border-t border-slate-250 dark:border-slate-850 font-semibold text-slate-650 dark:text-slate-350">
                    <p>📧 Email: <span className="font-extrabold text-slate-850 dark:text-white">{selectedLead.email || 'N/A'}</span></p>
                    <p>📞 Phone: <span className="font-extrabold text-slate-850 dark:text-white font-mono">{selectedLead.phone}</span></p>
                    <p>📦 Interest: <span className="font-extrabold text-slate-855 dark:text-white">{selectedLead.productName}</span></p>
                    <p>💰 Est. Value: <span className="font-extrabold text-slate-855 dark:text-white">₹{selectedLead.value.toLocaleString()}</span></p>
                    <p>👤 Owner Rep: <span className="font-extrabold text-slate-855 dark:text-white">{selectedLead.assignedTo || 'Anil Kumar'}</span></p>
                    <p>📅 Inbound Date: <span className="font-extrabold text-slate-855 dark:text-white font-mono">{selectedLead.date}</span></p>
                  </div>
                </div>

                {/* Timeline activity logger */}
                <div className="space-y-3">
                  <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider block">CRM Domain Activity Timeline</span>
                  
                  {/* Timeline listing */}
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {selectedLead.timeline.map((act, i) => (
                      <div key={i} className="p-2.5 border border-slate-100 dark:border-slate-850 bg-white dark:bg-slate-900 rounded-2xl space-y-1 shadow-sm">
                        <div className="flex justify-between items-center text-[9px] font-black uppercase text-slate-400">
                          <span>
                            {act.type === 'note' ? '📝 Note Added' : act.type === 'stage_change' ? '⚙️ Stage Change' : act.type === 'whatsapp' ? '💬 WhatsApp' : act.type === 'conversion' ? '🎉 Conversion' : '📞 Call Log'}
                          </span>
                          <span className="font-mono">{act.date}</span>
                        </div>
                        <p className="font-medium text-slate-700 dark:text-slate-300 leading-normal">{act.text}</p>
                      </div>
                    ))}
                  </div>

                  {/* Add activity form */}
                  <form onSubmit={handleAddTimelineActivity} className="p-3 bg-slate-50 dark:bg-slate-955 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                    <span className="text-[9px] text-slate-450 uppercase font-black tracking-wider block">Log Activity</span>
                    <div className="flex gap-2">
                      <select 
                        value={newNoteType} 
                        onChange={(e) => setNewNoteType(e.target.value as any)} 
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 text-[10px] font-bold dark:text-slate-200 focus:outline-none"
                      >
                        <option value="note">Note</option>
                        <option value="call">Call log</option>
                        <option value="whatsapp">WhatsApp log</option>
                      </select>
                      <input 
                        type="text" 
                        placeholder="Log details..." 
                        value={newNoteText}
                        onChange={(e) => setNewNoteText(e.target.value)}
                        className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 text-[10px] focus:outline-none dark:text-slate-100"
                      />
                      <button type="submit" className="bg-[#FAB12F] text-slate-950 font-black px-3.5 rounded-lg text-[10px] shadow-xs">Log</button>
                    </div>
                  </form>
                </div>
              </div>

              {/* Right Column: Follow-up controls & Convert Unified Customer Record */}
              <div className="space-y-4">
                
                {/* Follow up Nudge config */}
                <Card className="p-4 border border-[#f3d9a7]/60 dark:border-slate-800 bg-[#fff6e6]/20 dark:bg-slate-950/20 rounded-3xl space-y-3">
                  <span className="text-[10px] uppercase font-black text-slate-500 tracking-wider block">📅 Next Action Follow-Up Schedule</span>
                  <div className="grid gap-2 grid-cols-2">
                    <div>
                      <label className="text-[10px] text-slate-400 block font-bold mb-1">Follow-up Date</label>
                      <input 
                        type="date" 
                        value={selectedLead.followUpDate || ''} 
                        onChange={(e) => handleUpdateFollowUp(e.target.value, selectedLead.followUpNote || '')}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 text-xs font-bold dark:text-slate-100" 
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block font-bold mb-1">Follow-up Task Note</label>
                      <input 
                        type="text" 
                        placeholder="Enter action note..."
                        value={selectedLead.followUpNote || ''} 
                        onChange={(e) => handleUpdateFollowUp(selectedLead.followUpDate || '', e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 text-xs font-bold dark:text-slate-100" 
                      />
                    </div>
                  </div>
                </Card>

                {/* Pipeline Stage buttons control */}
                <Card className="p-4 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 rounded-3xl space-y-3">
                  <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider block">Pipeline Stage Progression</span>
                  <div className="grid grid-cols-3 gap-1.5 text-center font-bold">
                    {[
                      { id: 'new', label: 'New' },
                      { id: 'contacted', label: 'Contacted' },
                      { id: 'qualified', label: 'Qualified' },
                      { id: 'negotiation', label: 'Negotiate' },
                      { id: 'won', label: 'Won' },
                      { id: 'lost', label: 'Lost' }
                    ].map((stage) => {
                      const isActive = selectedLead.status === stage.id;
                      return (
                        <button
                          key={stage.id}
                          type="button"
                          onClick={() => handleUpdateStatus(selectedLead.id, stage.id as any)}
                          className={`py-2 rounded-xl text-[10px] leading-tight transition-all border ${
                            isActive
                              ? 'bg-[#FAB12F]/15 border-accent-500 text-amber-700 font-extrabold shadow-sm'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50'
                          }`}
                        >
                          {stage.label}
                        </button>
                      );
                    })}
                  </div>
                </Card>

                {/* AI Win-Rate Diagnostics Nudge Panel (Discover-Learn-Test-Improve) */}
                <Card className="p-4 border border-slate-200 dark:border-slate-850 bg-slate-50/20 dark:bg-slate-955/15 rounded-3xl space-y-3">
                  <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider block">🧠 AI Sourcing & Win-Rate Diagnostics</span>
                  
                  {(() => {
                    const isWhatsapp = selectedLead.source === 'WhatsApp';
                    const winChance = isWhatsapp ? '78%' : selectedLead.source === 'Referral' ? '82%' : '48%';
                    const urgencyMsg = isWhatsapp 
                      ? 'WhatsApp channels deplete faster. Recommend WhatsApp messaging follow-up within 24 hours.' 
                      : 'Standard pipeline duration leads require catalog quote submissions.';

                    return (
                      <div className="space-y-2 leading-relaxed text-[11px] font-semibold text-slate-700 dark:text-slate-350">
                        <p>🔹 <strong>DISCOVER:</strong> Sourced via <span className="font-extrabold">{selectedLead.source}</span>. Deal value calculated at ₹{selectedLead.value.toLocaleString()} targeting {selectedLead.productName}.</p>
                        <p>🔹 <strong>LEARN:</strong> Sourced inquiries from {selectedLead.source} convert average 2.4x faster than marketplace forms.</p>
                        <p>🔹 <strong>TEST:</strong> Win-rate projection: <span className="text-emerald-600 font-extrabold">{winChance} conversion probability</span> (Confidence: High).</p>
                        <p>🔹 <strong>IMPROVE:</strong> Nudge: {urgencyMsg}</p>
                      </div>
                    );
                  })()}
                </Card>

                {/* Convert to customer action */}
                {selectedLead.status === 'won' && (
                  <div className="pt-2">
                    {selectedLead.converted ? (
                      <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 p-4 rounded-3xl text-center font-extrabold uppercase animate-fade-in">
                        ✓ Converted to CRM Customer Registry Profile
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleConvertToCustomer(selectedLead)}
                        className="w-full bg-[#FAB12F] text-slate-950 font-black py-3 rounded-2xl text-center shadow-md hover:bg-[#e09e1b] transition-all text-xs"
                      >
                        🤝 Convert to CRM Customer
                      </button>
                    )}
                  </div>
                )}

              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

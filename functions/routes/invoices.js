import express from 'express';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import PDFDocument from 'pdfkit';
import { verifyToken } from '../middleware/auth.js';
import { rejectUnknownBodyFields, requireString, optionalNumber, optionalArray } from '../middleware/validation.js';

const router = express.Router();

function getDb() {
  return getFirestore();
}

router.use(verifyToken);

// Get all invoices for business
router.get('/', async (req, res, next) => {
  try {
    const db = getDb();
    const businessId = req.user?.businessId;
    if (!businessId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const snapshot = await db
      .collection('businesses')
      .doc(businessId)
      .collection('invoices')
      .orderBy('created_at', 'desc')
      .get();
    
    const invoices = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(invoices);
  } catch (error) {
    next(error);
  }
});

// Create invoice
router.post(
  '/',
  rejectUnknownBodyFields(['customerName', 'customerPhone', 'items', 'gstAmount', 'subtotal', 'total']),
  requireString('customerName', { min: 1, max: 200 }),
  requireString('customerPhone', { min: 6, max: 20 }),
  optionalArray('items', { maxLength: 200 }),
  optionalNumber('gstAmount', { min: 0, max: 1e9 }),
  optionalNumber('subtotal', { min: 0, max: 1e9 }),
  optionalNumber('total', { min: 0, max: 1e9 }),
  async (req, res, next) => {
  try {
    const db = getDb();
    const businessId = req.user?.businessId;
    if (!businessId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { customerName, customerPhone, items, gstAmount, subtotal, total } = req.body;
    
    // Create invoice
    const invoiceRef = await db
      .collection('businesses')
      .doc(businessId)
      .collection('invoices')
      .add({
        customer_name: customerName,
        customer_phone: customerPhone,
        subtotal: parseFloat(subtotal) || 0,
        gst_amount: parseFloat(gstAmount) || 0,
        total: parseFloat(total) || 0,
        created_at: FieldValue.serverTimestamp(),
      });
    
    // Add items
    if (items && Array.isArray(items)) {
      for (const item of items) {
        await invoiceRef.collection('items').add({
          product_id: item.productId,
          description: item.description,
          quantity: parseInt(item.quantity) || 1,
          price: parseFloat(item.price) || 0,
        });
      }
    }
    
    res.status(201).json({ id: invoiceRef.id, message: 'Invoice created' });
  } catch (error) {
    next(error);
  }
});

// Get invoice by ID
router.get('/:id', async (req, res, next) => {
  try {
    const db = getDb();
    const businessId = req.user?.businessId;
    if (!businessId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const doc = await db
      .collection('businesses')
      .doc(businessId)
      .collection('invoices')
      .doc(req.params.id)
      .get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    const itemsSnapshot = await doc.ref.collection('items').get();
    const items = itemsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    
    res.json({ id: doc.id, ...doc.data(), items });
  } catch (error) {
    next(error);
  }
});

// Generate PDF for invoice
router.get('/:id/pdf', async (req, res, next) => {
  try {
    const db = getDb();
    const businessId = req.user?.businessId;
    if (!businessId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const invoiceDoc = await db
      .collection('businesses')
      .doc(businessId)
      .collection('invoices')
      .doc(req.params.id)
      .get();
    
    if (!invoiceDoc.exists) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    const businessDoc = await db.collection('businesses').doc(businessId).get();
    const invoiceData = invoiceDoc.data();
    const itemsSnapshot = await invoiceDoc.ref.collection('items').get();
    const items = itemsSnapshot.docs.map(d => d.data());
    
    // Create PDF
    const pdf = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    const safeInvoiceId = String(req.params.id || '').replace(/[^a-zA-Z0-9_-]/g, '');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${safeInvoiceId || 'document'}.pdf"`);
    
    pdf.pipe(res);
    
    // Add content
    pdf.fontSize(20).text(businessDoc.data().shop_name, { align: 'center' });
    pdf.fontSize(12).text('INVOICE', { align: 'center' }).moveDown();
    
    pdf.fontSize(10)
      .text(`Invoice #: ${req.params.id}`)
      .text(`Date: ${new Date(invoiceData.created_at.toDate()).toLocaleDateString()}`);
    
    pdf.moveDown();
    pdf.text(`Customer: ${invoiceData.customer_name}`)
      .text(`Phone: ${invoiceData.customer_phone}`);
    
    pdf.moveDown();
    pdf.text('Items:', { underline: true });
    
    items.forEach(item => {
      pdf.fontSize(9).text(
        `${item.description} x ${item.quantity} @ ${item.price} = ${item.quantity * item.price}`
      );
    });
    
    pdf.moveDown();
    pdf.text(`Subtotal: ${invoiceData.subtotal}`);
    pdf.text(`GST: ${invoiceData.gst_amount}`);
    pdf.fontSize(12).text(`Total: ${invoiceData.total}`, { underline: true });
    
    pdf.end();
  } catch (error) {
    next(error);
  }
});

export default router;

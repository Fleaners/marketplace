const PDFDocument = require('pdfkit');
const { createInvoiceWithItems, getInvoiceById, recordTransaction } = require('../models/invoiceModel');
const { reduceStock } = require('../models/productModel');
const pool = require('../../config/db');

const DEFAULT_GST_RATE = 0.18;

async function createInvoice(req, res, next) {
  const client = await pool.connect();

  try {
    const business_id = req.business.id;
    const { customer_name, customer_phone, items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Invoice must include at least one item' });
    }

    const parsedItems = items.map((item) => ({
      product_id: parseInt(item.product_id, 10),
      quantity: parseInt(item.quantity, 10),
      price: parseFloat(item.price),
      description: item.description || null,
    }));

    const subtotal = parsedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const gst_amount = Number((subtotal * DEFAULT_GST_RATE).toFixed(2));
    const total = Number((subtotal + gst_amount).toFixed(2));

    await client.query('BEGIN');
    const invoicePayload = { business_id, customer_name, customer_phone, subtotal, gst_amount, total, items: parsedItems };
    const invoiceResult = await createInvoiceWithItems(client, invoicePayload);

    for (const item of parsedItems) {
      await reduceStock(item.product_id, item.quantity);
    }

    await recordTransaction(client, { business_id, type: 'sale', amount: total });
    await client.query('COMMIT');

    res.status(201).json(invoiceResult);
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
}

async function fetchInvoice(req, res, next) {
  try {
    const invoiceId = parseInt(req.params.id, 10);
    const invoice = await getInvoiceById(invoiceId);
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    res.json(invoice);
  } catch (error) {
    next(error);
  }
}

async function fetchInvoicePdf(req, res, next) {
  try {
    const invoiceId = parseInt(req.params.id, 10);
    const invoiceData = await getInvoiceById(invoiceId);

    if (!invoiceData) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const buffers = [];
    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(buffers);
      res.writeHead(200, {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename=invoice_${invoiceId}.pdf`,
        'Content-Length': pdfBuffer.length,
      });
      res.end(pdfBuffer);
    });

    doc.fontSize(20).text('Invoice', { underline: true });
    doc.moveDown();
    doc.fontSize(12).text(`Invoice ID: ${invoiceId}`);
    doc.text(`Customer: ${invoiceData.invoice.customer_name || 'N/A'}`);
    doc.text(`Phone: ${invoiceData.invoice.customer_phone || 'N/A'}`);
    doc.text(`Date: ${new Date(invoiceData.invoice.created_at).toLocaleString()}`);
    doc.moveDown();

    doc.text('Items:', { underline: true });
    invoiceData.items.forEach((item) => {
      doc.text(`${item.description || item.product_name} - ${item.quantity} x ${item.price.toFixed(2)} = ${(item.quantity * item.price).toFixed(2)}`);
    });
    doc.moveDown();

    doc.text(`Subtotal: ${invoiceData.invoice.subtotal.toFixed(2)}`);
    doc.text(`GST: ${invoiceData.invoice.gst_amount.toFixed(2)}`);
    doc.text(`Total: ${invoiceData.invoice.total.toFixed(2)}`);

    doc.end();
  } catch (error) {
    next(error);
  }
}

module.exports = { createInvoice, fetchInvoice, fetchInvoicePdf };

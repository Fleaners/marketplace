const pool = require('../../config/db');

async function createInvoiceWithItems(client, { business_id, customer_name, subtotal, gst_amount, total, items }) {
  const invoiceResult = await client.query(
    `INSERT INTO invoices (business_id, customer_name, subtotal, gst_amount, total)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [business_id, customer_name, subtotal, gst_amount, total]
  );

  const invoice = invoiceResult.rows[0];
  const itemRows = [];

  for (const item of items) {
    const itemResult = await client.query(
      `INSERT INTO invoice_items (invoice_id, product_id, quantity, price)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [invoice.id, item.product_id, item.quantity, item.price]
    );
    itemRows.push(itemResult.rows[0]);
  }

  return { invoice, items: itemRows };
}

async function getInvoiceById(id) {
  const invoiceResult = await pool.query('SELECT * FROM invoices WHERE id = $1', [id]);
  const invoice = invoiceResult.rows[0];
  if (!invoice) return null;
  const itemsResult = await pool.query(
    `SELECT ii.*, p.name AS product_name, p.cost_price, p.image_url
     FROM invoice_items ii
     JOIN products p ON p.id = ii.product_id
     WHERE ii.invoice_id = $1`,
    [id]
  );
  return { invoice, items: itemsResult.rows };
}

async function recordTransaction(client, { business_id, type, amount }) {
  await client.query(
    `INSERT INTO transactions (business_id, type, amount)
     VALUES ($1, $2, $3)`,
    [business_id, type, amount]
  );
}

async function getSalesSummary(business_id) {
  const result = await pool.query(
    `SELECT SUM(total) AS sales, COUNT(*) AS invoices, SUM(gst_amount) AS total_gst
     FROM invoices
     WHERE business_id = $1`,
    [business_id]
  );
  return result.rows[0];
}

async function getProductSales(business_id) {
  const result = await pool.query(
    `SELECT p.id, p.name, SUM(ii.quantity) AS quantity_sold, SUM(ii.price * ii.quantity) AS revenue
     FROM invoice_items ii
     JOIN products p ON p.id = ii.product_id
     WHERE p.business_id = $1
     GROUP BY p.id, p.name
     ORDER BY quantity_sold DESC
     LIMIT 5`,
    [business_id]
  );
  return result.rows;
}

async function getMonthlyProfitTrend(business_id) {
  const result = await pool.query(
    `SELECT DATE_TRUNC('month', i.created_at) AS month,
            SUM(ii.quantity * (ii.price - p.cost_price)) AS profit
     FROM invoices i
     JOIN invoice_items ii ON ii.invoice_id = i.id
     JOIN products p ON p.id = ii.product_id
     WHERE i.business_id = $1
     GROUP BY month
     ORDER BY month DESC
     LIMIT 6`,
    [business_id]
  );
  return result.rows;
}

module.exports = { createInvoiceWithItems, getInvoiceById, recordTransaction, getSalesSummary, getProductSales, getMonthlyProfitTrend };

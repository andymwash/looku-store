// ═══════════════════════════════════════════════════
//  LOOKU STORE — routes/reports.js
//  GET /api/reports/sales-csv    — Download sales CSV
//  GET /api/reports/restock-csv  — Download restock CSV
//  GET /api/reports/finance      — Finance summary JSON
// ═══════════════════════════════════════════════════
'use strict';

const express = require('express');
const { getDb } = require('../config/database');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

function toCSV(headers, rows) {
  const escape = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return [headers, ...rows].map(r => r.map(escape).join(',')).join('\n');
}

// GET /api/reports/sales-csv
router.get('/sales-csv', authenticate, requireRole('manager'), (req, res) => {
  const db    = getDb();
  const sales = db.prepare('SELECT * FROM sales ORDER BY sale_date DESC').all();
  const items = db.prepare('SELECT * FROM sale_items').all();

  const itemsMap = {};
  items.forEach(i => {
    if (!itemsMap[i.sale_id]) itemsMap[i.sale_id] = [];
    itemsMap[i.sale_id].push(i);
  });

  const headers = ['Date','Customer','Phone','Location','Product','Qty','Unit Price','Orig Price','Subtotal','Total','Discount','Payment Method','Payment Status','Attendant'];
  const rows = [];

  for (const sale of sales) {
    const saleItems = itemsMap[sale.id] || [];
    for (const item of saleItems) {
      rows.push([
        sale.sale_date, sale.customer_name || 'Walk-in', sale.customer_phone || '',
        sale.customer_location || '', item.product_name, item.qty,
        item.unit_price, item.orig_price || item.unit_price, item.subtotal,
        sale.total, sale.discount || 0, sale.payment_method, sale.payment_status,
        sale.attendant_name || ''
      ]);
    }
  }

  const today = new Date().toISOString().slice(0,10);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="looku-sales-${today}.csv"`);
  res.send(toCSV(headers, rows));
});

// GET /api/reports/restock-csv
router.get('/restock-csv', authenticate, requireRole('manager'), (req, res) => {
  const db       = getDb();
  const products = db.prepare('SELECT * FROM products ORDER BY category, name').all();
  const soldMap  = {};
  db.prepare('SELECT product_name, SUM(qty) as total_sold FROM sale_items GROUP BY product_name').all()
    .forEach(r => { soldMap[r.product_name] = r.total_sold; });

  const headers = ['Product','Brand','Category','Unit','Current Stock','Total Sold','Suggested Reorder'];
  const rows    = products.map(p => [
    p.name, p.brand || '', p.category, p.unit || '',
    p.stock, soldMap[p.name] || 0,
    Math.max(0, (soldMap[p.name] || 0) - p.stock + 20)
  ]);

  const today = new Date().toISOString().slice(0,10);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="looku-restock-${today}.csv"`);
  res.send(toCSV(headers, rows));
});

// GET /api/reports/finance
router.get('/finance', authenticate, requireRole('manager'), (req, res) => {
  const db = getDb();

  const overall = db.prepare(`
    SELECT
      COUNT(*)             AS transactions,
      SUM(total)           AS gross_revenue,
      SUM(discount)        AS total_discounts,
      SUM(total)*0.6       AS estimated_cost,
      SUM(total)*0.4       AS estimated_profit
    FROM sales
  `).get();

  const byMethod = db.prepare(`
    SELECT payment_method, COUNT(*) AS count, SUM(total) AS revenue
    FROM sales GROUP BY payment_method ORDER BY revenue DESC
  `).all();

  const byCategory = db.prepare(`
    SELECT p.category, SUM(si.subtotal) AS revenue, SUM(si.qty) AS units_sold
    FROM sale_items si
    JOIN products p ON si.product_id = p.id
    GROUP BY p.category ORDER BY revenue DESC
  `).all();

  res.json({
    success: true,
    data: { overall, byMethod, byCategory, currency: 'KSH', store: 'Looku Store, Eldoret' }
  });
});

module.exports = router;

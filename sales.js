// ═══════════════════════════════════════════════════
//  LOOKU STORE — routes/sales.js
//  GET    /api/sales           — All sales (manager)
//  GET    /api/sales/:id       — Single sale
//  POST   /api/sales           — Record sale (attendant/manager)
//  DELETE /api/sales/:id       — Delete sale (manager)
//  PATCH  /api/sales/:id/status — Update payment status
// ═══════════════════════════════════════════════════
'use strict';

const express = require('express');
const { getDb } = require('../config/database');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

// helper: attach items to a sale row
function withItems(db, sale) {
  const items = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(sale.id);
  return { ...sale, items };
}

// ── GET /api/sales ───────────────────────────────────
router.get('/', authenticate, requireRole('manager', 'attendant'), (req, res) => {
  const db = getDb();
  const { method, status, date, attendant } = req.query;

  let query  = 'SELECT * FROM sales WHERE 1=1';
  const params = [];

  if (method)   { query += ' AND payment_method = ?';  params.push(method); }
  if (status)   { query += ' AND payment_status = ?';  params.push(status); }
  if (date)     { query += ' AND sale_date = ?';        params.push(date); }
  if (attendant){ query += ' AND attendant_name LIKE ?'; params.push(`%${attendant}%`); }

  query += ' ORDER BY created_at DESC';
  const sales = db.prepare(query).all(...params).map(s => withItems(db, s));
  res.json({ success: true, data: sales, count: sales.length });
});

// ── GET /api/sales/summary ────────────────────────────
router.get('/summary', authenticate, requireRole('manager'), (req, res) => {
  const db = getDb();

  const totals = db.prepare(`
    SELECT
      COUNT(*)                                    AS total_sales,
      COALESCE(SUM(total), 0)                    AS gross_revenue,
      COALESCE(SUM(discount), 0)                 AS total_discounts,
      COUNT(CASE WHEN payment_status='Pending' THEN 1 END) AS pending_count
    FROM sales
  `).get();

  const byMethod = db.prepare(`
    SELECT payment_method, COUNT(*) AS count, SUM(total) AS revenue
    FROM sales GROUP BY payment_method
  `).all();

  const byAttendant = db.prepare(`
    SELECT attendant_name, COUNT(*) AS count, SUM(total) AS revenue
    FROM sales GROUP BY attendant_name ORDER BY revenue DESC
  `).all();

  const topProducts = db.prepare(`
    SELECT product_name, SUM(qty) AS total_qty, SUM(subtotal) AS total_revenue
    FROM sale_items GROUP BY product_name ORDER BY total_qty DESC LIMIT 5
  `).all();

  const dailyRevenue = db.prepare(`
    SELECT sale_date, SUM(total) AS revenue, COUNT(*) AS sales
    FROM sales GROUP BY sale_date ORDER BY sale_date DESC LIMIT 30
  `).all();

  res.json({
    success: true,
    data: { totals, byMethod, byAttendant, topProducts, dailyRevenue }
  });
});

// ── GET /api/sales/:id ───────────────────────────────
router.get('/:id', authenticate, requireRole('manager', 'attendant'), (req, res) => {
  const db   = getDb();
  const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(req.params.id);
  if (!sale) return res.status(404).json({ success: false, message: 'Sale not found.' });
  res.json({ success: true, data: withItems(db, sale) });
});

// ── POST /api/sales ──────────────────────────────────
router.post('/', authenticate, (req, res) => {
  const {
    items, customerName, customerPhone, customerLocation, customerNotes,
    paymentMethod, amountPaid, mobilePhone, network, cardRef,
  } = req.body;

  if (!items || !items.length) {
    return res.status(400).json({ success: false, message: 'At least one item is required.' });
  }
  if (!paymentMethod) {
    return res.status(400).json({ success: false, message: 'Payment method is required.' });
  }

  const db = getDb();

  // Validate products and calculate totals
  let total     = 0;
  let origTotal = 0;
  const resolvedItems = [];

  for (const item of items) {
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(item.productId);
    if (!product) {
      return res.status(400).json({ success: false, message: `Product ID ${item.productId} not found.` });
    }
    if (product.stock < item.qty) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock for "${product.name}". Available: ${product.stock}, requested: ${item.qty}.`
      });
    }

    const unitPrice = item.unitPrice !== undefined ? parseFloat(item.unitPrice) : product.price;
    const subtotal  = unitPrice * item.qty;
    const origSub   = product.price * item.qty;

    total     += subtotal;
    origTotal += origSub;

    resolvedItems.push({
      productId: product.id,
      productName: product.name,
      qty: item.qty,
      unitPrice,
      origPrice: product.price,
      subtotal,
    });
  }

  const discount      = origTotal - total;
  const paymentStatus = paymentMethod === 'M-Pesa' || paymentMethod === 'Mobile Money'
    ? 'Pending' : 'Paid';

  // Insert sale
  const saleResult = db.prepare(`
    INSERT INTO sales
      (attendant_id, attendant_name, customer_name, customer_phone, customer_location,
       customer_notes, payment_method, payment_status, amount_paid, change_given,
       mobile_phone, network, card_ref, total, orig_total, discount, sale_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, date('now'))
  `).run(
    req.user.id, req.user.name,
    customerName || null, customerPhone || null, customerLocation || null, customerNotes || null,
    paymentMethod, paymentStatus,
    amountPaid ? parseFloat(amountPaid) : null,
    amountPaid ? parseFloat(amountPaid) - total : null,
    mobilePhone || null, network || null, cardRef || null,
    total, origTotal, discount
  );

  const saleId = saleResult.lastInsertRowid;

  // Insert items and deduct stock
  const insertItem   = db.prepare(`
    INSERT INTO sale_items (sale_id, product_id, product_name, qty, unit_price, orig_price, subtotal)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const deductStock = db.prepare(`
    UPDATE products SET stock = stock - ?, updated_at = datetime('now') WHERE id = ?
  `);

  for (const item of resolvedItems) {
    insertItem.run(saleId, item.productId, item.productName, item.qty, item.unitPrice, item.origPrice, item.subtotal);
    deductStock.run(item.qty, item.productId);
  }

  // Push notifications
  const pushNotif = db.prepare(`
    INSERT INTO notifications (role, message, type) VALUES (?, ?, ?)
  `);
  const itemList  = resolvedItems.map(i => `${i.productName} ×${i.qty}`).join(', ');
  const orderMsg  = `🛒 New sale — ${customerName || 'Walk-in'} (${customerPhone || '—'}) · ${paymentMethod} · KES ${total.toLocaleString()} · ${itemList}`;
  pushNotif.run('manager',   orderMsg, 'order');
  pushNotif.run('attendant', orderMsg, 'order');

  if (customerPhone) {
    let custMsg = '';
    if (paymentMethod === 'Cash')
      custMsg = `✅ Sale confirmed! Total: KES ${total.toLocaleString()}. Cash paid: KES ${parseFloat(amountPaid||0).toLocaleString()}.`;
    else if (paymentMethod === 'M-Pesa' || paymentMethod === 'Mobile Money')
      custMsg = `📲 M-Pesa STK Push of KES ${total.toLocaleString()} sent to ${mobilePhone||customerPhone}. Enter your PIN to confirm.`;
    else
      custMsg = `💳 Sale confirmed via ATM/Card! Total: KES ${total.toLocaleString()}. Thank you!`;
    pushNotif.run('customer', custMsg, 'success');
  }

  const newSale = withItems(db, db.prepare('SELECT * FROM sales WHERE id = ?').get(saleId));
  res.status(201).json({ success: true, message: 'Sale recorded successfully.', data: newSale });
});

// ── PATCH /api/sales/:id/status ──────────────────────
router.patch('/:id/status', authenticate, requireRole('manager', 'attendant'), (req, res) => {
  const db   = getDb();
  const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(req.params.id);
  if (!sale) return res.status(404).json({ success: false, message: 'Sale not found.' });

  const { status } = req.body;
  if (!['Paid', 'Pending', 'Failed'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Status must be Paid, Pending or Failed.' });
  }

  db.prepare('UPDATE sales SET payment_status = ? WHERE id = ?').run(status, req.params.id);

  // Notify customer of payment confirmation
  if (status === 'Paid' && sale.customer_phone) {
    db.prepare('INSERT INTO notifications (role, message, type) VALUES (?, ?, ?)').run(
      'customer',
      `✅ Your payment of KES ${sale.total.toLocaleString()} has been confirmed. Thank you for shopping at Looku Store!`,
      'success'
    );
  }

  const updated = db.prepare('SELECT * FROM sales WHERE id = ?').get(req.params.id);
  res.json({ success: true, message: `Payment status updated to "${status}".`, data: withItems(db, updated) });
});

// ── DELETE /api/sales/:id ────────────────────────────
router.delete('/:id', authenticate, requireRole('manager'), (req, res) => {
  const db   = getDb();
  const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(req.params.id);
  if (!sale) return res.status(404).json({ success: false, message: 'Sale not found.' });

  db.prepare('DELETE FROM sale_items WHERE sale_id = ?').run(req.params.id);
  db.prepare('DELETE FROM sales WHERE id = ?').run(req.params.id);

  res.json({ success: true, message: `Sale #${req.params.id} deleted.` });
});

module.exports = router;

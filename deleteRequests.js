// ═══════════════════════════════════════════════════
//  LOOKU STORE — routes/deleteRequests.js
//  GET    /api/delete-requests         — All pending (manager)
//  POST   /api/delete-requests         — Submit request (attendant)
//  PATCH  /api/delete-requests/:id     — Approve/reject (manager)
// ═══════════════════════════════════════════════════
'use strict';

const express = require('express');
const { getDb } = require('../config/database');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/delete-requests
router.get('/', authenticate, requireRole('manager'), (req, res) => {
  const db   = getDb();
  const rows = db.prepare(
    `SELECT * FROM delete_requests WHERE status = 'pending' ORDER BY created_at DESC`
  ).all();
  res.json({ success: true, data: rows, count: rows.length });
});

// POST /api/delete-requests
router.post('/', authenticate, requireRole('attendant', 'manager'), (req, res) => {
  const { productId, reason } = req.body;
  if (!productId || !reason) {
    return res.status(400).json({ success: false, message: 'Product ID and reason are required.' });
  }

  const db      = getDb();
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
  if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });

  const result = db.prepare(`
    INSERT INTO delete_requests (product_id, product_name, requested_by, attendant_id, reason)
    VALUES (?, ?, ?, ?, ?)
  `).run(productId, product.name, req.user.name, req.user.id, reason);

  // Notify manager
  db.prepare('INSERT INTO notifications (role, message, type) VALUES (?, ?, ?)').run(
    'manager',
    `🗑 Delete request for "${product.name}" from ${req.user.name}. Reason: ${reason}`,
    'warning'
  );

  const request = db.prepare('SELECT * FROM delete_requests WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ success: true, message: 'Delete request submitted.', data: request });
});

// PATCH /api/delete-requests/:id
router.patch('/:id', authenticate, requireRole('manager'), (req, res) => {
  const db  = getDb();
  const req_ = db.prepare('SELECT * FROM delete_requests WHERE id = ?').get(req.params.id);
  if (!req_) return res.status(404).json({ success: false, message: 'Request not found.' });
  if (req_.status !== 'pending') {
    return res.status(400).json({ success: false, message: `Request already ${req_.status}.` });
  }

  const { action } = req.body; // 'approve' or 'reject'
  if (!['approve', 'reject'].includes(action)) {
    return res.status(400).json({ success: false, message: 'Action must be "approve" or "reject".' });
  }

  const newStatus = action === 'approve' ? 'approved' : 'rejected';
  db.prepare(`UPDATE delete_requests SET status = ? WHERE id = ?`).run(newStatus, req.params.id);

  if (action === 'approve') {
    // Delete the product
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req_.product_id);
    if (product) db.prepare('DELETE FROM products WHERE id = ?').run(req_.product_id);
    db.prepare('INSERT INTO notifications (role, message, type) VALUES (?, ?, ?)').run(
      'attendant',
      `✅ Delete request approved: "${req_.product_name}" has been removed from stock.`,
      'success'
    );
  } else {
    db.prepare('INSERT INTO notifications (role, message, type) VALUES (?, ?, ?)').run(
      'attendant',
      `❌ Delete request for "${req_.product_name}" was rejected by the manager.`,
      'info'
    );
  }

  res.json({ success: true, message: `Request ${newStatus}.` });
});

module.exports = router;

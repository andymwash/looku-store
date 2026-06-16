// ═══════════════════════════════════════════════════
//  LOOKU STORE — routes/notifications.js
//  GET    /api/notifications        — Get by role
//  PATCH  /api/notifications/read   — Mark all read
//  DELETE /api/notifications        — Clear all for role
// ═══════════════════════════════════════════════════
'use strict';

const express = require('express');
const { getDb } = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/notifications
router.get('/', authenticate, (req, res) => {
  const db    = getDb();
  const role  = req.query.role || req.user.role;
  const notifs = db.prepare(
    'SELECT * FROM notifications WHERE role = ? ORDER BY created_at DESC LIMIT 100'
  ).all(role);
  const unread = notifs.filter(n => !n.is_read).length;
  res.json({ success: true, data: notifs, unread });
});

// PATCH /api/notifications/read
router.patch('/read', authenticate, (req, res) => {
  const db   = getDb();
  const role = req.body.role || req.user.role;
  db.prepare('UPDATE notifications SET is_read = 1 WHERE role = ?').run(role);
  res.json({ success: true, message: 'All notifications marked as read.' });
});

// DELETE /api/notifications
router.delete('/', authenticate, (req, res) => {
  const db   = getDb();
  const role = req.query.role || req.user.role;
  db.prepare('DELETE FROM notifications WHERE role = ?').run(role);
  res.json({ success: true, message: 'Notifications cleared.' });
});

module.exports = router;

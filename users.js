// ═══════════════════════════════════════════════════
//  LOOKU STORE — routes/users.js
//  GET    /api/users           — All users (manager)
//  POST   /api/users           — Create attendant (manager)
//  PUT    /api/users/:id       — Edit user (manager)
//  DELETE /api/users/:id       — Delete user (manager)
//  PATCH  /api/users/:id/password — Change password
// ═══════════════════════════════════════════════════
'use strict';

const express = require('express');
const bcrypt  = require('bcryptjs');
const { getDb } = require('../config/database');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

const safeUser = u => ({ id: u.id, name: u.name, username: u.username, role: u.role, created_at: u.created_at });

// ── GET /api/users ───────────────────────────────────
router.get('/', authenticate, requireRole('manager'), (req, res) => {
  const db    = getDb();
  const users = db.prepare('SELECT * FROM users ORDER BY role, name').all().map(safeUser);
  res.json({ success: true, data: users });
});

// ── POST /api/users ──────────────────────────────────
router.post('/', authenticate, requireRole('manager'), (req, res) => {
  const { name, username, password, role } = req.body;
  if (!name || !username || !password) {
    return res.status(400).json({ success: false, message: 'Name, username and password are required.' });
  }
  const validRoles = ['manager', 'attendant'];
  if (role && !validRoles.includes(role)) {
    return res.status(400).json({ success: false, message: 'Role must be manager or attendant.' });
  }

  const db      = getDb();
  const exists  = db.prepare('SELECT id FROM users WHERE username = ?').get(username.toLowerCase());
  if (exists)   return res.status(409).json({ success: false, message: `Username "${username}" already exists.` });

  const hash   = bcrypt.hashSync(password, 10);
  const result = db.prepare(`
    INSERT INTO users (name, username, password, role) VALUES (?, ?, ?, ?)
  `).run(name, username.toLowerCase(), hash, role || 'attendant');

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ success: true, message: `Attendant "${name}" created.`, data: safeUser(user) });
});

// ── PUT /api/users/:id ───────────────────────────────
router.put('/:id', authenticate, requireRole('manager'), (req, res) => {
  const db   = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

  const { name, username, role } = req.body;
  if (username && username !== user.username) {
    const exists = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username.toLowerCase(), req.params.id);
    if (exists) return res.status(409).json({ success: false, message: `Username "${username}" already taken.` });
  }

  db.prepare(`UPDATE users SET name=?, username=?, role=? WHERE id=?`).run(
    name || user.name,
    (username || user.username).toLowerCase(),
    role || user.role,
    req.params.id
  );

  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  res.json({ success: true, message: `User "${updated.name}" updated.`, data: safeUser(updated) });
});

// ── DELETE /api/users/:id ────────────────────────────
router.delete('/:id', authenticate, requireRole('manager'), (req, res) => {
  const db   = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
  if (user.role === 'manager' && user.username === 'manager') {
    return res.status(403).json({ success: false, message: 'Cannot delete the primary manager account.' });
  }
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ success: true, message: `User "${user.name}" removed.` });
});

// ── PATCH /api/users/:id/password ───────────────────
router.patch('/:id/password', authenticate, (req, res) => {
  const db   = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

  // Only manager or the user themselves can change password
  if (req.user.role !== 'manager' && req.user.id !== parseInt(req.params.id)) {
    return res.status(403).json({ success: false, message: 'You can only change your own password.' });
  }

  const { currentPassword, newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ success: false, message: 'New password must be at least 6 characters.' });
  }

  // Non-managers must verify current password
  if (req.user.role !== 'manager') {
    if (!currentPassword || !bcrypt.compareSync(currentPassword, user.password)) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
    }
  }

  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hash, req.params.id);
  res.json({ success: true, message: 'Password updated successfully.' });
});

module.exports = router;

// ═══════════════════════════════════════════════════
//  LOOKU STORE — middleware/auth.js
//  JWT Authentication & Role Guard middleware
// ═══════════════════════════════════════════════════
'use strict';

const jwt = require('jsonwebtoken');
require('dotenv').config();

// ── Verify JWT token ─────────────────────────────────
function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, username, name, role }
    next();
  } catch (err) {
    return res.status(403).json({ success: false, message: 'Invalid or expired token. Please login again.' });
  }
}

// ── Require specific role ────────────────────────────
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(' or ')}. Your role: ${req.user.role}`
      });
    }
    next();
  };
}

module.exports = { authenticate, requireRole };

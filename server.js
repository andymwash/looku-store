// ═══════════════════════════════════════════════════
//  LOOKU STORE — server.js
//  Main Express server entry point
//  Kenya Fashion Store · Nairobi · KES
// ═══════════════════════════════════════════════════
'use strict';

require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const path     = require('path');
const fs       = require('fs');

const { initDb }        = require('./config/database');
const { seedDatabase }  = require('./config/seed');

// ── Route imports ────────────────────────────────────
const authRoutes        = require('./routes/auth');
const productRoutes     = require('./routes/products');
const salesRoutes       = require('./routes/sales');
const userRoutes        = require('./routes/users');
const notifRoutes       = require('./routes/notifications');
const deleteReqRoutes   = require('./routes/deleteRequests');
const reportRoutes      = require('./routes/reports');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Ensure uploads dir exists ────────────────────────
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// ── Middleware ───────────────────────────────────────
app.use(cors({
  origin: '*', // In production, restrict to your frontend domain
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '15mb' }));          // large base64 images
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// ── Serve uploaded images statically ─────────────────
app.use('/uploads', express.static(path.resolve(UPLOAD_DIR)));

// ── Serve frontend (index.html etc.) ─────────────────
const FRONTEND_DIR = path.resolve(__dirname, '../looku-store');
if (fs.existsSync(FRONTEND_DIR)) {
  app.use(express.static(FRONTEND_DIR));
}

// ── API Routes ───────────────────────────────────────
app.use('/api/auth',            authRoutes);
app.use('/api/products',        productRoutes);
app.use('/api/sales',           salesRoutes);
app.use('/api/users',           userRoutes);
app.use('/api/notifications',   notifRoutes);
app.use('/api/delete-requests', deleteReqRoutes);
app.use('/api/reports',         reportRoutes);

// ── Health check ─────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    store:   'Looku Store',
    tagline: 'Style for Every Story',
    city:    'Nairobi, Kenya',
    currency:'KES',
    version: '1.0.0',
    status:  'running',
    time:    new Date().toISOString()
  });
});

// ── API 404 handler ──────────────────────────────────
app.use('/api/*', (req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found.` });
});

// ── SPA fallback (serves frontend for non-API routes) ─
app.get('*', (req, res) => {
  const indexPath = path.join(FRONTEND_DIR, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.json({ success: true, message: 'Looku Store API is running. Frontend not found at ' + FRONTEND_DIR });
  }
});

// ── Global error handler ─────────────────────────────
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err.message);
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ success: false, message: 'Image file too large. Max 10MB.' });
  }
  res.status(500).json({ success: false, message: 'Internal server error.', error: process.env.NODE_ENV === 'development' ? err.message : undefined });
});

// ── Boot ─────────────────────────────────────────────
async function start() {
  try {
    console.log('\n🏪 LOOKU STORE — Fashion & Clothing · Nairobi, Kenya');
    console.log('━'.repeat(52));

    // Init DB and seed
    initDb();
    await seedDatabase();

    // Start server
    app.listen(PORT, () => {
      console.log(`\n✅ Server running on http://localhost:${PORT}`);
      console.log(`📦 Products API : http://localhost:${PORT}/api/products`);
      console.log(`💰 Sales API    : http://localhost:${PORT}/api/sales`);
      console.log(`📊 Reports      : http://localhost:${PORT}/api/reports/finance`);
      console.log(`❤️  Health check : http://localhost:${PORT}/api/health`);
      console.log('\n🔑 Default logins:');
      console.log('   Manager  → manager  / looku2026');
      console.log('   Wanjiru  → wanjiru  / wanjiru123');
      console.log('   Kipchoge → kipchoge / kipchoge123');
      console.log('━'.repeat(52));
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

start();

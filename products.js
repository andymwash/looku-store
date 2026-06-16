// ═══════════════════════════════════════════════════
//  LOOKU STORE — routes/products.js
//  GET    /api/products           — All products (public)
//  GET    /api/products/:id       — Single product (public)
//  POST   /api/products           — Add product (manager only)
//  PUT    /api/products/:id       — Edit product (manager only)
//  DELETE /api/products/:id       — Delete product (manager only)
//  POST   /api/products/:id/stock — Update stock qty (manager/attendant)
// ═══════════════════════════════════════════════════
'use strict';

const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const { getDb } = require('../config/database');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

// ── Multer: store uploaded images on disk ─────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = process.env.UPLOAD_DIR || './uploads';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext  = path.extname(file.originalname) || '.jpg';
    const name = `product_${Date.now()}${ext}`;
    cb(null, name);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  }
});

// ── GET /api/products ─────────────────────────────────
router.get('/', (req, res) => {
  const db = getDb();
  const { category, search, inStock } = req.query;

  let query = 'SELECT * FROM products WHERE 1=1';
  const params = [];

  if (category) { query += ' AND category = ?'; params.push(category); }
  if (search)   { query += ' AND (name LIKE ? OR brand LIKE ? OR description LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
  if (inStock === 'true') { query += ' AND stock > 0'; }

  query += ' ORDER BY name ASC';
  const products = db.prepare(query).all(...params);

  // Return image URL instead of base64 path
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const mapped  = products.map(p => ({
    ...p,
    image: p.image && p.image.startsWith('/uploads/')
      ? `${baseUrl}${p.image}`
      : p.image || null
  }));

  res.json({ success: true, data: mapped, count: mapped.length });
});

// ── GET /api/products/categories ─────────────────────
router.get('/categories', (req, res) => {
  const db = getDb();
  const rows = db.prepare(`SELECT DISTINCT category FROM products ORDER BY category`).all();
  res.json({ success: true, data: rows.map(r => r.category) });
});

// ── GET /api/products/:id ────────────────────────────
router.get('/:id', (req, res) => {
  const db = getDb();
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });

  const baseUrl = `${req.protocol}://${req.get('host')}`;
  if (product.image && product.image.startsWith('/uploads/')) {
    product.image = `${baseUrl}${product.image}`;
  }
  res.json({ success: true, data: product });
});

// ── POST /api/products ───────────────────────────────
router.post('/', authenticate, requireRole('manager'), upload.single('image'), (req, res) => {
  const { name, brand, category, unit, price, stock, description, icon, imageBase64 } = req.body;

  if (!name || !category || !price) {
    return res.status(400).json({ success: false, message: 'Name, category and price are required.' });
  }

  let imagePath = null;

  // Handle file upload
  if (req.file) {
    imagePath = `/uploads/${req.file.filename}`;
  }
  // Handle base64 upload (from frontend)
  else if (imageBase64 && imageBase64.startsWith('data:image/')) {
    const matches  = imageBase64.match(/^data:image\/(\w+);base64,(.+)$/);
    if (matches) {
      const ext      = matches[1] === 'jpeg' ? 'jpg' : matches[1];
      const buffer   = Buffer.from(matches[2], 'base64');
      const filename = `product_${Date.now()}.${ext}`;
      const dir      = process.env.UPLOAD_DIR || './uploads';
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, filename), buffer);
      imagePath = `/uploads/${filename}`;
    }
  }

  const db = getDb();
  const result = db.prepare(`
    INSERT INTO products (name, brand, category, unit, price, stock, description, icon, image)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(name, brand || null, category, unit || null, parseFloat(price), parseInt(stock) || 0, description || null, icon || '👗', imagePath);

  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ success: true, message: `"${name}" added to stock.`, data: product });
});

// ── PUT /api/products/:id ────────────────────────────
router.put('/:id', authenticate, requireRole('manager'), upload.single('image'), (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ success: false, message: 'Product not found.' });

  const { name, brand, category, unit, price, stock, description, icon, imageBase64, removeImage } = req.body;

  let imagePath = existing.image;

  if (removeImage === 'true') {
    // Delete old image file if it's a local upload
    if (existing.image && existing.image.startsWith('/uploads/')) {
      const filePath = path.join(process.env.UPLOAD_DIR || './uploads', path.basename(existing.image));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    imagePath = null;
  } else if (req.file) {
    imagePath = `/uploads/${req.file.filename}`;
  } else if (imageBase64 && imageBase64.startsWith('data:image/')) {
    const matches = imageBase64.match(/^data:image\/(\w+);base64,(.+)$/);
    if (matches) {
      const ext      = matches[1] === 'jpeg' ? 'jpg' : matches[1];
      const buffer   = Buffer.from(matches[2], 'base64');
      const filename = `product_${Date.now()}.${ext}`;
      const dir      = process.env.UPLOAD_DIR || './uploads';
      fs.writeFileSync(path.join(dir, filename), buffer);
      imagePath = `/uploads/${filename}`;
    }
  }

  db.prepare(`
    UPDATE products
    SET name=?, brand=?, category=?, unit=?, price=?, stock=?, description=?, icon=?, image=?, updated_at=datetime('now')
    WHERE id=?
  `).run(
    name || existing.name, brand ?? existing.brand, category || existing.category,
    unit ?? existing.unit, parseFloat(price) || existing.price, parseInt(stock) ?? existing.stock,
    description ?? existing.description, icon || existing.icon, imagePath, req.params.id
  );

  const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  res.json({ success: true, message: `"${updated.name}" updated.`, data: updated });
});

// ── DELETE /api/products/:id ─────────────────────────
router.delete('/:id', authenticate, requireRole('manager'), (req, res) => {
  const db = getDb();
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });

  // Delete image file if local
  if (product.image && product.image.startsWith('/uploads/')) {
    const filePath = path.join(process.env.UPLOAD_DIR || './uploads', path.basename(product.image));
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }

  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  res.json({ success: true, message: `"${product.name}" deleted from stock.` });
});

// ── POST /api/products/:id/stock ─────────────────────
router.post('/:id/stock', authenticate, requireRole('manager', 'attendant'), (req, res) => {
  const db = getDb();
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });

  const qty = parseInt(req.body.qty);
  if (!qty || isNaN(qty)) return res.status(400).json({ success: false, message: 'Valid qty is required.' });

  const newStock = product.stock + qty;
  if (newStock < 0) return res.status(400).json({ success: false, message: 'Stock cannot go below 0.' });

  db.prepare(`UPDATE products SET stock = ?, updated_at = datetime('now') WHERE id = ?`).run(newStock, req.params.id);
  const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  res.json({ success: true, message: `Stock updated. New qty: ${newStock}`, data: updated });
});

module.exports = router;

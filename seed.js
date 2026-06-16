// ═══════════════════════════════════════════════════
//  LOOKU STORE — config/seed.js
//  Seeds initial data: admin user + fashion products
// ═══════════════════════════════════════════════════
'use strict';

const bcrypt = require('bcryptjs');
const { getDb } = require('./database');

const PRODUCTS = [
  { name: "Women's Maxi Dress",       brand: "Looku Collection", category: "Women's Wear",  unit: "Sizes S/M/L/XL",       price: 2800, stock: 25, icon: "👗", description: "Elegant floral maxi dress — lightweight chiffon fabric, perfect for any occasion. Available in multiple colours.", image: "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=400&q=80" },
  { name: "Men's Official Shirt",     brand: "Looku Men",        category: "Men's Wear",    unit: "Sizes S/M/L/XL/XXL",   price: 1500, stock: 40, icon: "👔", description: "Smart slim-fit cotton shirt — ideal for the office, church or formal events. Wrinkle-resistant fabric.", image: "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=400&q=80" },
  { name: "Ladies' Bodycon Dress",    brand: "Looku Collection", category: "Women's Wear",  unit: "Sizes XS/S/M/L",       price: 1800, stock: 30, icon: "👗", description: "Trendy stretch bodycon dress — hugs your curves perfectly. Great for evening outings and parties.", image: "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=400&q=80" },
  { name: "Men's Chino Trousers",     brand: "Looku Men",        category: "Men's Wear",    unit: "Waist 28–40 inches",   price: 1900, stock: 35, icon: "👖", description: "Classic slim-fit chino trousers — versatile for casual and semi-formal wear. Breathable cotton blend.", image: "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=400&q=80" },
  { name: "Kids' School Uniform Set", brand: "Looku Kids",       category: "Kids' Wear",    unit: "Ages 3–14 yrs",        price: 1200, stock: 50, icon: "🧒", description: "Durable school uniform set — shirt + shorts/skirt. Stain-resistant and easy to wash.", image: "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=400&q=80" },
  { name: "African Print Kitenge Top",brand: "Looku Ankara",     category: "Women's Wear",  unit: "Sizes S/M/L/XL",       price: 1600, stock: 20, icon: "👚", description: "Vibrant Ankara kitenge top — bold African prints, tailored fit. Celebrate your culture in style.", image: "https://images.unsplash.com/photo-1590735213920-68192a487bc2?w=400&q=80" },
  { name: "Men's T-Shirt (Plain)",    brand: "Looku Basics",     category: "Men's Wear",    unit: "Sizes S/M/L/XL/XXL",   price: 650,  stock: 80, icon: "👕", description: "100% cotton plain t-shirt — soft, comfortable everyday wear. Multiple colours available.", image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&q=80" },
  { name: "Ladies' Denim Jeans",      brand: "Looku Denim",      category: "Women's Wear",  unit: "Waist 26–38 inches",   price: 2500, stock: 28, icon: "👖", description: "High-waist stretch denim jeans — flattering cut, super comfortable. Pairs with anything.", image: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=400&q=80" },
  { name: "Men's Denim Jeans",        brand: "Looku Denim",      category: "Men's Wear",    unit: "Waist 28–40 inches",   price: 2200, stock: 32, icon: "👖", description: "Classic straight-leg denim jeans — rugged and durable. Perfect for casual outings around Eldoret.", image: "https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&q=80" },
  { name: "Kids' Sneakers",           brand: "Looku Kids",       category: "Footwear",      unit: "Sizes EU 25–38",       price: 1400, stock: 22, icon: "👟", description: "Colourful kids' sneakers — cushioned sole, easy velcro strap. Durable for school and play.", image: "https://images.unsplash.com/photo-1514989940723-e8e51635b782?w=400&q=80" },
  { name: "Ladies' Block-Heel Shoes", brand: "Looku Footwear",   category: "Footwear",      unit: "Sizes EU 36–42",       price: 3200, stock: 18, icon: "👠", description: "Elegant block-heel shoes — comfortable enough for all-day wear, stylish enough for any event.", image: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400&q=80" },
  { name: "Men's Loafers",            brand: "Looku Footwear",   category: "Footwear",      unit: "Sizes EU 39–46",       price: 2800, stock: 20, icon: "👞", description: "Premium leather loafers — sleek design for office, church and dinner. Easy slip-on comfort.", image: "https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?w=400&q=80" },
  { name: "Ladies' Handbag",          brand: "Looku Accessories",category: "Accessories",   unit: "One size",             price: 2200, stock: 15, icon: "👜", description: "Stylish faux-leather handbag — spacious interior, multiple compartments. Perfect everyday bag.", image: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&q=80" },
  { name: "Men's Leather Belt",       brand: "Looku Accessories",category: "Accessories",   unit: "Lengths 85–120 cm",    price: 750,  stock: 45, icon: "🪢", description: "Genuine leather belt — smart buckle, durable stitching. Completes any formal or casual outfit.", image: "https://images.unsplash.com/photo-1624222247344-550fb60fe8ff?w=400&q=80" },
  { name: "Baby Romper Set",          brand: "Looku Kids",       category: "Kids' Wear",    unit: "Ages 0–24 months",     price: 900,  stock: 40, icon: "🍼", description: "Adorable soft-cotton baby romper set — 2 pieces, gentle on delicate skin. Cute prints.", image: "https://images.unsplash.com/photo-1522771930-78848d9293e8?w=400&q=80" },
  { name: "Ankara Dress (Tailored)",  brand: "Looku Ankara",     category: "Women's Wear",  unit: "Custom sizing",        price: 3500, stock: 12, icon: "👗", description: "Bespoke tailored Ankara dress — bold African prints. Available for custom orders.", image: "https://images.unsplash.com/photo-1618085219724-c59ba48e08cd?w=400&q=80" },
  { name: "Men's Suit (2-Piece)",     brand: "Looku Men",        category: "Men's Wear",    unit: "Sizes 36–52 (chest)",  price: 7500, stock: 10, icon: "🤵", description: "Sharp 2-piece suit — slim fit, premium fabric. Perfect for weddings and corporate events.", image: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=400&q=80" },
  { name: "Sports Hoodie",            brand: "Looku Active",     category: "Sportswear",    unit: "Sizes S/M/L/XL",       price: 1800, stock: 30, icon: "🧥", description: "Fleece-lined sports hoodie — warm and comfortable. Great for jogs along Karura Forest.", image: "https://images.unsplash.com/photo-1556821840-3a63f15732ce?w=400&q=80" },
  { name: "Ladies' Sports Leggings",  brand: "Looku Active",     category: "Sportswear",    unit: "Sizes XS/S/M/L/XL",   price: 1400, stock: 35, icon: "🩱", description: "High-waist compression leggings — moisture-wicking fabric. Perfect for gym or yoga.", image: "https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=400&q=80" },
  { name: "Scarf / Hijab (Silk)",     brand: "Looku Accessories",category: "Accessories",   unit: "170×70 cm",            price: 850,  stock: 50, icon: "🧣", description: "Lightweight silk-feel scarf — vibrant prints, versatile styling. Hijab, head wrap or neck scarf.", image: "https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=400&q=80" },
];

const USERS = [
  { name: "Store Manager",   username: "manager",  password: "looku2026",   role: "manager"   },
  { name: "Wanjiru Kamau",   username: "wanjiru",  password: "wanjiru123",  role: "attendant" },
  { name: "Kipchoge Mutai",  username: "kipchoge", password: "kipchoge123", role: "attendant" },
  { name: "Achieng Otieno",  username: "achieng",  password: "achieng123",  role: "attendant" },
];

async function seedDatabase() {
  const db = getDb();

  // Check if already seeded
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (userCount.count > 0) {
    console.log('⏩ Database already seeded — skipping');
    return;
  }

  console.log('🌱 Seeding database...');

  // Seed users
  const insertUser = db.prepare(`
    INSERT OR IGNORE INTO users (name, username, password, role)
    VALUES (?, ?, ?, ?)
  `);
  for (const user of USERS) {
    const hash = bcrypt.hashSync(user.password, 10);
    insertUser.run(user.name, user.username, hash, user.role);
  }
  console.log(`  ✅ ${USERS.length} users seeded`);

  // Seed products
  const insertProduct = db.prepare(`
    INSERT OR IGNORE INTO products
      (name, brand, category, unit, price, stock, icon, description, image)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const p of PRODUCTS) {
    insertProduct.run(p.name, p.brand, p.category, p.unit, p.price, p.stock, p.icon, p.description, p.image);
  }
  console.log(`  ✅ ${PRODUCTS.length} products seeded`);

  // Seed sample sales
  const insertSale = db.prepare(`
    INSERT INTO sales
      (attendant_name, customer_name, customer_phone, customer_location,
       payment_method, payment_status, total, sale_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertItem = db.prepare(`
    INSERT INTO sale_items (sale_id, product_name, qty, unit_price, subtotal)
    VALUES (?, ?, ?, ?, ?)
  `);

  const sampleSales = [
    { attendant: "Wanjiru Kamau",  customer: "Amina Hassan",    phone: "0712345678", location: "PCEA Area, Eldoret",   method: "M-Pesa",   date: "2026-05-08", items: [["Women's Maxi Dress", 2, 2800], ["Ladies' Handbag", 1, 2200]] },
    { attendant: "Kipchoge Mutai", customer: "Brian Otieno",    phone: "0722987654", location: "Huruma, Eldoret",    method: "ATM/Card", date: "2026-05-10", items: [["Men's Suit (2-Piece)", 1, 7500], ["Men's Leather Belt", 1, 750]] },
    { attendant: "Achieng Otieno", customer: "Grace Muthoni",   phone: "0733111222", location: "Langas, Eldoret",    method: "M-Pesa",   date: "2026-05-13", items: [["Kids' School Uniform Set", 3, 1200], ["Kids' Sneakers", 2, 1400]] },
    { attendant: "Wanjiru Kamau",  customer: "Fatuma Ali",      phone: "0700555888", location: "Pioneer, Eldoret",     method: "Cash",     date: "2026-05-15", items: [["African Print Kitenge Top", 2, 1600], ["Ladies' Denim Jeans", 1, 2500]] },
    { attendant: "Kipchoge Mutai", customer: "Daniel Njoroge",  phone: "0711333444", location: "Uganda Road, Eldoret",  method: "M-Pesa",   date: "2026-05-17", items: [["Men's Official Shirt", 2, 1500], ["Men's Chino Trousers", 1, 1900]] },
    { attendant: "Achieng Otieno", customer: "Zainab Mohamed",  phone: "0715666777", location: "Huruma Estate, Eldoret",   method: "M-Pesa",   date: "2026-05-20", items: [["Ankara Dress (Tailored)", 1, 3500], ["Scarf / Hijab (Silk)", 2, 850]] },
  ];

  for (const s of sampleSales) {
    const total = s.items.reduce((a, i) => a + i[1] * i[2], 0);
    const result = insertSale.run(s.attendant, s.customer, s.phone, s.location, s.method, "Paid", total, s.date);
    for (const [name, qty, price] of s.items) {
      insertItem.run(result.lastInsertRowid, name, qty, price, qty * price);
    }
  }
  console.log(`  ✅ ${sampleSales.length} sample sales seeded`);
  console.log('🎉 Seeding complete!');
}

module.exports = { seedDatabase };

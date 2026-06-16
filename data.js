// ═══════════════════════════════════════════════════
//  LOOKU STORE — data.js
//  Kenya Fashion & Clothing · KSH · Eldoret
// ═══════════════════════════════════════════════════

const MANAGER_CREDS = { username: "manager", password: "looku2026" };

// ── Default seed data ────────────────────────────────
const DEFAULT_PRODUCTS = [
  {
    id: 1, name: "Women's Maxi Dress", brand: "Looku Collection",
    unit: "Sizes S / M / L / XL", category: "Women's Wear", price: 2800, stock: 25,
    icon: "👗",
    image: "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=400&q=80",
    description: "Elegant floral maxi dress — lightweight chiffon fabric, perfect for any occasion. Available in multiple colours."
  },
  {
    id: 2, name: "Men's Official Shirt", brand: "Looku Men",
    unit: "Sizes S / M / L / XL / XXL", category: "Men's Wear", price: 1500, stock: 40,
    icon: "👔",
    image: "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=400&q=80",
    description: "Smart slim-fit cotton shirt — ideal for the office, church or formal events. Wrinkle-resistant fabric."
  },
  {
    id: 3, name: "Ladies' Bodycon Dress", brand: "Looku Collection",
    unit: "Sizes XS / S / M / L", category: "Women's Wear", price: 1800, stock: 30,
    icon: "👗",
    image: "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=400&q=80",
    description: "Trendy stretch bodycon dress — hugs your curves perfectly. Great for evening outings and parties."
  },
  {
    id: 4, name: "Men's Chino Trousers", brand: "Looku Men",
    unit: "Waist 28–40 inches", category: "Men's Wear", price: 1900, stock: 35,
    icon: "👖",
    image: "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=400&q=80",
    description: "Classic slim-fit chino trousers — versatile for casual and semi-formal wear. Breathable cotton blend."
  },
  {
    id: 5, name: "Kids' School Uniform Set", brand: "Looku Kids",
    unit: "Ages 3–14 yrs", category: "Kids' Wear", price: 1200, stock: 50,
    icon: "🧒",
    image: "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=400&q=80",
    description: "Durable school uniform set — shirt + shorts/skirt. Stain-resistant and easy to wash. Various school colours available."
  },
  {
    id: 6, name: "African Print Kitenge Top", brand: "Looku Ankara",
    unit: "Sizes S / M / L / XL", category: "Women's Wear", price: 1600, stock: 20,
    icon: "👚",
    image: "https://images.unsplash.com/photo-1590735213920-68192a487bc2?w=400&q=80",
    description: "Vibrant Ankara kitenge top — bold African prints, tailored fit. Celebrate your culture in style."
  },
  {
    id: 7, name: "Men's T-Shirt (Plain)", brand: "Looku Basics",
    unit: "Sizes S / M / L / XL / XXL", category: "Men's Wear", price: 650, stock: 80,
    icon: "👕",
    image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&q=80",
    description: "100% cotton plain t-shirt — soft, comfortable everyday wear. Available in black, white, navy, grey and more."
  },
  {
    id: 8, name: "Ladies' Denim Jeans", brand: "Looku Denim",
    unit: "Waist 26–38 inches", category: "Women's Wear", price: 2500, stock: 28,
    icon: "👖",
    image: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=400&q=80",
    description: "High-waist stretch denim jeans — flattering cut, super comfortable. Pairs with anything in your wardrobe."
  },
  {
    id: 9, name: "Men's Denim Jeans", brand: "Looku Denim",
    unit: "Waist 28–40 inches", category: "Men's Wear", price: 2200, stock: 32,
    icon: "👖",
    image: "https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&q=80",
    description: "Classic straight-leg denim jeans — rugged and durable. Perfect for casual outings around Eldoret."
  },
  {
    id: 10, name: "Kids' Sneakers", brand: "Looku Kids",
    unit: "Sizes EU 25–38", category: "Footwear", price: 1400, stock: 22,
    icon: "👟",
    image: "https://images.unsplash.com/photo-1514989940723-e8e51635b782?w=400&q=80",
    description: "Colourful kids' sneakers — cushioned sole, easy velcro strap. Durable for school and play."
  },
  {
    id: 11, name: "Ladies' Block-Heel Shoes", brand: "Looku Footwear",
    unit: "Sizes EU 36–42", category: "Footwear", price: 3200, stock: 18,
    icon: "👠",
    image: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400&q=80",
    description: "Elegant block-heel shoes — comfortable enough for all-day wear, stylish enough for any event."
  },
  {
    id: 12, name: "Men's Loafers", brand: "Looku Footwear",
    unit: "Sizes EU 39–46", category: "Footwear", price: 2800, stock: 20,
    icon: "👞",
    image: "https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?w=400&q=80",
    description: "Premium leather loafers — sleek design for office, church and dinner. Easy slip-on, all-day comfort."
  },
  {
    id: 13, name: "Ladies' Handbag", brand: "Looku Accessories",
    unit: "One size", category: "Accessories", price: 2200, stock: 15,
    icon: "👜",
    image: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&q=80",
    description: "Stylish faux-leather handbag — spacious interior, multiple compartments. The perfect everyday bag."
  },
  {
    id: 14, name: "Men's Leather Belt", brand: "Looku Accessories",
    unit: "Lengths 85–120 cm", category: "Accessories", price: 750, stock: 45,
    icon: "🪢",
    image: "https://images.unsplash.com/photo-1624222247344-550fb60fe8ff?w=400&q=80",
    description: "Genuine leather belt — smart buckle, durable stitching. Completes any formal or casual outfit."
  },
  {
    id: 15, name: "Baby Romper Set", brand: "Looku Kids",
    unit: "Ages 0–24 months", category: "Kids' Wear", price: 900, stock: 40,
    icon: "🍼",
    image: "https://images.unsplash.com/photo-1522771930-78848d9293e8?w=400&q=80",
    description: "Adorable soft-cotton baby romper set — 2 pieces, gentle on delicate skin. Cute prints and pastel colours."
  },
  {
    id: 16, name: "Ankara Dress (Tailored)", brand: "Looku Ankara",
    unit: "Custom sizing available", category: "Women's Wear", price: 3500, stock: 12,
    icon: "👗",
    image: "https://images.unsplash.com/photo-1618085219724-c59ba48e08cd?w=400&q=80",
    description: "Bespoke tailored Ankara dress — bold African prints, fitted silhouette. Available for custom orders."
  },
  {
    id: 17, name: "Men's Suit (2-Piece)", brand: "Looku Men",
    unit: "Sizes 36–52 (chest)", category: "Men's Wear", price: 7500, stock: 10,
    icon: "🤵",
    image: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=400&q=80",
    description: "Sharp 2-piece suit — slim fit, premium fabric. Perfect for weddings, interviews and corporate events in Eldoret."
  },
  {
    id: 18, name: "Sports Hoodie", brand: "Looku Active",
    unit: "Sizes S / M / L / XL", category: "Sportswear", price: 1800, stock: 30,
    icon: "🧥",
    image: "https://images.unsplash.com/photo-1556821840-3a63f15732ce?w=400&q=80",
    description: "Fleece-lined sports hoodie — warm and comfortable. Great for early morning jogs along Eldoret Arboretum or casual wear."
  },
  {
    id: 19, name: "Ladies' Sports Leggings", brand: "Looku Active",
    unit: "Sizes XS / S / M / L / XL", category: "Sportswear", price: 1400, stock: 35,
    icon: "🩱",
    image: "https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=400&q=80",
    description: "High-waist compression leggings — moisture-wicking fabric. Perfect for gym, yoga or a walk in Eldoret's CBD."
  },
  {
    id: 20, name: "Scarf / Hijab (Silk)", brand: "Looku Accessories",
    unit: "One size — 170×70 cm", category: "Accessories", price: 850, stock: 50,
    icon: "🧣",
    image: "https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=400&q=80",
    description: "Lightweight silk-feel scarf — vibrant prints, versatile styling. Can be worn as a hijab, head wrap or neck scarf."
  },
];

const DEFAULT_SALES = [
  {
    id: 1, date: "2026-05-08",
    items: [{ name: "Women's Maxi Dress", qty: 2, price: 2800 }, { name: "Ladies' Handbag", qty: 1, price: 2200 }],
    total: 7800, attendant: "Wanjiru Kamau",
    customerName: "Amina Hassan", customerPhone: "0712 345 678",
    customerLocation: "PCEA Area, Eldoret",
    paymentMethod: "M-Pesa", paymentStatus: "Paid"
  },
  {
    id: 2, date: "2026-05-10",
    items: [{ name: "Men's Suit (2-Piece)", qty: 1, price: 7500 }, { name: "Men's Leather Belt", qty: 1, price: 750 }],
    total: 8250, attendant: "Kipchoge Mutai",
    customerName: "Brian Otieno", customerPhone: "0722 987 654",
    customerLocation: "Huruma, Eldoret",
    paymentMethod: "ATM/Card", paymentStatus: "Paid"
  },
  {
    id: 3, date: "2026-05-13",
    items: [{ name: "Kids' School Uniform Set", qty: 3, price: 1200 }, { name: "Kids' Sneakers", qty: 2, price: 1400 }],
    total: 6400, attendant: "Wanjiru Kamau",
    customerName: "Grace Muthoni", customerPhone: "0733 111 222",
    customerLocation: "Langas, Eldoret",
    paymentMethod: "M-Pesa", paymentStatus: "Paid"
  },
  {
    id: 4, date: "2026-05-15",
    items: [{ name: "African Print Kitenge Top", qty: 2, price: 1600 }, { name: "Ladies' Denim Jeans", qty: 1, price: 2500 }],
    total: 5700, attendant: "Achieng Otieno",
    customerName: "Fatuma Ali", customerPhone: "0700 555 888",
    customerLocation: "Pioneer, Eldoret",
    paymentMethod: "Cash", paymentStatus: "Paid"
  },
  {
    id: 5, date: "2026-05-17",
    items: [{ name: "Men's Official Shirt", qty: 2, price: 1500 }, { name: "Men's Chino Trousers", qty: 1, price: 1900 }],
    total: 4900, attendant: "Kipchoge Mutai",
    customerName: "Daniel Njoroge", customerPhone: "0711 333 444",
    customerLocation: "Uganda Road, Eldoret",
    paymentMethod: "M-Pesa", paymentStatus: "Paid"
  },
  {
    id: 6, date: "2026-05-20",
    items: [{ name: "Ankara Dress (Tailored)", qty: 1, price: 3500 }, { name: "Scarf / Hijab (Silk)", qty: 2, price: 850 }],
    total: 5200, attendant: "Achieng Otieno",
    customerName: "Zainab Mohamed", customerPhone: "0715 666 777",
    customerLocation: "Huruma, Eldoret",
    paymentMethod: "M-Pesa", paymentStatus: "Paid"
  },
];

const DEFAULT_ATTENDANTS = [
  { id: 1, username: "wanjiru",  password: "wanjiru123",  name: "Wanjiru Kamau"  },
  { id: 2, username: "kipchoge", password: "kipchoge123", name: "Kipchoge Mutai" },
  { id: 3, username: "achieng",  password: "achieng123",  name: "Achieng Otieno" },
];

// ── localStorage keys ─────────────────────────────────
const KEYS = {
  products:      "looku_products",
  sales:         "looku_sales",
  attendants:    "looku_attendants",
  requests:      "looku_delete_requests",
  stockReports:  "looku_stock_reports",
};

function loadFromStorage(key, defaultValue) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultValue;
  } catch (e) { return defaultValue; }
}

function saveToStorage(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch (e) { console.warn("localStorage save failed:", e); }
}

// ── Live data ─────────────────────────────────────────
let products           = loadFromStorage(KEYS.products,      DEFAULT_PRODUCTS);
let sales              = loadFromStorage(KEYS.sales,         DEFAULT_SALES);
let ATTENDANT_ACCOUNTS = loadFromStorage(KEYS.attendants,    DEFAULT_ATTENDANTS);
let deleteRequests     = loadFromStorage(KEYS.requests,      []);
let stockReports       = loadFromStorage(KEYS.stockReports,  []);
let cart               = [];
let loggedInAttendant  = null;

function saveProducts()      { saveToStorage(KEYS.products,      products);           }
function saveSales()         { saveToStorage(KEYS.sales,         sales);              }
function saveAttendants()    { saveToStorage(KEYS.attendants,     ATTENDANT_ACCOUNTS); }
function saveRequests()      { saveToStorage(KEYS.requests,       deleteRequests);     }
function saveStockReports()  { saveToStorage(KEYS.stockReports,   stockReports);       }

// ── Helpers ───────────────────────────────────────────
function fmt(n) {
  return `KSH ${Number(n).toLocaleString("en-KE")}`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function nextId(arr) {
  return arr.length ? Math.max(...arr.map(i => i.id)) + 1 : 1;
}

function factoryReset() {
  Object.values(KEYS).forEach(k => localStorage.removeItem(k));
  location.reload();
}

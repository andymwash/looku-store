# LOOKU STORE — Backend API
### Node.js + Express + SQLite · Nairobi, Kenya 🇰🇪

---

## 📁 Project Structure

```
looku-store-backend/
├── server.js                  ← Main entry point
├── package.json
├── .env.example               ← Copy to .env and configure
├── looku_store.db             ← SQLite database (auto-created)
├── uploads/                   ← Product images stored here
├── config/
│   ├── database.js            ← DB init & connection
│   └── seed.js                ← Default users & products
├── middleware/
│   └── auth.js                ← JWT authentication guard
└── routes/
    ├── auth.js                ← Login / logout
    ├── products.js            ← Product CRUD + image upload
    ├── sales.js               ← Sales recording & reporting
    ├── users.js               ← Attendant management
    ├── notifications.js       ← In-app notifications
    ├── deleteRequests.js      ← Attendant delete requests
    └── reports.js             ← CSV downloads & finance
```

---

## 🚀 Setup & Run

### 1. Install Node.js (v22+)
Download from https://nodejs.org — version 22 or higher is required.

### 2. Install dependencies
```bash
cd looku-store-backend
npm install
```

### 3. Configure environment
```bash
cp .env.example .env
```
Edit `.env` if needed (defaults work out of the box).

### 4. Start the server
```bash
# Production
node --experimental-sqlite server.js

# Development (auto-restart on changes)
npm run dev
```

### 5. Open the app
- **API:**      http://localhost:3000/api/health
- **Frontend:** http://localhost:3000  (if looku-store folder is alongside)

---

## 🔑 Default Login Credentials

| Role      | Username   | Password      |
|-----------|------------|---------------|
| Manager   | `manager`  | `looku2026`   |
| Attendant | `wanjiru`  | `wanjiru123`  |
| Attendant | `kipchoge` | `kipchoge123` |
| Attendant | `achieng`  | `achieng123`  |

---

## 📡 API Endpoints

All protected routes require: `Authorization: Bearer <token>`

### 🔐 Auth
| Method | Endpoint           | Access  | Description        |
|--------|--------------------|---------|--------------------|
| POST   | `/api/auth/login`  | Public  | Login, get token   |
| GET    | `/api/auth/me`     | Any     | Current user info  |
| POST   | `/api/auth/logout` | Any     | Logout             |

**Login example:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"manager","password":"looku2026"}'
```

---

### 📦 Products
| Method | Endpoint                        | Access           | Description          |
|--------|---------------------------------|------------------|----------------------|
| GET    | `/api/products`                 | Public           | All products         |
| GET    | `/api/products?category=X`      | Public           | Filter by category   |
| GET    | `/api/products?search=dress`    | Public           | Search products      |
| GET    | `/api/products/categories`      | Public           | All categories       |
| GET    | `/api/products/:id`             | Public           | Single product       |
| POST   | `/api/products`                 | Manager          | Add product          |
| PUT    | `/api/products/:id`             | Manager          | Edit product         |
| DELETE | `/api/products/:id`             | Manager          | Delete product       |
| POST   | `/api/products/:id/stock`       | Manager/Attendant| Update stock qty     |

**Add product with image (base64):**
```bash
curl -X POST http://localhost:3000/api/products \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Kitenge Dress",
    "brand": "Looku Ankara",
    "category": "Women'\''s Wear",
    "unit": "Sizes S/M/L/XL",
    "price": 2500,
    "stock": 15,
    "description": "Beautiful Ankara kitenge dress",
    "imageBase64": "data:image/jpeg;base64,..."
  }'
```

---

### 💰 Sales
| Method | Endpoint                      | Access           | Description         |
|--------|-------------------------------|------------------|---------------------|
| GET    | `/api/sales`                  | Manager/Attendant| All sales           |
| GET    | `/api/sales?method=M-Pesa`    | Manager/Attendant| Filter by method    |
| GET    | `/api/sales/summary`          | Manager          | Revenue summary     |
| GET    | `/api/sales/:id`              | Manager/Attendant| Single sale         |
| POST   | `/api/sales`                  | Any (auth)       | Record new sale     |
| PATCH  | `/api/sales/:id/status`       | Manager/Attendant| Update payment status|
| DELETE | `/api/sales/:id`              | Manager          | Delete sale         |

**Record a sale:**
```bash
curl -X POST http://localhost:3000/api/sales \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {"productId": 1, "qty": 2, "unitPrice": 2800},
      {"productId": 13, "qty": 1}
    ],
    "customerName": "Amina Hassan",
    "customerPhone": "0712345678",
    "customerLocation": "Westlands, Nairobi",
    "paymentMethod": "M-Pesa",
    "mobilePhone": "0712345678",
    "network": "M-Pesa (Safaricom)"
  }'
```

---

### 👥 Users
| Method | Endpoint                       | Access  | Description        |
|--------|--------------------------------|---------|--------------------|
| GET    | `/api/users`                   | Manager | All users          |
| POST   | `/api/users`                   | Manager | Create attendant   |
| PUT    | `/api/users/:id`               | Manager | Edit user          |
| DELETE | `/api/users/:id`               | Manager | Remove user        |
| PATCH  | `/api/users/:id/password`      | Manager/Self| Change password|

---

### 📊 Reports
| Method | Endpoint                      | Access  | Description           |
|--------|-------------------------------|---------|----------------------|
| GET    | `/api/reports/sales-csv`      | Manager | Download sales CSV   |
| GET    | `/api/reports/restock-csv`    | Manager | Download restock CSV |
| GET    | `/api/reports/finance`        | Manager | Finance JSON summary |

---

### 🔔 Notifications
| Method | Endpoint                       | Access | Description         |
|--------|--------------------------------|--------|---------------------|
| GET    | `/api/notifications`           | Any    | Get notifications   |
| GET    | `/api/notifications?role=manager` | Any | Filter by role   |
| PATCH  | `/api/notifications/read`      | Any    | Mark all as read    |
| DELETE | `/api/notifications`           | Any    | Clear notifications |

---

### 🗑 Delete Requests
| Method | Endpoint                       | Access    | Description          |
|--------|--------------------------------|-----------|----------------------|
| GET    | `/api/delete-requests`         | Manager   | All pending requests |
| POST   | `/api/delete-requests`         | Attendant | Submit request       |
| PATCH  | `/api/delete-requests/:id`     | Manager   | Approve or reject    |

---

## 🗄️ Database Tables

| Table             | Purpose                              |
|-------------------|--------------------------------------|
| `users`           | Managers and attendants              |
| `products`        | Clothing items with images           |
| `sales`           | Transaction records                  |
| `sale_items`      | Individual items per sale            |
| `delete_requests` | Attendant product deletion requests  |
| `notifications`   | In-app notifications per role        |

---

## 🔒 Security Notes
- Passwords are **bcrypt hashed** (never stored in plain text)
- All protected routes use **JWT tokens** (24hr expiry)
- Role-based access: Manager sees everything; Attendants see their own data
- In production, set `NODE_ENV=production` and restrict CORS origin

## 🌍 Deployment (Render.com — Free)
1. Push to GitHub
2. Go to https://render.com → New Web Service
3. Connect your repo
4. Build command: `npm install`
5. Start command: `node --experimental-sqlite server.js`
6. Add environment variables from `.env`

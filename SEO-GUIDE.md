# How to Make Looku Store Findable on Google
## Step-by-Step Guide · Nairobi, Kenya 🇰🇪

---

## ✅ STEP 1 — Deploy the Website (Get a Live Link)

### Option A: Netlify (Easiest — Recommended)
1. Go to https://netlify.com → sign up free
2. Click **"Add new site" → "Deploy manually"**
3. Drag and drop the entire `looku-store` folder
4. Netlify gives you a link like: `https://looku-store.netlify.app`
5. **Set a custom domain** (see Step 2)

### Option B: GitHub Pages (Free + Professional)
1. Create account at https://github.com
2. New repository → name it `lookustore`
3. Upload all files from the `looku-store` folder
4. Settings → Pages → Source → main branch
5. Live at: `https://yourusername.github.io/lookustore`

---

## ✅ STEP 2 — Get a .co.ke Domain Name

A Kenyan domain makes you appear more trustworthy and rank better locally.

### Register at (cost ~KES 1,000–2,000/year):
- **Safaricom Domains:** https://domains.safaricom.co.ke
- **Kenya Web Experts:** https://www.kenyawebexperts.com
- **Truehost Kenya:** https://truehost.co.ke
- **HostPoa:** https://hostpoa.com

**Recommended domain:** `lookustore.co.ke` or `looku.co.ke`

### After buying domain — connect to Netlify:
1. Netlify → Site Settings → Domain Management
2. Add your custom domain: `lookustore.co.ke`
3. Update your domain's DNS records as Netlify instructs

---

## ✅ STEP 3 — Submit to Google Search Console

This tells Google your site exists so it can index it.

1. Go to https://search.google.com/search-console
2. Sign in with Google
3. Click **"Add property"** → enter `https://www.lookustore.co.ke`
4. Verify ownership (Netlify makes this easy — HTML file method)
5. Go to **Sitemaps** → enter `https://www.lookustore.co.ke/sitemap.xml` → Submit
6. Google will start indexing your site within 1–7 days

---

## ✅ STEP 4 — Create Google Business Profile (VERY IMPORTANT)

This makes you appear on **Google Maps** and in **"near me"** searches.

1. Go to https://business.google.com
2. Click **"Manage now"**
3. Search for "Looku Store" → if not found, click **"Add your business"**
4. Fill in:
   - Business name: **Looku Store**
   - Category: **Clothing Store**
   - Location: Your exact address in Nairobi
   - Phone: Your M-Pesa line
   - Website: `https://www.lookustore.co.ke`
   - Hours: Mon–Sat 8am–8pm, Sun 10am–6pm
5. Upload photos of your store and products
6. Google will send a verification postcard or call

✨ Once verified, customers searching **"clothing store near me Nairobi"** or **"fashion store Westlands"** will find you!

---

## ✅ STEP 5 — Update Your Website Domain

Once you have your domain (e.g. `lookustore.co.ke`), update these files:

### In `index.html` — update these lines:
```html
<link rel="canonical" href="https://www.lookustore.co.ke/"/>
<meta property="og:url" content="https://www.lookustore.co.ke/"/>
<meta property="og:image" content="https://www.lookustore.co.ke/looku_logo.png"/>
```

### In `sitemap.xml` — replace all instances of:
`https://www.lookustore.co.ke` → your actual domain

---

## ✅ STEP 6 — Social Media Profiles (Help SEO)

Create these accounts using the name **"Looku Store"**:

| Platform    | Why it matters                        |
|-------------|---------------------------------------|
| **Instagram** | Fashion sells on Instagram — post product photos daily |
| **Facebook**  | Create a Facebook Page + Facebook Shop |
| **TikTok**    | Short videos of outfits get huge reach in Kenya |
| **WhatsApp Business** | Customers can message to order |

Link all social profiles back to your website. This builds trust with Google.

---

## ✅ STEP 7 — WhatsApp Business (Order via Chat)

1. Download **WhatsApp Business** app
2. Set up your catalogue (add product photos + prices)
3. Add a "Chat on WhatsApp" button to your site:

Add this to the landing page in `index.html`:
```html
<a href="https://wa.me/254700000000?text=Hi%20Looku%20Store!%20I'd%20like%20to%20order%20something."
   target="_blank" class="whatsapp-btn">
  💬 Order on WhatsApp
</a>
```

---

## 📊 What Good SEO Looks Like (Timeline)

| Timeframe | What happens |
|-----------|-------------|
| Day 1     | Deploy site, submit to Google Search Console |
| Week 1    | Google crawls and indexes your site |
| Week 2    | Google Business Profile verified |
| Month 1   | Start appearing for searches like "Looku Store Nairobi" |
| Month 3   | Start ranking for "clothing store Nairobi", "kitenge dress Kenya" |
| Month 6   | Strong local rankings if you keep adding products + reviews |

---

## 🔑 Most Important Keywords to Rank For

Your site is already optimised for these search terms:

- `looku store`
- `clothing store nairobi`
- `fashion shop nairobi`
- `women's wear nairobi`
- `kitenge dress nairobi`
- `ankara dress kenya`
- `buy clothes online kenya`
- `men's suit nairobi`
- `school uniform nairobi`
- `kids clothing nairobi`
- `african fashion kenya`
- `online boutique nairobi`

---

## ✅ Quick Checklist

- [ ] Website deployed on Netlify or GitHub Pages
- [ ] .co.ke domain purchased and connected
- [ ] Google Search Console set up + sitemap submitted
- [ ] Google Business Profile created and verified
- [ ] Instagram + Facebook pages created
- [ ] WhatsApp Business set up with product catalogue
- [ ] Ask first customers to leave Google reviews ⭐⭐⭐⭐⭐

---

*The files `sitemap.xml`, `robots.txt`, and `manifest.json` are already included
in your looku-store folder and are ready to upload.*

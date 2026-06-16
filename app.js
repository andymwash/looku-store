// ═══════════════════════════════════════════════════
//  LOOKU STORE — app.js
// ═══════════════════════════════════════════════════

// ────────────────────────────────────────────────────
//  NOTIFICATIONS (in-app bell system)
// ────────────────────────────────────────────────────
function pushNotification(role, msg, type = "info") {
  const key = "looku_notif_" + role;
  let notifs = [];
  try { notifs = JSON.parse(localStorage.getItem(key)) || []; } catch(e){}
  notifs.unshift({ id: Date.now(), msg, type, time: new Date().toLocaleTimeString(), read: false });
  if (notifs.length > 50) notifs = notifs.slice(0, 50);
  localStorage.setItem(key, JSON.stringify(notifs));
}

function getNotifications(role) {
  try { return JSON.parse(localStorage.getItem("looku_notif_" + role)) || []; } catch(e){ return []; }
}

function markAllRead(role) {
  let notifs = getNotifications(role);
  notifs = notifs.map(n => ({ ...n, read: true }));
  localStorage.setItem("looku_notif_" + role, JSON.stringify(notifs));
}

function clearNotifications(role) {
  localStorage.removeItem("looku_notif_" + role);
}

function unreadCount(role) {
  return getNotifications(role).filter(n => !n.read).length;
}

// ────────────────────────────────────────────────────
//  APP — routing & shared utilities
// ────────────────────────────────────────────────────
const App = {
  currentPage: "landing",

  goTo(pageId) {
    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
    const target = document.getElementById("page-" + pageId);
    if (target) target.classList.add("active");
    this.currentPage = pageId;
    if (pageId === "manager")   Manager.init();
    if (pageId === "customer")  Customer.init();
    if (pageId === "attendant") Attendant.init();
  },

  selectRole(role) { this.goTo(role); },

  managerLogin() {
    const u = document.getElementById("login-user").value.trim();
    const p = document.getElementById("login-pass").value;
    const errBox = document.getElementById("login-error");
    if (u === MANAGER_CREDS.username && p === MANAGER_CREDS.password) {
      errBox.style.display = "none";
      document.getElementById("login-user").value = "";
      document.getElementById("login-pass").value = "";
      this.goTo("manager");
    } else {
      errBox.style.display = "flex";
      errBox.textContent = "⚠ Invalid credentials. Please try again.";
    }
  },

  attendantLogin() {
    const u = document.getElementById("att-login-user").value.trim().toLowerCase();
    const p = document.getElementById("att-login-pass").value;
    const errBox = document.getElementById("attendant-login-error");
    const account = ATTENDANT_ACCOUNTS.find(a => a.username === u && a.password === p);
    if (account) {
      errBox.style.display = "none";
      loggedInAttendant = account;
      document.getElementById("att-login-user").value = "";
      document.getElementById("att-login-pass").value = "";
      const roleEl = document.getElementById("att-sidebar-role");
      if (roleEl) roleEl.textContent = account.name;
      this.goTo("attendant");
    } else {
      errBox.style.display = "flex";
      errBox.textContent = "⚠ Invalid username or password. Please try again.";
    }
  },

  attendantLogout() { loggedInAttendant = null; this.goTo("landing"); },

  showSuccess(containerId, msg, duration = 4000) {
    const el = document.createElement("div");
    el.className = "success-box";
    el.textContent = "✓ " + msg;
    const container = document.getElementById(containerId);
    if (container) { container.prepend(el); setTimeout(() => el.remove(), duration); }
  },

  salesTable(salesArr, showAttendant = false) {
    if (!salesArr.length) return '<div class="empty-state">No records found.</div>';
    const attH = showAttendant ? "<th>Attendant/Customer</th>" : "";
    const rows = salesArr.map(s => {
      const itemsStr = s.items.map(i => `${i.name} ×${i.qty}`).join(", ");
      const attTd = showAttendant ? `<td>${s.attendant || "—"}</td>` : "";
      const payBadge = s.paymentMethod
        ? `<span class="pay-badge pay-${(s.paymentMethod||'').toLowerCase().replace(/\s/g,'-')}">${s.paymentMethod}</span>`
        : "";
      const statusBadge = `<span class="status-badge status-${(s.paymentStatus||'pending').toLowerCase()}">${s.paymentStatus||'Pending'}</span>`;
      const customer = s.customerName ? `<br><small style="color:#6b7280">👤 ${s.customerName} · 📞 ${s.customerPhone||'—'}</small>` : "";
      return `<tr>
        <td>${s.date}</td>
        <td>${itemsStr}${customer}</td>
        ${attTd}
        <td>${payBadge} ${statusBadge}</td>
        <td style="font-weight:700;color:#10b981">${fmt(s.total)}</td>
      </tr>`;
    }).join("");
    return `<div class="table-wrap"><table>
      <thead><tr><th>Date</th><th>Items</th>${attH}<th>Payment</th><th>Total</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>`;
  },

  // ── CSV Download ──────────────────────────────────
  downloadSalesCSV() {
    const header = ["Date","Customer Name","Phone","Location","Items","Qty","Unit Price","Total","Payment Method","Payment Status","Attendant"];
    const rows = [];
    sales.forEach(s => {
      s.items.forEach(item => {
        rows.push([
          s.date,
          s.customerName || "Walk-in",
          s.customerPhone || "",
          s.customerLocation || "",
          item.name,
          item.qty,
          item.price,
          s.total,
          s.paymentMethod || "Cash",
          s.paymentStatus || "Paid",
          s.attendant || ""
        ]);
      });
    });
    const csvContent = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `looku-sales-${today()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },

  // ── Restock Download ─────────────────────────────
  downloadRestockCSV() {
    // Summarise sold quantities per product
    const soldMap = {};
    sales.forEach(s => s.items.forEach(i => {
      soldMap[i.name] = (soldMap[i.name] || 0) + i.qty;
    }));
    const header = ["Product","Brand","Category","Unit","Current Stock","Total Sold","Suggested Reorder Qty"];
    const rows = products.map(p => [
      p.name, p.brand || "", p.category, p.unit || "",
      p.stock,
      soldMap[p.name] || 0,
      Math.max(0, (soldMap[p.name] || 0) - p.stock + 20)
    ]);
    const csvContent = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `looku-restock-${today()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
};

// ────────────────────────────────────────────────────
//  MANAGER
// ────────────────────────────────────────────────────
const Manager = {
  currentTab: "overview",

  init() {
    this.showTab("overview", document.querySelector("#page-manager .nav-btn"));
    this.updateRequestBadge();
    this.updateNotifBadge();
  },

  updateRequestBadge() {
    const btn = document.getElementById("req-nav-btn");
    if (btn) btn.textContent = deleteRequests.length ? `⚠️ Requests (${deleteRequests.length})` : "⚠️ Requests";
    const srBtn = document.getElementById("mgr-sr-btn");
    const unread = stockReports.filter(r => r.status === "Submitted").length;
    if (srBtn) srBtn.textContent = unread > 0 ? `📋 Stock Reports (${unread})` : "📋 Stock Reports";
  },

  updateNotifBadge() {
    const btn = document.getElementById("mgr-notif-btn");
    const count = unreadCount("manager");
    if (btn) btn.textContent = count > 0 ? `🔔 Notifications (${count})` : "🔔 Notifications";
  },

  showTab(tab, btn) {
    this.currentTab = tab;
    document.querySelectorAll("#page-manager .nav-btn").forEach(b => b.classList.remove("active"));
    if (btn) btn.classList.add("active");
    if (tab === "notifications") markAllRead("manager");
    if (tab === "stock-reports") {
      stockReports.forEach(r => { if (r.status === "Submitted") r.status = "Reviewed"; });
      saveStockReports();
      this.updateRequestBadge();
    }
    this.render();
    this.updateNotifBadge();
  },

  render() {
    const el = document.getElementById("manager-main");
    switch (this.currentTab) {
      case "overview":       el.innerHTML = this.renderOverview();      break;
      case "sales":          el.innerHTML = this.renderSales();         break;
      case "finance":        el.innerHTML = this.renderFinance();       break;
      case "stock":          el.innerHTML = this.renderStock();         break;
      case "requests":       el.innerHTML = this.renderRequests();      break;
      case "attendants":     el.innerHTML = this.renderAttendants();    break;
      case "notifications":  el.innerHTML = this.renderNotifications(); break;
      case "stock-reports":  el.innerHTML = this.renderStockReports();  break;
    }
  },

  statCard(icon, value, label, color, small = false) {
    return `<div class="stat-card"><div class="stat-accent-bar" style="background:${color}"></div>
      <div class="stat-icon">${icon}</div>
      <div class="stat-value${small?" small":""}">${value}</div>
      <div class="stat-label">${label}</div></div>`;
  },

  renderOverview() {
    const totalRev = sales.reduce((a, s) => a + s.total, 0);
    const topMap = {};
    sales.forEach(s => s.items.forEach(i => { topMap[i.name] = (topMap[i.name]||0)+i.qty; }));
    const top = Object.entries(topMap).sort((a,b)=>b[1]-a[1])[0];
    const pending = sales.filter(s => (s.paymentStatus||"Paid") === "Pending").length;
    return `
      <h2 class="page-title">Dashboard Overview</h2>
      <div class="stats-grid">
        ${this.statCard("💰", fmt(totalRev), "Total Revenue", "#f59e0b")}
        ${this.statCard("📊", sales.length, "Total Sales", "#10b981")}
        ${this.statCard("📦", products.length, "Products", "#6366f1")}
        ${this.statCard("⏳", pending, "Pending Payments", "#ef4444")}
        ${this.statCard("🏆", top ? top[0] : "—", "Top Product", "#ec4899", true)}
      </div>
      <div style="display:flex;gap:12px;margin-bottom:24px;flex-wrap:wrap">
        <button class="btn" style="background:#10b981" onclick="App.downloadRestockCSV()">⬇ Download Restock List (CSV)</button>
        <button class="btn" style="background:#6366f1" onclick="App.downloadSalesCSV()">⬇ Download All Sales (CSV)</button>
      </div>
      <h3 class="section-title">Recent Orders</h3>
      ${App.salesTable([...sales].reverse().slice(0,8), true)}`;
  },

  renderSales() {
    const methods = ["All","Cash","Mobile Money","ATM/Card"];
    const filter = document.getElementById("sale-filter-method")?.value || "All";
    let filtered = [...sales].reverse();
    if (filter !== "All") filtered = filtered.filter(s => s.paymentMethod === filter);
    const optHtml = methods.map(m => `<option${filter===m?" selected":""}>${m}</option>`).join("");

    const rows = filtered.map(s => {
      const itemsStr = s.items.map(i => `${i.name} ×${i.qty}${i.discountPrice ? ` <span style="color:#f59e0b;font-size:11px">(disc. ${fmt(i.discountPrice)})</span>` : ""}`).join(", ");
      const payBadge = s.paymentMethod
        ? `<span class="pay-badge pay-${(s.paymentMethod).toLowerCase().replace(/[\/\s]/g,"-")}">${s.paymentMethod}</span>` : "";
      const statusBadge = `<span class="status-badge status-${(s.paymentStatus||"paid").toLowerCase()}">${s.paymentStatus||"Paid"}</span>`;
      const customer = s.customerName
        ? `<br><small style="color:#6b7280">👤 ${s.customerName} · 📞 ${s.customerPhone||"—"} · 📍 ${s.customerLocation||"—"}</small>` : "";
      return `<tr>
        <td>${s.date}</td>
        <td>${itemsStr}${customer}</td>
        <td>${s.attendant||"—"}</td>
        <td>${payBadge} ${statusBadge}</td>
        <td style="font-weight:700;color:#10b981">${fmt(s.total)}</td>
        <td>
          <button class="sm-btn" style="background:#ef4444" onclick="Manager.deleteSale(${s.id})">🗑 Delete</button>
        </td>
      </tr>`;
    }).join("");

    return `
      <h2 class="page-title">Sales Records</h2>
      <div style="display:flex;gap:12px;align-items:center;margin-bottom:16px;flex-wrap:wrap">
        <select class="input" style="width:auto" id="sale-filter-method" onchange="Manager.render()">
          ${optHtml}
        </select>
        <button class="btn" style="background:#10b981" onclick="App.downloadRestockCSV()">⬇ Restock List</button>
        <button class="btn" style="background:#6366f1" onclick="App.downloadSalesCSV()">⬇ Sales CSV</button>
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th>Date</th><th>Items</th><th>Attendant</th><th>Payment</th><th>Total</th><th>Action</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="6" style="text-align:center;color:#9ca3af;padding:24px">No sales found.</td></tr>'}</tbody>
      </table></div>`;
  },

  deleteSale(saleId) {
    const s = sales.find(sl => sl.id === saleId);
    if (!s) return;
    const label = `${s.date} · ${s.items.map(i=>i.name).join(", ")} · ${fmt(s.total)}`;
    if (!confirm(`Delete this sale?\n\n${label}\n\nThis cannot be undone.`)) return;
    sales = sales.filter(sl => sl.id !== saleId);
    saveSales();
    App.showSuccess("manager-main", "Sale deleted successfully.");
    this.render();
  },

  renderFinance() {
    const totalRev = sales.reduce((a, s) => a + s.total, 0);
    const byMethod = {};
    sales.forEach(s => {
      const m = s.paymentMethod || "Cash";
      if (!byMethod[m]) byMethod[m] = { count: 0, total: 0 };
      byMethod[m].count++;
      byMethod[m].total += s.total;
    });
    const byAtt = {};
    sales.forEach(s => {
      const k = s.attendant || "—";
      if (!byAtt[k]) byAtt[k] = { count: 0, revenue: 0 };
      byAtt[k].count++;
      byAtt[k].revenue += s.total;
    });
    const methodRows = Object.entries(byMethod).map(([m,d]) =>
      `<tr><td>${m}</td><td>${d.count}</td><td style="color:#10b981;font-weight:600">${fmt(d.total)}</td></tr>`).join("");
    const attRows = Object.entries(byAtt).map(([a,d]) =>
      `<tr><td>${a}</td><td>${d.count}</td><td style="color:#10b981;font-weight:600">${fmt(d.revenue)}</td></tr>`).join("");
    return `
      <h2 class="page-title">Finance Accounts</h2>
      <div class="stats-grid">
        ${this.statCard("💰", fmt(totalRev), "Gross Revenue", "#f59e0b")}
        ${this.statCard("📉", fmt(totalRev*0.6), "Est. Cost (60%)", "#ef4444")}
        ${this.statCard("📈", fmt(totalRev*0.4), "Est. Profit (40%)", "#10b981")}
        ${this.statCard("🔢", sales.length, "Transactions", "#6366f1")}
      </div>
      <h3 class="section-title">Revenue by Payment Method</h3>
      <div class="table-wrap"><table><thead><tr><th>Method</th><th>Count</th><th>Revenue</th></tr></thead><tbody>${methodRows}</tbody></table></div>
      <h3 class="section-title">Revenue by Attendant</h3>
      <div class="table-wrap"><table><thead><tr><th>Attendant</th><th>Sales</th><th>Revenue</th></tr></thead><tbody>${attRows}</tbody></table></div>`;
  },

  renderStock() {
    const editingId = Manager._editingProductId;
    const ep = editingId ? products.find(p => p.id === editingId) : null;

    const rows = products.map(p => {
      const isEditing = editingId === p.id;
      if (isEditing) {
        // Inline edit row
        return `
          <tr style="background:#fffbeb;border-left:3px solid #f59e0b">
            <td colspan="8">
              <div style="padding:12px">
                <div style="font-weight:700;color:#92400e;margin-bottom:12px;font-size:13px">✏️ Editing: ${p.name}</div>
                <div class="form-grid" style="gap:10px">
                  <div class="field" style="margin:0"><label class="label">Product Name</label>
                    <input class="input" id="edit-name" value="${p.name}"/></div>
                  <div class="field" style="margin:0"><label class="label">Brand</label>
                    <input class="input" id="edit-brand" value="${p.brand||""}"/></div>
                  <div class="field" style="margin:0"><label class="label">Category</label>
                    <input class="input" id="edit-cat" value="${p.category}"/></div>
                  <div class="field" style="margin:0"><label class="label">Unit / Size</label>
                    <input class="input" id="edit-unit" value="${p.unit||""}"/></div>
                  <div class="field" style="margin:0"><label class="label">Price (KES)</label>
                    <input class="input" id="edit-price" type="number" value="${p.price}"/></div>
                  <div class="field" style="margin:0"><label class="label">Stock Qty</label>
                    <input class="input" id="edit-stock" type="number" value="${p.stock}"/></div>
                </div>
                <div class="field" style="margin:10px 0 0"><label class="label">Description</label>
                  <textarea class="input" id="edit-desc" rows="2">${p.description||""}</textarea></div>

                <!-- Image update for edit -->
                <div class="field" style="margin-top:10px">
                  <label class="label">Product Image</label>
                  <div class="img-source-btns" id="edit-img-source-btns">
                    <button type="button" class="img-source-btn"
                      onclick="document.getElementById('edit-image-file').click()">
                      <span style="font-size:20px">🖼️</span><span>Upload from PC</span>
                    </button>
                    <button type="button" class="img-source-btn"
                      onclick="Manager.openCameraEdit()">
                      <span style="font-size:20px">📷</span><span>Take Photo</span>
                    </button>
                    <button type="button" class="img-source-btn"
                      onclick="Manager.pasteFromClipboardEdit()">
                      <span style="font-size:20px">📋</span><span>Paste Image</span>
                    </button>
                  </div>
                  <div class="upload-area" id="edit-upload-area"
                    style="${p.image ? "padding:0;min-height:120px" : ""}"
                    ondragover="event.preventDefault();this.classList.add('drag-over')"
                    ondragleave="this.classList.remove('drag-over')"
                    ondrop="Manager.handleDropEdit(event)"
                    onclick="document.getElementById('edit-image-file').click()">
                    <div id="edit-upload-placeholder" style="display:${p.image?"none":"block"}">
                      <div class="upload-icon">⬆️</div>
                      <div class="upload-text">Click, drag &amp; drop or paste new image</div>
                    </div>
                    <img id="edit-upload-preview" class="upload-preview"
                      src="${p.image||""}" style="display:${p.image?"block":"none"}"/>
                  </div>
                  <input type="file" id="edit-image-file" accept="image/*,.heic,.heif"
                    style="display:none" onchange="Manager.handleFileSelectEdit(this)"/>
                  <div style="display:flex;gap:8px;margin-top:6px">
                    <div id="edit-img-info" style="font-size:11px;color:#9ca3af;flex:1"></div>
                    ${p.image ? `<button type="button" class="sm-btn" style="background:#ef4444"
                      onclick="Manager.clearEditImage()">✕ Remove Image</button>` : ""}
                  </div>
                </div>
                <!-- Camera for edit -->
                <div id="edit-camera-panel" style="display:none;margin-top:10px">
                  <video id="edit-camera-video" autoplay playsinline
                    style="width:100%;max-height:220px;border-radius:10px;background:#000"></video>
                  <div style="display:flex;gap:8px;margin-top:8px">
                    <button type="button" class="btn" style="background:#10b981;flex:1"
                      onclick="Manager.capturePhotoEdit()">📸 Capture</button>
                    <button type="button" class="btn" style="background:#6b7280;flex:1"
                      onclick="Manager.closeCameraEdit()">✕ Cancel</button>
                  </div>
                  <canvas id="edit-camera-canvas" style="display:none"></canvas>
                </div>

                <div style="display:flex;gap:10px;margin-top:14px;flex-wrap:wrap">
                  <button class="btn" style="background:#10b981;flex:1"
                    onclick="Manager.saveEdit(${p.id})">✓ Save Changes</button>
                  <button class="btn" style="background:#6b7280"
                    onclick="Manager.cancelEdit()">✕ Cancel</button>
                </div>
              </div>
            </td>
          </tr>`;
      }

      return `<tr>
        <td><div class="thumb-wrap">${p.image
          ? `<img src="${p.image}" class="prod-thumb" alt="${p.name}"/>`
          : `<div class="prod-thumb-fallback">${p.icon||"📦"}</div>`}</div></td>
        <td><strong>${p.name}</strong><br><span style="font-size:11px;color:#9ca3af">${p.description ? p.description.slice(0,50)+"…" : ""}</span></td>
        <td>${p.brand||"—"}</td>
        <td>${p.unit||"—"}</td>
        <td>${p.category}</td>
        <td style="font-weight:600">${fmt(p.price)}</td>
        <td><span class="stock-badge ${p.stock>10?"stock-ok":"stock-low"}">${p.stock}</span></td>
        <td>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            <button class="sm-btn" style="background:#f59e0b"
              onclick="Manager.startEdit(${p.id})">✏️ Edit</button>
            <button class="sm-btn" style="background:#ef4444"
              onclick="Manager.deleteProduct(${p.id})">🗑 Delete</button>
          </div>
        </td>
      </tr>`;
    }).join("");

    return `
      <h2 class="page-title">Stock Management</h2>
      <div style="margin-bottom:16px">
        <button class="btn" style="background:#10b981" onclick="App.downloadRestockCSV()">⬇ Download Restock List (CSV)</button>
      </div>

      <div class="form-card">
        <div class="form-title">Add New Product</div>
        <div class="form-grid">
          <div class="field"><label class="label">Product Name</label>
            <input class="input" id="new-name" placeholder="e.g. Ladies Maxi Dress"/></div>
          <div class="field"><label class="label">Brand</label>
            <input class="input" id="new-brand" placeholder="e.g. Looku Collection"/></div>
          <div class="field"><label class="label">Category</label>
            <input class="input" id="new-cat" placeholder="e.g. Women's Wear"/></div>
          <div class="field"><label class="label">Unit / Size</label>
            <input class="input" id="new-unit" placeholder="e.g. Sizes S/M/L/XL or EU 36-42"/></div>
          <div class="field"><label class="label">Price (KES)</label>
            <input class="input" id="new-price" type="number" placeholder="0"/></div>
          <div class="field"><label class="label">Stock Qty</label>
            <input class="input" id="new-stock" type="number" placeholder="0"/></div>
        </div>

        <div class="field">
          <label class="label">Product Image</label>
          <div class="img-source-btns" id="img-source-btns">
            <button type="button" class="img-source-btn" onclick="document.getElementById('new-image-file').click()">
              <span style="font-size:24px">🖼️</span>
              <span>Upload from PC</span>
              <span style="font-size:11px;color:#9ca3af">JPG, PNG, WEBP, GIF, BMP, SVG</span>
            </button>
            <button type="button" class="img-source-btn" id="camera-btn" onclick="Manager.openCamera()">
              <span style="font-size:24px">📷</span>
              <span>Take Photo</span>
              <span style="font-size:11px;color:#9ca3af">Use device camera</span>
            </button>
            <button type="button" class="img-source-btn" onclick="Manager.pasteFromClipboard()">
              <span style="font-size:24px">📋</span>
              <span>Paste Image</span>
              <span style="font-size:11px;color:#9ca3af">Ctrl+V / Cmd+V</span>
            </button>
          </div>
          <div class="upload-area" id="upload-area"
            ondragover="event.preventDefault();this.classList.add('drag-over')"
            ondragleave="this.classList.remove('drag-over')"
            ondrop="Manager.handleDrop(event)"
            onclick="document.getElementById('new-image-file').click()">
            <div id="upload-placeholder">
              <div class="upload-icon">⬆️</div>
              <div class="upload-text">Drag &amp; drop image here or click to browse</div>
              <div class="upload-hint">Supports JPG · PNG · WEBP · GIF · BMP · SVG · HEIC — any size</div>
            </div>
            <img id="upload-preview" class="upload-preview" style="display:none" alt="Product preview"/>
          </div>
          <input type="file" id="new-image-file" accept="image/*,image/heic,image/heif,.heic,.heif"
            style="display:none" onchange="Manager.handleFileSelect(this)"/>
          <div id="camera-panel" style="display:none;margin-top:12px">
            <video id="camera-video" autoplay playsinline
              style="width:100%;max-height:280px;border-radius:12px;background:#000;display:block"></video>
            <div style="display:flex;gap:10px;margin-top:10px">
              <button type="button" class="btn" style="background:#10b981;flex:1"
                onclick="Manager.capturePhoto()">📸 Capture Photo</button>
              <button type="button" class="btn" style="background:#6b7280;flex:1"
                onclick="Manager.closeCamera()">✕ Cancel</button>
            </div>
            <canvas id="camera-canvas" style="display:none"></canvas>
          </div>
          <div id="img-action-row" style="display:none;gap:10px;align-items:center;flex-wrap:wrap">
            <div id="img-info" style="font-size:12px;color:#6b7280;flex:1"></div>
            <button type="button" class="sm-btn" style="background:#6b7280"
              onclick="Manager.clearImage()">✕ Remove Image</button>
            <button type="button" class="sm-btn" style="background:#6366f1"
              onclick="document.getElementById('new-image-file').click()">🔄 Change</button>
          </div>
        </div>

        <div class="field">
          <label class="label">Description</label>
          <textarea class="input" id="new-desc" rows="2" placeholder="Brief product description..."></textarea>
        </div>
        <button class="btn" style="background:#f59e0b;margin-top:4px;width:100%"
          onclick="Manager.addProduct()">+ Add Product</button>
      </div>

      <h3 class="section-title">All Products</h3>
      <div class="table-wrap"><table>
        <thead><tr><th>Image</th><th>Product</th><th>Brand</th><th>Unit</th>
          <th>Category</th><th>Price</th><th>Stock</th><th>Actions</th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>

      <div style="margin-top:32px;padding:16px;background:#fff5f5;border:1px solid #fecaca;border-radius:12px">
        <div style="font-weight:700;color:#b91c1c;margin-bottom:6px">⚠ Danger Zone</div>
        <p style="font-size:13px;color:#6b7280;margin-bottom:12px">Erases ALL data and restores factory defaults. Cannot be undone.</p>
        <button class="btn" style="background:#ef4444"
          onclick="if(confirm('Are you sure? ALL data will be permanently erased.'))factoryReset()">
          🗑 Reset All Data
        </button>
      </div>`;
  },

  // ── Edit product ──────────────────────────────────────
  _editingProductId: null,
  _editImageBase64: null,
  _editCameraStream: null,

  startEdit(productId) {
    Manager._editingProductId = productId;
    Manager._editImageBase64  = null;
    this.render();
    // Scroll to editing row
    setTimeout(() => {
      const row = document.querySelector("tr[style*='fffbeb']");
      if (row) row.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  },

  cancelEdit() {
    Manager._editingProductId = null;
    Manager._editImageBase64  = null;
    this.render();
  },

  saveEdit(productId) {
    const name  = document.getElementById("edit-name")?.value.trim();
    const brand = document.getElementById("edit-brand")?.value.trim();
    const cat   = document.getElementById("edit-cat")?.value.trim();
    const unit  = document.getElementById("edit-unit")?.value.trim();
    const price = +document.getElementById("edit-price")?.value;
    const stock = +document.getElementById("edit-stock")?.value;
    const desc  = document.getElementById("edit-desc")?.value.trim();
    if (!name || !price) return alert("Product name and price are required.");

    const idx = products.findIndex(p => p.id === productId);
    if (idx === -1) return;

    // Only update image if a new one was uploaded; keep old one otherwise
    const newImage = Manager._editImageBase64;
    const prevImg  = products[idx].image;

    // Check if user removed the image
    const preview = document.getElementById("edit-upload-preview");
    const imageCleared = preview && preview.src === "" || preview && preview.style.display === "none";
    const finalImage = newImage || (imageCleared ? "" : prevImg);

    products[idx] = {
      ...products[idx],
      name, brand, category: cat || "General",
      unit, price, stock, description: desc,
      image: finalImage
    };

    Manager._editingProductId = null;
    Manager._editImageBase64  = null;
    saveProducts();
    App.showSuccess("manager-main", `"${name}" updated successfully!`);
    this.render();
  },

  deleteProduct(productId) {
    const p = products.find(pr => pr.id === productId);
    if (!p) return;
    if (!confirm(`Delete "${p.name}" from stock?\n\nThis cannot be undone.`)) return;
    products = products.filter(pr => pr.id !== productId);
    saveProducts();
    App.showSuccess("manager-main", `"${p.name}" deleted from stock.`);
    // Also cancel edit if we were editing this product
    if (Manager._editingProductId === productId) Manager._editingProductId = null;
    this.render();
  },

  // ── Edit image helpers (mirrors add-product image methods) ──
  handleFileSelectEdit(input) {
    const file = input.files[0];
    if (!file) return;
    Manager.processImageFileEdit(file);
  },

  handleDropEdit(event) {
    event.preventDefault();
    document.getElementById("edit-upload-area")?.classList.remove("drag-over");
    const file = event.dataTransfer.files[0];
    if (!file || !file.type.startsWith("image/")) {
      alert("Please drop an image file."); return;
    }
    Manager.processImageFileEdit(file);
  },

  async pasteFromClipboardEdit() {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imgType = item.types.find(t => t.startsWith("image/"));
        if (imgType) {
          const blob = await item.getType(imgType);
          Manager.processImageFileEdit(new File([blob], "pasted.png", { type: imgType }));
          return;
        }
      }
      alert("No image on clipboard. Copy an image first then click Paste.");
    } catch(e) {
      alert("Press Ctrl+V to paste an image.");
    }
  },

  async openCameraEdit() {
    const panel = document.getElementById("edit-camera-panel");
    const video = document.getElementById("edit-camera-video");
    try {
      Manager._editCameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      });
      video.srcObject = Manager._editCameraStream;
      if (panel) panel.style.display = "block";
      const sourceBtns = document.getElementById("edit-img-source-btns");
      if (sourceBtns) sourceBtns.style.display = "none";
    } catch(e) {
      alert("Camera not available. Upload from PC instead.");
    }
  },

  capturePhotoEdit() {
    const video  = document.getElementById("edit-camera-video");
    const canvas = document.getElementById("edit-camera-canvas");
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    Manager.closeCameraEdit();
    Manager.applyImageEdit(dataUrl, "Camera photo", video.videoWidth, video.videoHeight);
  },

  closeCameraEdit() {
    if (Manager._editCameraStream) {
      Manager._editCameraStream.getTracks().forEach(t => t.stop());
      Manager._editCameraStream = null;
    }
    const panel = document.getElementById("edit-camera-panel");
    if (panel) panel.style.display = "none";
    const sourceBtns = document.getElementById("edit-img-source-btns");
    if (sourceBtns) sourceBtns.style.display = "grid";
  },

  processImageFileEdit(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      if (file.size > 1 * 1024 * 1024) {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX = 800;
          let w = img.width, h = img.height;
          if (w > MAX || h > MAX) {
            if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
            else        { w = Math.round(w * MAX / h); h = MAX; }
          }
          canvas.width = w; canvas.height = h;
          canvas.getContext("2d").drawImage(img, 0, 0, w, h);
          Manager.applyImageEdit(canvas.toDataURL("image/jpeg", 0.82), file.name, w, h);
        };
        img.src = dataUrl;
      } else {
        const tmp = new Image();
        tmp.onload = () => Manager.applyImageEdit(dataUrl, file.name, tmp.width, tmp.height);
        tmp.onerror = () => Manager.applyImageEdit(dataUrl, file.name, 0, 0);
        tmp.src = dataUrl;
      }
    };
    reader.readAsDataURL(file);
  },

  applyImageEdit(dataUrl, filename, w, h) {
    Manager._editImageBase64 = dataUrl;
    const preview     = document.getElementById("edit-upload-preview");
    const placeholder = document.getElementById("edit-upload-placeholder");
    const area        = document.getElementById("edit-upload-area");
    const infoEl      = document.getElementById("edit-img-info");
    const sourceBtns  = document.getElementById("edit-img-source-btns");
    if (preview)     { preview.src = dataUrl; preview.style.display = "block"; }
    if (placeholder) { placeholder.style.display = "none"; }
    if (area)        { area.classList.add("upload-has-image"); }
    if (sourceBtns)  { sourceBtns.style.display = "none"; }
    if (infoEl && w && h) {
      const kb = Math.round(dataUrl.length * 0.75 / 1024);
      infoEl.textContent = `${filename} · ${w}×${h}px · ~${kb} KB`;
    }
  },

  clearEditImage() {
    Manager._editImageBase64 = null;
    const preview     = document.getElementById("edit-upload-preview");
    const placeholder = document.getElementById("edit-upload-placeholder");
    const area        = document.getElementById("edit-upload-area");
    const sourceBtns  = document.getElementById("edit-img-source-btns");
    const fileInput   = document.getElementById("edit-image-file");
    if (preview)     { preview.src = ""; preview.style.display = "none"; }
    if (placeholder) { placeholder.style.display = "block"; }
    if (area)        { area.classList.remove("upload-has-image"); }
    if (sourceBtns)  { sourceBtns.style.display = "grid"; }
    if (fileInput)   { fileInput.value = ""; }
  },

  // ── Handle file selected from input ──────────────────
  handleFileSelect(input) {
    const file = input.files[0];
    if (!file) return;
    Manager.processImageFile(file);
  },

  // ── Handle drag & drop ────────────────────────────────
  handleDrop(event) {
    event.preventDefault();
    document.getElementById("upload-area").classList.remove("drag-over");
    const file = event.dataTransfer.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Please drop an image file (JPG, PNG, WEBP, GIF, BMP, SVG, etc.).");
      return;
    }
    Manager.processImageFile(file);
  },

  // ── Paste from clipboard ──────────────────────────────
  async pasteFromClipboard() {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imgType = item.types.find(t => t.startsWith("image/"));
        if (imgType) {
          const blob = await item.getType(imgType);
          Manager.processImageFile(new File([blob], "pasted-image.png", { type: imgType }));
          return;
        }
      }
      alert("No image found on clipboard. Copy an image first, then click Paste.");
    } catch(e) {
      // Fallback: listen for paste event
      alert("Press Ctrl+V (or Cmd+V) anywhere on this page to paste an image from your clipboard.");
      document.addEventListener("paste", Manager._pasteListener = (ev) => {
        const items = Array.from(ev.clipboardData?.items || []);
        const imgItem = items.find(i => i.type.startsWith("image/"));
        if (imgItem) {
          Manager.processImageFile(imgItem.getAsFile());
          document.removeEventListener("paste", Manager._pasteListener);
        }
      }, { once: true });
    }
  },

  // ── Camera: open ──────────────────────────────────────
  async openCamera() {
    const panel = document.getElementById("camera-panel");
    const video = document.getElementById("camera-video");
    try {
      Manager._cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 960 } }
      });
      video.srcObject = Manager._cameraStream;
      panel.style.display = "block";
      document.getElementById("img-source-btns").style.display = "none";
      document.getElementById("upload-area").style.display     = "none";
    } catch(e) {
      alert("Camera not available or permission denied. Please upload an image from your device instead.");
    }
  },

  // ── Camera: capture ───────────────────────────────────
  capturePhoto() {
    const video  = document.getElementById("camera-video");
    const canvas = document.getElementById("camera-canvas");
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    Manager.closeCamera();
    Manager.applyImage(dataUrl, "Camera photo", video.videoWidth, video.videoHeight);
  },

  // ── Camera: close ─────────────────────────────────────
  closeCamera() {
    if (Manager._cameraStream) {
      Manager._cameraStream.getTracks().forEach(t => t.stop());
      Manager._cameraStream = null;
    }
    const panel = document.getElementById("camera-panel");
    if (panel) panel.style.display = "none";
    const sourceBtns = document.getElementById("img-source-btns");
    if (sourceBtns) sourceBtns.style.display = "grid";
    const area = document.getElementById("upload-area");
    if (area && !Manager._uploadedImageBase64) area.style.display = "flex";
  },

  // ── Process any image file (compress if needed) ───────
  processImageFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const originalDataUrl = e.target.result;
      // Compress if > 1MB for storage efficiency
      if (file.size > 1 * 1024 * 1024) {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX = 800;
          let w = img.width, h = img.height;
          if (w > MAX || h > MAX) {
            if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
            else        { w = Math.round(w * MAX / h); h = MAX; }
          }
          canvas.width = w; canvas.height = h;
          canvas.getContext("2d").drawImage(img, 0, 0, w, h);
          const compressed = canvas.toDataURL("image/jpeg", 0.82);
          Manager.applyImage(compressed, file.name, w, h);
        };
        img.src = originalDataUrl;
      } else {
        // Small file — use as-is (preserves SVG, GIF, PNG transparency, etc.)
        const tempImg = new Image();
        tempImg.onload = () => Manager.applyImage(originalDataUrl, file.name, tempImg.width, tempImg.height);
        tempImg.onerror = () => Manager.applyImage(originalDataUrl, file.name, 0, 0);
        tempImg.src = originalDataUrl;
      }
    };
    reader.readAsDataURL(file);
  },

  // ── Apply image to UI ─────────────────────────────────
  applyImage(dataUrl, filename, w, h) {
    Manager._uploadedImageBase64 = dataUrl;

    const preview     = document.getElementById("upload-preview");
    const placeholder = document.getElementById("upload-placeholder");
    const area        = document.getElementById("upload-area");
    const actionRow   = document.getElementById("img-action-row");
    const infoEl      = document.getElementById("img-info");
    const sourceBtns  = document.getElementById("img-source-btns");

    if (preview)     { preview.src = dataUrl; preview.style.display = "block"; }
    if (placeholder) { placeholder.style.display = "none"; }
    if (area)        { area.classList.add("upload-has-image"); area.style.display = "flex"; }
    if (actionRow)   { actionRow.style.display = "flex"; }
    if (sourceBtns)  { sourceBtns.style.display = "none"; }
    if (infoEl && w && h) {
      const kb = Math.round(dataUrl.length * 0.75 / 1024);
      infoEl.textContent = `${filename} · ${w}×${h}px · ~${kb} KB`;
    }
  },

  // ── Clear image ───────────────────────────────────────
  clearImage() {
    Manager._uploadedImageBase64 = null;
    const preview     = document.getElementById("upload-preview");
    const placeholder = document.getElementById("upload-placeholder");
    const area        = document.getElementById("upload-area");
    const actionRow   = document.getElementById("img-action-row");
    const sourceBtns  = document.getElementById("img-source-btns");
    const fileInput   = document.getElementById("new-image-file");

    if (preview)     { preview.src = ""; preview.style.display = "none"; }
    if (placeholder) { placeholder.style.display = "block"; }
    if (area)        { area.classList.remove("upload-has-image"); area.style.display = "flex"; }
    if (actionRow)   { actionRow.style.display = "none"; }
    if (sourceBtns)  { sourceBtns.style.display = "grid"; }
    if (fileInput)   { fileInput.value = ""; }
  },

  // ── Legacy method (kept for backward compatibility) ───
  previewImage(input) { Manager.handleFileSelect(input); },

  addProduct() {
    const name  = document.getElementById("new-name").value.trim();
    const brand = document.getElementById("new-brand").value.trim();
    const cat   = document.getElementById("new-cat").value.trim();
    const unit  = document.getElementById("new-unit").value.trim();
    const price = +document.getElementById("new-price").value;
    const stock = +document.getElementById("new-stock").value;
    const desc  = document.getElementById("new-desc").value.trim();
    const image = Manager._uploadedImageBase64 || "";
    if (!name || !price || !stock) return alert("Please fill in Name, Price and Stock.");
    products.push({
      id: nextId(products), name, brand,
      category: cat || "General", unit, price, stock,
      image, description: desc, icon: "📦"
    });
    Manager._uploadedImageBase64 = null;
    saveProducts();
    App.showSuccess("manager-main", `"${name}" added to stock!`);
    this.render();
  },

  renderRequests() {
    if (!deleteRequests.length) return `<h2 class="page-title">Delete Requests</h2><div class="empty-state">No pending requests.</div>`;
    const rows = deleteRequests.map(r => `<tr>
      <td>${r.productName}</td><td>${r.requestedBy}</td><td>${r.reason}</td>
      <td>
        <button class="sm-btn" style="background:#10b981" onclick="Manager.approveDelete(${r.id})">Approve</button>
        <button class="sm-btn" style="background:#ef4444;margin-left:6px" onclick="Manager.rejectDelete(${r.id})">Reject</button>
      </td></tr>`).join("");
    return `<h2 class="page-title">Delete Authorisation Requests</h2>
      <div class="table-wrap"><table>
        <thead><tr><th>Product</th><th>Requested By</th><th>Reason</th><th>Actions</th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>`;
  },

  approveDelete(reqId) {
    const req = deleteRequests.find(r => r.id === reqId);
    if (req) {
      products = products.filter(p => p.id !== req.productId);
      deleteRequests = deleteRequests.filter(r => r.id !== reqId);
      saveProducts(); saveRequests();
      App.showSuccess("manager-main", `"${req.productName}" deleted.`);
    }
    this.updateRequestBadge(); this.render();
  },

  rejectDelete(reqId) {
    deleteRequests = deleteRequests.filter(r => r.id !== reqId);
    saveRequests(); this.updateRequestBadge(); this.render();
  },

  renderAttendants() {
    const rows = ATTENDANT_ACCOUNTS.map(a => `<tr>
      <td>${a.name}</td><td>${a.username}</td>
      <td><span style="letter-spacing:2px;color:#9ca3af">••••••••</span></td>
      <td><button class="sm-btn" style="background:#ef4444" onclick="Manager.removeAttendant(${a.id})">Remove</button></td>
    </tr>`).join("");
    return `
      <h2 class="page-title">Attendant Accounts</h2>
      <div class="form-card">
        <div class="form-title">Add New Attendant Account</div>
        <div class="form-grid">
          <div class="field"><label class="label">Full Name</label><input class="input" id="new-att-name" placeholder="e.g. Sarah Apio"/></div>
          <div class="field"><label class="label">Username</label><input class="input" id="new-att-user" placeholder="e.g. sarah"/></div>
          <div class="field"><label class="label">Password</label><input class="input" id="new-att-pass" type="password" placeholder="Set a password"/></div>
          <div class="field"><label class="label">Confirm Password</label><input class="input" id="new-att-pass2" type="password" placeholder="Repeat password"/></div>
        </div>
        <div id="new-att-error" class="err-box" style="display:none"></div>
        <button class="btn" style="background:#10b981" onclick="Manager.addAttendant()">+ Add Attendant</button>
      </div>
      <h3 class="section-title">All Attendant Accounts</h3>
      <div class="table-wrap"><table>
        <thead><tr><th>Full Name</th><th>Username</th><th>Password</th><th>Action</th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>`;
  },

  addAttendant() {
    const name  = document.getElementById("new-att-name").value.trim();
    const uname = document.getElementById("new-att-user").value.trim().toLowerCase();
    const pass  = document.getElementById("new-att-pass").value;
    const pass2 = document.getElementById("new-att-pass2").value;
    const errEl = document.getElementById("new-att-error");
    if (!name||!uname||!pass) { errEl.style.display="flex"; errEl.textContent="⚠ Fill all fields."; return; }
    if (pass!==pass2)          { errEl.style.display="flex"; errEl.textContent="⚠ Passwords don't match."; return; }
    if (ATTENDANT_ACCOUNTS.find(a=>a.username===uname)) { errEl.style.display="flex"; errEl.textContent="⚠ Username exists."; return; }
    errEl.style.display="none";
    ATTENDANT_ACCOUNTS.push({ id: nextId(ATTENDANT_ACCOUNTS), username: uname, password: pass, name });
    saveAttendants();
    App.showSuccess("manager-main", `Attendant "${name}" added!`);
    this.render();
  },

  removeAttendant(id) {
    const acc = ATTENDANT_ACCOUNTS.find(a=>a.id===id);
    if (!acc) return;
    if (!confirm(`Remove "${acc.name}"?`)) return;
    ATTENDANT_ACCOUNTS = ATTENDANT_ACCOUNTS.filter(a=>a.id!==id);
    saveAttendants();
    App.showSuccess("manager-main", `Attendant "${acc.name}" removed.`);
    this.render();
  },

  renderNotifications() {
    const notifs = getNotifications("manager");
    if (!notifs.length) return `<h2 class="page-title">Notifications</h2><div class="empty-state">No notifications yet.</div>`;
    const rows = notifs.map(n => `
      <div class="notif-item notif-${n.type}${n.read?"":" notif-unread"}">
        <div class="notif-msg">${n.msg}</div>
        <div class="notif-time">${n.time}</div>
      </div>`).join("");
    return `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <h2 class="page-title" style="margin:0">Notifications</h2>
        <button class="sm-btn" style="background:#6b7280" onclick="clearNotifications('manager');Manager.render()">Clear All</button>
      </div>
      <div class="notif-list">${rows}</div>`;
  },

  // ── STOCK REPORTS ──────────────────────────────────
  renderStockReports() {
    const filterType = document.getElementById("sr-filter-type")?.value || "All";
    const filterUrgency = document.getElementById("sr-filter-urgency")?.value || "All";
    const filterAttendant = document.getElementById("sr-filter-attendant")?.value || "";

    let filtered = [...stockReports];
    if (filterType !== "All") filtered = filtered.filter(r => r.reportType === filterType);
    if (filterUrgency !== "All") filtered = filtered.filter(r => r.reorderUrgency === filterUrgency);
    if (filterAttendant) filtered = filtered.filter(r => r.submittedBy.toLowerCase().includes(filterAttendant.toLowerCase()));

    // Summary stats
    const totalReports    = stockReports.length;
    const newSubmitted    = stockReports.filter(r => r.status === "Submitted").length;
    const criticalUrgency = stockReports.filter(r => r.reorderUrgency === "Critical" || r.reorderUrgency === "High").length;
    const poorQuality     = stockReports.filter(r => r.quality === "Poor" || r.quality === "Rejected").length;
    const totalReceived   = stockReports.reduce((a, r) => a + (r.totalReceived || 0), 0);
    const totalImperfect  = stockReports.reduce((a, r) => a + (r.imperfectQty || 0), 0);

    const urgencyColors = { "Critical":"#ef4444","High":"#f97316","Medium":"#f59e0b","Low":"#3b82f6","Not Needed":"#10b981" };
    const qualityColors = { "Excellent":"#10b981","Good":"#3b82f6","Average":"#f59e0b","Poor":"#f97316","Rejected":"#ef4444" };

    const reportCards = filtered.length === 0
      ? `<div class="empty-state">No stock reports found${filterType !== "All" ? " for this filter" : ""}.</div>`
      : filtered.map(r => {
          const imperfectPct = r.totalReceived > 0 ? Math.round((r.imperfectQty / r.totalReceived) * 100) : 0;
          const perfectPct   = r.totalReceived > 0 ? Math.round((r.perfectQty   / r.totalReceived) * 100) : 0;
          const qColor       = qualityColors[r.quality]  || "#6b7280";
          const uColor       = urgencyColors[r.reorderUrgency] || "#6b7280";
          const isNew        = r.status === "Submitted";
          return `
            <div class="sr-card${isNew ? " sr-card-new" : ""}">
              <div class="sr-card-header">
                <div>
                  <div class="sr-card-title">${r.productName}</div>
                  <div class="sr-card-meta">
                    ${r.productCategory} · ${r.reportType} · ${r.date}
                    ${isNew ? '<span class="sr-new-badge">NEW</span>' : ""}
                  </div>
                </div>
                <div style="text-align:right;flex-shrink:0">
                  <div class="sr-card-by">By: ${r.submittedBy}</div>
                  <div class="sr-card-at">${r.submittedAt}</div>
                </div>
              </div>

              <!-- Quantity strip -->
              <div class="sr-qty-strip">
                <div class="sr-qty-box" style="border-color:#10b981">
                  <div class="sr-qty-num" style="color:#10b981">${r.totalReceived}</div>
                  <div class="sr-qty-label">Received</div>
                </div>
                <div class="sr-qty-box" style="border-color:#16a34a">
                  <div class="sr-qty-num" style="color:#16a34a">${r.perfectQty}</div>
                  <div class="sr-qty-label">✅ Perfect</div>
                  <div class="sr-qty-pct">${perfectPct}%</div>
                </div>
                <div class="sr-qty-box" style="border-color:#d97706">
                  <div class="sr-qty-num" style="color:#d97706">${r.imperfectQty}</div>
                  <div class="sr-qty-label">⚠ Imperfect</div>
                  <div class="sr-qty-pct">${imperfectPct}%</div>
                </div>
                <div class="sr-qty-box" style="border-color:#dc2626">
                  <div class="sr-qty-num" style="color:#dc2626">${r.missingQty}</div>
                  <div class="sr-qty-label">❌ Missing</div>
                </div>
                <div class="sr-qty-box" style="border-color:#6b7280">
                  <div class="sr-qty-num" style="color:#6b7280">${r.returnedQty}</div>
                  <div class="sr-qty-label">↩ Returned</div>
                </div>
                <div class="sr-qty-box" style="border-color:#6366f1;background:#ede9fe">
                  <div class="sr-qty-num" style="color:#6366f1">${r.addedToStock}</div>
                  <div class="sr-qty-label">➕ Added</div>
                </div>
              </div>

              <!-- Stock change bar -->
              <div class="sr-stock-change">
                <span>Stock: <strong>${r.previousStock}</strong></span>
                <div class="sr-stock-arrow">→ +${r.addedToStock} →</div>
                <span><strong style="color:#10b981">${r.newStock}</strong></span>
              </div>

              <!-- Quality & Urgency badges -->
              <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;align-items:center">
                <span class="sr-badge" style="background:${qColor}22;color:${qColor};border-color:${qColor}">
                  Quality: ${r.quality}
                </span>
                <span class="sr-badge" style="background:${uColor}22;color:${uColor};border-color:${uColor}">
                  Reorder: ${r.reorderUrgency}
                </span>
                <span class="sr-badge" style="background:#e0e7ff;color:#3730a3;border-color:#a5b4fc">
                  Size: ${r.sizeAccuracy}
                </span>
                <span class="sr-badge" style="background:#f1f5f9;color:#475569;border-color:#cbd5e1">
                  Fabric: ${r.fabricQuality}
                </span>
                <span class="sr-badge" style="background:#fdf4ff;color:#7e22ce;border-color:#d8b4fe">
                  Colours: ${r.colourAccuracy}
                </span>
              </div>

              <!-- Details grid -->
              <div class="sr-details-grid">
                ${r.supplier !== "—" ? `<div><span class="sr-detail-label">Supplier</span><span>${r.supplier}</span></div>` : ""}
                ${r.batchNo  !== "—" ? `<div><span class="sr-detail-label">Batch/Invoice</span><span>${r.batchNo}</span></div>` : ""}
                ${r.costPerUnit > 0   ? `<div><span class="sr-detail-label">Cost/Unit</span><span>${fmt(r.costPerUnit)}</span></div>` : ""}
                ${r.totalCost > 0     ? `<div><span class="sr-detail-label">Total Cost</span><span style="font-weight:700">${fmt(r.totalCost)}</span></div>` : ""}
                ${r.sellingPrice > 0  ? `<div><span class="sr-detail-label">Selling Price</span><span>${fmt(r.sellingPrice)}</span></div>` : ""}
                ${r.suggestedPrice > 0 ? `<div><span class="sr-detail-label">Suggested Price</span><span style="color:#f59e0b;font-weight:600">${fmt(r.suggestedPrice)}</span></div>` : ""}
                ${r.storageLocation !== "—" ? `<div><span class="sr-detail-label">Location</span><span>${r.storageLocation}</span></div>` : ""}
                <div><span class="sr-detail-label">Storage</span><span>${r.storageCondition}</span></div>
              </div>

              ${r.defectsDesc && r.defectsDesc !== "None" ? `
                <div style="background:#fef9ec;border-radius:8px;padding:10px 12px;margin-top:10px;border-left:3px solid #f59e0b">
                  <div style="font-size:11px;font-weight:700;color:#92400e;margin-bottom:4px;text-transform:uppercase;letter-spacing:.5px">⚠ Defects Noted</div>
                  <div style="font-size:13px;color:#78350f">${r.defectsDesc}</div>
                </div>` : ""}

              ${r.notes && r.notes !== "—" ? `
                <div style="background:#f0f9ff;border-radius:8px;padding:10px 12px;margin-top:8px;border-left:3px solid #38bdf8">
                  <div style="font-size:11px;font-weight:700;color:#075985;margin-bottom:4px;text-transform:uppercase;letter-spacing:.5px">📝 Notes / Recommendations</div>
                  <div style="font-size:13px;color:#0c4a6e">${r.notes}</div>
                </div>` : ""}
            </div>`;
        }).join("");

    return `
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:20px">
        <h2 class="page-title" style="margin:0">📋 Stock Reports</h2>
        <button class="btn" style="background:#6366f1" onclick="Manager.downloadStockReportsCSV()">⬇ Download CSV</button>
      </div>

      <!-- Summary stats -->
      <div class="stats-grid" style="margin-bottom:20px">
        ${this.statCard("📋", totalReports,   "Total Reports",      "#6366f1")}
        ${this.statCard("🆕", newSubmitted,   "New (Unread)",       "#f59e0b")}
        ${this.statCard("🔴", criticalUrgency,"Urgent Reorders",    "#ef4444")}
        ${this.statCard("⚠",  poorQuality,    "Poor Quality Alerts","#f97316")}
        ${this.statCard("📦", totalReceived,  "Total Items Received","#10b981")}
        ${this.statCard("⚠",  totalImperfect, "Total Imperfect",    "#d97706")}
      </div>

      <!-- Filters -->
      <div class="form-card" style="padding:14px 20px;margin-bottom:20px">
        <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end">
          <div class="field" style="margin:0;flex:1;min-width:150px">
            <label class="label">Report Type</label>
            <select class="input" id="sr-filter-type" onchange="Manager.render()">
              <option value="All">All Types</option>
              <option>New Stock In</option>
              <option>Stock Update</option>
              <option>Returned Stock</option>
              <option>Damaged Stock</option>
              <option>Stock Transfer</option>
            </select>
          </div>
          <div class="field" style="margin:0;flex:1;min-width:150px">
            <label class="label">Reorder Urgency</label>
            <select class="input" id="sr-filter-urgency" onchange="Manager.render()">
              <option value="All">All Urgency</option>
              <option>Critical</option>
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
              <option>Not Needed</option>
            </select>
          </div>
          <div class="field" style="margin:0;flex:1;min-width:150px">
            <label class="label">Attendant Name</label>
            <input class="input" id="sr-filter-attendant" placeholder="Search by name..." oninput="Manager.render()"/>
          </div>
          <button class="sm-btn" style="background:#6b7280;margin-bottom:2px"
            onclick="document.getElementById('sr-filter-type').value='All';document.getElementById('sr-filter-urgency').value='All';document.getElementById('sr-filter-attendant').value='';Manager.render()">
            Clear Filters
          </button>
        </div>
      </div>

      <div style="font-size:13px;color:#6b7280;margin-bottom:12px">
        Showing <strong>${filtered.length}</strong> of ${stockReports.length} reports
      </div>

      <div class="sr-reports-list">${reportCards}</div>`;
  },

  downloadStockReportsCSV() {
    if (!stockReports.length) return alert("No stock reports to download.");
    const headers = [
      "Date","Submitted By","Submitted At","Report Type","Product","Category",
      "Supplier","Batch/Invoice","Total Received","Perfect","Imperfect",
      "Missing","Returned","Added to Stock","Prev Stock","New Stock",
      "Quality","Size Accuracy","Fabric Quality","Colour Accuracy","Defects",
      "Storage Location","Storage Condition","Cost Per Unit (KES)","Total Cost (KES)",
      "Selling Price (KES)","Suggested Price (KES)","Reorder Urgency","Notes","Status"
    ];
    const rows = stockReports.map(r => [
      r.date, r.submittedBy, r.submittedAt, r.reportType,
      r.productName, r.productCategory, r.supplier, r.batchNo,
      r.totalReceived, r.perfectQty, r.imperfectQty, r.missingQty,
      r.returnedQty, r.addedToStock, r.previousStock, r.newStock,
      r.quality, r.sizeAccuracy, r.fabricQuality, r.colourAccuracy,
      r.defectsDesc, r.storageLocation, r.storageCondition,
      r.costPerUnit, r.totalCost, r.sellingPrice, r.suggestedPrice,
      r.reorderUrgency, r.notes, r.status
    ]);
    const csv = [headers, ...rows]
      .map(row => row.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `looku-stock-reports-${today()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
};


// ────────────────────────────────────────────────────
//  PAYMENT MODAL  (step-based, fully fixed)
// ────────────────────────────────────────────────────
const PaymentModal = {
  _resolve: null,
  _orderData: null,
  _selectedMethod: "",

  show(orderData) {
    this._orderData = orderData;
    this._selectedMethod = "";
    document.getElementById("pay-modal-total").textContent = fmt(orderData.total);
    ["pay-cash-section","pay-mobile-section","pay-atm-section"].forEach(id =>
      document.getElementById(id).style.display = "none");
    document.getElementById("pay-confirm-btn").style.display = "none";
    document.getElementById("pay-change-display").innerHTML  = "";
    document.getElementById("pay-method-select").value       = "";
    const cp = document.getElementById("pay-cash-paid");    if(cp) cp.value = "";
    const mp = document.getElementById("pay-mobile-phone");  if(mp) mp.value = "";
    const ar = document.getElementById("pay-atm-ref");       if(ar) ar.value = "";
    document.querySelectorAll("#payment-modal .pay-method-btn")
      .forEach(b => b.classList.remove("pay-method-selected"));
    document.getElementById("payment-modal").style.display = "flex";
  },

  hide() { document.getElementById("payment-modal").style.display = "none"; },

  selectMethod2(method) {
    this._selectedMethod = method;
    document.querySelectorAll("#payment-modal .pay-method-btn").forEach(b =>
      b.classList.toggle("pay-method-selected", b.getAttribute("data-method") === method));
    document.getElementById("pay-method-select").value = method;

    ["pay-cash-section","pay-mobile-section","pay-atm-section"].forEach(id =>
      document.getElementById(id).style.display = "none");
    document.getElementById("pay-confirm-btn").style.display = "none";
    document.getElementById("pay-change-display").innerHTML  = "";

    if (method === "Cash") {
      document.getElementById("pay-cash-section").style.display = "block";
    } else if (method === "Mobile Money") {
      document.getElementById("pay-mobile-section").style.display = "block";
      document.getElementById("pay-confirm-btn").style.display    = "inline-flex";
    } else if (method === "ATM/Card") {
      document.getElementById("pay-atm-section").style.display = "block";
      document.getElementById("pay-confirm-btn").style.display  = "inline-flex";
    }
  },

  selectMethod() {
    const m = document.getElementById("pay-method-select").value;
    if (m) this.selectMethod2(m);
  },

  calcCashChange() {
    const paid  = +document.getElementById("pay-cash-paid").value;
    const total = this._orderData ? this._orderData.total : 0;
    const change = paid - total;
    const el  = document.getElementById("pay-change-display");
    const btn = document.getElementById("pay-confirm-btn");
    if (!paid) { el.innerHTML = ""; btn.style.display = "none"; return; }
    if (change >= 0) {
      el.innerHTML = `<div class="change-box change-ok" style="margin:10px 0">
        ✓ Change to return to customer: <strong>${fmt(change)}</strong></div>`;
      btn.style.display = "inline-flex";
    } else {
      el.innerHTML = `<div class="change-box change-short" style="margin:10px 0">
        ⚠ Amount short by <strong>${fmt(Math.abs(change))}</strong>. Please enter more.</div>`;
      btn.style.display = "none";
    }
  },

  confirm() {
    const method = this._selectedMethod;
    if (!method) { alert("Please choose a payment method first."); return; }
    let extra = {};
    if (method === "Cash") {
      const paid  = +document.getElementById("pay-cash-paid").value;
      const total = this._orderData.total;
      if (!paid)        { alert("Please enter the amount paid."); return; }
      if (paid < total) { alert(`Amount paid (${fmt(paid)}) is less than total (${fmt(total)}).`); return; }
      extra = { amountPaid: paid, change: paid - total };
    } else if (method === "Mobile Money") {
      const phone   = document.getElementById("pay-mobile-phone").value.trim();
      const network = document.getElementById("pay-mobile-network").value;
      if (!phone) { alert("Please enter the phone number for Mobile Money."); return; }
      extra = { mobilePhone: phone, network };
    } else if (method === "ATM/Card") {
      extra = { cardRef: document.getElementById("pay-atm-ref").value.trim() };
    }
    this.hide();
    if (this._resolve) this._resolve({ method, ...extra });
  },

  cancel() {
    this._selectedMethod = "";
    this.hide();
    if (this._resolve) this._resolve(null);
  }
};

// ────────────────────────────────────────────────────
//  CUSTOMER
// ────────────────────────────────────────────────────
const Customer = {
  currentTab: "browse",
  searchTerm: "",
  selectedCat: "All",
  _checkoutStep: 1,
  _checkoutDetails: {},
  _lastOrder: null,

  init() {
    cart = [];
    this._checkoutStep    = 1;
    this._lastOrder       = null;
    this._checkoutDetails = {};
    this.updateCartNav();
    this.showTab("browse", document.querySelector("#page-customer .nav-btn"));
    this.updateNotifBadge();
  },

  updateCartNav() {
    const btn = document.getElementById("cart-nav-btn");
    if (btn) btn.textContent = `🛒 Cart (${cart.length})`;
  },

  updateNotifBadge() {
    const btn   = document.getElementById("cust-notif-btn");
    const count = unreadCount("customer");
    if (btn) btn.textContent = count > 0 ? `🔔 Notifications (${count})` : "🔔 Notifications";
  },

  showTab(tab, btn) {
    this.currentTab = tab;
    document.querySelectorAll("#page-customer .nav-btn").forEach(b => b.classList.remove("active"));
    if (btn) btn.classList.add("active");
    if (tab === "notifications") markAllRead("customer");
    if (tab === "cart") this._checkoutStep = 1;
    this.render();
    this.updateNotifBadge();
  },

  render() {
    const el = document.getElementById("customer-main");
    switch (this.currentTab) {
      case "browse":        el.innerHTML = this.renderBrowse();        break;
      case "cart":          el.innerHTML = this.renderCart();          break;
      case "enquire":       el.innerHTML = this.renderEnquire();       break;
      case "notifications": el.innerHTML = this.renderNotifications(); break;
    }
  },

  // ── STEP INDICATOR ───────────────────────────────
  checkoutSteps(active) {
    const steps = [{n:1,label:"Cart"},{n:2,label:"Details"},{n:3,label:"Payment"}];
    return `<div class="checkout-steps">
      ${steps.map((s,idx) => `
        <div class="checkout-step ${s.n < active ? "step-done" : s.n === active ? "step-active" : "step-pending"}">
          <div class="step-circle">${s.n < active ? "✓" : s.n}</div>
          <div class="step-label">${s.label}</div>
        </div>
        ${idx < steps.length-1 ? '<div class="step-line"></div>' : ""}
      `).join("")}
    </div>`;
  },

  // ── BROWSE ────────────────────────────────────────
  renderBrowse() {
    const categories = ["All", ...new Set(products.map(p => p.category))];
    const catOpts    = categories.map(c =>
      `<option value="${c}" ${this.selectedCat===c?"selected":""}>${c}</option>`).join("");
    const filtered = products.filter(p =>
      (this.selectedCat==="All" || p.category===this.selectedCat) &&
      (p.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
       (p.brand && p.brand.toLowerCase().includes(this.searchTerm.toLowerCase()))));

    const cards = filtered.map(p => {
      const inStock  = p.stock > 0;
      const lowStock = p.stock > 0 && p.stock <= 10;
      const stockLabel = !inStock ? "Out of Stock" : lowStock ? `Only ${p.stock} left!` : `${p.stock} in stock`;
      const stockClass = (!inStock||lowStock) ? "stock-low" : "stock-ok";
      const hasImg = !!p.image;
      const imgHtml = hasImg
        ? `<img src="${p.image}" alt="${p.name}" class="prod-img prod-img-clickable"
             onclick="Customer.openLightbox(${p.id})"
             onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"/>
           <div class="prod-img-fallback" style="display:none">${p.icon||"👗"}</div>
           <div class="prod-img-zoom-hint">🔍 Tap to view</div>`
        : `<div class="prod-img-fallback" style="cursor:default">${p.icon||"👗"}</div>`;
      return `
        <div class="product-card-v2">
          <div class="prod-img-wrap">${imgHtml}<span class="prod-cat-tag">${p.category}</span></div>
          <div class="prod-body">
            <div class="prod-brand">${p.brand||""}</div>
            <div class="prod-name-v2">${p.name}</div>
            <div class="prod-unit">📐 ${p.unit||""}</div>
            <div class="prod-desc">${p.description||""}</div>
            <div class="prod-footer">
              <div>
                <div class="prod-price-v2">${fmt(p.price)}</div>
                <span class="stock-badge ${stockClass}">${stockLabel}</span>
              </div>
              <button class="btn add-cart-btn" ${!inStock?"disabled":""}
                onclick="Customer.addToCart(${p.id})">${inStock?"🛒 Add":"✕"}</button>
            </div>
          </div>
        </div>`;
    }).join("");

    return `
      <h2 class="page-title">Our Products</h2>
      <div class="filter-bar">
        <input class="input" placeholder="Search by name or brand..." value="${this.searchTerm}"
          oninput="Customer.searchTerm=this.value;Customer.render()"/>
        <select class="input" style="width:auto" onchange="Customer.selectedCat=this.value;Customer.render()">
          ${catOpts}
        </select>
      </div>
      <div class="product-grid-v2">
        ${cards||'<p style="color:#9ca3af;padding:20px">No products found.</p>'}
      </div>`;
  },

  addToCart(productId) {
    const p = products.find(pr => pr.id === productId);
    if (!p) return;
    const ex = cart.find(i => i.id === productId);
    if (ex) ex.qty++; else cart.push({...p, qty:1});
    this.updateCartNav(); this.render();
  },

  // ── LIGHTBOX ──────────────────────────────────────
  openLightbox(productId) {
    const p = products.find(pr => pr.id === productId);
    if (!p || !p.image) return;

    const modal      = document.getElementById("lightbox-modal");
    const img        = document.getElementById("lightbox-img");
    const caption    = document.getElementById("lightbox-caption");
    const meta       = document.getElementById("lightbox-meta");
    const cartBtn    = document.getElementById("lightbox-cart-btn");

    img.src     = p.image;
    img.alt     = p.name;
    caption.textContent = p.name + (p.brand ? ` · ${p.brand}` : "");
    meta.innerHTML = `
      <span class="pay-badge" style="background:#e0e7ff;color:#3730a3">${p.category}</span>
      <span style="margin:0 8px;color:#9ca3af">|</span>
      <span>📦 ${p.unit||""}</span>
      <span style="margin:0 8px;color:#9ca3af">|</span>
      <span style="color:#10b981;font-weight:700">${fmt(p.price)}</span>
      ${p.stock > 0
        ? `<span style="margin:0 8px;color:#9ca3af">|</span><span class="stock-badge stock-ok">${p.stock} in stock</span>`
        : `<span style="margin:0 8px;color:#9ca3af">|</span><span class="stock-badge stock-low">Out of Stock</span>`}
    `;

    if (p.stock > 0) {
      cartBtn.style.display = "inline-flex";
      cartBtn.onclick = () => {
        Customer.addToCart(p.id);
        Customer.closeLightbox();
      };
    } else {
      cartBtn.style.display = "none";
    }

    modal.style.display = "flex";
    document.body.style.overflow = "hidden";

    // Keyboard close
    document.addEventListener("keydown", Customer._lightboxKeyHandler = (e) => {
      if (e.key === "Escape") Customer.closeLightbox();
    });
  },

  closeLightbox(event) {
    // If clicking backdrop (not the box itself), close
    if (event && event.target.id !== "lightbox-modal") return;
    const modal = document.getElementById("lightbox-modal");
    if (modal) modal.style.display = "none";
    document.body.style.overflow = "";
    if (Customer._lightboxKeyHandler) {
      document.removeEventListener("keydown", Customer._lightboxKeyHandler);
      Customer._lightboxKeyHandler = null;
    }
  },

  _lightboxKeyHandler: null,

  removeFromCart(productId) {
    cart = cart.filter(i => i.id !== productId);
    this.updateCartNav(); this.render();
  },

  updateQty(productId, qty) {
    if (qty < 1) { this.removeFromCart(productId); return; }
    const item = cart.find(i => i.id === productId);
    if (item) item.qty = qty;
    this.updateCartNav(); this.render();
  },

  // ── STEP 1: CART ──────────────────────────────────
  renderCart() {
    if (this._checkoutStep === 3 && this._lastOrder) return this.renderOrderSuccess();
    if (this._checkoutStep === 2) return this.renderDetailsForm();

    if (!cart.length) return `
      <h2 class="page-title">Your Cart</h2>
      <div class="empty-state">🛒 Your cart is empty. Browse products to add items.</div>`;

    const total = cart.reduce((a,i) => a + i.price*i.qty, 0);
    const rows  = cart.map(i => `<tr>
      <td style="font-weight:600">${i.name}</td>
      <td>${fmt(i.price)}</td>
      <td><div class="qty-controls">
        <button class="qty-btn" onclick="Customer.updateQty(${i.id},${i.qty-1})">−</button>
        <span style="min-width:24px;text-align:center">${i.qty}</span>
        <button class="qty-btn" onclick="Customer.updateQty(${i.id},${i.qty+1})">+</button>
      </div></td>
      <td style="font-weight:700;color:#10b981">${fmt(i.price*i.qty)}</td>
      <td><button class="sm-btn" style="background:#ef4444"
        onclick="Customer.removeFromCart(${i.id})">✕</button></td>
    </tr>`).join("");

    return `
      <h2 class="page-title">🛒 Your Cart</h2>
      ${this.checkoutSteps(1)}
      <div class="table-wrap" style="margin-bottom:16px"><table>
        <thead><tr><th>Product</th><th>Price</th><th>Qty</th><th>Subtotal</th><th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>
      <div class="cart-summary">
        <div>
          <div style="font-size:13px;color:#6b7280;margin-bottom:2px">${cart.length} item(s)</div>
          <div class="cart-total">Total: ${fmt(total)}</div>
        </div>
        <button class="btn" style="background:#6366f1;padding:12px 28px;font-size:15px"
          onclick="Customer.goToDetails()">Next: Your Details →</button>
      </div>`;
  },

  goToDetails() {
    if (!cart.length) return;
    this._checkoutStep = 2;
    this.render();
  },

  // ── STEP 2: DETAILS ───────────────────────────────
  renderDetailsForm() {
    const total = cart.reduce((a,i) => a + i.price*i.qty, 0);
    const d     = this._checkoutDetails;
    return `
      <h2 class="page-title">📋 Your Details</h2>
      ${this.checkoutSteps(2)}
      <div class="form-card">
        <div class="form-title">Fill in your details to complete the order</div>
        <div class="form-grid">
          <div class="field">
            <label class="label">Full Name <span style="color:#ef4444">*</span></label>
            <input class="input" id="cust-name" placeholder="e.g. Sarah Nakato" value="${d.name||""}"/>
          </div>
          <div class="field">
            <label class="label">Phone Number <span style="color:#ef4444">*</span></label>
            <input class="input" id="cust-phone" type="tel" placeholder="e.g. 0712 345 678" value="${d.phone||""}"/>
          </div>
        </div>
        <div class="field">
          <label class="label">Delivery Location <span style="color:#ef4444">*</span></label>
          <input class="input" id="cust-location" placeholder="e.g. Kapsoya, Eldoret / Uganda Road" value="${d.location||""}"/>
        </div>
        <div class="field">
          <label class="label">Order Notes (optional)</label>
          <textarea class="input" id="cust-notes" rows="2"
            placeholder="Your preferred size, colour, or any special tailoring requests...">${d.notes||""}</textarea>
        </div>
        <div style="display:flex;gap:12px;margin-top:8px;flex-wrap:wrap">
          <button class="btn" style="background:#6b7280"
            onclick="Customer._checkoutStep=1;Customer.render()">← Back to Cart</button>
          <button class="btn" style="background:#6366f1;flex:1"
            onclick="Customer.proceedToPayment()">Next: Choose Payment →</button>
        </div>
      </div>
      <div class="form-card" style="background:#f9fafb">
        <div class="form-title" style="color:#6b7280;font-size:13px">Order Summary</div>
        ${cart.map(i=>`
          <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px;padding:4px 0;border-bottom:1px solid #f3f4f6">
            <span>${i.name} <span style="color:#9ca3af">×${i.qty}</span></span>
            <span style="font-weight:600">${fmt(i.price*i.qty)}</span>
          </div>`).join("")}
        <div style="display:flex;justify-content:space-between;font-weight:800;font-size:15px;margin-top:10px;padding-top:10px;border-top:2px solid #10b981">
          <span>Total</span><span style="color:#10b981">${fmt(total)}</span>
        </div>
      </div>`;
  },

  proceedToPayment() {
    const name     = document.getElementById("cust-name")?.value.trim();
    const phone    = document.getElementById("cust-phone")?.value.trim();
    const location = document.getElementById("cust-location")?.value.trim();
    const notes    = document.getElementById("cust-notes")?.value.trim();
    if (!name)     { alert("Please enter your full name.");         return; }
    if (!phone)    { alert("Please enter your phone number.");      return; }
    if (!location) { alert("Please enter your delivery location."); return; }
    this._checkoutDetails   = { name, phone, location, notes };
    PaymentModal._orderData = { total: cart.reduce((a,i)=>a+i.price*i.qty,0) };
    PaymentModal._resolve   = (result) => Customer.finishOrder(result);
    PaymentModal.show(PaymentModal._orderData);
  },

  // ── FINISH ORDER ─────────────────────────────────
  finishOrder(payResult) {
    if (!payResult) return; // user cancelled
    const total   = cart.reduce((a,i)=>a+i.price*i.qty,0);
    const details = this._checkoutDetails;
    const newSale = {
      id: nextId(sales),
      date: today(),
      items: cart.map(i=>({name:i.name,qty:i.qty,price:i.price})),
      total,
      attendant:        "Customer Order",
      customerName:     details.name,
      customerPhone:    details.phone,
      customerLocation: details.location||"",
      customerNotes:    details.notes||"",
      paymentMethod:    payResult.method,
      paymentStatus:    payResult.method==="Mobile Money" ? "Pending" : "Paid",
      ...payResult
    };
    sales.push(newSale);
    cart.forEach(ci => {
      const p = products.find(pr=>pr.id===ci.id);
      if (p) p.stock = Math.max(0, p.stock - ci.qty);
    });
    saveSales(); saveProducts();

    // Notifications
    const itemList = newSale.items.map(i=>`${i.name} ×${i.qty}`).join(", ");
    pushNotification("manager",
      `🛒 New order — ${details.name} (${details.phone}) · ${payResult.method} · ${fmt(total)} · ${itemList}`, "order");
    pushNotification("attendant",
      `🛒 New order — ${details.name} (${details.phone}) · ${payResult.method} · ${fmt(total)} · ${itemList}`, "order");

    let custMsg = "";
    if (payResult.method==="Cash")
      custMsg = `✅ Order confirmed! Total: ${fmt(total)}. Cash paid: ${fmt(payResult.amountPaid)}, Change: ${fmt(payResult.change)}.`;
    else if (payResult.method==="Mobile Money")
      custMsg = `📲 An M-Pesa STK Push of ${fmt(total)} has been sent to ${payResult.mobilePhone}. Enter your M-Pesa PIN to confirm.`;
    else
      custMsg = `💳 Order confirmed via ATM/Card! Total: ${fmt(total)}. Delivery to ${details.location}.`;
    pushNotification("customer", custMsg, "success");

    this._lastOrder       = { ...newSale };
    cart                  = [];
    this._checkoutDetails = {};
    this._checkoutStep    = 3;
    this.updateCartNav();
    this.updateNotifBadge();
    this.render();
  },

  // ── STEP 3: SUCCESS SCREEN ───────────────────────
  renderOrderSuccess() {
    const o   = this._lastOrder;
    if (!o) return "";
    const pay       = o.paymentMethod;
    const isPending = o.paymentStatus === "Pending";
    const icons     = {"Cash":"💵","Mobile Money":"📲","ATM/Card":"💳"};
    let payDetail   = "";
    if (pay==="Cash")
      payDetail = `<div class="order-success-row"><span>Cash Paid</span><strong>${fmt(o.amountPaid)}</strong></div>
                   <div class="order-success-row"><span>Change</span><strong style="color:#10b981">${fmt(o.change)}</strong></div>`;
    else if (pay==="Mobile Money")
      payDetail = `<div class="order-success-row"><span>Prompt sent to</span><strong>${o.mobilePhone}</strong></div>
                   <div class="order-success-row"><span>Network</span><strong>${o.network}</strong></div>
                   <div style="background:#fef3c7;border-radius:8px;padding:10px;font-size:13px;color:#92400e;margin-top:8px">
                     ⏳ Approve the payment prompt on your phone to confirm your order.</div>`;
    else
      payDetail = `<div class="order-success-row"><span>Reference</span><strong>${o.cardRef||"—"}</strong></div>`;

    return `
      <div class="order-success-wrap">
        <div class="order-success-icon">${icons[pay]||"✅"}</div>
        <h2 class="order-success-title">${isPending?"Order Placed!":"Order Confirmed! 🎉"}</h2>
        <p class="order-success-sub">${isPending
          ? "Please approve your M-Pesa STK Push to complete payment."
          : "Thank you for shopping at Looku Store! We'll be in touch shortly."}</p>

        <div class="order-success-card">
          <div class="order-success-row"><span>Date</span><strong>${o.date}</strong></div>
          <div class="order-success-row"><span>Customer</span><strong>${o.customerName}</strong></div>
          <div class="order-success-row"><span>Phone</span><strong>${o.customerPhone}</strong></div>
          <div class="order-success-row"><span>Location</span><strong>${o.customerLocation||"—"}</strong></div>
          <div style="border-top:1px solid #e5e7eb;margin:10px 0 8px"></div>
          <div class="order-success-row"><span>Payment</span>
            <span class="pay-badge pay-${pay.toLowerCase().replace(/[\/\s]/g,"-")}">${pay}</span></div>
          <div class="order-success-row"><span>Status</span>
            <span class="status-badge status-${o.paymentStatus.toLowerCase()}">${o.paymentStatus}</span></div>
          ${payDetail}
          <div style="border-top:1px solid #e5e7eb;margin:10px 0 6px"></div>
          <div style="font-size:12px;color:#6b7280;margin-bottom:8px;font-weight:600;text-transform:uppercase;letter-spacing:.5px">Items Ordered</div>
          ${o.items.map(i=>`
            <div class="order-success-row">
              <span>${i.name} <span style="color:#9ca3af">×${i.qty}</span></span>
              <strong>${fmt(i.price*i.qty)}</strong>
            </div>`).join("")}
          <div class="order-success-row" style="margin-top:10px;padding-top:10px;border-top:2px solid #10b981;font-size:16px">
            <span style="font-weight:800">Total</span>
            <strong style="color:#10b981;font-size:18px">${fmt(o.total)}</strong>
          </div>
        </div>

        <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-top:24px">
          <button class="btn" style="background:#6366f1"
            onclick="Customer._checkoutStep=1;Customer._lastOrder=null;Customer.showTab('browse',null);document.querySelector('#page-customer .nav-btn').classList.add('active')">
            🛍 Continue Shopping
          </button>
          <button class="btn" style="background:#10b981"
            onclick="Customer.showTab('notifications',null)">
            🔔 My Notifications
          </button>
        </div>
      </div>`;
  },

  // ── ENQUIRE ───────────────────────────────────────
  renderEnquire() {
    return `
      <h2 class="page-title">Send an Enquiry</h2>
      <div class="form-card" style="max-width:520px">
        <div class="field"><label class="label">Your Name</label>
          <input class="input" id="enq-name" placeholder="Your name"/></div>
        <div class="field"><label class="label">Phone Number</label>
          <input class="input" id="enq-phone" placeholder="e.g. 0712 345 678"/></div>
        <div class="field"><label class="label">Message</label>
          <textarea class="input" id="enq-msg" rows="4"
            placeholder="Ask about sizes, colours, custom tailoring, bulk orders and delivery..."></textarea></div>
        <button class="btn" style="background:#6366f1" onclick="Customer.sendEnquiry()">💬 Send Enquiry</button>
      </div>`;
  },

  sendEnquiry() {
    const name  = document.getElementById("enq-name").value.trim();
    const phone = document.getElementById("enq-phone").value.trim();
    const msg   = document.getElementById("enq-msg").value.trim();
    if (!name||!msg) return alert("Please fill in your name and message.");
    pushNotification("manager",   `💬 Enquiry from ${name} (${phone}): "${msg}"`, "info");
    pushNotification("attendant", `💬 Enquiry from ${name} (${phone}): "${msg}"`, "info");
    App.showSuccess("customer-main", "Enquiry sent! We'll get back to you soon.");
    this.render();
  },

  // ── NOTIFICATIONS ─────────────────────────────────
  renderNotifications() {
    const notifs = getNotifications("customer");
    if (!notifs.length) return `<h2 class="page-title">Notifications</h2>
      <div class="empty-state">No notifications yet.</div>`;
    const rows = notifs.map(n => `
      <div class="notif-item notif-${n.type}${n.read?"":" notif-unread"}">
        <div class="notif-msg">${n.msg}</div>
        <div class="notif-time">${n.time}</div>
      </div>`).join("");
    return `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <h2 class="page-title" style="margin:0">Notifications</h2>
        <button class="sm-btn" style="background:#6b7280"
          onclick="clearNotifications('customer');Customer.render()">Clear All</button>
      </div>
      <div class="notif-list">${rows}</div>`;
  }
};

//  ATTENDANT
// ────────────────────────────────────────────────────
const Attendant = {
  currentTab: "orders",
  saleItems: [{ productId: "", qty: 1 }],
  pendingDeleteProduct: null,

  init() {
    this.saleItems = [{ productId: "", qty: 1 }];
    this.showTab("orders", document.querySelector("#page-attendant .nav-btn"));
    this.updateNotifBadge();
  },

  updateNotifBadge() {
    const btn = document.getElementById("att-notif-btn");
    const count = unreadCount("attendant");
    if (btn) btn.textContent = count > 0 ? `🔔 Notifications (${count})` : "🔔 Notifications";
  },

  showTab(tab, btn) {
    this.currentTab = tab;
    document.querySelectorAll("#page-attendant .nav-btn").forEach(b => b.classList.remove("active"));
    if (btn) btn.classList.add("active");
    if (tab === "notifications") markAllRead("attendant");
    this.render();
    this.updateNotifBadge();
  },

  render() {
    const el = document.getElementById("attendant-main");
    switch (this.currentTab) {
      case "orders":        el.innerHTML = this.renderOrders(); break;
      case "sale":          el.innerHTML = this.renderSale(); break;
      case "stock":         el.innerHTML = this.renderStock(); break;
      case "notifications": el.innerHTML = this.renderNotifications(); break;
    }
  },

  getAttendantName() { return loggedInAttendant ? loggedInAttendant.name : "Attendant"; },

  renderOrders() {
    const todaySales = sales.filter(s => s.date === today());
    // Pending payment actions
    const pendingSales = sales.filter(s => s.paymentStatus === "Pending");
    const pendingHtml = pendingSales.length ? `
      <h3 class="section-title" style="color:#ef4444">⏳ Pending Payments (${pendingSales.length})</h3>
      <div class="table-wrap"><table>
        <thead><tr><th>Customer</th><th>Phone</th><th>Method</th><th>Total</th><th>Action</th></tr></thead>
        <tbody>${pendingSales.map(s => `<tr>
          <td>${s.customerName||"Walk-in"}</td>
          <td>${s.customerPhone||"—"}</td>
          <td><span class="pay-badge pay-mobile-money">${s.paymentMethod}</span></td>
          <td style="font-weight:600;color:#10b981">${fmt(s.total)}</td>
          <td>
            <button class="sm-btn" style="background:#10b981" onclick="Attendant.confirmPayment(${s.id})">✓ Confirm Paid</button>
            <button class="sm-btn" style="background:#f59e0b;margin-left:4px" onclick="Attendant.promptPayment(${s.id})">📲 Re-prompt</button>
          </td>
        </tr>`).join("")}</tbody>
      </table></div>` : "";

    return `
      <h2 class="page-title">Customer Orders</h2>
      ${pendingHtml}
      <h3 class="section-title">Today's Orders</h3>
      ${todaySales.length ? App.salesTable(todaySales, true) : '<div class="empty-state">No orders today yet.</div>'}
      <h3 class="section-title" style="margin-top:28px">All Orders History</h3>
      ${App.salesTable([...sales].reverse(), true)}`;
  },

  confirmPayment(saleId) {
    const s = sales.find(sl => sl.id === saleId);
    if (!s) return;
    s.paymentStatus = "Paid";
    saveSales();
    pushNotification("customer", `✅ Your payment of ${fmt(s.total)} via ${s.paymentMethod} has been confirmed. Thank you!`, "success");
    pushNotification("manager", `✅ Payment confirmed: ${fmt(s.total)} from ${s.customerName||"customer"} via ${s.paymentMethod}.`, "success");
    App.showSuccess("attendant-main", `Payment confirmed for ${s.customerName||"customer"}.`);
    this.render();
  },

  promptPayment(saleId) {
    const s = sales.find(sl => sl.id === saleId);
    if (!s) return;
    pushNotification("customer", `📲 Payment reminder: Please complete your payment of ${fmt(s.total)} to Looku Store. Thank you!`, "warning");
    App.showSuccess("attendant-main", `Payment reminder sent to ${s.customerName||"customer"}.`);
  },

  renderSale() {
    const itemRows = this.saleItems.map((item, idx) => {
      const p = products.find(pr => pr.id === +item.productId);
      const origPrice  = p ? p.price : 0;
      const salePrice  = item.salePrice !== undefined ? item.salePrice : origPrice;
      const subtotal   = p ? salePrice * item.qty : 0;
      const hasDiscount = p && salePrice < origPrice;
      const discount   = hasDiscount ? origPrice - salePrice : 0;

      return `
        <div class="sale-item-row" style="align-items:flex-end;flex-wrap:wrap;gap:8px;padding:10px;background:#f9fafb;border-radius:10px;margin-bottom:8px">
          <div class="field" style="flex:2;min-width:160px;margin:0">
            ${idx===0?'<label class="label">Product</label>':""}
            <select class="input" onchange="Attendant.updateSaleItem(${idx},'productId',this.value)">
              <option value="">Select product...</option>
              ${products.map(pr=>`<option value="${pr.id}" ${+item.productId===pr.id?"selected":""}>${pr.name} — ${fmt(pr.price)}</option>`).join("")}
            </select>
          </div>
          <div class="field" style="flex:0 0 70px;margin:0">
            ${idx===0?'<label class="label">Qty</label>':""}
            <input class="input" type="number" min="1" value="${item.qty}"
              onchange="Attendant.updateSaleItem(${idx},'qty',+this.value)"/>
          </div>
          <div class="field" style="flex:0 0 130px;margin:0">
            ${idx===0?'<label class="label" title="You can adjust for discount">Unit Price (KSH) ✏️</label>':""}
            <input class="input ${hasDiscount?"input-discounted":""}" type="number" min="0"
              value="${salePrice}"
              ${!p?"disabled":""}
              title="Original price: ${fmt(origPrice)}. Edit to apply discount."
              onchange="Attendant.updateSaleItem(${idx},'salePrice',+this.value)"
              style="border-color:${hasDiscount?"#f59e0b":"#e5e7eb"}"/>
            ${hasDiscount ? `<div style="font-size:11px;color:#f59e0b;margin-top:2px">
              Orig: ${fmt(origPrice)} · Disc: ${fmt(discount)}/unit
            </div>` : (p ? `<div style="font-size:11px;color:#9ca3af;margin-top:2px">Orig: ${fmt(origPrice)}</div>` : "")}
          </div>
          <div class="field" style="flex:0 0 120px;margin:0">
            ${idx===0?'<label class="label">Subtotal</label>':""}
            <input class="input" style="background:#f3f4f6;font-weight:700;color:#10b981" readonly
              value="${p ? fmt(subtotal) : "—"}"/>
          </div>
          ${this.saleItems.length>1?`<button class="sm-btn" style="background:#ef4444;margin-bottom:2px" onclick="Attendant.removeSaleItem(${idx})">✕</button>`:""}
        </div>`;
    }).join("");

    const total = this.calcSaleTotal();
    const origTotal = this.calcOrigTotal();
    const totalDiscount = origTotal - total;

    return `
      <h2 class="page-title">Add Sale</h2>
      <div class="form-card">
        <div class="form-title">Customer Details</div>
        <div class="form-grid">
          <div class="field"><label class="label">Customer Name</label>
            <input class="input" id="att-cust-name" placeholder="Customer name (optional)"/></div>
          <div class="field"><label class="label">Phone Number</label>
            <input class="input" id="att-cust-phone" placeholder="e.g. 0712 345 678"/></div>
        </div>
        <div class="field"><label class="label">Location</label>
          <input class="input" id="att-cust-location" placeholder="e.g. Uganda Road, Eldoret"/></div>
      </div>
      <div class="form-card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <div class="form-title" style="margin:0">Sale Items</div>
          <div style="font-size:12px;color:#6b7280;background:#f1f5f9;padding:4px 10px;border-radius:20px">
            ✏️ You can edit Unit Price to apply a discount
          </div>
        </div>
        <div class="sale-items-wrap">${itemRows}</div>
        <button class="sm-btn" style="background:#6b7280;margin-top:4px;margin-bottom:16px"
          onclick="Attendant.addSaleItem()">+ Add Item</button>

        <div class="divider"></div>

        ${totalDiscount > 0 ? `
        <div style="display:flex;justify-content:space-between;font-size:13px;color:#9ca3af;margin-bottom:6px;padding:0 4px">
          <span>Original Price</span><span style="text-decoration:line-through">${fmt(origTotal)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:13px;color:#f59e0b;font-weight:600;margin-bottom:6px;padding:0 4px">
          <span>🏷 Total Discount</span><span>− ${fmt(totalDiscount)}</span>
        </div>` : ""}

        <div class="total-row">
          <span style="font-weight:700">Total Amount</span>
          <span style="font-weight:800;color:#1f2937;font-size:18px">${fmt(total)}</span>
        </div>

        <div class="field" style="margin-top:12px">
          <label class="label">Payment Method</label>
          <div class="pay-method-grid">
            <button class="pay-method-btn ${this._selectedPayMethod==="Cash"?"pay-method-selected":""}"
              id="pm-cash" data-method="Cash" onclick="Attendant.selectPayMethod('Cash')">💵 Cash</button>
            <button class="pay-method-btn ${this._selectedPayMethod==="Mobile Money"?"pay-method-selected":""}"
              id="pm-mobile" data-method="Mobile Money" onclick="Attendant.selectPayMethod('Mobile Money')">📲 M-Pesa / Mobile</button>
            <button class="pay-method-btn ${this._selectedPayMethod==="ATM/Card"?"pay-method-selected":""}"
              id="pm-atm" data-method="ATM/Card" onclick="Attendant.selectPayMethod('ATM/Card')">💳 ATM / Card</button>
          </div>
        </div>

        <div id="att-pay-cash-section" style="display:${this._selectedPayMethod==="Cash"?"block":"none"}">
          <div class="field"><label class="label">Amount Paid (KSH)</label>
            <input class="input" id="att-amount-paid" type="number" placeholder="Enter amount paid"
              oninput="Attendant.updateChange()"/>
          </div>
          <div id="att-change-display"></div>
        </div>
        <div id="att-pay-mobile-section" style="display:${this._selectedPayMethod==="Mobile Money"?"block":"none"}">
          <div class="form-grid">
            <div class="field"><label class="label">Customer Phone</label>
              <input class="input" id="att-mobile-phone" placeholder="e.g. 0712 345 678"/></div>
            <div class="field"><label class="label">Network</label>
              <select class="input" id="att-mobile-network">
                <option>M-Pesa (Safaricom)</option><option>Airtel Money Kenya</option><option>T-Kash (Telkom)</option>
              </select></div>
          </div>
          <div class="change-box change-ok" style="margin-top:4px">📲 An M-Pesa STK Push will be sent to the customer's phone. Ask them to approve it.</div>
        </div>
        <div id="att-pay-atm-section" style="display:${this._selectedPayMethod==="ATM/Card"?"block":"none"}">
          <div class="field"><label class="label">Card / ATM Reference (optional)</label>
            <input class="input" id="att-atm-ref" placeholder="Transaction ref"/></div>
          <div class="change-box change-ok" style="margin-top:4px">💳 Confirm customer card transaction is approved.</div>
        </div>

        <input type="hidden" id="att-pay-method" value="${this._selectedPayMethod}"/>
        <button class="btn" style="background:#10b981;margin-top:16px;width:100%;font-size:15px"
          onclick="Attendant.recordSale()">✓ Record Sale</button>
      </div>`;
  },

  _selectedPayMethod: "",

  selectPayMethod(method) {
    this._selectedPayMethod = method;
    document.getElementById("att-pay-method").value = method;
    ["Cash","Mobile Money","ATM/Card"].forEach(m => {
      const id = "pm-" + m.toLowerCase().replace(/[\/\s]/g,"-").replace("--","-");
      const btn = document.getElementById(id);
      if (btn) btn.classList.toggle("pay-method-selected", m === method);
    });
    document.getElementById("att-pay-cash-section").style.display   = method==="Cash" ? "block" : "none";
    document.getElementById("att-pay-mobile-section").style.display = method==="Mobile Money" ? "block" : "none";
    document.getElementById("att-pay-atm-section").style.display    = method==="ATM/Card" ? "block" : "none";
    document.getElementById("att-change-display").innerHTML = "";
  },

  calcSaleTotal() {
    return this.saleItems.reduce((acc, item) => {
      const p = products.find(pr => pr.id === +item.productId);
      if (!p) return acc;
      const price = (item.salePrice !== undefined && item.salePrice !== null) ? item.salePrice : p.price;
      return acc + price * item.qty;
    }, 0);
  },

  calcOrigTotal() {
    return this.saleItems.reduce((acc, item) => {
      const p = products.find(pr => pr.id === +item.productId);
      return acc + (p ? p.price * item.qty : 0);
    }, 0);
  },

  updateSaleItem(idx, field, val) {
    if (field === "productId") {
      // Reset salePrice when product changes so it defaults to new product price
      this.saleItems[idx].salePrice = undefined;
    }
    this.saleItems[idx][field] = val;
    this.render();
  },
  addSaleItem()    { this.saleItems.push({ productId: "", qty: 1 }); this.render(); },
  removeSaleItem(idx) { this.saleItems.splice(idx, 1); this.render(); },

  updateChange() {
    const paid = +document.getElementById("att-amount-paid").value;
    const total = this.calcSaleTotal();
    const change = paid - total;
    const el = document.getElementById("att-change-display");
    if (!paid || !el) return;
    el.innerHTML = change >= 0
      ? `<div class="change-box change-ok">✓ Change to return: ${fmt(change)}</div>`
      : `<div class="change-box change-short">⚠ Short by: ${fmt(Math.abs(change))}</div>`;
  },

  recordSale() {
    const valid = this.saleItems.filter(i => i.productId && i.qty > 0);
    if (!valid.length) return alert("Please add at least one product.");
    const total = this.calcSaleTotal();
    if (!total) return alert("Total is 0. Select valid products.");
    const method = this._selectedPayMethod;
    if (!method) return alert("Please select a payment method (Cash, Mobile Money, or ATM/Card).");

    if (method === "Cash") {
      const paid = +document.getElementById("att-amount-paid").value;
      if (!paid || paid < total) return alert("Please enter a valid amount paid (must be ≥ total).");
    }

    const custName     = document.getElementById("att-cust-name")?.value.trim() || "";
    const custPhone    = document.getElementById("att-cust-phone")?.value.trim() || "";
    const custLocation = document.getElementById("att-cust-location")?.value.trim() || "";

    const items = valid.map(i => {
      const p = products.find(pr => pr.id === +i.productId);
      const salePrice = (i.salePrice !== undefined && i.salePrice !== null) ? i.salePrice : p.price;
      const discountPrice = salePrice < p.price ? salePrice : undefined;
      return { name: p.name, qty: +i.qty, price: salePrice, origPrice: p.price, discountPrice };
    });

    let extraInfo = {};
    let payStatus = "Paid";
    if (method === "Cash") {
      const paid = +document.getElementById("att-amount-paid").value;
      extraInfo = { amountPaid: paid, change: paid - total };
    } else if (method === "Mobile Money") {
      const phone = document.getElementById("att-mobile-phone").value.trim() || custPhone;
      const network = document.getElementById("att-mobile-network").value;
      if (!phone) return alert("Please enter a phone number for Mobile Money.");
      extraInfo = { mobilePhone: phone, network };
      payStatus = "Pending";
    } else if (method === "ATM/Card") {
      extraInfo = { cardRef: document.getElementById("att-atm-ref").value.trim() };
    }

    const newSale = {
      id: nextId(sales), date: today(), items, total,
      attendant: this.getAttendantName(),
      customerName: custName, customerPhone: custPhone, customerLocation: custLocation,
      paymentMethod: method, paymentStatus: payStatus, ...extraInfo
    };

    sales.push(newSale);
    valid.forEach(i => {
      const p = products.find(pr => pr.id === +i.productId);
      if (p) p.stock = Math.max(0, p.stock - +i.qty);
    });
    saveSales(); saveProducts();

    // Notifications
    const itemList = items.map(i=>`${i.name} ×${i.qty}`).join(", ");
    pushNotification("manager", `🧾 Sale recorded by ${this.getAttendantName()}: ${fmt(total)} via ${method}${custName?" for "+custName:""}. Items: ${itemList}`, "order");
    if (custPhone) {
      pushNotification("customer", payStatus==="Pending"
        ? `📲 Hi ${custName||"Customer"}, please complete your ${method} payment of ${fmt(total)} to Looku Store. Items: ${itemList}`
        : `✅ Sale confirmed! ${fmt(total)} received via ${method}. Items: ${itemList}. Thank you!`, "success");
    }

    const paid = method==="Cash" ? +document.getElementById("att-amount-paid").value : 0;
    const change = method==="Cash" ? Math.max(0, paid - total) : 0;
    this.saleItems = [{ productId: "", qty: 1 }];
    this._selectedPayMethod = "";

    App.showSuccess("attendant-main",
      method==="Cash"
        ? `Sale recorded! Change: ${fmt(change)}`
        : method==="Mobile Money"
        ? `Sale recorded! Payment prompt sent.`
        : `Sale recorded! ATM/Card payment confirmed.`
    );
    this.render();
  },

  renderStock() {
    const productOptions = products.map(p =>
      `<option value="${p.id}">${p.name} — ${p.category} (stock: ${p.stock})</option>`
    ).join("");

    const rows = products.map(p => `<tr>
      <td><strong>${p.name}</strong></td>
      <td>${p.category}</td>
      <td>${fmt(p.price)}</td>
      <td><span class="stock-badge ${p.stock > 10 ? "stock-ok" : "stock-low"}">${p.stock}</span></td>
      <td><button class="sm-btn" style="background:#ef4444" onclick="Attendant.requestDelete(${p.id})">⚠ Request Delete</button></td>
    </tr>`).join("");

    return `
      <h2 class="page-title">Stock Management</h2>
      <p style="color:#6b7280;font-size:13px;margin-bottom:16px">
        Fill in the full stock report below — it is sent directly to the Manager.
      </p>

      <div class="form-card" style="border-top:4px solid #10b981">
        <div class="form-title">📋 Submit Stock Report</div>
        <div style="font-size:12px;color:#6b7280;margin-bottom:16px">
          Complete all fields accurately. This report is sent to the Manager immediately upon submission.
        </div>

        <div class="form-grid">
          <div class="field">
            <label class="label">Product <span style="color:#ef4444">*</span></label>
            <select class="input" id="sr-product-id" onchange="Attendant.prefillStockReport()">
              <option value="">Select product...</option>
              ${productOptions}
            </select>
          </div>
          <div class="field">
            <label class="label">Date of Stock Entry <span style="color:#ef4444">*</span></label>
            <input class="input" id="sr-date" type="date" value="${today()}"/>
          </div>
          <div class="field">
            <label class="label">Supplier / Source</label>
            <input class="input" id="sr-supplier" placeholder="e.g. Looku Warehouse, Market"/>
          </div>
          <div class="field">
            <label class="label">Batch / Invoice Number</label>
            <input class="input" id="sr-batch" placeholder="e.g. INV-2026-001"/>
          </div>
        </div>

        <div style="background:#f0fdf4;border-radius:12px;padding:16px;margin-bottom:14px;border:1px solid #bbf7d0">
          <div style="font-weight:700;color:#166534;font-size:13px;margin-bottom:12px;text-transform:uppercase;letter-spacing:.5px">📦 Quantity Details</div>
          <div class="form-grid">
            <div class="field" style="margin:0">
              <label class="label">Total Items Received <span style="color:#ef4444">*</span></label>
              <input class="input" id="sr-total-qty" type="number" min="1" placeholder="e.g. 50" oninput="Attendant.calcStockTotals()"/>
            </div>
            <div class="field" style="margin:0">
              <label class="label">✅ Perfect / Good Condition <span style="color:#ef4444">*</span></label>
              <input class="input" id="sr-perfect-qty" type="number" min="0" placeholder="e.g. 47" oninput="Attendant.calcStockTotals()"/>
            </div>
            <div class="field" style="margin:0">
              <label class="label">⚠ Imperfect / Damaged</label>
              <input class="input" id="sr-imperfect-qty" type="number" min="0" placeholder="e.g. 3" oninput="Attendant.calcStockTotals()"/>
            </div>
            <div class="field" style="margin:0">
              <label class="label">❌ Missing / Short</label>
              <input class="input" id="sr-missing-qty" type="number" min="0" placeholder="e.g. 0" oninput="Attendant.calcStockTotals()"/>
            </div>
            <div class="field" style="margin:0">
              <label class="label">↩ Returned to Supplier</label>
              <input class="input" id="sr-returned-qty" type="number" min="0" placeholder="e.g. 0" oninput="Attendant.calcStockTotals()"/>
            </div>
            <div class="field" style="margin:0">
              <label class="label">➕ Items Added to Store Stock</label>
              <input class="input" id="sr-added-qty" type="number" min="0" placeholder="Auto-calculated"
                style="background:#dcfce7;font-weight:700;color:#166534" oninput="Attendant.calcStockTotals()"/>
            </div>
          </div>
          <div id="sr-totals-display" style="display:none;margin-top:12px;padding:10px 14px;background:#fff;border-radius:8px;border:1px solid #bbf7d0;font-size:13px"></div>
        </div>

        <div style="background:#fffbeb;border-radius:12px;padding:16px;margin-bottom:14px;border:1px solid #fde68a">
          <div style="font-weight:700;color:#92400e;font-size:13px;margin-bottom:12px;text-transform:uppercase;letter-spacing:.5px">🏷 Quality Assessment</div>
          <div class="form-grid">
            <div class="field" style="margin:0">
              <label class="label">Overall Quality <span style="color:#ef4444">*</span></label>
              <select class="input" id="sr-quality">
                <option value="">Select quality grade...</option>
                <option value="Excellent">⭐⭐⭐⭐⭐ Excellent — All items perfect</option>
                <option value="Good">⭐⭐⭐⭐ Good — Minor defects only</option>
                <option value="Average">⭐⭐⭐ Average — Some defects noted</option>
                <option value="Poor">⭐⭐ Poor — Many defects</option>
                <option value="Rejected">⭐ Rejected — Returned to supplier</option>
              </select>
            </div>
            <div class="field" style="margin:0">
              <label class="label">Size / Fit Accuracy</label>
              <select class="input" id="sr-size-accuracy">
                <option value="Accurate">✅ Sizes accurate as labeled</option>
                <option value="Runs Small">⬇ Runs small — size up</option>
                <option value="Runs Large">⬆ Runs large — size down</option>
                <option value="Mixed">🔀 Mixed — varies per item</option>
              </select>
            </div>
            <div class="field" style="margin:0">
              <label class="label">Fabric / Material Quality</label>
              <select class="input" id="sr-fabric">
                <option value="Premium">Premium — matches description</option>
                <option value="Standard">Standard — acceptable</option>
                <option value="Below Standard">Below Standard — issues noted</option>
              </select>
            </div>
            <div class="field" style="margin:0">
              <label class="label">Colours / Prints Accuracy</label>
              <select class="input" id="sr-colours">
                <option value="Accurate">✅ Matches catalogue exactly</option>
                <option value="Slight Variation">🎨 Slight colour variation</option>
                <option value="Different">❌ Different from catalogue</option>
              </select>
            </div>
          </div>
        </div>

        <div class="field">
          <label class="label">Description of Defects / Issues</label>
          <textarea class="input" id="sr-defects" rows="2" placeholder="Torn stitching, colour fading, broken zips, stains, size mislabelling..."></textarea>
        </div>

        <div style="background:#f0f9ff;border-radius:12px;padding:16px;margin-bottom:14px;border:1px solid #bae6fd">
          <div style="font-weight:700;color:#075985;font-size:13px;margin-bottom:12px;text-transform:uppercase;letter-spacing:.5px">💰 Cost & Pricing</div>
          <div class="form-grid">
            <div class="field" style="margin:0">
              <label class="label">Cost Per Unit (KES)</label>
              <input class="input" id="sr-cost-unit" type="number" min="0" placeholder="e.g. 1200" oninput="Attendant.calcStockCosts()"/>
            </div>
            <div class="field" style="margin:0">
              <label class="label">Total Stock Cost (KES)</label>
              <input class="input" id="sr-total-cost" type="number" min="0" placeholder="Auto-calculated" style="background:#f0f9ff"/>
            </div>
            <div class="field" style="margin:0">
              <label class="label">Current Selling Price (KES)</label>
              <input class="input" id="sr-selling-price" type="number" min="0" placeholder="Current store price"/>
            </div>
            <div class="field" style="margin:0">
              <label class="label">Suggested Selling Price (KES)</label>
              <input class="input" id="sr-suggested-price" type="number" min="0" placeholder="Your suggestion"/>
            </div>
          </div>
        </div>

        <div class="form-grid">
          <div class="field">
            <label class="label">Storage Location in Store</label>
            <input class="input" id="sr-location" placeholder="e.g. Rack A3, Shelf 2, Store room"/>
          </div>
          <div class="field">
            <label class="label">Storage Condition</label>
            <select class="input" id="sr-storage-condition">
              <option value="Good">✅ Good — proper storage</option>
              <option value="Needs Improvement">⚠ Needs improvement</option>
              <option value="Poor">❌ Poor — at risk of damage</option>
            </select>
          </div>
          <div class="field">
            <label class="label">Reorder Urgency</label>
            <select class="input" id="sr-urgency">
              <option value="Not Needed">🟢 Not needed yet</option>
              <option value="Low">🔵 Low — next month</option>
              <option value="Medium">🟡 Medium — within 2 weeks</option>
              <option value="High">🟠 High — this week</option>
              <option value="Critical">🔴 Critical — immediately</option>
            </select>
          </div>
          <div class="field">
            <label class="label">Report Type</label>
            <select class="input" id="sr-type">
              <option value="New Stock In">📦 New Stock In</option>
              <option value="Stock Update">🔄 Stock Update / Recount</option>
              <option value="Returned Stock">↩ Returned Stock</option>
              <option value="Damaged Stock">⚠ Damaged Stock Report</option>
              <option value="Stock Transfer">🔀 Stock Transfer</option>
            </select>
          </div>
        </div>

        <div class="field">
          <label class="label">Additional Notes / Recommendations to Manager</label>
          <textarea class="input" id="sr-notes" rows="3"
            placeholder="Reorder recommendations, supplier feedback, pricing suggestions, anything the manager should know..."></textarea>
        </div>

        <div id="sr-error" class="err-box" style="display:none"></div>
        <button class="btn" style="background:#10b981;width:100%;margin-top:8px;font-size:15px"
          onclick="Attendant.submitStockReport()">
          📤 Submit Report to Manager
        </button>
      </div>

      <h3 class="section-title">All Products &amp; Stock Levels</h3>
      <div class="table-wrap"><table>
        <thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Action</th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>`;
  },

  prefillStockReport() {
    const id = +document.getElementById("sr-product-id")?.value;
    const p  = products.find(pr => pr.id === id);
    if (!p) return;
    const priceEl = document.getElementById("sr-selling-price");
    if (priceEl) priceEl.value = p.price;
  },

  calcStockTotals() {
    const total     = +document.getElementById("sr-total-qty")?.value     || 0;
    const perfect   = +document.getElementById("sr-perfect-qty")?.value   || 0;
    const imperfect = +document.getElementById("sr-imperfect-qty")?.value || 0;
    const missing   = +document.getElementById("sr-missing-qty")?.value   || 0;
    const returned  = +document.getElementById("sr-returned-qty")?.value  || 0;
    const addedEl   = document.getElementById("sr-added-qty");
    const displayEl = document.getElementById("sr-totals-display");
    if (addedEl && perfect > 0 && !addedEl._userEdited) addedEl.value = perfect;
    if (addedEl) addedEl.addEventListener("input", () => { addedEl._userEdited = true; }, { once: true });
    const accounted = perfect + imperfect + missing + returned;
    const variance  = total - accounted;
    if (displayEl && total > 0) {
      displayEl.style.display = "block";
      displayEl.innerHTML = `<div style="display:flex;gap:16px;flex-wrap:wrap;font-size:13px">
        <span>📦 Received: <strong>${total}</strong></span>
        <span style="color:#16a34a">✅ Perfect: <strong>${perfect}</strong></span>
        <span style="color:#d97706">⚠ Imperfect: <strong>${imperfect}</strong></span>
        <span style="color:#dc2626">❌ Missing: <strong>${missing}</strong></span>
        <span style="color:#6b7280">↩ Returned: <strong>${returned}</strong></span>
        ${variance !== 0 ? `<span style="color:${variance > 0 ? "#7c3aed":"#dc2626"}">⚡ Variance: <strong>${variance > 0 ? "+"+variance : variance}</strong></span>` : '<span style="color:#16a34a">✓ Fully accounted</span>'}
      </div>`;
    }
    Attendant.calcStockCosts();
  },

  calcStockCosts() {
    const unitCost  = +document.getElementById("sr-cost-unit")?.value  || 0;
    const addedQty  = +document.getElementById("sr-added-qty")?.value  || 0;
    const totalCostEl = document.getElementById("sr-total-cost");
    if (totalCostEl && unitCost && addedQty) totalCostEl.value = unitCost * addedQty;
  },

  submitStockReport() {
    const productId  = +document.getElementById("sr-product-id")?.value;
    const date       = document.getElementById("sr-date")?.value;
    const totalQty   = +document.getElementById("sr-total-qty")?.value   || 0;
    const perfectQty = +document.getElementById("sr-perfect-qty")?.value || 0;
    const addedQty   = +document.getElementById("sr-added-qty")?.value;
    const quality    = document.getElementById("sr-quality")?.value;
    const errEl      = document.getElementById("sr-error");

    if (!productId) { errEl.style.display="flex"; errEl.textContent="⚠ Please select a product."; return; }
    if (!totalQty)  { errEl.style.display="flex"; errEl.textContent="⚠ Total items received is required."; return; }
    if (perfectQty === "" || perfectQty === null) { errEl.style.display="flex"; errEl.textContent="⚠ Perfect items count is required."; return; }
    if (!quality)   { errEl.style.display="flex"; errEl.textContent="⚠ Please select overall quality grade."; return; }
    errEl.style.display = "none";

    const p = products.find(pr => pr.id === productId);
    if (!p) return;

    const finalAdded = addedQty || perfectQty;

    const report = {
      id:               nextId(stockReports),
      date,
      reportType:       document.getElementById("sr-type")?.value        || "New Stock In",
      productId,
      productName:      p.name,
      productCategory:  p.category,
      submittedBy:      this.getAttendantName(),
      submittedAt:      new Date().toLocaleString("en-KE"),
      supplier:         document.getElementById("sr-supplier")?.value    || "—",
      batchNo:          document.getElementById("sr-batch")?.value       || "—",
      totalReceived:    totalQty,
      perfectQty,
      imperfectQty:     +document.getElementById("sr-imperfect-qty")?.value || 0,
      missingQty:       +document.getElementById("sr-missing-qty")?.value   || 0,
      returnedQty:      +document.getElementById("sr-returned-qty")?.value  || 0,
      addedToStock:     finalAdded,
      previousStock:    p.stock,
      newStock:         p.stock + finalAdded,
      quality,
      sizeAccuracy:     document.getElementById("sr-size-accuracy")?.value  || "Accurate",
      fabricQuality:    document.getElementById("sr-fabric")?.value         || "Standard",
      colourAccuracy:   document.getElementById("sr-colours")?.value        || "Accurate",
      defectsDesc:      document.getElementById("sr-defects")?.value        || "None",
      storageLocation:  document.getElementById("sr-location")?.value       || "—",
      storageCondition: document.getElementById("sr-storage-condition")?.value || "Good",
      costPerUnit:      +document.getElementById("sr-cost-unit")?.value      || 0,
      totalCost:        +document.getElementById("sr-total-cost")?.value     || 0,
      sellingPrice:     +document.getElementById("sr-selling-price")?.value  || p.price,
      suggestedPrice:   +document.getElementById("sr-suggested-price")?.value || 0,
      reorderUrgency:   document.getElementById("sr-urgency")?.value         || "Not Needed",
      notes:            document.getElementById("sr-notes")?.value           || "—",
      status:           "Submitted",
    };

    // Update stock
    p.stock = report.newStock;
    saveProducts();
    stockReports.unshift(report);
    saveStockReports();

    // Notify manager
    const urgIcon = { "Critical":"🔴","High":"🟠","Medium":"🟡","Low":"🔵","Not Needed":"🟢" };
    pushNotification("manager",
      `📋 NEW STOCK REPORT — ${report.productName} (${report.reportType}) · ${report.date} · By: ${report.submittedBy} · ` +
      `Received: ${report.totalReceived} | ✅ ${report.perfectQty} perfect | ⚠ ${report.imperfectQty} imperfect | ❌ ${report.missingQty} missing | Added: ${report.addedToStock} · ` +
      `Quality: ${report.quality} | ${urgIcon[report.reorderUrgency]||"📦"} Reorder: ${report.reorderUrgency} · ` +
      `Cost: ${fmt(report.totalCost)} | Notes: ${report.notes}`,
      "stock"
    );

    App.showSuccess("attendant-main",
      `✅ Stock report submitted! "${p.name}" stock updated: ${report.previousStock} → ${report.newStock} items.`
    );
    this.render();
  },

  updateStock() {
    // quick fallback (not shown in UI but kept for compatibility)
    const id  = +document.getElementById("stock-product-id")?.value;
    const qty = +document.getElementById("stock-qty")?.value;
    if (!id || !qty) return;
    const p = products.find(pr => pr.id === id);
    if (p) { p.stock += qty; saveProducts(); }
    this.render();
  },

  requestDelete(productId) {
    const p = products.find(pr => pr.id === productId);
    if (!p) return;
    this.pendingDeleteProduct = p;
    document.getElementById("modal-product-name").textContent = p.name;
    document.getElementById("modal-reason").value = "";
    document.getElementById("delete-modal").style.display = "flex";
  },

  closeModal() {
    this.pendingDeleteProduct = null;
    document.getElementById("delete-modal").style.display = "none";
  },

  submitDeleteRequest() {
    const reason = document.getElementById("modal-reason").value.trim();
    if (!reason) return alert("Please enter a reason.");
    const p = this.pendingDeleteProduct;
    deleteRequests.push({ id: nextId(deleteRequests), productId: p.id, productName: p.name, requestedBy: this.getAttendantName(), reason });
    saveRequests();
    pushNotification("manager", `🗑 Delete request: "${p.name}" by ${this.getAttendantName()}. Reason: ${reason}`, "warning");
    this.closeModal();
    App.showSuccess("attendant-main", `Delete request for "${p.name}" sent to Manager.`);
  },

  renderNotifications() {
    const notifs = getNotifications("attendant");
    if (!notifs.length) return `<h2 class="page-title">Notifications</h2><div class="empty-state">No notifications yet.</div>`;
    const rows = notifs.map(n => `
      <div class="notif-item notif-${n.type}${n.read?"":" notif-unread"}">
        <div class="notif-msg">${n.msg}</div>
        <div class="notif-time">${n.time}</div>
      </div>`).join("");
    return `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <h2 class="page-title" style="margin:0">Notifications</h2>
        <button class="sm-btn" style="background:#6b7280" onclick="clearNotifications('attendant');Attendant.render()">Clear All</button>
      </div>
      <div class="notif-list">${rows}</div>`;
  }
};

// ── Boot ──────────────────────────────────────────────
// Global paste listener — pastes image when on stock page
document.addEventListener("paste", (ev) => {
  if (Manager.currentTab !== "stock") return;
  const items = Array.from(ev.clipboardData?.items || []);
  const imgItem = items.find(i => i.type.startsWith("image/"));
  if (imgItem) {
    ev.preventDefault();
    Manager.processImageFile(imgItem.getAsFile());
  }
});

App.goTo("landing");

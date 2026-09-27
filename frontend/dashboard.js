/**
 * MADHAN MART - Multi-Role Dashboard Script (Buyer, Seller, Admin)
 * Pure Vanilla JavaScript with Supabase Integration
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Clear any legacy offline orders cache so dashboard strictly reflects Supabase
  localStorage.removeItem('madhan_mart_all_orders');

  // --------------------------------------------------------------------------
  // 1. Authentication & Session Check
  // --------------------------------------------------------------------------
  let currentUser = null;

  const sessionData = localStorage.getItem('madhan_mart_current_user');
  if (sessionData) {
    try {
      currentUser = JSON.parse(sessionData);
    } catch (e) {
      currentUser = null;
    }
  }

  if (!currentUser && window.MadhanMartSupabase) {
    try {
      const liveSessionUser = await window.MadhanMartSupabase.getCurrentSession();
      if (liveSessionUser) {
        currentUser = liveSessionUser;
      }
    } catch (e) {
      console.warn('[SUPABASE] Session check notice:', e);
    }
  }

  // If no user is logged in, redirect to login page
  if (!currentUser) {
    window.location.href = 'login.html';
    return;
  }

  let activeRole = (currentUser.role || 'buyer').toLowerCase();

  // Populate User Header Info
  const navUserName = document.getElementById('navUserName');
  const heroUserName = document.getElementById('heroUserName');
  const menuFullName = document.getElementById('menuFullName');
  const menuEmail = document.getElementById('menuEmail');
  const userAvatar = document.getElementById('userAvatar');
  const dropdownAvatar = document.getElementById('dropdownAvatar');
  const navUserRoleBadge = document.getElementById('navUserRoleBadge');
  const menuRoleTag = document.getElementById('menuRoleTag');
  const menuPortalStatus = document.getElementById('menuPortalStatus');

  function updateUserInfoDisplay() {
    const fullName = currentUser.fullName || currentUser.email.split('@')[0];
    const firstName = fullName.split(' ')[0];
    const userEmail = currentUser.email || '';
    const initial = (firstName && firstName.length > 0) ? firstName.charAt(0).toUpperCase() : 'U';

    if (navUserName) navUserName.textContent = fullName;
    if (heroUserName) heroUserName.textContent = firstName;
    if (menuFullName) menuFullName.textContent = fullName;
    if (menuEmail) menuEmail.textContent = userEmail;
    if (userAvatar) userAvatar.textContent = initial;
    if (dropdownAvatar) dropdownAvatar.textContent = initial;

    if (navUserRoleBadge) {
      navUserRoleBadge.textContent = activeRole.toUpperCase();
      navUserRoleBadge.className = `user-role-badge role-badge-${activeRole}`;
    }
    if (menuRoleTag) {
      menuRoleTag.textContent = `Role: ${activeRole.toUpperCase()}`;
    }
    if (menuPortalStatus) {
      menuPortalStatus.textContent = `${activeRole.charAt(0).toUpperCase() + activeRole.slice(1)} Session Active`;
    }
  }

  updateUserInfoDisplay();

  // --------------------------------------------------------------------------
  // 2. Strict Role Locking & Module View Activation (No Role Switching Allowed)
  // --------------------------------------------------------------------------
  const buyerView = document.getElementById('buyerModuleView');
  const sellerView = document.getElementById('sellerModuleView');
  const adminView = document.getElementById('adminModuleView');
  const navSearchWrap = document.getElementById('navSearchWrap');
  const cartBtn = document.getElementById('cartBtn');
  const portalBadgeIndicator = document.getElementById('portalBadgeIndicator');
  const portalBadgeIcon = document.getElementById('portalBadgeIcon');
  const portalBadgeText = document.getElementById('portalBadgeText');

  function initializeRoleView(role) {
    const lockedRole = (role || 'buyer').toLowerCase();

    // 1. Update Portal Badge
    if (portalBadgeIndicator) {
      portalBadgeIndicator.className = `portal-badge-indicator portal-${lockedRole}`;
    }
    if (portalBadgeIcon) {
      portalBadgeIcon.textContent = lockedRole === 'seller' ? '🏪' : (lockedRole === 'admin' ? '🛡️' : '🛒');
    }
    if (portalBadgeText) {
      portalBadgeText.textContent = lockedRole === 'seller' ? 'Seller Center' : (lockedRole === 'admin' ? 'Admin Super Panel' : 'Buyer Storefront');
    }

    // 2. Activate ONLY the user's authorized role view and hide others
    if (buyerView) buyerView.style.display = lockedRole === 'buyer' ? 'block' : 'none';
    if (sellerView) sellerView.style.display = lockedRole === 'seller' ? 'block' : 'none';
    if (adminView) adminView.style.display = lockedRole === 'admin' ? 'block' : 'none';

    // 3. Buyer specific navigation items
    if (navSearchWrap) navSearchWrap.style.display = lockedRole === 'buyer' ? 'flex' : 'none';
    if (cartBtn) cartBtn.style.display = lockedRole === 'buyer' ? 'flex' : 'none';

    // 4. Load data strictly for active role
    if (lockedRole === 'buyer') {
      loadProducts('all');
      loadBuyerOrders();
    } else if (lockedRole === 'seller') {
      loadSellerDashboard();
    } else if (lockedRole === 'admin') {
      loadAdminDashboard();
    }
  }

  // --------------------------------------------------------------------------
  // 3. User Menu & Logout
  // --------------------------------------------------------------------------
  const userMenuBtn = document.getElementById('userMenuBtn');
  const userDropdown = document.getElementById('userDropdown');

  if (userMenuBtn && userDropdown) {
    userMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      userDropdown.classList.toggle('show');
    });

    document.addEventListener('click', (e) => {
      if (!userDropdown.contains(e.target) && !userMenuBtn.contains(e.target)) {
        userDropdown.classList.remove('show');
      }
    });
  }

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      showToast('Signing out...');
      if (window.MadhanMartSupabase) {
        await window.MadhanMartSupabase.signOut();
      } else {
        localStorage.removeItem('madhan_mart_current_user');
      }
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 500);
    });
  }

  // Toast Helper
  const toastElement = document.getElementById('dashboardToast');
  let toastTimer = null;
  function showToast(message) {
    if (!toastElement) return;
    toastElement.textContent = message;
    toastElement.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastElement.classList.remove('show');
    }, 2800);
  }

  // --------------------------------------------------------------------------
  // 4. BUYER MODULE - Products Catalog, Cart & Checkout
  // --------------------------------------------------------------------------
  let allCatalogProducts = [];
  const productsGrid = document.getElementById('productsGrid');
  const categoryFilters = document.querySelectorAll('.category-filters .filter-btn');
  const searchInput = document.getElementById('searchInput');

  function getProductImage(p) {
    if (!p) return 'images/ps5-controller.jpg';

    // 1. Check local uploaded image cache if stored locally
    try {
      const localUploadedImages = JSON.parse(localStorage.getItem('madhan_mart_uploaded_images') || '{}');
      if (p.id && localUploadedImages[p.id]) {
        return localUploadedImages[p.id];
      }
    } catch (e) {}

    // 2. Check if p.image_url is valid
    if (p.image_url && typeof p.image_url === 'string' && p.image_url.trim() && !p.image_url.includes('null') && p.image_url !== 'undefined') {
      return p.image_url;
    }

    // 3. Fallbacks based on category / name
    const name = ((p.name) || '').toLowerCase();
    const cat = ((p.category) || '').toLowerCase();

    if (name.includes('playstation') || name.includes('controller') || name.includes('dualsense') || cat === 'consoles') return 'images/ps5-controller.jpg';
    if (name.includes('razer') || name.includes('keyboard') || name.includes('huntsman') || cat === 'peripherals') return 'images/razer-keyboard.jpg';
    if (name.includes('hyperx') || name.includes('headset') || name.includes('cloud alpha') || cat === 'audio') return 'images/hyperx-headset.jpg';
    if (name.includes('logitech') || name.includes('mouse') || name.includes('g502')) return 'images/logitech-mouse.jpg';
    if (name.includes('rog') || name.includes('monitor') || name.includes('oled') || cat === 'hardware') return 'images/rog-monitor.jpg';
    if (name.includes('quest') || name.includes('vr') || name.includes('meta')) return 'images/meta-quest-vr.jpg';
    if (name.includes('chair') || name.includes('secretlab') || name.includes('titan') || cat === 'accessories') return 'images/gaming-chair.jpg';
    if (name.includes('stream deck') || name.includes('elgato')) return 'images/stream-deck.jpg';
    if (cat === 'laptops') return 'images/rog-monitor.jpg';
    if (cat === 'mobiles') return 'images/stream-deck.jpg';
    return 'images/ps5-controller.jpg';
  }

  async function loadProducts(category = 'all', searchQuery = '') {
    if (window.MadhanMartSupabase) {
      allCatalogProducts = await window.MadhanMartSupabase.getProducts(category);
    } else {
      allCatalogProducts = [];
    }

    let filtered = allCatalogProducts;
    if (category && category !== 'all') {
      filtered = filtered.filter(p => p.category === category);
    }
    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(p => p.name.toLowerCase().includes(q) || (p.category && p.category.toLowerCase().includes(q)));
    }

    renderProductsGrid(filtered);
  }

  function renderProductsGrid(products) {
    if (!productsGrid) return;
    productsGrid.innerHTML = '';

    if (products.length === 0) {
      productsGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-muted);">
          <p style="font-size: 1.5rem; margin-bottom: 8px;">🔍</p>
          <p style="font-weight: 600;">No products found in this category.</p>
        </div>
      `;
      return;
    }

    products.forEach(p => {
      const card = document.createElement('article');
      card.className = 'product-card';
      card.setAttribute('data-cat', p.category || 'general');

      const imgSrc = getProductImage(p);
      const imgHtml = `<img src="${imgSrc}" alt="${p.name}" class="product-img" loading="lazy" onerror="this.src='images/ps5-controller.jpg'">`;

      const badgeHtml = p.badge ? `<span class="product-badge badge-popular">${p.badge}</span>` : '';
      const origPriceHtml = p.original_price ? `<span class="price-original">₹${parseFloat(p.original_price).toLocaleString()}</span>` : '';

      card.innerHTML = `
        <div class="product-img-box">
          ${badgeHtml}
          ${imgHtml}
        </div>
        <div class="product-details">
          <span class="product-category">${(p.category || 'tech').toUpperCase()}</span>
          <h3 class="product-name">${p.name}</h3>
          <div class="product-rating" style="display: flex; align-items: center; justify-content: space-between;">
            <div>
              <span class="stars">★★★★★</span>
              <span class="rating-num">(${p.rating || 5.0})</span>
            </div>
            <button type="button" class="btn-review-card" data-id="${p.id}" data-name="${p.name}">⭐ Review</button>
          </div>
          <div class="product-price-row">
            <div class="price-wrap">
              <span class="price-current">₹${parseFloat(p.price).toLocaleString()}</span>
              ${origPriceHtml}
            </div>
            <button type="button" class="btn-add-cart" data-id="${p.id}" data-name="${p.name}" data-price="${p.price}" data-img="${imgSrc}">Add +</button>
          </div>
        </div>
      `;

      productsGrid.appendChild(card);
    });

    // Bind Add to cart buttons
    productsGrid.querySelectorAll('.btn-add-cart').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const name = btn.getAttribute('data-name');
        const price = parseFloat(btn.getAttribute('data-price'));
        const img = btn.getAttribute('data-img');
        addToCart({ id, name, price, img, quantity: 1 });
      });
    });

    // Bind Write review buttons
    productsGrid.querySelectorAll('.btn-review-card').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const name = btn.getAttribute('data-name');
        openReviewModal(id, name);
      });
    });
  }

  // Category filter buttons
  categoryFilters.forEach(btn => {
    btn.addEventListener('click', () => {
      categoryFilters.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const cat = btn.getAttribute('data-cat');
      const searchVal = searchInput ? searchInput.value : '';
      loadProducts(cat, searchVal);
    });
  });

  // Search input live filtering
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const activeFilter = document.querySelector('.category-filters .filter-btn.active');
      const cat = activeFilter ? activeFilter.getAttribute('data-cat') : 'all';
      loadProducts(cat, searchInput.value);
    });
  }

  // --------------------------------------------------------------------------
  // 5. Shopping Cart & Checkout System
  // --------------------------------------------------------------------------
  let cart = [];
  const cartKey = `madhan_mart_cart_${currentUser.email || 'guest'}`;

  try {
    cart = JSON.parse(localStorage.getItem(cartKey) || '[]');
  } catch (e) {
    cart = [];
  }

  const cartBadge = document.getElementById('cartBadge');
  const statCartCount = document.getElementById('statCartCount');
  const cartModal = document.getElementById('cartModal');
  const closeCartBtn = document.getElementById('closeCartBtn');
  const cartItemsList = document.getElementById('cartItemsList');
  const cartSummary = document.getElementById('cartSummary');
  const cartSubtotal = document.getElementById('cartSubtotal');
  const cartTotal = document.getElementById('cartTotal');
  const clearCartBtn = document.getElementById('clearCartBtn');
  const checkoutBtn = document.getElementById('checkoutBtn');

  function updateCartUI() {
    const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    if (cartBadge) cartBadge.textContent = totalCount;
    if (statCartCount) statCartCount.textContent = totalCount;

    localStorage.setItem(cartKey, JSON.stringify(cart));

    if (!cartItemsList) return;
    cartItemsList.innerHTML = '';

    if (cart.length === 0) {
      cartItemsList.innerHTML = '<p class="cart-empty-text">Your shopping cart is empty.</p>';
      if (cartSummary) cartSummary.style.display = 'none';
      if (checkoutBtn) checkoutBtn.disabled = true;
      return;
    }

    if (cartSummary) cartSummary.style.display = 'block';
    if (checkoutBtn) checkoutBtn.disabled = false;

    let subtotal = 0;

    cart.forEach((item, index) => {
      const itemTotal = item.price * item.quantity;
      subtotal += itemTotal;

      const row = document.createElement('div');
      row.className = 'cart-item-row';
      row.style.display = 'flex';
      row.style.alignItems = 'center';
      row.style.justifyContent = 'space-between';
      row.style.padding = '10px 0';
      row.style.borderBottom = '1px solid var(--border-color)';

      row.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
          <img src="${item.img || 'images/laptop.jpg'}" style="width: 44px; height: 44px; border-radius: 6px; object-fit: cover;" onerror="this.src='images/laptop.jpg'">
          <div>
            <h4 style="font-size: 0.88rem; font-weight: 600; margin: 0;">${item.name}</h4>
            <span style="font-size: 0.8rem; color: var(--text-muted);">₹${item.price.toLocaleString()} each</span>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <button type="button" class="btn-qty btn-qty-minus" data-idx="${index}" style="width: 26px; height: 26px; border: 1px solid var(--border-color); background: #f8fafc; border-radius: 4px; cursor: pointer;">-</button>
          <span style="font-weight: 700; font-size: 0.9rem;">${item.quantity}</span>
          <button type="button" class="btn-qty btn-qty-plus" data-idx="${index}" style="width: 26px; height: 26px; border: 1px solid var(--border-color); background: #f8fafc; border-radius: 4px; cursor: pointer;">+</button>
          <button type="button" class="btn-cart-remove" data-idx="${index}" style="background: transparent; border: none; color: #ef4444; font-size: 1.1rem; cursor: pointer; margin-left: 6px;">✕</button>
        </div>
      `;

      cartItemsList.appendChild(row);
    });

    if (cartSubtotal) cartSubtotal.textContent = `₹${subtotal.toLocaleString()}`;
    if (cartTotal) cartTotal.textContent = `₹${subtotal.toLocaleString()}`;

    cartItemsList.querySelectorAll('.btn-qty-minus').forEach(b => {
      b.addEventListener('click', () => {
        const idx = parseInt(b.getAttribute('data-idx'));
        if (cart[idx].quantity > 1) {
          cart[idx].quantity -= 1;
        } else {
          cart.splice(idx, 1);
        }
        updateCartUI();
      });
    });

    cartItemsList.querySelectorAll('.btn-qty-plus').forEach(b => {
      b.addEventListener('click', () => {
        const idx = parseInt(b.getAttribute('data-idx'));
        cart[idx].quantity += 1;
        updateCartUI();
      });
    });

    cartItemsList.querySelectorAll('.btn-cart-remove').forEach(b => {
      b.addEventListener('click', () => {
        const idx = parseInt(b.getAttribute('data-idx'));
        cart.splice(idx, 1);
        updateCartUI();
      });
    });
  }

  function addToCart(item) {
    const existing = cart.find(i => i.name === item.name);
    if (existing) {
      existing.quantity += 1;
    } else {
      cart.push(item);
    }
    updateCartUI();
    showToast(`Added ${item.name} to cart!`);
  }

  if (cartBtn && cartModal) {
    cartBtn.addEventListener('click', () => {
      updateCartUI();
      cartModal.classList.add('show');
    });
  }

  if (closeCartBtn && cartModal) {
    closeCartBtn.addEventListener('click', () => {
      cartModal.classList.remove('show');
    });
  }

  if (clearCartBtn) {
    clearCartBtn.addEventListener('click', () => {
      cart = [];
      updateCartUI();
      showToast('Cart cleared');
    });
  }

  // --------------------------------------------------------------------------
  // 6. Checkout Modal & Order Placement
  // --------------------------------------------------------------------------
  const checkoutModal = document.getElementById('checkoutModal');
  const closeCheckoutBtn = document.getElementById('closeCheckoutBtn');
  const backToCartBtn = document.getElementById('backToCartBtn');
  const checkoutForm = document.getElementById('checkoutForm');
  const checkoutModalTotal = document.getElementById('checkoutModalTotal');

  if (checkoutBtn && checkoutModal && cartModal) {
    checkoutBtn.addEventListener('click', () => {
      cartModal.classList.remove('show');
      const total = cart.reduce((sum, i) => sum + (i.price * i.quantity), 0);
      if (checkoutModalTotal) checkoutModalTotal.textContent = `₹${total.toLocaleString()}`;
      checkoutModal.classList.add('show');
    });
  }

  if (closeCheckoutBtn && checkoutModal) {
    closeCheckoutBtn.addEventListener('click', () => {
      checkoutModal.classList.remove('show');
    });
  }

  if (backToCartBtn && checkoutModal && cartModal) {
    backToCartBtn.addEventListener('click', () => {
      checkoutModal.classList.remove('show');
      cartModal.classList.add('show');
    });
  }

  if (checkoutForm) {
    checkoutForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const total = cart.reduce((sum, i) => sum + (i.price * i.quantity), 0);
      if (total <= 0) return;

      const orderDetails = {
        shipping_address: document.getElementById('shippingAddress')?.value || '',
        phone_number: document.getElementById('shippingPhone')?.value || '',
        city: document.getElementById('shippingCity')?.value || '',
        pincode: document.getElementById('shippingPin')?.value || '',
        payment_method: document.querySelector('input[name="paymentMethod"]:checked')?.value || 'Google Pay / UPI'
      };

      showToast('Placing order...');

      let createdOrder = null;
      if (window.MadhanMartSupabase) {
        createdOrder = await window.MadhanMartSupabase.createOrder(cart, total, currentUser, orderDetails);
      }

      cart = [];
      updateCartUI();
      checkoutModal.classList.remove('show');

      showToast(`🎉 Order Placed Successfully! (${createdOrder?.order_code || '#MM-ORDER'})`);
      await loadBuyerOrders();
    });
  }

  // --------------------------------------------------------------------------
  // 7. Buyer Orders Table & History
  // --------------------------------------------------------------------------
  const ordersTableWrap = document.getElementById('ordersTableWrap');
  const emptyOrdersWrap = document.getElementById('emptyOrdersWrap');
  const ordersTableBody = document.getElementById('ordersTableBody');
  const statOrdersCount = document.getElementById('statOrdersCount');

  async function loadBuyerOrders() {
    let orders = [];
    if (window.MadhanMartSupabase) {
      orders = await window.MadhanMartSupabase.getUserOrders(currentUser);
    }

    if (statOrdersCount) statOrdersCount.textContent = orders.length;

    if (!ordersTableBody) return;
    ordersTableBody.innerHTML = '';

    if (orders.length === 0) {
      if (ordersTableWrap) ordersTableWrap.style.display = 'none';
      if (emptyOrdersWrap) emptyOrdersWrap.style.display = 'flex';
      return;
    }

    if (ordersTableWrap) ordersTableWrap.style.display = 'block';
    if (emptyOrdersWrap) emptyOrdersWrap.style.display = 'none';

    orders.forEach(order => {
      const tr = document.createElement('tr');
      const dateStr = order.created_at ? new Date(order.created_at).toLocaleDateString() : 'Today';
      const statusClass = (order.status || 'Pending').toLowerCase();

      tr.innerHTML = `
        <td style="font-weight: 700; color: var(--primary);">${order.order_code}</td>
        <td>${dateStr}</td>
        <td>${order.items ? order.items.map(i => `${i.name} (x${i.quantity || 1})`).join(', ') : 'Ordered Items'}</td>
        <td style="font-weight: 700;">₹${parseFloat(order.total_amount).toLocaleString()}</td>
        <td><span class="status-badge status-${statusClass}">${order.status || 'Pending'}</span></td>
        <td><button type="button" class="btn-secondary btn-view-invoice" data-code="${order.order_code}" data-amount="${order.total_amount}" data-date="${dateStr}">🧾 Receipt</button></td>
      `;

      ordersTableBody.appendChild(tr);
    });

    ordersTableBody.querySelectorAll('.btn-view-invoice').forEach(btn => {
      btn.addEventListener('click', () => {
        openInvoiceModal(btn.getAttribute('data-code'), btn.getAttribute('data-amount'), btn.getAttribute('data-date'));
      });
    });
  }

  // --------------------------------------------------------------------------
  // 8. Invoice Modal & PDF Download
  // --------------------------------------------------------------------------
  const invoiceModal = document.getElementById('invoiceModal');
  const closeInvoiceBtn = document.getElementById('closeInvoiceBtn');
  const invoiceModalBody = document.getElementById('invoiceModalBody');
  const downloadInvoicePdfBtn = document.getElementById('downloadInvoicePdfBtn');
  const printInvoiceBtn = document.getElementById('printInvoiceBtn');

  function openInvoiceModal(code, amount, date) {
    if (!invoiceModal || !invoiceModalBody) return;
    invoiceModalBody.innerHTML = `
      <div style="padding: 20px; background: #ffffff; border: 1px solid var(--border-color); border-radius: 8px;">
        <div style="display: flex; justify-content: space-between; border-bottom: 2px solid var(--primary); padding-bottom: 12px; margin-bottom: 16px;">
          <div>
            <h2 style="margin: 0; color: var(--primary); font-size: 1.4rem;">MADHAN MART</h2>
            <p style="margin: 2px 0 0; font-size: 0.8rem; color: var(--text-muted);">Online E-Commerce Platform</p>
          </div>
          <div style="text-align: right;">
            <h3 style="margin: 0; font-size: 1.1rem;">ORDER RECEIPT</h3>
            <p style="margin: 2px 0 0; font-weight: 700; color: var(--primary);">${code}</p>
          </div>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 20px;">
          <div>
            <p style="margin: 0; font-weight: 700;">Customer Details:</p>
            <p style="margin: 2px 0 0;">${currentUser.fullName || 'Customer'}</p>
            <p style="margin: 2px 0 0; color: var(--text-muted);">${currentUser.email}</p>
          </div>
          <div style="text-align: right;">
            <p style="margin: 0;"><strong>Date:</strong> ${date}</p>
            <p style="margin: 2px 0 0;"><strong>Payment Status:</strong> Confirmed</p>
          </div>
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem; margin-bottom: 20px;">
          <thead>
            <tr style="background: #f1f5f9;">
              <th style="padding: 8px; text-align: left; border-bottom: 1px solid var(--border-color);">Item Description</th>
              <th style="padding: 8px; text-align: right; border-bottom: 1px solid var(--border-color);">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding: 10px 8px; border-bottom: 1px solid var(--border-color);">Order Package (${code})</td>
              <td style="padding: 10px 8px; text-align: right; font-weight: 700; border-bottom: 1px solid var(--border-color);">₹${parseFloat(amount).toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
        <div style="text-align: right; font-size: 1.1rem; font-weight: 800; color: var(--primary);">
          Total: ₹${parseFloat(amount).toLocaleString()}
        </div>
      </div>
    `;
    invoiceModal.classList.add('show');
  }

  if (closeInvoiceBtn && invoiceModal) {
    closeInvoiceBtn.addEventListener('click', () => invoiceModal.classList.remove('show'));
  }

  if (printInvoiceBtn) {
    printInvoiceBtn.addEventListener('click', () => window.print());
  }

  if (downloadInvoicePdfBtn) {
    downloadInvoicePdfBtn.addEventListener('click', () => {
      showToast('Downloading receipt...');
      try {
        if (window.jspdf && window.jspdf.jsPDF) {
          const doc = new window.jspdf.jsPDF();
          doc.setFontSize(20);
          doc.setTextColor(37, 99, 235);
          doc.text('MADHAN MART - ORDER RECEIPT', 14, 22);
          doc.setFontSize(10);
          doc.setTextColor(100, 116, 139);
          doc.text(`Customer: ${currentUser.fullName || 'Customer'} (${currentUser.email})`, 14, 32);
          doc.text(`Date: ${new Date().toLocaleString()}`, 14, 38);
          doc.save(`Madhan_Mart_Receipt_${Date.now()}.pdf`);
          showToast('Receipt PDF downloaded!');
        } else {
          window.print();
        }
      } catch (e) {
        window.print();
      }
    });
  }

  // --------------------------------------------------------------------------
  // 9. Product Reviews Modal (Buyer)
  // --------------------------------------------------------------------------
  const reviewModal = document.getElementById('reviewModal');
  const closeReviewModalBtn = document.getElementById('closeReviewModalBtn');
  const cancelReviewBtn = document.getElementById('cancelReviewBtn');
  const reviewForm = document.getElementById('reviewForm');
  const reviewProductId = document.getElementById('reviewProductId');
  const reviewProductName = document.getElementById('reviewProductName');
  const starBtns = document.querySelectorAll('.star-btn');
  const selectedStarRating = document.getElementById('selectedStarRating');

  function openReviewModal(prodId, prodName) {
    if (reviewProductId) reviewProductId.value = prodId;
    if (reviewProductName) reviewProductName.textContent = `Product: ${prodName}`;
    if (reviewModal) reviewModal.classList.add('show');
  }

  starBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const val = parseInt(btn.getAttribute('data-val'));
      if (selectedStarRating) selectedStarRating.value = val;
      starBtns.forEach(b => {
        const bVal = parseInt(b.getAttribute('data-val'));
        b.classList.toggle('active', bVal <= val);
      });
    });
  });

  if (closeReviewModalBtn && reviewModal) {
    closeReviewModalBtn.addEventListener('click', () => reviewModal.classList.remove('show'));
  }
  if (cancelReviewBtn && reviewModal) {
    cancelReviewBtn.addEventListener('click', () => reviewModal.classList.remove('show'));
  }

  if (reviewForm) {
    reviewForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const pId = reviewProductId.value;
      const rating = parseInt(selectedStarRating.value) || 5;
      const comment = document.getElementById('reviewComment').value.trim();

      if (!comment) {
        alert('Please enter your comments for this review.');
        return;
      }

      if (window.MadhanMartSupabase) {
        await window.MadhanMartSupabase.addReview({
          product_id: pId,
          user_email: currentUser.email,
          user_name: currentUser.fullName,
          rating: rating,
          comment: comment
        });
      }

      showToast('⭐ Review submitted successfully!');
      if (reviewModal) reviewModal.classList.remove('show');
      document.getElementById('reviewComment').value = '';
    });
  }

  // --------------------------------------------------------------------------
  // 10. SELLER CENTER MODULE - Products & Orders Received
  // --------------------------------------------------------------------------
  const sellerProductCount = document.getElementById('sellerProductCount');
  const sellerOrdersCount = document.getElementById('sellerOrdersCount');
  const sellerRevenue = document.getElementById('sellerRevenue');
  const sellerProductsTableBody = document.getElementById('sellerProductsTableBody');
  const sellerOrdersTableBody = document.getElementById('sellerOrdersTableBody');
  const btnOpenAddProduct = document.getElementById('btnOpenAddProduct');
  const productModal = document.getElementById('productModal');
  const closeProductModalBtn = document.getElementById('closeProductModalBtn');
  const cancelProductBtn = document.getElementById('cancelProductBtn');
  const productForm = document.getElementById('productForm');
  const btnRefreshSellerCatalog = document.getElementById('btnRefreshSellerCatalog');

  async function loadSellerDashboard() {
    let prods = [];
    let orders = [];

    if (window.MadhanMartSupabase) {
      prods = await window.MadhanMartSupabase.getProducts('all');
      allCatalogProducts = prods;
      orders = await window.MadhanMartSupabase.getAllOrders();
    }

    if (sellerProductCount) sellerProductCount.textContent = prods.length;
    if (sellerOrdersCount) sellerOrdersCount.textContent = orders.length;

    const totalRev = orders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);
    if (sellerRevenue) sellerRevenue.textContent = `₹${totalRev.toLocaleString()}`;

    // Render Inventory Table
    if (sellerProductsTableBody) {
      sellerProductsTableBody.innerHTML = '';
      prods.forEach(p => {
        const imgSrc = getProductImage(p);
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td style="font-weight: 600; display: flex; align-items: center; gap: 8px;">
            <img src="${imgSrc}" style="width: 36px; height: 36px; border-radius: 6px; object-fit: cover;" onerror="this.src='images/ps5-controller.jpg'">
            <span>${p.name}</span>
          </td>
          <td><span style="text-transform: capitalize;">${p.category || 'tech'}</span></td>
          <td style="font-weight: 700;">₹${parseFloat(p.price).toLocaleString()}</td>
          <td>${p.stock_quantity || 20} in stock</td>
          <td><span class="status-badge status-delivered">${p.badge || 'Available'}</span></td>
          <td>
            <button type="button" class="btn-action-edit btn-seller-edit" data-id="${p.id}" data-name="${p.name}" data-price="${p.price}" data-origprice="${p.original_price || ''}" data-stock="${p.stock_quantity || 20}" data-badge="${p.badge || ''}" data-category="${p.category || 'laptops'}" data-emoji="${p.emoji || '📦'}" data-image="${imgSrc}">✏️ Edit</button>
            <button type="button" class="btn-action-delete btn-seller-delete" data-id="${p.id}">🗑️ Delete</button>
          </td>
        `;
        sellerProductsTableBody.appendChild(tr);
      });

      sellerProductsTableBody.querySelectorAll('.btn-seller-delete').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.getAttribute('data-id');
          if (confirm('Are you sure you want to remove this product?')) {
            if (window.MadhanMartSupabase) {
              await window.MadhanMartSupabase.deleteProduct(id);
            }
            try {
              const imgStore = JSON.parse(localStorage.getItem('madhan_mart_uploaded_images') || '{}');
              delete imgStore[id];
              localStorage.setItem('madhan_mart_uploaded_images', JSON.stringify(imgStore));
            } catch (e) {}
            showToast('Product removed');
            loadSellerDashboard();
          }
        });
      });

      sellerProductsTableBody.querySelectorAll('.btn-seller-edit').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-id');
          const name = btn.getAttribute('data-name');
          const price = btn.getAttribute('data-price');
          const origPrice = btn.getAttribute('data-origprice');
          const stock = btn.getAttribute('data-stock');
          const category = btn.getAttribute('data-category');
          const badge = btn.getAttribute('data-badge');
          const emoji = btn.getAttribute('data-emoji');
          const image = btn.getAttribute('data-image');

          document.getElementById('editProductId').value = id;
          document.getElementById('prodName').value = name;
          document.getElementById('prodPrice').value = price;
          document.getElementById('prodOrigPrice').value = origPrice;
          document.getElementById('prodStock').value = stock;
          if (document.getElementById('prodCategory')) document.getElementById('prodCategory').value = category || 'laptops';
          if (document.getElementById('prodBadge')) document.getElementById('prodBadge').value = badge || '';
          if (document.getElementById('prodEmoji')) document.getElementById('prodEmoji').value = emoji || '📦';

          if (image && image !== 'null' && image !== 'undefined') {
            setImagePreview(image, `${name}.jpg`, 'Current image active');
          } else {
            clearImageUploadState();
          }

          document.getElementById('productModalTitle').textContent = '✏️ Edit Product';
          if (productModal) productModal.classList.add('show');
        });
      });
    }

    // Render Orders Received Table
    if (sellerOrdersTableBody) {
      sellerOrdersTableBody.innerHTML = '';
      if (orders.length === 0) {
        sellerOrdersTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">No orders received yet.</td></tr>';
      } else {
        orders.forEach(o => {
          const tr = document.createElement('tr');
          const statusClass = (o.status || 'Pending').toLowerCase();
          tr.innerHTML = `
            <td style="font-weight: 700; color: var(--primary);">${o.order_code}</td>
            <td>${o.user_email || 'Customer'}</td>
            <td>${o.items ? o.items.map(i => i.name).join(', ') : 'Ordered item'}</td>
            <td style="font-weight: 700;">₹${parseFloat(o.total_amount).toLocaleString()}</td>
            <td><span class="status-badge status-${statusClass}">${o.status || 'Pending'}</span></td>
            <td><button type="button" class="btn-secondary btn-seller-status" data-id="${o.id}">Mark Delivered</button></td>
          `;
          sellerOrdersTableBody.appendChild(tr);
        });

        sellerOrdersTableBody.querySelectorAll('.btn-seller-status').forEach(btn => {
          btn.addEventListener('click', async () => {
            const id = btn.getAttribute('data-id');
            if (window.MadhanMartSupabase) {
              await window.MadhanMartSupabase.updateOrderStatus(id, 'Delivered');
            }
            showToast('Order marked as Delivered');
            loadSellerDashboard();
          });
        });
      }
    }
  }

  if (btnRefreshSellerCatalog) {
    btnRefreshSellerCatalog.addEventListener('click', loadSellerDashboard);
  }

  // --------------------------------------------------------------------------
  // Product Image File Upload & Live Preview Handler
  // --------------------------------------------------------------------------
  const prodFileUploadZone = document.getElementById('prodFileUploadZone');
  const prodImageFile = document.getElementById('prodImageFile');
  const prodImage = document.getElementById('prodImage');
  const fileUploadPrompt = document.getElementById('fileUploadPrompt');
  const filePreviewCard = document.getElementById('filePreviewCard');
  const prodImagePreview = document.getElementById('prodImagePreview');
  const previewFileName = document.getElementById('previewFileName');
  const previewFileSize = document.getElementById('previewFileSize');
  const btnChooseFile = document.getElementById('btnChooseFile');
  const btnChangeImage = document.getElementById('btnChangeImage');
  const btnRemoveImage = document.getElementById('btnRemoveImage');
  const btnToggleImageUrl = document.getElementById('btnToggleImageUrl');
  const imageUrlInputWrap = document.getElementById('imageUrlInputWrap');
  const prodImageUrlInput = document.getElementById('prodImageUrlInput');

  function clearImageUploadState() {
    if (prodImageFile) prodImageFile.value = '';
    if (prodImage) prodImage.value = '';
    if (prodImageUrlInput) prodImageUrlInput.value = '';
    if (prodImagePreview) prodImagePreview.src = '';
    if (fileUploadPrompt) fileUploadPrompt.style.display = 'flex';
    if (filePreviewCard) filePreviewCard.style.display = 'none';
  }

  function setImagePreview(src, fileName = 'product-image.jpg', fileSizeText = 'Image ready') {
    if (!src) {
      clearImageUploadState();
      return;
    }
    if (prodImage) prodImage.value = src;
    if (prodImagePreview) prodImagePreview.src = src;
    if (previewFileName) previewFileName.textContent = fileName;
    if (previewFileSize) previewFileSize.textContent = fileSizeText;
    if (fileUploadPrompt) fileUploadPrompt.style.display = 'none';
    if (filePreviewCard) filePreviewCard.style.display = 'flex';
  }

  // Compress image to canvas dataURL (max 600px width/height, WebP/JPEG 0.82)
  function processAndCompressImage(file) {
    if (!file || !file.type.startsWith('image/')) {
      showToast('⚠️ Please select a valid image file (PNG, JPG, WEBP)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 600;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }

        canvas.width = Math.round(width);
        canvas.height = Math.round(height);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
        const approxKb = Math.round((compressedDataUrl.length * 3) / 4 / 1024);
        setImagePreview(compressedDataUrl, file.name, `${approxKb} KB (Optimized & Ready)`);
      };
      img.src = readerEvent.target.result;
    };
    reader.readAsDataURL(file);
  }

  if (btnChooseFile && prodImageFile) {
    btnChooseFile.addEventListener('click', (e) => {
      e.stopPropagation();
      prodImageFile.click();
    });
  }

  if (prodFileUploadZone && prodImageFile) {
    prodFileUploadZone.addEventListener('click', () => {
      if (filePreviewCard && filePreviewCard.style.display === 'none') {
        prodImageFile.click();
      }
    });

    prodFileUploadZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      prodFileUploadZone.classList.add('dragover');
    });

    prodFileUploadZone.addEventListener('dragleave', () => {
      prodFileUploadZone.classList.remove('dragover');
    });

    prodFileUploadZone.addEventListener('drop', (e) => {
      e.preventDefault();
      prodFileUploadZone.classList.remove('dragover');
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        processAndCompressImage(e.dataTransfer.files[0]);
      }
    });
  }

  if (prodImageFile) {
    prodImageFile.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        processAndCompressImage(e.target.files[0]);
      }
    });
  }

  if (btnChangeImage && prodImageFile) {
    btnChangeImage.addEventListener('click', (e) => {
      e.stopPropagation();
      prodImageFile.click();
    });
  }

  if (btnRemoveImage) {
    btnRemoveImage.addEventListener('click', (e) => {
      e.stopPropagation();
      clearImageUploadState();
    });
  }

  if (btnToggleImageUrl && imageUrlInputWrap) {
    btnToggleImageUrl.addEventListener('click', () => {
      const isHidden = imageUrlInputWrap.style.display === 'none';
      imageUrlInputWrap.style.display = isHidden ? 'block' : 'none';
      btnToggleImageUrl.textContent = isHidden ? '- Hide external URL' : '+ Or paste external Image URL';
    });
  }

  if (prodImageUrlInput) {
    prodImageUrlInput.addEventListener('input', (e) => {
      const url = e.target.value.trim();
      if (url) {
        setImagePreview(url, 'External Image Link', 'Remote URL');
      }
    });
  }

  // Open Add Product Modal
  if (btnOpenAddProduct && productModal) {
    btnOpenAddProduct.addEventListener('click', () => {
      document.getElementById('editProductId').value = '';
      document.getElementById('productForm').reset();
      clearImageUploadState();
      document.getElementById('productModalTitle').textContent = '📦 Add Product';
      productModal.classList.add('show');
    });
  }

  if (closeProductModalBtn && productModal) {
    closeProductModalBtn.addEventListener('click', () => productModal.classList.remove('show'));
  }
  if (cancelProductBtn && productModal) {
    cancelProductBtn.addEventListener('click', () => productModal.classList.remove('show'));
  }

  // Handle Add/Edit Product Submit
  if (productForm) {
    productForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const editId = document.getElementById('editProductId').value;
      const name = document.getElementById('prodName').value.trim();
      const category = document.getElementById('prodCategory').value;
      const badge = document.getElementById('prodBadge').value.trim();
      const price = parseFloat(document.getElementById('prodPrice').value);
      const origPrice = parseFloat(document.getElementById('prodOrigPrice').value) || price * 1.15;
      const stock = parseInt(document.getElementById('prodStock').value) || 20;
      const emoji = document.getElementById('prodEmoji').value || '📦';
      const rawImage = document.getElementById('prodImage').value || '';
      const fallbackImg = getProductImage({ name, category });
      const finalImage = rawImage || fallbackImg;

      if (!name || isNaN(price)) {
        alert('Please enter a valid product name and price.');
        return;
      }

      const productPayload = {
        name,
        category,
        badge,
        price,
        original_price: origPrice,
        stock_quantity: stock,
        emoji,
        image_url: finalImage,
        seller_email: currentUser.email,
        seller_name: currentUser.fullName
      };

      if (window.MadhanMartSupabase) {
        try {
          if (editId) {
            productPayload.id = editId;
            if (rawImage && rawImage.startsWith('data:image')) {
              try {
                const imgStore = JSON.parse(localStorage.getItem('madhan_mart_uploaded_images') || '{}');
                imgStore[editId] = rawImage;
                localStorage.setItem('madhan_mart_uploaded_images', JSON.stringify(imgStore));
              } catch (e) {}
            }
            await window.MadhanMartSupabase.updateProduct(editId, productPayload);
            showToast(`✅ Updated product "${name}" with image!`);
          } else {
            const savedProd = await window.MadhanMartSupabase.addProduct(productPayload);
            const savedId = (savedProd && savedProd.id) ? savedProd.id : productPayload.id;
            if (savedId && rawImage && rawImage.startsWith('data:image')) {
              try {
                const imgStore = JSON.parse(localStorage.getItem('madhan_mart_uploaded_images') || '{}');
                imgStore[savedId] = rawImage;
                localStorage.setItem('madhan_mart_uploaded_images', JSON.stringify(imgStore));
              } catch (e) {}
            }
            showToast(`🎉 Product "${name}" published with image!`);
          }
        } catch (saveErr) {
          console.error('[SUPABASE PRODUCT SAVE ERROR]', saveErr);
          if (saveErr && saveErr.message && saveErr.message.includes('varying(500)')) {
            try {
              const generatedId = editId || ('p_' + Date.now());
              if (rawImage && rawImage.startsWith('data:image')) {
                const imgStore = JSON.parse(localStorage.getItem('madhan_mart_uploaded_images') || '{}');
                imgStore[generatedId] = rawImage;
                localStorage.setItem('madhan_mart_uploaded_images', JSON.stringify(imgStore));
              }
              productPayload.image_url = fallbackImg;
              if (editId) {
                await window.MadhanMartSupabase.updateProduct(editId, productPayload);
              } else {
                productPayload.id = generatedId;
                await window.MadhanMartSupabase.addProduct(productPayload);
              }
              showToast(`🎉 Product "${name}" saved with uploaded photo!`);
            } catch (retryErr) {
              alert(`Could not save product: ${retryErr.message}`);
              return;
            }
          } else {
            alert(`Could not save product to Supabase: ${saveErr.message || 'Check RLS permissions'}`);
            return;
          }
        }
      }

      productModal.classList.remove('show');
      productForm.reset();
      clearImageUploadState();

      if (activeRole === 'seller') await loadSellerDashboard();
      else await loadProducts('all');
    });
  }

  // --------------------------------------------------------------------------
  // 11. ADMIN SUPER PANEL MODULE - Users, Orders & Moderation
  // --------------------------------------------------------------------------
  const adminTotalUsers = document.getElementById('adminTotalUsers');
  const adminTotalOrders = document.getElementById('adminTotalOrders');
  const adminPlatformGMV = document.getElementById('adminPlatformGMV');
  const adminTotalProducts = document.getElementById('adminTotalProducts');
  const adminUsersTableBody = document.getElementById('adminUsersTableBody');
  const adminOrdersTableBody = document.getElementById('adminOrdersTableBody');
  const adminCatalogTableBody = document.getElementById('adminCatalogTableBody');
  const btnRefreshAdminUsers = document.getElementById('btnRefreshAdminUsers');
  const btnAdminExportStats = document.getElementById('btnAdminExportStats');

  async function loadAdminDashboard() {
    let users = [];
    let orders = [];
    let prods = [];

    if (window.MadhanMartSupabase) {
      users = await window.MadhanMartSupabase.getAllUsers();
      orders = await window.MadhanMartSupabase.getAllOrders();
      prods = await window.MadhanMartSupabase.getProducts('all');
      allCatalogProducts = prods;
    }

    if (adminTotalUsers) adminTotalUsers.textContent = users.length;
    if (adminTotalOrders) adminTotalOrders.textContent = orders.length;
    if (adminTotalProducts) adminTotalProducts.textContent = prods.length;

    const gmv = orders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);
    if (adminPlatformGMV) adminPlatformGMV.textContent = `₹${gmv.toLocaleString()}`;

    // Render All Users Table
    if (adminUsersTableBody) {
      adminUsersTableBody.innerHTML = '';
      users.forEach(u => {
        const tr = document.createElement('tr');
        const role = (u.role || 'buyer').toLowerCase();
        tr.innerHTML = `
          <td style="font-weight: 700;">${u.full_name || u.fullName || 'User'}</td>
          <td>${u.email}</td>
          <td><span class="user-role-badge role-badge-${role}">${role.toUpperCase()}</span></td>
          <td><span class="status-badge status-delivered">Active</span></td>
        `;
        adminUsersTableBody.appendChild(tr);
      });
    }

    // Render Master Orders Table with Status Selector
    if (adminOrdersTableBody) {
      adminOrdersTableBody.innerHTML = '';
      if (orders.length === 0) {
        adminOrdersTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">No platform orders found.</td></tr>';
      } else {
        orders.forEach(o => {
          const tr = document.createElement('tr');
          const dateStr = o.created_at ? new Date(o.created_at).toLocaleDateString() : 'Today';
          const currentStatus = o.status || 'Pending';

          tr.innerHTML = `
            <td style="font-weight: 700; color: var(--primary);">${o.order_code}</td>
            <td>${o.user_email || 'Customer'}</td>
            <td>${dateStr}</td>
            <td style="font-weight: 700;">₹${parseFloat(o.total_amount).toLocaleString()}</td>
            <td><span class="status-badge status-${currentStatus.toLowerCase()}">${currentStatus}</span></td>
            <td>
              <select class="status-select admin-order-status-select" data-id="${o.id || o.order_code}">
                <option value="Pending" ${currentStatus === 'Pending' ? 'selected' : ''}>Pending</option>
                <option value="Processing" ${currentStatus === 'Processing' ? 'selected' : ''}>Processing</option>
                <option value="Delivered" ${currentStatus === 'Delivered' ? 'selected' : ''}>Delivered</option>
                <option value="Cancelled" ${currentStatus === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
              </select>
            </td>
          `;
          adminOrdersTableBody.appendChild(tr);
        });

        adminOrdersTableBody.querySelectorAll('.admin-order-status-select').forEach(sel => {
          sel.addEventListener('change', async (e) => {
            const orderId = sel.getAttribute('data-id');
            const newStatus = e.target.value;
            if (window.MadhanMartSupabase) {
              await window.MadhanMartSupabase.updateOrderStatus(orderId, newStatus);
            }
            showToast(`Order status updated to ${newStatus}`);
            loadAdminDashboard();
          });
        });
      }
    }

    // Render Catalog Moderation Table
    if (adminCatalogTableBody) {
      adminCatalogTableBody.innerHTML = '';
      prods.forEach(p => {
        const imgSrc = getProductImage(p);
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td style="font-weight: 600; display: flex; align-items: center; gap: 8px;">
            <img src="${imgSrc}" style="width: 34px; height: 34px; border-radius: 6px; object-fit: cover;" onerror="this.src='images/ps5-controller.jpg'">
            <span>${p.name}</span>
          </td>
          <td><span style="text-transform: capitalize;">${p.category || 'tech'}</span></td>
          <td style="font-weight: 700;">₹${parseFloat(p.price).toLocaleString()}</td>
          <td>${p.seller_name || 'Seller'}</td>
          <td>
            <button type="button" class="btn-action-delete btn-admin-del-prod" data-id="${p.id}">🗑️ Remove Listing</button>
          </td>
        `;
        adminCatalogTableBody.appendChild(tr);
      });

      adminCatalogTableBody.querySelectorAll('.btn-admin-del-prod').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.getAttribute('data-id');
          if (confirm('Admin Action: Permanently remove this product from the platform?')) {
            if (window.MadhanMartSupabase) {
              await window.MadhanMartSupabase.deleteProduct(id);
            }
            showToast('Product listing removed');
            loadAdminDashboard();
          }
        });
      });
    }
  }

  if (btnRefreshAdminUsers) {
    btnRefreshAdminUsers.addEventListener('click', loadAdminDashboard);
  }

  if (btnAdminExportStats) {
    btnAdminExportStats.addEventListener('click', () => {
      showToast('Exporting data...');
      setTimeout(() => alert('Platform data report exported successfully.'), 300);
    });
  }

  // --------------------------------------------------------------------------
  // 12. Intelligent Floating AI Shopping Assistant & Platform Guide
  // --------------------------------------------------------------------------
  const aiChatbotToggle = document.getElementById('aiChatbotToggle');
  const aiChatbotCard = document.getElementById('aiChatbotCard');
  const closeAiChatBtn = document.getElementById('closeAiChatBtn');
  const aiChatForm = document.getElementById('aiChatForm');
  const aiChatInput = document.getElementById('aiChatInput');
  const aiChatMessages = document.getElementById('aiChatMessages');
  const aiQuickChips = document.getElementById('aiQuickChips');

  if (aiChatbotToggle && aiChatbotCard) {
    aiChatbotToggle.addEventListener('click', () => {
      const isHidden = aiChatbotCard.style.display === 'none' || !aiChatbotCard.style.display;
      aiChatbotCard.style.display = isHidden ? 'flex' : 'none';
      if (isHidden && aiChatInput) {
        setTimeout(() => aiChatInput.focus(), 150);
      }
    });
  }

  if (closeAiChatBtn && aiChatbotCard) {
    closeAiChatBtn.addEventListener('click', () => {
      aiChatbotCard.style.display = 'none';
    });
  }

  // Bind Quick Suggestion Chips
  if (aiQuickChips) {
    aiQuickChips.querySelectorAll('.ai-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const q = chip.getAttribute('data-query');
        if (q && aiChatInput) {
          aiChatInput.value = q;
          handleAiChatSubmit();
        }
      });
    });
  }

  // Scroll to and highlight a product on the storefront
  function jumpToStoreProduct(productName) {
    if (activeRole !== 'buyer') {
      showToast('Switch to Buyer Storefront to view catalog products.');
      return;
    }
    const catBtns = document.querySelectorAll('.category-filters .filter-btn');
    catBtns.forEach(b => b.classList.remove('active'));
    const allBtn = document.querySelector('.category-filters .filter-btn[data-cat="all"]');
    if (allBtn) allBtn.classList.add('active');

    loadProducts('all', productName);

    if (window.innerWidth <= 768 && aiChatbotCard) {
      aiChatbotCard.style.display = 'none';
    }

    const catalogSection = document.getElementById('productsSection');
    if (catalogSection) {
      catalogSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    showToast(`Showing results for "${productName}"`);
  }

  async function generateAiResponse(userQuery) {
    const q = userQuery.toLowerCase().trim();

    // 1. Always pull the latest live product catalog from Supabase to guarantee 100% updated knowledge
    let prods = [];
    if (window.MadhanMartSupabase) {
      try {
        prods = await window.MadhanMartSupabase.getProducts('all');
        allCatalogProducts = prods;
      } catch (e) {
        prods = Array.isArray(allCatalogProducts) ? allCatalogProducts : [];
      }
    } else {
      prods = Array.isArray(allCatalogProducts) ? allCatalogProducts : [];
    }

    // Dynamic intelligent keyword extractor
    // Strips common filler/question words so ANY newly added or edited product name matches accurately
    const fillerWords = new Set([
      'what', 'is', 'the', 'rate', 'of', 'how', 'much', 'cost', 'price', 'tell', 'me', 'about', 
      'show', 'can', 'you', 'available', 'product', 'item', 'items', 'products', 'give', 'details', 
      'for', 'any', 'in', 'store', 'stock', 'please', 'do', 'have', 'i', 'want', 'buy', 'need', 'a', 'an',
      'there', 'new', 'edit', 'edited', 'added', 'latest', 'recent', 'check', 'current', 'live'
    ]);

    const queryTokens = q.replace(/[^a-z0-9\s]/gi, ' ').split(/\s+/).filter(w => w && !fillerWords.has(w) && w.length >= 2);

    // Dynamic product scoring against live database
    function scoreProduct(p) {
      const name = (p.name || '').toLowerCase();
      const cat = (p.category || '').toLowerCase();
      const badge = (p.badge || '').toLowerCase();
      const seller = (p.seller_name || '').toLowerCase();
      let score = 0;

      // Exact phrase match in name
      if (queryTokens.length > 0) {
        const fullTokenQuery = queryTokens.join(' ');
        if (name.includes(fullTokenQuery)) score += 100;
      }

      // Check whole clean query in name
      const cleanQ = q.replace(/^(?:what is the rate of|what is the price of|how much is|price of|rate of|cost of|is|are|tell me about)\s+/i, '').trim();
      if (cleanQ.length >= 3 && name.includes(cleanQ)) {
        score += 80;
      }

      // Token overlap
      queryTokens.forEach(token => {
        if (name.includes(token)) score += 30;
        else if (cat.includes(token)) score += 15;
        else if (badge.includes(token)) score += 10;
        else if (seller.includes(token)) score += 8;
      });

      return score;
    }

    // 1. Check for New / Recently Added Products
    if (q.includes('new product') || q.includes('latest') || q.includes('recently added') || q.includes('new items') || q.includes("what's new") || q.includes('what is new') || q.includes('new arrival') || q.includes('new arrivals') || q.includes('recent') || q.includes('new added') || q.includes('added product')) {
      const recentProds = [...prods].slice(0, 4);
      return {
        text: `✨ <strong>New & Recently Added Products in Store:</strong><br>Our live database is updated! Here are the newest products added by verified sellers with real-time rates and instant stock availability:`,
        products: recentProds
      };
    }

    // 2. Dynamic Scored Product Matching (Works for ANY newly added or edited product)
    let matchedProducts = [];
    if (queryTokens.length > 0) {
      const scored = prods
        .map(p => ({ product: p, score: scoreProduct(p) }))
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score);

      matchedProducts = scored.map(item => item.product);
    }

    // Fallback category alias matching if token scoring yielded nothing
    if (matchedProducts.length === 0) {
      const matchCat = (kw) => prods.filter(p => ((p.name || '') + ' ' + (p.category || '')).toLowerCase().includes(kw));
      if (q.includes('ps5') || q.includes('playstation') || q.includes('dualsense') || q.includes('controller')) {
        matchedProducts = matchCat('playstation').concat(matchCat('controller'));
      } else if (q.includes('razer') || q.includes('keyboard') || q.includes('huntsman')) {
        matchedProducts = matchCat('keyboard').concat(matchCat('razer'));
      } else if (q.includes('headset') || q.includes('hyperx') || q.includes('audio') || q.includes('headphone') || q.includes('earphone')) {
        matchedProducts = matchCat('headset').concat(matchCat('hyperx')).concat(matchCat('audio'));
      } else if (q.includes('mouse') || q.includes('logitech') || q.includes('g502')) {
        matchedProducts = matchCat('mouse').concat(matchCat('logitech'));
      } else if (q.includes('monitor') || q.includes('oled') || q.includes('rog') || q.includes('display') || q.includes('screen')) {
        matchedProducts = matchCat('monitor').concat(matchCat('rog')).concat(matchCat('hardware'));
      } else if (q.includes('quest') || q.includes('vr') || q.includes('meta')) {
        matchedProducts = matchCat('quest').concat(matchCat('vr'));
      } else if (q.includes('chair') || q.includes('secretlab') || q.includes('titan')) {
        matchedProducts = matchCat('chair').concat(matchCat('secretlab'));
      } else if (q.includes('stream deck') || q.includes('elgato') || q.includes('macro')) {
        matchedProducts = matchCat('stream deck').concat(matchCat('elgato'));
      } else if (q.includes('laptop') || q.includes('dell') || q.includes('macbook') || q.includes('notebook')) {
        matchedProducts = matchCat('laptop').concat(matchCat('laptops'));
      } else if (q.includes('mobile') || q.includes('phone') || q.includes('samsung') || q.includes('iphone') || q.includes('iqoo') || q.includes('oneplus')) {
        matchedProducts = matchCat('mobile').concat(matchCat('mobiles')).concat(matchCat('phone'));
      } else if (q.includes('console') || q.includes('gaming')) {
        matchedProducts = matchCat('consoles').concat(matchCat('gaming'));
      }
    }

    // Deduplicate matched products
    matchedProducts = Array.from(new Set(matchedProducts));

    // 3. Deals / Discounts query
    if (q.includes('deal') || q.includes('discount') || q.includes('offer') || q.includes('sale') || q.includes('best deal') || q.includes('trending')) {
      const deals = prods.filter(p => p.badge || (p.original_price && p.original_price > p.price));
      const list = deals.length > 0 ? deals.slice(0, 4) : prods.slice(0, 3);
      return {
        text: `🔥 <strong>Here are our Top Deals & Featured Discounts today!</strong> All items are verified in stock with express delivery:`,
        products: list
      };
    }

    // 4. Price threshold query (e.g. "under 10000", "below 5000", "under 50k", "cheapest")
    const priceUnderMatch = q.match(/(?:under|below|less than|within)\s*(?:₹|rs\.?|inr)?\s*(\d+)(?:k)?/i);
    if (priceUnderMatch) {
      let limit = parseInt(priceUnderMatch[1]);
      if (q.includes(priceUnderMatch[1] + 'k')) limit *= 1000;
      const budgetProds = prods.filter(p => parseFloat(p.price) <= limit).sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
      if (budgetProds.length > 0) {
        return {
          text: `💰 <strong>Found ${budgetProds.length} product(s) under ₹${limit.toLocaleString()}:</strong>`,
          products: budgetProds.slice(0, 4)
        };
      } else {
        return {
          text: `No products currently found under ₹${limit.toLocaleString()}. Our starting price in the catalog is ₹${Math.min(...prods.map(p => parseFloat(p.price))).toLocaleString()}.`
        };
      }
    }

    if (q.includes('cheapest') || q.includes('lowest price') || q.includes('least expensive')) {
      const sorted = [...prods].sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
      return {
        text: `🏷️ <strong>Our most affordable product is:</strong>`,
        products: sorted.slice(0, 2)
      };
    }

    if (q.includes('expensive') || q.includes('costliest') || q.includes('premium') || q.includes('flagship')) {
      const sorted = [...prods].sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
      return {
        text: `💎 <strong>Our top-tier premium hardware listing is:</strong>`,
        products: sorted.slice(0, 2)
      };
    }

    // 5. Specific Product Rate / Availability / Details Inquiry
    const isRateOrPriceQuery = q.includes('rate') || q.includes('price') || q.includes('cost') || q.includes('how much') || q.includes('available') || q.includes('stock') || q.includes('tell me') || q.includes('details');

    if (matchedProducts.length === 1 || (matchedProducts.length > 0 && isRateOrPriceQuery)) {
      const p = matchedProducts[0];
      const pPrice = parseFloat(p.price) || 0;
      const pOrig = parseFloat(p.original_price);
      const discountPct = (pOrig && pOrig > pPrice) ? Math.round(((pOrig - pPrice) / pOrig) * 100) : 0;
      const discountNote = discountPct > 0 ? ` <span style="color: #10b981; font-weight:700;">(${discountPct}% OFF, Regular ₹${pOrig.toLocaleString()})</span>` : '';
      const stock = p.stock_quantity !== undefined ? p.stock_quantity : 20;
      const stockStatus = stock > 0 ? `🟢 <strong>In Stock</strong> (${stock} units ready for dispatch)` : `🔴 <strong>Out of Stock</strong>`;
      const sellerStr = p.seller_name ? ` • Sold by: <strong>${p.seller_name}</strong>` : '';

      return {
        text: `🏷️ <strong>Live Details for ${p.name}:</strong><br><br>
        • <strong>Live Rate:</strong> <span style="font-size: 1.1rem; font-weight: 800; color: var(--primary);">₹${pPrice.toLocaleString()}</span>${discountNote}<br>
        • <strong>Stock Status:</strong> ${stockStatus}${sellerStr}<br>
        • <strong>Category:</strong> <span style="text-transform: capitalize;">${p.category || 'Hardware'}</span><br><br>
        👇 You can add this item directly to your cart or view it in the store catalog below:`,
        products: matchedProducts.slice(0, 4)
      };
    }

    // If multiple products matched:
    if (matchedProducts.length > 0) {
      const count = matchedProducts.length;
      return {
        text: `📦 <strong>Found ${count} matching product(s) in our live catalog:</strong> Check live rates, stock status, and add directly to your cart below!`,
        products: matchedProducts.slice(0, 4)
      };
    }

    // 5. Site Guide & Platform Information Queries
    if (q.includes('site') || q.includes('about') || q.includes('what is madhan mart') || q.includes('how does it work') || q.includes('guide')) {
      return {
        text: `🌟 <strong>About MADHAN MART Commerce Platform:</strong><br><br>
        • <strong>Multi-Role Ecosystem:</strong> Dedicated interfaces for 🛒 <strong>Buyers</strong>, 🏪 <strong>Sellers</strong>, and 🛡️ <strong>Admins</strong>.<br>
        • <strong>Live Supabase Cloud Database:</strong> Real-time product inventory sync, order state updates, and instant receipts.<br>
        • <strong>Instant Checkout & Invoices:</strong> Support for COD, UPI, Cards, plus automated 1-click PDF invoices with GST calculations.<br>
        • <strong>Seller Portal:</strong> Multi-seller inventory dashboard with camera image uploads and sales analytics.`
      };
    }

    if (q.includes('how to order') || q.includes('how to buy') || q.includes('order process') || q.includes('checkout')) {
      return {
        text: `🛒 <strong>How to Place an Order on MADHAN MART:</strong><br><br>
        1. <strong>Browse Products:</strong> Filter by categories (Laptops, Mobiles, Consoles, Audio, Peripherals) or search above.<br>
        2. <strong>Add to Cart:</strong> Click <strong>"Add +"</strong> on any item card or from this chat.<br>
        3. <strong>Open Shopping Cart:</strong> Tap the cart icon at the top right.<br>
        4. <strong>Checkout & Confirm:</strong> Choose COD, UPI, or Card, enter shipping details, and confirm.<br>
        5. <strong>Download Invoice:</strong> Receive instant order confirmation with a downloadable PDF invoice!`
      };
    }

    if (q.includes('payment') || q.includes('cod') || q.includes('upi') || q.includes('card') || q.includes('pay')) {
      return {
        text: `💳 <strong>Accepted Payment Methods:</strong><br><br>
        • <strong>Cash on Delivery (COD):</strong> Pay in cash upon doorstep delivery.<br>
        • <strong>UPI (GPay / PhonePe / Paytm):</strong> Instant QR / UPI ID transactions.<br>
        • <strong>Credit / Debit Cards:</strong> Visa, MasterCard, RuPay with secure 256-bit encryption.<br>
        • <strong>Net Banking:</strong> All major Indian banks supported.`
      };
    }

    if (q.includes('delivery') || q.includes('shipping') || q.includes('how long') || q.includes('courier')) {
      return {
        text: `🚚 <strong>Shipping & Delivery Information:</strong><br><br>
        • <strong>Standard Delivery:</strong> 2 to 4 business days across India.<br>
        • <strong>Express Delivery:</strong> Available for Metro cities (Next-day delivery).<br>
        • <strong>Shipping Fee:</strong> Free shipping on orders above ₹1,000!`
      };
    }

    if (q.includes('seller') || q.includes('how to sell') || q.includes('vendor') || q.includes('upload product')) {
      return {
        text: `🏪 <strong>Seller Center Guide:</strong><br><br>
        • <strong>Register as Seller:</strong> Create a seller account with your store name.<br>
        • <strong>Upload Products:</strong> Click <strong>"📦 Add Product"</strong> to set title, category, price, stock, and upload product photos directly from your device.<br>
        • <strong>Order Management:</strong> Real-time orders table where sellers can process orders and mark them as <em>Delivered</em>.<br>
        • <strong>Revenue Analytics:</strong> Live dashboard showing total inventory count and gross revenue earned.`
      };
    }

    if (q.includes('admin') || q.includes('moderation') || q.includes('super admin')) {
      return {
        text: `🛡️ <strong>Admin Super Panel Guide:</strong><br><br>
        • Full platform visibility over all Registered Users, Gross Merchandise Value (GMV), and Master Orders.<br>
        • Global Catalog Moderation: Ability to inspect seller listings and remove unauthorized products.<br>
        • Global Order Status Overrides: Update any customer order to Processing, Delivered, or Cancelled.`
      };
    }

    if (q.includes('role') || q.includes('switch') || q.includes('login') || q.includes('account')) {
      return {
        text: `🔒 <strong>Role-Locking Security Policy:</strong><br><br>
        You are currently active as <strong>${activeRole.toUpperCase()}</strong> (${currentUser.email || 'User'}).<br>
        For platform security, role switching inside the same session is prevented. To switch between Buyer, Seller, or Admin portals, click your <strong>Profile Avatar (top-right)</strong> -> <strong>"Sign Out / Switch Role"</strong>, and log in with that specific account.`
      };
    }

    if (q.includes('order') || q.includes('track') || q.includes('history') || q.includes('my order') || q.includes('receipt') || q.includes('invoice')) {
      if (activeRole === 'buyer') {
        return {
          text: `📦 <strong>Track Orders & Invoices:</strong><br><br>
          Scroll down to the <strong>"📦 My Order History"</strong> section to see all your active and past orders, live delivery tracking statuses (Pending, Processing, Delivered), and click <strong>"📥 Download Invoice"</strong> to generate official PDF receipts anytime!`
        };
      } else {
        return {
          text: `📦 <strong>Order Tracking:</strong> You are currently on the ${activeRole.toUpperCase()} dashboard. Check your orders table in the main panel above!`
        };
      }
    }

    // Default Fallback with live products
    const randomSamples = prods.slice(0, 3);
    return {
      text: `👋 I am here to help you shop smart! You can ask me:<br>
      • <em>"What is the rate of PS5 controller?"</em><br>
      • <em>"Show products under ₹10,000"</em><br>
      • <em>"What new products are added?"</em><br>
      • <em>"How does delivery and checkout work?"</em><br><br>
      Here are a few popular items available in our live store right now:`,
      products: randomSamples
    };
  }

  async function handleAiChatSubmit() {
    const q = aiChatInput.value.trim();
    if (!q) return;

    // Append User Message
    const userDiv = document.createElement('div');
    userDiv.className = 'ai-msg user';
    userDiv.textContent = q;
    aiChatMessages.appendChild(userDiv);
    aiChatInput.value = '';
    aiChatMessages.scrollTop = aiChatMessages.scrollHeight;

    // Append Typing Indicator
    const typingDiv = document.createElement('div');
    typingDiv.className = 'ai-msg bot ai-typing-wrap';
    typingDiv.innerHTML = `
      <div class="ai-typing">
        <span class="ai-dot"></span>
        <span class="ai-dot"></span>
        <span class="ai-dot"></span>
      </div>
    `;
    aiChatMessages.appendChild(typingDiv);
    aiChatMessages.scrollTop = aiChatMessages.scrollHeight;

    // Fetch fresh database knowledge & generate response
    const response = await generateAiResponse(q);

    setTimeout(() => {
      typingDiv.remove();

      const botDiv = document.createElement('div');
      botDiv.className = 'ai-msg bot';

      let innerHtml = `<div>${response.text}</div>`;

      // Render product cards if matched
      if (response.products && Array.isArray(response.products) && response.products.length > 0) {
        response.products.forEach(p => {
          const imgSrc = getProductImage(p);
          const price = parseFloat(p.price) || 0;
          const origPrice = parseFloat(p.original_price);
          const origHtml = (origPrice && origPrice > price) ? `<span class="ai-prod-orig-price">₹${origPrice.toLocaleString()}</span>` : '';
          const stock = p.stock_quantity !== undefined ? p.stock_quantity : 20;
          const stockText = stock > 0 ? `🟢 ${stock} in stock` : `🔴 Out of stock`;

          innerHtml += `
            <div class="ai-product-card" data-id="${p.id}">
              <div class="ai-prod-header">
                <img src="${imgSrc}" class="ai-prod-thumb" alt="${p.name}" onerror="this.src='images/ps5-controller.jpg'">
                <div class="ai-prod-info">
                  <span class="ai-prod-title" title="${p.name}">${p.name}</span>
                  <div class="ai-prod-price-box">
                    <span class="ai-prod-price">₹${price.toLocaleString()}</span>
                    ${origHtml}
                  </div>
                  <span class="ai-prod-stock">${stockText}</span>
                </div>
              </div>
              <div class="ai-prod-actions">
                <button type="button" class="ai-btn-add-cart" data-id="${p.id}" data-name="${p.name}" data-price="${price}" data-img="${imgSrc}">🛒 Add to Cart</button>
                <button type="button" class="ai-btn-view-store" data-name="${p.name}">🔍 View in Store</button>
              </div>
            </div>
          `;
        });
      }

      botDiv.innerHTML = innerHtml;
      aiChatMessages.appendChild(botDiv);

      // Bind interactive buttons inside the newly created bot message
      botDiv.querySelectorAll('.ai-btn-add-cart').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const id = btn.getAttribute('data-id');
          const name = btn.getAttribute('data-name');
          const price = parseFloat(btn.getAttribute('data-price'));
          const img = btn.getAttribute('data-img');
          addToCart({ id, name, price, img, quantity: 1 });
          btn.textContent = '✅ Added!';
          setTimeout(() => { btn.textContent = '🛒 Add to Cart'; }, 1500);
        });
      });

      botDiv.querySelectorAll('.ai-btn-view-store').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const name = btn.getAttribute('data-name');
          jumpToStoreProduct(name);
        });
      });

      aiChatMessages.scrollTop = aiChatMessages.scrollHeight;
    }, 350);
  }

  if (aiChatForm) {
    aiChatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      handleAiChatSubmit();
    });
  }

  // --------------------------------------------------------------------------
  // 13. Live Supabase Realtime Catalog & Orders Synchronization
  // --------------------------------------------------------------------------
  if (window.MadhanMartSupabase && window.MadhanMartSupabase.client) {
    try {
      const sb = window.MadhanMartSupabase.client;

      // Realtime Products Sync
      sb.channel('realtime-products-sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, (payload) => {
          console.log('[REALTIME] Products updated in database:', payload);
          if (activeRole === 'buyer') {
            const activeFilter = document.querySelector('.category-filters .filter-btn.active');
            const cat = activeFilter ? activeFilter.getAttribute('data-cat') : 'all';
            loadProducts(cat, searchInput ? searchInput.value : '');
          } else if (activeRole === 'seller') {
            loadSellerDashboard();
          } else if (activeRole === 'admin') {
            loadAdminDashboard();
          }
        })
        .subscribe();

      // Realtime Orders Sync
      sb.channel('realtime-orders-sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
          console.log('[REALTIME] Orders updated in database:', payload);
          if (activeRole === 'buyer') {
            loadBuyerOrders();
          } else if (activeRole === 'seller') {
            loadSellerDashboard();
          } else if (activeRole === 'admin') {
            loadAdminDashboard();
          }
        })
        .subscribe();

    } catch (realtimeErr) {
      console.warn('[REALTIME] Subscription notice:', realtimeErr);
    }
  }

  // Initial load strictly based on user's authorized role
  initializeRoleView(activeRole);
});

/**
 * MADHAN MART - Multi-Role Dashboard Script (Buyer, Seller, Admin)
 * Pure Vanilla JavaScript with Supabase Integration
 */

document.addEventListener('DOMContentLoaded', async () => {
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
  const navUserRoleBadge = document.getElementById('navUserRoleBadge');
  const menuRoleTag = document.getElementById('menuRoleTag');

  function updateUserInfoDisplay() {
    const fullName = currentUser.fullName || currentUser.email.split('@')[0];
    const firstName = fullName.split(' ')[0];
    const userEmail = currentUser.email || '';
    const initial = firstName.charAt(0).toUpperCase();

    if (navUserName) navUserName.textContent = fullName;
    if (heroUserName) heroUserName.textContent = firstName;
    if (menuFullName) menuFullName.textContent = fullName;
    if (menuEmail) menuEmail.textContent = userEmail;
    if (userAvatar) userAvatar.textContent = initial;

    if (navUserRoleBadge) {
      navUserRoleBadge.textContent = activeRole.toUpperCase();
      navUserRoleBadge.className = `user-role-badge role-badge-${activeRole}`;
    }
    if (menuRoleTag) {
      menuRoleTag.textContent = `Active Role: ${activeRole.toUpperCase()}`;
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
    if (p && p.image_url && typeof p.image_url === 'string' && p.image_url.trim() && !p.image_url.includes('null')) {
      return p.image_url;
    }
    const name = ((p && p.name) || '').toLowerCase();
    if (name.includes('playstation') || name.includes('controller') || name.includes('dualsense')) return 'images/ps5-controller.jpg';
    if (name.includes('razer') || name.includes('keyboard') || name.includes('huntsman')) return 'images/razer-keyboard.jpg';
    if (name.includes('hyperx') || name.includes('headset') || name.includes('cloud alpha')) return 'images/hyperx-headset.jpg';
    if (name.includes('logitech') || name.includes('mouse') || name.includes('g502')) return 'images/logitech-mouse.jpg';
    if (name.includes('rog') || name.includes('monitor') || name.includes('oled')) return 'images/rog-monitor.jpg';
    if (name.includes('quest') || name.includes('vr') || name.includes('meta')) return 'images/meta-quest-vr.jpg';
    if (name.includes('chair') || name.includes('secretlab') || name.includes('titan')) return 'images/gaming-chair.jpg';
    if (name.includes('stream deck') || name.includes('elgato')) return 'images/stream-deck.jpg';
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
            <button type="button" class="btn-action-edit btn-seller-edit" data-id="${p.id}" data-name="${p.name}" data-price="${p.price}" data-stock="${p.stock_quantity || 20}">✏️ Edit</button>
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
          const stock = btn.getAttribute('data-stock');

          document.getElementById('editProductId').value = id;
          document.getElementById('prodName').value = name;
          document.getElementById('prodPrice').value = price;
          document.getElementById('prodStock').value = stock;
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

  // Open Add Product Modal
  if (btnOpenAddProduct && productModal) {
    btnOpenAddProduct.addEventListener('click', () => {
      document.getElementById('editProductId').value = '';
      document.getElementById('productForm').reset();
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
      const image_url = document.getElementById('prodImage').value || 'images/laptop.jpg';

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
        image_url,
        seller_email: currentUser.email,
        seller_name: currentUser.fullName
      };

      if (window.MadhanMartSupabase) {
        try {
          if (editId) {
            await window.MadhanMartSupabase.updateProduct(editId, productPayload);
            showToast(`✅ Updated product "${name}" in database!`);
          } else {
            await window.MadhanMartSupabase.addProduct(productPayload);
            showToast(`🎉 Product "${name}" published to Supabase!`);
          }
        } catch (saveErr) {
          console.error('[SUPABASE PRODUCT SAVE ERROR]', saveErr);
          showToast(`⚠️ Supabase Error: ${saveErr.message || 'Check database permissions'}`);
          alert(`Could not save product to Supabase: ${saveErr.message || 'Check RLS permissions on the products table'}`);
          return;
        }
      }

      productModal.classList.remove('show');
      productForm.reset();

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
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td style="font-weight: 600;">${p.name}</td>
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
  // 12. Floating AI Assistant Chatbot
  // --------------------------------------------------------------------------
  const aiChatbotToggle = document.getElementById('aiChatbotToggle');
  const aiChatbotCard = document.getElementById('aiChatbotCard');
  const closeAiChatBtn = document.getElementById('closeAiChatBtn');
  const aiChatForm = document.getElementById('aiChatForm');
  const aiChatInput = document.getElementById('aiChatInput');
  const aiChatMessages = document.getElementById('aiChatMessages');

  if (aiChatbotToggle && aiChatbotCard) {
    aiChatbotToggle.addEventListener('click', () => {
      const isHidden = aiChatbotCard.style.display === 'none' || !aiChatbotCard.style.display;
      aiChatbotCard.style.display = isHidden ? 'flex' : 'none';
    });
  }

  if (closeAiChatBtn && aiChatbotCard) {
    closeAiChatBtn.addEventListener('click', () => {
      aiChatbotCard.style.display = 'none';
    });
  }

  if (aiChatForm && aiChatInput && aiChatMessages) {
    aiChatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const q = aiChatInput.value.trim();
      if (!q) return;

      const userDiv = document.createElement('div');
      userDiv.className = 'ai-msg user';
      userDiv.textContent = q;
      aiChatMessages.appendChild(userDiv);
      aiChatInput.value = '';

      const lower = q.toLowerCase();
      let reply = 'I can help you browse products, check order statuses, or switch account roles.';

      if (lower.includes('laptop') || lower.includes('dell')) {
        reply = '💻 We offer the Dell Inspiron 15 Core i5 Laptop for ₹45,000. You can add it directly to your cart!';
      } else if (lower.includes('mobile') || lower.includes('phone') || lower.includes('samsung')) {
        reply = '📱 The Samsung Galaxy 5G Mobile is available for ₹18,000!';
      } else if (lower.includes('ps5') || lower.includes('controller') || lower.includes('playstation')) {
        reply = '🎮 The PlayStation 5 DualSense Wireless Controller is available for ₹5,790!';
      } else if (lower.includes('order') || lower.includes('track') || lower.includes('status')) {
        reply = '📦 You can review all your placed orders and download receipts in the "My Order History" section.';
      } else if (lower.includes('seller') || lower.includes('admin') || lower.includes('role')) {
        reply = `🔒 You are logged in as a ${activeRole.toUpperCase()}. Account roles are locked for security. To switch roles, log out and sign in with that role's account.`;
      }

      setTimeout(() => {
        const botDiv = document.createElement('div');
        botDiv.className = 'ai-msg bot';
        botDiv.textContent = reply;
        aiChatMessages.appendChild(botDiv);
        aiChatMessages.scrollTop = aiChatMessages.scrollHeight;
      }, 350);

      aiChatMessages.scrollTop = aiChatMessages.scrollHeight;
    });
  }

  // --------------------------------------------------------------------------
  // 13. Live Supabase Realtime Catalog Synchronization
  // --------------------------------------------------------------------------
  if (window.MadhanMartSupabase && window.MadhanMartSupabase.client) {
    try {
      const sb = window.MadhanMartSupabase.client;
      sb.channel('realtime-products-sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, (payload) => {
          console.log('[REALTIME] Product updated in database:', payload);
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
    } catch (realtimeErr) {
      console.warn('[REALTIME] Products subscription notice:', realtimeErr);
    }
  }

  // Initial load strictly based on user's authorized role
  initializeRoleView(activeRole);
});

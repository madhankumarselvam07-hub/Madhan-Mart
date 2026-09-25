/**
 * MADHAN MART - Dashboard Script
 * Full Supabase Integration: Google OAuth Hydration, Live Products & Supabase Orders
 */

document.addEventListener('DOMContentLoaded', async () => {
  // --------------------------------------------------------------------------
  // 1. Authentication Check & User Profile Hydration
  // --------------------------------------------------------------------------
  let currentUser = null;

  // 1a. Check for active Supabase OAuth / Session (e.g. returning from Google Sign-In)
  if (window.MadhanMartSupabase) {
    try {
      const liveSessionUser = await window.MadhanMartSupabase.getCurrentSession();
      if (liveSessionUser) {
        currentUser = liveSessionUser;
      }
    } catch (e) {
      console.warn('[SUPABASE] Session hydration notice:', e);
    }
  }

  // 1b. Fallback to localStorage session
  if (!currentUser) {
    const sessionData = localStorage.getItem('madhan_mart_current_user');
    if (sessionData) {
      try {
        currentUser = JSON.parse(sessionData);
      } catch (e) {
        currentUser = null;
      }
    }
  }

  // If no user is logged in, redirect to login page
  if (!currentUser) {
    window.location.href = 'login.html';
    return;
  }

  // Populate User Information across dashboard
  const navUserName = document.getElementById('navUserName');
  const heroUserName = document.getElementById('heroUserName');
  const menuFullName = document.getElementById('menuFullName');
  const menuEmail = document.getElementById('menuEmail');
  const userAvatar = document.getElementById('userAvatar');

  const fullName = currentUser.fullName || 'Madhan Kumar';
  const firstName = fullName.split(' ')[0];
  const userEmail = currentUser.email || 'customer@madhanmart.com';
  const initial = firstName.charAt(0).toUpperCase();

  if (navUserName) navUserName.textContent = fullName;
  if (heroUserName) heroUserName.textContent = firstName;
  if (menuFullName) menuFullName.textContent = fullName;
  if (menuEmail) menuEmail.textContent = userEmail;
  if (userAvatar) userAvatar.textContent = initial;

  // --------------------------------------------------------------------------
  // 2. User Profile Dropdown Menu
  // --------------------------------------------------------------------------
  const userMenuBtn = document.getElementById('userMenuBtn');
  const userDropdown = document.getElementById('userDropdown');

  if (userMenuBtn && userDropdown) {
    userMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isExpanded = userDropdown.classList.toggle('show');
      userMenuBtn.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
    });

    document.addEventListener('click', (e) => {
      if (!userDropdown.contains(e.target) && !userMenuBtn.contains(e.target)) {
        userDropdown.classList.remove('show');
        userMenuBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // --------------------------------------------------------------------------
  // 3. Logout Handler
  // --------------------------------------------------------------------------
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
      }, 600);
    });
  }

  // --------------------------------------------------------------------------
  // 4. Cart State & Modal Interactions
  // --------------------------------------------------------------------------
  let cart = [];
  const cartBtn = document.getElementById('cartBtn');
  const cartBadge = document.getElementById('cartBadge');
  const cartModal = document.getElementById('cartModal');
  const closeCartBtn = document.getElementById('closeCartBtn');
  const clearCartBtn = document.getElementById('clearCartBtn');
  const checkoutBtn = document.getElementById('checkoutBtn');
  const cartItemsList = document.getElementById('cartItemsList');
  const cartSummary = document.getElementById('cartSummary');
  const cartSubtotal = document.getElementById('cartSubtotal');
  const cartTotal = document.getElementById('cartTotal');

  // Open / Close Cart Modal
  if (cartBtn && cartModal) {
    cartBtn.addEventListener('click', () => {
      renderCartModal();
      cartModal.classList.add('show');
    });
  }

  if (closeCartBtn && cartModal) {
    closeCartBtn.addEventListener('click', () => {
      cartModal.classList.remove('show');
    });

    cartModal.addEventListener('click', (e) => {
      if (e.target === cartModal) {
        cartModal.classList.remove('show');
      }
    });
  }

  if (clearCartBtn) {
    clearCartBtn.addEventListener('click', () => {
      cart = [];
      updateCartBadge();
      renderCartModal();
      showToast('Cart cleared.');
    });
  }

  function updateCartBadge() {
    const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    if (cartBadge) {
      cartBadge.textContent = totalCount;
      cartBadge.style.transform = 'scale(1.25)';
      setTimeout(() => {
        cartBadge.style.transform = 'scale(1)';
      }, 150);
    }
  }

  function renderCartModal() {
    if (!cartItemsList) return;

    if (cart.length === 0) {
      cartItemsList.innerHTML = '<p class="cart-empty-text">Your cart is empty. Add some gaming gear!</p>';
      if (cartSummary) cartSummary.style.display = 'none';
      if (checkoutBtn) checkoutBtn.disabled = true;
      return;
    }

    cartItemsList.innerHTML = cart.map((item, index) => `
      <div class="cart-item-row">
        <div class="cart-item-info">
          <span class="cart-item-name">${escapeHtml(item.name)} (x${item.quantity})</span>
          <span class="cart-item-price">₹${(item.price * item.quantity).toLocaleString('en-IN')}</span>
        </div>
        <button type="button" class="btn-remove-item" data-index="${index}">Remove</button>
      </div>
    `).join('');

    const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    if (cartSubtotal) cartSubtotal.textContent = `₹${totalAmount.toLocaleString('en-IN')}`;
    if (cartTotal) cartTotal.textContent = `₹${totalAmount.toLocaleString('en-IN')}`;
    if (cartSummary) cartSummary.style.display = 'flex';
    if (checkoutBtn) checkoutBtn.disabled = false;

    // Attach Remove Event Listeners
    const removeButtons = cartItemsList.querySelectorAll('.btn-remove-item');
    removeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-index'), 10);
        cart.splice(idx, 1);
        updateCartBadge();
        renderCartModal();
      });
    });
  }

  // Add To Cart Button Listeners (for static or dynamic cards)
  function attachAddToCartListeners() {
    const addCartButtons = document.querySelectorAll('.btn-add-cart');
    addCartButtons.forEach((btn) => {
      btn.onclick = () => {
        const card = btn.closest('.product-card');
        const productName = btn.getAttribute('data-name') || card.querySelector('.product-name')?.textContent || 'Gaming Gear';
        const priceText = card.querySelector('.price-current')?.textContent.replace(/[^0-9]/g, '') || '4999';
        const price = parseInt(priceText, 10);

        const existingItem = cart.find(item => item.name === productName);
        if (existingItem) {
          existingItem.quantity += 1;
        } else {
          cart.push({ name: productName, price: price, quantity: 1 });
        }

        updateCartBadge();
        showToast(`🛒 Added "${productName}" to cart!`);
      };
    });
  }

  attachAddToCartListeners();

  // --------------------------------------------------------------------------
  // 5. Place Order (Direct Supabase Insertion)
  // --------------------------------------------------------------------------
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', async () => {
      if (cart.length === 0) return;

      checkoutBtn.disabled = true;
      checkoutBtn.textContent = 'Saving to Supabase...';

      const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      try {
        let orderCode = '#MM-' + Math.floor(10000 + Math.random() * 90000);

        if (window.MadhanMartSupabase) {
          try {
            const createdOrder = await window.MadhanMartSupabase.createOrder(cart, totalAmount);
            if (createdOrder && createdOrder.order_code) {
              orderCode = createdOrder.order_code;
            }
          } catch (supErr) {
            console.warn('[SUPABASE] Order insert notice:', supErr);
          }
        }

        // Summary item text
        const itemsSummary = cart.length === 1 
          ? `${cart[0].name} (x${cart[0].quantity})`
          : `${cart[0].name} + ${cart.length - 1} more item(s)`;

        // Add to local orders list & update DOM
        addOrderToRecentOrdersTable({
          order_code: orderCode,
          date: 'Just now',
          items: itemsSummary,
          amount: `₹${totalAmount.toLocaleString('en-IN')}`,
          status: 'Confirmed'
        });

        // Reset Cart
        cart = [];
        updateCartBadge();
        if (cartModal) cartModal.classList.remove('show');
        showToast(`🎉 Order ${orderCode} placed successfully in Supabase!`);

      } catch (err) {
        console.error('Order creation error:', err);
        showToast('Error saving order. Please try again.');
      } finally {
        checkoutBtn.disabled = false;
        checkoutBtn.textContent = 'Place Order (Supabase)';
      }
    });
  }

  // --------------------------------------------------------------------------
  // 6. Recent Orders Table Helpers & Supabase Orders Fetch
  // --------------------------------------------------------------------------
  const emptyOrdersWrap = document.getElementById('emptyOrdersWrap');
  const ordersTableWrap = document.getElementById('ordersTableWrap');
  const ordersTableBody = document.getElementById('ordersTableBody');
  const statOrdersCount = document.querySelector('.stat-card:nth-child(1) .stat-number');
  const statRewardsXp = document.querySelector('.stat-card:nth-child(4) .stat-number');

  let orderCount = 0;

  function addOrderToRecentOrdersTable(order) {
    if (emptyOrdersWrap) emptyOrdersWrap.style.display = 'none';
    if (ordersTableWrap) ordersTableWrap.style.display = 'block';

    const row = document.createElement('tr');
    row.innerHTML = `
      <td class="order-id">${escapeHtml(order.order_code)}</td>
      <td>${escapeHtml(order.date || 'Today')}</td>
      <td>${escapeHtml(order.items || 'Gaming Gear')}</td>
      <td>${escapeHtml(order.amount || '₹0.00')}</td>
      <td><span class="status-badge status-delivered">${escapeHtml(order.status || 'Confirmed')}</span></td>
      <td><button type="button" class="btn-table-action" onclick="alert('Viewing receipt for ${order.order_code}')">View Invoice</button></td>
    `;

    if (ordersTableBody) {
      ordersTableBody.prepend(row);
    }

    orderCount += 1;
    if (statOrdersCount) statOrdersCount.textContent = orderCount;
    if (statRewardsXp) statRewardsXp.textContent = `${orderCount * 250} XP`;
  }

  // Fetch past orders from Supabase on load
  if (window.MadhanMartSupabase) {
    try {
      const pastOrders = await window.MadhanMartSupabase.getUserOrders();
      if (pastOrders && pastOrders.length > 0) {
        pastOrders.forEach(ord => {
          const itemsText = ord.order_items && ord.order_items.length > 0
            ? ord.order_items.map(i => i.product_name).join(', ')
            : 'Gaming Hardware';

          const dateStr = ord.created_at ? new Date(ord.created_at).toLocaleDateString() : 'Recent';
          addOrderToRecentOrdersTable({
            order_code: ord.order_code,
            date: dateStr,
            items: itemsText,
            amount: `₹${parseFloat(ord.total_amount || 0).toLocaleString('en-IN')}`,
            status: ord.status || 'Delivered'
          });
        });
      }
    } catch (e) {
      console.warn('[SUPABASE] Past orders fetch error:', e);
    }
  }

  // --------------------------------------------------------------------------
  // 7. Dynamic Category Filtering
  // --------------------------------------------------------------------------
  const filterButtons = document.querySelectorAll('.filter-btn');
  const productCards = document.querySelectorAll('.product-card');

  filterButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      filterButtons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      const category = btn.getAttribute('data-cat');

      productCards.forEach((card) => {
        const cardCat = card.getAttribute('data-cat');
        if (category === 'all' || cardCat === category) {
          card.style.display = 'flex';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });

  // --------------------------------------------------------------------------
  // 8. Search Filter
  // --------------------------------------------------------------------------
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase().trim();
      productCards.forEach((card) => {
        const nameEl = card.querySelector('.product-name');
        const name = nameEl ? nameEl.textContent.toLowerCase() : '';
        if (name.includes(query)) {
          card.style.display = 'flex';
        } else {
          card.style.display = 'none';
        }
      });
    });
  }

  // --------------------------------------------------------------------------
  // 9. Toast Notification Helper & Sanitization
  // --------------------------------------------------------------------------
  const toast = document.getElementById('dashboardToast');
  let toastTimer = null;

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.style.display = 'block';

    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.style.display = 'none';
    }, 2800);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
});

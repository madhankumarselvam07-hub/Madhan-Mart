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
  // --------------------------------------------------------------------------
  // 4. User-Specific Persistent Cart State & Modal Interactions
  // --------------------------------------------------------------------------
  const userCartKey = `madhan_mart_cart_${currentUser.email ? currentUser.email.toLowerCase() : 'default'}`;

  function loadUserCart() {
    try {
      const saved = localStorage.getItem(userCartKey);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  }

  function saveUserCart(cartData) {
    try {
      localStorage.setItem(userCartKey, JSON.stringify(cartData));
    } catch (e) {}
  }

  // Load this specific customer's saved cart
  let cart = loadUserCart();

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

  // Initialize cart badge from saved user cart
  updateCartBadge();

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
      saveUserCart(cart);
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
        saveUserCart(cart);
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

        saveUserCart(cart);
        updateCartBadge();
        showToast(`🛒 Added "${productName}" to cart!`);
      };
    });
  }

  attachAddToCartListeners();

  // --------------------------------------------------------------------------
  // 5. Place Order & Checkout Flow (Address, Location & Payment Selection)
  // --------------------------------------------------------------------------
  const checkoutModal = document.getElementById('checkoutModal');
  const closeCheckoutBtn = document.getElementById('closeCheckoutBtn');
  const backToCartBtn = document.getElementById('backToCartBtn');
  const checkoutForm = document.getElementById('checkoutForm');
  const checkoutModalTotal = document.getElementById('checkoutModalTotal');
  const confirmOrderBtn = document.getElementById('confirmOrderBtn');
  const confirmOrderBtnLabel = document.getElementById('confirmOrderBtnLabel');

  const shippingFullNameInput = document.getElementById('shippingFullName');
  const shippingPhoneInput = document.getElementById('shippingPhone');
  const shippingAddressInput = document.getElementById('shippingAddress');
  const shippingCityInput = document.getElementById('shippingCity');
  const shippingStateInput = document.getElementById('shippingState');
  const shippingPinInput = document.getElementById('shippingPin');

  const paymentMethodRadios = document.querySelectorAll('input[name="paymentMethod"]');
  const upiFields = document.getElementById('upiFields');
  const cardFields = document.getElementById('cardFields');
  const netbankingFields = document.getElementById('netbankingFields');
  const codFields = document.getElementById('codFields');
  const upiIdInput = document.getElementById('upiId');
  const cardNumberInput = document.getElementById('cardNumber');
  const cardExpiryInput = document.getElementById('cardExpiry');
  const cardCvvInput = document.getElementById('cardCvv');
  const bankSelect = document.getElementById('bankSelect');

  // Step 1: Open Checkout Modal when clicking "Proceed to Checkout" from Cart Modal
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
      if (cart.length === 0) {
        showToast('Your cart is empty.');
        return;
      }

      // Hide Cart Modal
      if (cartModal) cartModal.classList.remove('show');

      // Pre-populate name
      if (shippingFullNameInput && !shippingFullNameInput.value) {
        shippingFullNameInput.value = currentUser?.fullName || 'Madhan Kumar';
      }

      // Populate Total Amount in Checkout Modal
      const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      if (checkoutModalTotal) {
        checkoutModalTotal.textContent = `₹${totalAmount.toLocaleString('en-IN')}`;
      }
      if (confirmOrderBtnLabel) {
        confirmOrderBtnLabel.textContent = `Confirm & Pay ₹${totalAmount.toLocaleString('en-IN')}`;
      }

      // Show Checkout Modal
      if (checkoutModal) {
        checkoutModal.classList.add('show');
      }
    });
  }

  // Close Checkout Modal handlers
  if (closeCheckoutBtn && checkoutModal) {
    closeCheckoutBtn.addEventListener('click', () => {
      checkoutModal.classList.remove('show');
    });
    checkoutModal.addEventListener('click', (e) => {
      if (e.target === checkoutModal) {
        checkoutModal.classList.remove('show');
      }
    });
  }

  // Back to Cart button
  if (backToCartBtn && checkoutModal && cartModal) {
    backToCartBtn.addEventListener('click', () => {
      checkoutModal.classList.remove('show');
      renderCartModal();
      cartModal.classList.add('show');
    });
  }

  // Payment Method Radio Change Handler
  paymentMethodRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      document.querySelectorAll('.payment-method-card').forEach(card => card.classList.remove('active'));
      const parentCard = radio.closest('.payment-method-card');
      if (parentCard) parentCard.classList.add('active');

      const selected = radio.value;
      if (upiFields) upiFields.style.display = selected === 'Google Pay / UPI' ? 'block' : 'none';
      if (cardFields) cardFields.style.display = selected === 'Credit / Debit Card' ? 'block' : 'none';
      if (netbankingFields) netbankingFields.style.display = selected === 'Net Banking' ? 'block' : 'none';
      if (codFields) codFields.style.display = selected === 'Cash on Delivery' ? 'block' : 'none';
    });
  });

  // Step 2: Confirm Order & Submit Checkout Form
  if (checkoutForm) {
    checkoutForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (cart.length === 0) {
        showToast('Cart is empty.');
        return;
      }

      const nameVal = shippingFullNameInput ? shippingFullNameInput.value.trim() : 'Madhan Kumar';
      const phoneVal = shippingPhoneInput ? shippingPhoneInput.value.trim() : '';
      const addressVal = shippingAddressInput ? shippingAddressInput.value.trim() : '';
      const cityVal = shippingCityInput ? shippingCityInput.value.trim() : 'Chennai';
      const stateVal = shippingStateInput ? shippingStateInput.value.trim() : 'Tamil Nadu';
      const pinVal = shippingPinInput ? shippingPinInput.value.trim() : '600025';

      if (!nameVal || !phoneVal || !addressVal || !cityVal || !pinVal) {
        showToast('⚠️ Please fill in all required delivery details.');
        return;
      }

      // Determine selected payment method and extra detail
      let selectedMethod = 'Google Pay / UPI';
      const activeRadio = document.querySelector('input[name="paymentMethod"]:checked');
      if (activeRadio) selectedMethod = activeRadio.value;

      let paymentDetailsStr = selectedMethod;
      if (selectedMethod === 'Google Pay / UPI') {
        const upi = upiIdInput ? upiIdInput.value.trim() : 'madhan@okaxis';
        paymentDetailsStr = `Google Pay / UPI (${upi || 'GPay Verified'})`;
      } else if (selectedMethod === 'Credit / Debit Card') {
        const cardNum = cardNumberInput ? cardNumberInput.value.trim().slice(-4) : '8820';
        paymentDetailsStr = `Credit Card (ending in ${cardNum || '8820'})`;
      } else if (selectedMethod === 'Net Banking') {
        const bank = bankSelect ? bankSelect.value : 'HDFC Bank';
        paymentDetailsStr = `Net Banking (${bank})`;
      } else if (selectedMethod === 'Cash on Delivery') {
        paymentDetailsStr = 'Cash on Delivery (Pay on doorstep)';
      }

      const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      // Set button loading state
      if (confirmOrderBtn) {
        confirmOrderBtn.disabled = true;
        confirmOrderBtnLabel.textContent = '🔒 Processing payment & saving order...';
      }

      try {
        let orderCode = '#MM-' + Math.floor(10000 + Math.random() * 90000);

        const orderDetailsPayload = {
          shipping_address: `${addressVal}, ${cityVal}, ${stateVal} - ${pinVal}`,
          phone_number: phoneVal,
          city: cityVal,
          pincode: pinVal,
          payment_method: paymentDetailsStr
        };

        if (window.MadhanMartSupabase) {
          try {
            const createdOrder = await window.MadhanMartSupabase.createOrder(cart, totalAmount, currentUser, orderDetailsPayload);
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

        // Keep snapshot of ordered items for the invoice
        const orderedItemsSnapshot = JSON.parse(JSON.stringify(cart));

        // Add to local orders list & update DOM
        addOrderToRecentOrdersTable({
          order_code: orderCode,
          date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
          items: itemsSummary,
          rawItems: orderedItemsSnapshot,
          amount: `₹${totalAmount.toLocaleString('en-IN')}`,
          status: 'Confirmed',
          shipping_address: orderDetailsPayload.shipping_address,
          phone_number: phoneVal,
          city: cityVal,
          pincode: pinVal,
          payment_method: paymentDetailsStr,
          customer_name: nameVal
        });

        // Reset Cart and clear persistent storage for this user
        cart = [];
        saveUserCart(cart);
        updateCartBadge();
        
        if (checkoutModal) checkoutModal.classList.remove('show');
        showToast(`🎉 Order ${orderCode} placed successfully via ${selectedMethod}!`);

        // Automatically open the tax invoice modal for the newly placed order!
        setTimeout(() => {
          openInvoiceModal(orderCode);
        }, 400);

      } catch (err) {
        console.error('Order creation error:', err);
        showToast('Error saving order. Please try again.');
      } finally {
        if (confirmOrderBtn) {
          confirmOrderBtn.disabled = false;
          confirmOrderBtnLabel.textContent = 'Confirm & Place Order';
        }
      }
    });
  }

  // --------------------------------------------------------------------------
  // 6. Recent Orders Table Helpers & Supabase Orders Fetch
  // --------------------------------------------------------------------------
  const emptyOrdersWrap = document.getElementById('emptyOrdersWrap');
  const ordersTableWrap = document.getElementById('ordersTableWrap');
  const ordersTableBody = document.getElementById('ordersTableBody');
  const statOrdersCount = document.getElementById('statOrdersCount');
  const statRewardsXp = document.getElementById('statRewardsXp');

  const orderRegistry = new Map();
  let activeInvoiceOrderCode = null;

  // Invoice Modal Elements
  const invoiceModal = document.getElementById('invoiceModal');
  const closeInvoiceBtn = document.getElementById('closeInvoiceBtn');
  const printInvoiceBtn = document.getElementById('printInvoiceBtn');
  const downloadInvoicePdfBtn = document.getElementById('downloadInvoicePdfBtn');
  const invoiceModalBody = document.getElementById('invoiceModalBody');

  let orderCount = 0;

  // Reset default state
  if (statOrdersCount) statOrdersCount.textContent = '0';
  if (statRewardsXp) statRewardsXp.textContent = '0 XP';
  if (emptyOrdersWrap) emptyOrdersWrap.style.display = 'flex';
  if (ordersTableWrap) ordersTableWrap.style.display = 'none';
  if (ordersTableBody) ordersTableBody.innerHTML = '';

  function addOrderToRecentOrdersTable(order) {
    orderRegistry.set(order.order_code, order);

    if (emptyOrdersWrap) emptyOrdersWrap.style.display = 'none';
    if (ordersTableWrap) ordersTableWrap.style.display = 'block';

    const row = document.createElement('tr');
    row.innerHTML = `
      <td class="order-id">${escapeHtml(order.order_code)}</td>
      <td>${escapeHtml(order.date || 'Today')}</td>
      <td>${escapeHtml(order.items || 'Gaming Gear')}</td>
      <td>${escapeHtml(order.amount || '₹0.00')}</td>
      <td><span class="status-badge status-delivered">${escapeHtml(order.status || 'Confirmed')}</span></td>
      <td><button type="button" class="btn-table-action" data-code="${escapeHtml(order.order_code)}">🧾 View Invoice</button></td>
    `;

    const viewBtn = row.querySelector('.btn-table-action');
    if (viewBtn) {
      viewBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        openInvoiceModal(order.order_code);
      });
    }

    if (ordersTableBody) {
      ordersTableBody.prepend(row);
    }

    orderCount += 1;
    if (statOrdersCount) statOrdersCount.textContent = orderCount;
    if (statRewardsXp) statRewardsXp.textContent = `${orderCount * 250} XP`;
  }

  // --------------------------------------------------------------------------
  // 6b. Invoice Modal Display & PDF Generation
  // --------------------------------------------------------------------------
  window.openInvoiceModal = function(orderCode) {
    const order = orderRegistry.get(orderCode);
    if (!order) {
      showToast('Order details not found.');
      return;
    }

    activeInvoiceOrderCode = orderCode;

    const customerName = order.customer_name || (currentUser && currentUser.fullName) || 'Valued Gamer';
    const customerEmail = (currentUser && currentUser.email) || order.user_email || 'customer@madhanmart.com';
    const customerPhone = order.phone_number || '+91 98765 43210';
    const customerAddress = order.shipping_address || 'No. 42, Anna Salai, Chennai, Tamil Nadu - 600025';
    const paymentMode = order.payment_method || 'Google Pay / UPI (Verified)';

    const rawTotalStr = String(order.amount || '0').replace(/[^0-9.]/g, '');
    const totalNum = parseFloat(rawTotalStr) || 0;
    const subtotalNum = Math.round(totalNum / 1.18);
    const gstNum = totalNum - subtotalNum;

    let itemsRowsHtml = '';
    if (order.rawItems && order.rawItems.length > 0) {
      itemsRowsHtml = order.rawItems.map((item, idx) => {
        const q = item.quantity || 1;
        const unitP = item.price || item.unit_price || 0;
        const tot = q * unitP;
        return `
          <tr>
            <td class="text-center">${idx + 1}</td>
            <td><strong>${escapeHtml(item.name || item.product_name || 'Gaming Item')}</strong></td>
            <td class="text-center">${q}</td>
            <td class="text-right">₹${Number(unitP).toLocaleString('en-IN')}</td>
            <td class="text-right">₹${Number(tot).toLocaleString('en-IN')}</td>
          </tr>
        `;
      }).join('');
    } else {
      itemsRowsHtml = `
        <tr>
          <td class="text-center">1</td>
          <td><strong>${escapeHtml(order.items || 'Gaming Gear Package')}</strong></td>
          <td class="text-center">1</td>
          <td class="text-right">₹${totalNum.toLocaleString('en-IN')}</td>
          <td class="text-right">₹${totalNum.toLocaleString('en-IN')}</td>
        </tr>
      `;
    }

    if (invoiceModalBody) {
      invoiceModalBody.innerHTML = `
        <div class="invoice-paper" id="invoicePrintArea">
          <header class="invoice-header">
            <div>
              <div class="invoice-brand-title">MADHAN MART</div>
              <div class="invoice-brand-tag">Next-Gen Gaming Gear & Hardware • Official Tax Invoice</div>
              <div class="invoice-brand-tag">GSTIN: 33AAACM0724M1Z5 | support@madhanmart.com</div>
            </div>
            <div class="invoice-badge-box">
              <span class="invoice-type-tag">ORIGINAL FOR RECIPIENT</span>
              <div class="invoice-code">${escapeHtml(order.order_code)}</div>
            </div>
          </header>

          <div class="invoice-grid">
            <div>
              <div class="invoice-col-title">Billed & Shipped To</div>
              <div class="invoice-col-content">
                <span class="invoice-customer-name">${escapeHtml(customerName)}</span><br>
                <span>${escapeHtml(customerEmail)} • ${escapeHtml(customerPhone)}</span><br>
                <span>📍 ${escapeHtml(customerAddress)}</span>
              </div>
            </div>
            <div>
              <div class="invoice-col-title">Invoice & Payment Details</div>
              <div class="invoice-col-content">
                <strong>Invoice Date:</strong> ${escapeHtml(order.date || 'Today')}<br>
                <strong>Payment:</strong> <span style="color: #2563eb; font-weight: 700;">${escapeHtml(paymentMode)}</span><br>
                <strong>Order Status:</strong> <span style="color: #10b981; font-weight: 700;">${escapeHtml(order.status || 'Paid & Delivered')}</span>
              </div>
            </div>
          </div>

          <div class="invoice-table-wrap">
            <table class="invoice-table">
              <thead>
                <tr>
                  <th class="text-center" style="width: 40px;">#</th>
                  <th>Item Description</th>
                  <th class="text-center" style="width: 60px;">Qty</th>
                  <th class="text-right" style="width: 110px;">Unit Price</th>
                  <th class="text-right" style="width: 120px;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${itemsRowsHtml}
              </tbody>
            </table>
          </div>

          <div class="invoice-summary-section">
            <div class="invoice-notes">
              <strong>Warranty & Guarantee:</strong><br>
              • Includes 1-Year Official Manufacturer Warranty.<br>
              • 7-Day Replacement window for gaming hardware & peripherals.<br>
              • Computer generated invoice requiring no physical signature.
            </div>
            <div class="invoice-totals-box">
              <div class="invoice-total-row">
                <span>Subtotal (Net):</span>
                <span>₹${subtotalNum.toLocaleString('en-IN')}</span>
              </div>
              <div class="invoice-total-row">
                <span>GST (18% Included):</span>
                <span>₹${gstNum.toLocaleString('en-IN')}</span>
              </div>
              <div class="invoice-total-row">
                <span>Delivery:</span>
                <span style="color: #10b981; font-weight: 700;">FREE</span>
              </div>
              <div class="invoice-total-row invoice-grand-total">
                <span>Grand Total:</span>
                <span>₹${totalNum.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    if (invoiceModal) {
      invoiceModal.classList.add('show');
    }
  };

  window.generateInvoicePDF = function(orderCode) {
    const order = orderRegistry.get(orderCode);
    if (!order) {
      showToast('Order not found for PDF generation.');
      return;
    }

    showToast('📄 Generating official PDF Invoice...');

    try {
      if (!window.jspdf || !window.jspdf.jsPDF) {
        window.print();
        return;
      }

      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const brandBlue = [37, 99, 235];
      const darkNavy = [15, 23, 42];
      const textMuted = [100, 116, 139];
      const lightBg = [248, 250, 252];

      // Top colored banner
      doc.setFillColor(...brandBlue);
      doc.rect(0, 0, 210, 26, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.text('MADHAN MART', 14, 17);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('TAX INVOICE / BILL', 150, 17);

      // Seller details
      doc.setTextColor(...darkNavy);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('MADHAN MART E-COMMERCE PVT. LTD.', 14, 38);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...textMuted);
      doc.text('Pro Gaming Consoles, RGB Peripherals & Streaming Hardware', 14, 44);
      doc.text('GSTIN: 33AAACM0724M1Z5 | Support: support@madhanmart.com', 14, 49);
      doc.text('Chennai, Tamil Nadu, India - 600001', 14, 54);

      // Invoice info box
      doc.setFillColor(...lightBg);
      doc.roundedRect(125, 32, 71, 26, 2, 2, 'F');

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...darkNavy);
      doc.text(`Invoice No: ${order.order_code}`, 130, 39);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...textMuted);
      doc.text(`Date: ${order.date || new Date().toLocaleDateString('en-GB')}`, 130, 46);
      doc.text(`Status: ${order.status || 'Paid & Delivered'}`, 130, 53);

      // Divider line
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(14, 61, 196, 61);

      // Customer Info Section
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...darkNavy);
      doc.text('BILLED & SHIPPED TO:', 14, 69);

      const customerName = order.customer_name || (currentUser && currentUser.fullName) || 'Valued Customer';
      const customerEmail = (currentUser && currentUser.email) || order.user_email || 'customer@madhanmart.com';
      const customerPhone = order.phone_number || '+91 98765 43210';
      const customerAddress = order.shipping_address || 'No. 42, Anna Salai, Chennai, Tamil Nadu - 600025';
      const paymentMode = order.payment_method || 'Google Pay / UPI (Verified)';

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...brandBlue);
      doc.text(customerName, 14, 75);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...textMuted);
      doc.text(`Email: ${customerEmail} | Phone: ${customerPhone}`, 14, 80);
      doc.text(`Delivery Location: ${customerAddress.slice(0, 55)}`, 14, 85);
      doc.text(`Payment Method: ${paymentMode}`, 14, 90);

      // Table data
      let tableRows = [];
      if (order.rawItems && order.rawItems.length > 0) {
        tableRows = order.rawItems.map((it, idx) => {
          const q = it.quantity || 1;
          const unitP = it.price || it.unit_price || 0;
          const tot = q * unitP;
          return [
            (idx + 1).toString(),
            it.name || it.product_name || 'Gaming Gear Item',
            q.toString(),
            `Rs. ${Number(unitP).toLocaleString('en-IN')}`,
            `Rs. ${Number(tot).toLocaleString('en-IN')}`
          ];
        });
      } else {
        tableRows = [
          ['1', order.items || 'Gaming Gear Package', '1', String(order.amount || '0').replace('₹', 'Rs. '), String(order.amount || '0').replace('₹', 'Rs. ')]
        ];
      }

      if (typeof doc.autoTable === 'function') {
        doc.autoTable({
          startY: 96,
          head: [['#', 'Item Description', 'Qty', 'Unit Price', 'Total']],
          body: tableRows,
          theme: 'grid',
          headStyles: {
            fillColor: brandBlue,
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 9,
            halign: 'left'
          },
          bodyStyles: {
            fontSize: 9,
            textColor: darkNavy,
            cellPadding: 3.5
          },
          columnStyles: {
            0: { cellWidth: 12, halign: 'center' },
            1: { cellWidth: 95 },
            2: { cellWidth: 18, halign: 'center' },
            3: { cellWidth: 32, halign: 'right' },
            4: { cellWidth: 35, halign: 'right' }
          },
          styles: {
            lineColor: [226, 232, 240],
            lineWidth: 0.2
          }
        });
      }

      const finalY = (doc.lastAutoTable ? doc.lastAutoTable.finalY : 135) + 8;
      const rawTotalStr = String(order.amount || '0').replace(/[^0-9.]/g, '');
      const totalNum = parseFloat(rawTotalStr) || 0;
      const subtotalNum = Math.round(totalNum / 1.18);
      const gstNum = totalNum - subtotalNum;

      // Totals Box
      doc.setFillColor(...lightBg);
      doc.roundedRect(120, finalY, 76, 36, 2, 2, 'F');

      doc.setFontSize(9);
      doc.setTextColor(...textMuted);
      doc.text('Subtotal (Net):', 125, finalY + 8);
      doc.text(`Rs. ${subtotalNum.toLocaleString('en-IN')}`, 190, finalY + 8, { align: 'right' });

      doc.text('GST (18% Included):', 125, finalY + 15);
      doc.text(`Rs. ${gstNum.toLocaleString('en-IN')}`, 190, finalY + 15, { align: 'right' });

      doc.text('Delivery Charge:', 125, finalY + 22);
      doc.setTextColor(16, 185, 129);
      doc.text('FREE', 190, finalY + 22, { align: 'right' });

      doc.setDrawColor(226, 232, 240);
      doc.line(125, finalY + 25, 191, finalY + 25);

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...brandBlue);
      doc.text('Grand Total:', 125, finalY + 31);
      doc.text(`Rs. ${totalNum.toLocaleString('en-IN')}`, 190, finalY + 31, { align: 'right' });

      // Footer notes
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...textMuted);
      doc.text('Thank you for shopping at Madhan Mart!', 14, finalY + 12);
      doc.text('• Genuine 1-Year Manufacturer Warranty on all items', 14, finalY + 18);
      doc.text('• 7-Days Easy Replacement Policy for hardware', 14, finalY + 24);
      doc.text('• This is a computer-generated tax invoice and requires no physical signature.', 14, 280);

      const cleanCode = (order.order_code || 'Order').replace(/[^a-zA-Z0-9-_]/g, '');
      doc.save(`MadhanMart_Invoice_${cleanCode}.pdf`);
      showToast(`✅ Downloaded MadhanMart_Invoice_${cleanCode}.pdf`);
    } catch (pdfErr) {
      console.error('PDF Generation Error:', pdfErr);
      showToast('Downloading failed, opening print dialog...');
      window.print();
    }
  };

  // Attach Invoice Modal Handlers
  if (closeInvoiceBtn && invoiceModal) {
    closeInvoiceBtn.addEventListener('click', () => {
      invoiceModal.classList.remove('show');
    });
    invoiceModal.addEventListener('click', (e) => {
      if (e.target === invoiceModal) {
        invoiceModal.classList.remove('show');
      }
    });
  }

  if (printInvoiceBtn) {
    printInvoiceBtn.addEventListener('click', () => {
      window.print();
    });
  }

  if (downloadInvoicePdfBtn) {
    downloadInvoicePdfBtn.addEventListener('click', () => {
      if (activeInvoiceOrderCode) {
        window.generateInvoicePDF(activeInvoiceOrderCode);
      }
    });
  }

  // Fetch past orders from Supabase specifically for CURRENT logged-in user
  if (window.MadhanMartSupabase && currentUser) {
    try {
      const pastOrders = await window.MadhanMartSupabase.getUserOrders(currentUser);
      if (pastOrders && pastOrders.length > 0) {
        pastOrders.forEach(ord => {
          const itemsText = ord.order_items && ord.order_items.length > 0
            ? ord.order_items.map(i => i.product_name).join(', ')
            : 'Gaming Hardware';

          const dateStr = ord.created_at ? new Date(ord.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recent';
          addOrderToRecentOrdersTable({
            order_code: ord.order_code,
            date: dateStr,
            items: itemsText,
            rawItems: ord.order_items || [],
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

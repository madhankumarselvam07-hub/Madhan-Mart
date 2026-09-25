/**
 * MADHAN MART - Dashboard Script
 * Pure Vanilla JavaScript
 */

document.addEventListener('DOMContentLoaded', () => {
  // --------------------------------------------------------------------------
  // 1. Authentication Check & User Profile Hydration
  // --------------------------------------------------------------------------
  const sessionData = localStorage.getItem('madhan_mart_current_user');
  let currentUser = null;

  if (sessionData) {
    try {
      currentUser = JSON.parse(sessionData);
    } catch (e) {
      currentUser = null;
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
    logoutBtn.addEventListener('click', () => {
      showToast('Signing out...');
      localStorage.removeItem('madhan_mart_current_user');
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 700);
    });
  }

  // --------------------------------------------------------------------------
  // 4. Cart Counter & Add to Cart Interactions
  // --------------------------------------------------------------------------
  let cartCount = 0;
  const cartBadge = document.getElementById('cartBadge');
  const addCartButtons = document.querySelectorAll('.btn-add-cart');

  addCartButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const productName = btn.getAttribute('data-name') || 'Item';
      cartCount += 1;
      if (cartBadge) {
        cartBadge.textContent = cartCount;
        cartBadge.style.transform = 'scale(1.25)';
        setTimeout(() => {
          cartBadge.style.transform = 'scale(1)';
        }, 150);
      }
      showToast(`🛒 Added "${productName}" to your cart!`);
    });
  });

  // --------------------------------------------------------------------------
  // 5. Category Filtering
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
  // 6. Search Filter
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
  // 7. Toast Notification Helper
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
    }, 2500);
  }
});

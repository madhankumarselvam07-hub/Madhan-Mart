/**
 * MADHAN MART - Supabase Client Integration
 * Pure Vanilla JavaScript Client with 3-Role Support (Buyer, Seller, Admin)
 */

const SUPABASE_CONFIG = {
  url: 'https://jpmsviyournhtjaqmzfr.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpwbXN2aXlvdXJuaHRqYXFtemZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAzMzM3MDUsImV4cCI6MjEwNTkwOTcwNX0.-4tHZXqV19QCXizVX2QfAEvrhiBJqMrx803clppJPsk'
};

// Built-in Demo & Fallback Accounts (3-Role System)
const BUILTIN_DEMO_ACCOUNTS = [
  {
    email: 'admin@madhanmart.com',
    password: 'Admin@123',
    fullName: 'System Administrator',
    role: 'admin',
    id: '00000000-0000-0000-0000-000000000001'
  },
  {
    email: 'seller@madhanmart.com',
    password: 'Seller@123',
    fullName: 'Tech Deals Official',
    role: 'seller',
    id: '00000000-0000-0000-0000-000000000002'
  },
  {
    email: 'buyer@madhanmart.com',
    password: 'Buyer@123',
    fullName: 'Madhan Kumar',
    role: 'buyer',
    id: '00000000-0000-0000-0000-000000000003'
  }
];

// Lazy / Safe Supabase Client Initializer
function getSupabase() {
  if (!window._madhanMartSupabaseInstance) {
    if (window.supabase && typeof window.supabase.createClient === 'function') {
      window._madhanMartSupabaseInstance = window.supabase.createClient(
        SUPABASE_CONFIG.url,
        SUPABASE_CONFIG.anonKey
      );
    }
  }
  return window._madhanMartSupabaseInstance;
}

window.MadhanMartSupabase = {
  get client() {
    return getSupabase();
  },

  // --------------------------------------------------------------------------
  // 1. Authentication (3-Role Support: Buyer, Seller, Admin)
  // --------------------------------------------------------------------------

  // Sign Up with Email, Password, Full Name and Role (buyer or seller)
  async signUp(email, password, fullName, role = 'buyer') {
    const sb = getSupabase();
    if (!sb) throw new Error('Supabase client is loading. Please try again.');

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = fullName.trim();
    const cleanPassword = password;
    const cleanRole = (role || 'buyer').toLowerCase();

    let authUserId = null;

    // 1. Insert/Upsert row directly into public.users table in Supabase Cloud DB
    try {
      const { data: dbData, error: dbError } = await sb
        .from('users')
        .upsert([{
          full_name: cleanName,
          email: cleanEmail,
          role: cleanRole,
          password_hash: cleanPassword
        }], { onConflict: 'email' });

      if (dbError) {
        console.warn('[SUPABASE DB] Users table upsert notice:', dbError);
      } else {
        console.log('[SUPABASE DB] Successfully stored user in public.users:', cleanEmail, 'Role:', cleanRole);
      }
    } catch (dbErr) {
      console.warn('[SUPABASE DB] Insert exception:', dbErr);
    }

    // 2. Register with Supabase Auth
    try {
      const { data: authData, error: authError } = await sb.auth.signUp({
        email: cleanEmail,
        password: cleanPassword,
        options: {
          data: {
            full_name: cleanName,
            role: cleanRole
          }
        }
      });

      if (authError) {
        console.warn('[SUPABASE AUTH] Sign up notice:', authError.message);
      }
      if (authData && authData.user) {
        authUserId = authData.user.id;
      }
    } catch (authEx) {
      console.warn('[SUPABASE AUTH] Sign up exception:', authEx);
    }

    return { email: cleanEmail, fullName: cleanName, role: cleanRole, id: authUserId };
  },

  // Sign In with Email, Password and optional requested Role
  async signIn(email, password, requestedRole = null) {
    const sb = getSupabase();
    if (!sb) throw new Error('Supabase client is not ready.');

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password;

    // A. Check Built-in Demo Accounts (Admin, Seller, Buyer)
    const demoMatch = BUILTIN_DEMO_ACCOUNTS.find(
      (acc) => acc.email === cleanEmail && (acc.password === cleanPassword || cleanPassword === 'admin123' || cleanPassword === 'Admin@123' || cleanPassword === 'Seller@123' || cleanPassword === 'Buyer@123')
    );
    if (demoMatch) {
      const sessionData = {
        id: demoMatch.id,
        email: demoMatch.email,
        fullName: demoMatch.fullName,
        role: demoMatch.role,
        loginTime: new Date().toISOString()
      };
      localStorage.setItem('madhan_mart_current_user', JSON.stringify(sessionData));
      return sessionData;
    }

    // Admin Special Check (Allow admin@... to authenticate with admin credentials)
    if (cleanEmail.includes('admin') && (cleanPassword === 'Admin@123' || cleanPassword === 'admin123' || cleanPassword === 'admin')) {
      const sessionData = {
        id: '00000000-0000-0000-0000-000000000001',
        email: cleanEmail,
        fullName: 'System Administrator',
        role: 'admin',
        loginTime: new Date().toISOString()
      };
      localStorage.setItem('madhan_mart_current_user', JSON.stringify(sessionData));
      return sessionData;
    }

    let authUser = null;
    let authErrorOccurred = false;
    let authErrorMessage = '';

    // B. Try Supabase Auth API
    try {
      const { data, error } = await sb.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPassword
      });

      if (error) {
        authErrorOccurred = true;
        authErrorMessage = error.message || 'Invalid credentials';
        console.warn('[SUPABASE AUTH] Sign in rejected:', authErrorMessage);
      } else if (data && data.user) {
        authUser = data.user;
      }
    } catch (e) {
      authErrorOccurred = true;
      authErrorMessage = e.message || 'Auth exception';
      console.warn('[SUPABASE AUTH] Exception:', e);
    }

    // C. If Supabase Auth succeeded, extract full name and role
    if (authUser && !authErrorOccurred) {
      let fullName = cleanEmail.split('@')[0];
      let userRole = requestedRole || 'buyer';
      let userId = authUser.id;

      try {
        const { data: userRow } = await sb
          .from('users')
          .select('*')
          .eq('email', cleanEmail)
          .maybeSingle();

        if (userRow) {
          if (userRow.full_name) fullName = userRow.full_name;
          if (userRow.role) userRole = userRow.role;
        } else {
          const meta = authUser.user_metadata || {};
          fullName = meta.full_name || meta.name || fullName;
          if (meta.role) userRole = meta.role;
        }
      } catch (dbErr) {
        console.warn('[SUPABASE DB] Fetch user error:', dbErr);
      }

      const sessionData = {
        id: userId,
        email: cleanEmail,
        fullName: fullName,
        role: userRole,
        loginTime: new Date().toISOString()
      };

      localStorage.setItem('madhan_mart_current_user', JSON.stringify(sessionData));
      return sessionData;
    }

    // D. Cloud Database Verification (For unconfirmed emails, rate limits, or direct table sync)
    try {
      const { data: dbUser, error: dbError } = await sb
        .from('users')
        .select('*')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (dbUser) {
        const storedPass = dbUser.password_hash;
        if (!storedPass || storedPass === cleanPassword || storedPass === 'managed_by_supabase_auth') {
          console.log('[SUPABASE DB] Validated login via public.users for:', cleanEmail);
          const sessionData = {
            id: dbUser.id || null,
            email: cleanEmail,
            fullName: dbUser.full_name || cleanEmail.split('@')[0],
            role: dbUser.role || requestedRole || 'buyer',
            loginTime: new Date().toISOString()
          };
          localStorage.setItem('madhan_mart_current_user', JSON.stringify(sessionData));
          return sessionData;
        } else {
          throw new Error('Incorrect password. Please check your password and try again.');
        }
      }
    } catch (dbEx) {
      if (dbEx.message && dbEx.message.includes('Incorrect password')) {
        throw dbEx;
      }
      console.warn('[SUPABASE DB] Cloud login lookup notice:', dbEx);
    }

    // E. Local backup store check (for offline/locally registered accounts)
    const registeredUsers = JSON.parse(localStorage.getItem('madhan_mart_users') || '[]');
    const matchedLocal = registeredUsers.find(
      (u) => u.email.toLowerCase() === cleanEmail
    );

    if (matchedLocal) {
      if (matchedLocal.password === cleanPassword) {
        const sessionData = {
          id: matchedLocal.id || null,
          email: cleanEmail,
          fullName: matchedLocal.fullName || cleanEmail.split('@')[0],
          role: matchedLocal.role || requestedRole || 'buyer',
          loginTime: new Date().toISOString()
        };
        localStorage.setItem('madhan_mart_current_user', JSON.stringify(sessionData));
        return sessionData;
      } else {
        throw new Error('Incorrect password. Please check your password and try again.');
      }
    }

    // F. User not found anywhere
    throw new Error('No account found with this email. Please click "Create Account" below to register.');
  },

  // Sign Out
  async signOut() {
    localStorage.removeItem('madhan_mart_current_user');
    const sb = getSupabase();
    if (sb) {
      try {
        await sb.auth.signOut();
      } catch (e) {
        console.warn('[SUPABASE] Sign out notice:', e);
      }
    }
  },

  // Check Current Session & Hydrate (e.g. Google OAuth or page reload)
  async getCurrentSession() {
    const localUser = localStorage.getItem('madhan_mart_current_user');
    if (localUser) {
      try {
        return JSON.parse(localUser);
      } catch (e) {}
    }

    const sb = getSupabase();
    if (!sb) return null;

    try {
      const { data: { session }, error } = await sb.auth.getSession();
      if (!error && session && session.user) {
        const user = session.user;
        const meta = user.user_metadata || {};
        const fullName = meta.full_name || meta.name || user.email.split('@')[0];
        const role = meta.role || 'buyer';

        // Ensure row exists in public.users
        try {
          await sb.from('users').upsert([{
            id: user.id,
            full_name: fullName,
            email: user.email,
            role: role,
            password_hash: 'google_oauth_provider'
          }], { onConflict: 'email' });
        } catch (e) {}

        const userData = {
          id: user.id,
          email: user.email,
          fullName: fullName,
          role: role
        };

        localStorage.setItem('madhan_mart_current_user', JSON.stringify(userData));
        return userData;
      }
    } catch (e) {
      console.warn('[SUPABASE] Session check error:', e);
    }
    return null;
  },

  // --------------------------------------------------------------------------
  // 2. Products Database (Catalog, Search, Add, Edit, Delete for Sellers & Admins)
  // --------------------------------------------------------------------------
  async getProducts(category = 'all') {
    const sb = getSupabase();
    if (!sb) {
      return this.getLocalFallbackProducts();
    }

    try {
      let query = sb.from('products').select('*');
      if (category && category !== 'all') {
        query = query.eq('category', category);
      }
      query = query.order('created_at', { ascending: true });

      const { data, error } = await query;
      if (error || !data || data.length === 0) {
        return this.getLocalFallbackProducts(category);
      }
      return data;
    } catch (e) {
      console.warn('[SUPABASE] Products query error:', e);
      return this.getLocalFallbackProducts(category);
    }
  },

  // Seller/Admin: Add Product
  async addProduct(product) {
    const sb = getSupabase();
    const newProduct = {
      name: product.name,
      category: product.category || 'peripherals',
      badge: product.badge || 'New',
      image_url: product.image_url || 'images/laptop.jpg',
      emoji: product.emoji || '📦',
      price: parseFloat(product.price) || 0,
      original_price: parseFloat(product.original_price) || parseFloat(product.price) * 1.2,
      rating: 5.0,
      stock_quantity: parseInt(product.stock_quantity) || 50,
      seller_email: product.seller_email || 'seller@madhanmart.com',
      seller_name: product.seller_name || 'Tech Deals Official',
      is_available: true
    };

    if (sb) {
      try {
        const { data, error } = await sb.from('products').insert([newProduct]).select().single();
        if (!error && data) {
          return data;
        }
      } catch (e) {
        console.warn('[SUPABASE] Product insert error:', e);
      }
    }

    // Local fallback store
    const localProducts = JSON.parse(localStorage.getItem('madhan_mart_custom_products') || '[]');
    newProduct.id = 'prod_' + Date.now();
    localProducts.unshift(newProduct);
    localStorage.setItem('madhan_mart_custom_products', JSON.stringify(localProducts));
    return newProduct;
  },

  // Seller/Admin: Update Product
  async updateProduct(id, updates) {
    const sb = getSupabase();
    if (sb) {
      try {
        const { data, error } = await sb.from('products').update(updates).eq('id', id).select().single();
        if (!error && data) return data;
      } catch (e) {
        console.warn('[SUPABASE] Update product error:', e);
      }
    }

    const localProducts = JSON.parse(localStorage.getItem('madhan_mart_custom_products') || '[]');
    const idx = localProducts.findIndex(p => p.id === id);
    if (idx !== -1) {
      localProducts[idx] = { ...localProducts[idx], ...updates };
      localStorage.setItem('madhan_mart_custom_products', JSON.stringify(localProducts));
      return localProducts[idx];
    }
    return updates;
  },

  // Seller/Admin: Delete Product
  async deleteProduct(id) {
    const sb = getSupabase();
    if (sb) {
      try {
        const { error } = await sb.from('products').delete().eq('id', id);
        if (!error) return true;
      } catch (e) {
        console.warn('[SUPABASE] Delete product error:', e);
      }
    }

    // Remove from local custom products
    const localProducts = JSON.parse(localStorage.getItem('madhan_mart_custom_products') || '[]');
    const filtered = localProducts.filter(p => p.id !== id);
    localStorage.setItem('madhan_mart_custom_products', JSON.stringify(filtered));

    // Also track deleted system products in local storage
    const deletedIds = JSON.parse(localStorage.getItem('madhan_mart_deleted_products') || '[]');
    deletedIds.push(id);
    localStorage.setItem('madhan_mart_deleted_products', JSON.stringify(deletedIds));
    return true;
  },

  // Fallback initial products
  getLocalFallbackProducts(category = 'all') {
    const defaults = [
      { id: '1', name: 'Dell Inspiron 15 Core i5 Laptop', category: 'laptops', badge: 'Bestseller', image_url: 'images/laptop.jpg', emoji: '💻', price: 45000.00, original_price: 52000.00, rating: 4.8, stock_quantity: 25, seller_email: 'seller@madhanmart.com', seller_name: 'Tech Deals Official' },
      { id: '2', name: 'Samsung Galaxy 5G Mobile', category: 'mobiles', badge: 'Top Deal', image_url: 'images/mobile.jpg', emoji: '📱', price: 18000.00, original_price: 22000.00, rating: 4.7, stock_quantity: 40, seller_email: 'seller@madhanmart.com', seller_name: 'Tech Deals Official' },
      { id: '3', name: 'PlayStation 5 DualSense Wireless Controller', category: 'consoles', badge: 'Bestseller', image_url: 'images/ps5-controller.jpg', emoji: '🎮', price: 5790.00, original_price: 6490.00, rating: 4.9, stock_quantity: 50, seller_email: 'seller@madhanmart.com', seller_name: 'Tech Deals Official' },
      { id: '4', name: 'Razer Huntsman Mini 60% Optical Keyboard', category: 'peripherals', badge: '20% OFF', image_url: 'images/razer-keyboard.jpg', emoji: '⌨️', price: 7999.00, original_price: 9999.00, rating: 4.8, stock_quantity: 35, seller_email: 'seller@madhanmart.com', seller_name: 'Tech Deals Official' },
      { id: '5', name: 'HyperX Cloud Alpha Wireless 7.1 Gaming Headset', category: 'audio', badge: 'New', image_url: 'images/hyperx-headset.jpg', emoji: '🎧', price: 12499.00, original_price: 15999.00, rating: 4.9, stock_quantity: 25, seller_email: 'seller@madhanmart.com', seller_name: 'Tech Deals Official' },
      { id: '6', name: 'Logitech G502 X PLUS Wireless RGB Gaming Mouse', category: 'peripherals', badge: '15% OFF', image_url: 'images/logitech-mouse.jpg', emoji: '🖱️', price: 8495.00, original_price: 9995.00, rating: 4.7, stock_quantity: 40, seller_email: 'seller@madhanmart.com', seller_name: 'Tech Deals Official' },
      { id: '7', name: 'ROG Swift OLED 27" 240Hz 0.03ms Gaming Monitor', category: 'hardware', badge: 'Hot Deal', image_url: 'images/rog-monitor.jpg', emoji: '🖥️', price: 64990.00, original_price: 74990.00, rating: 5.0, stock_quantity: 15, seller_email: 'seller@madhanmart.com', seller_name: 'Tech Deals Official' },
      { id: '8', name: 'Meta Quest 3 128GB All-In-One VR Headset', category: 'consoles', badge: 'Trending', image_url: 'images/meta-quest-vr.jpg', emoji: '🥽', price: 46990.00, original_price: 52990.00, rating: 4.8, stock_quantity: 20, seller_email: 'seller@madhanmart.com', seller_name: 'Tech Deals Official' },
      { id: '9', name: 'Secretlab TITAN Evo Ergonomic Gaming Chair', category: 'accessories', badge: 'Top Rated', image_url: 'images/gaming-chair.jpg', emoji: '💺', price: 34999.00, original_price: 41999.00, rating: 4.9, stock_quantity: 10, seller_email: 'seller@madhanmart.com', seller_name: 'Tech Deals Official' },
      { id: '10', name: 'Elgato Stream Deck MK.2 – 15 Macro RGB Keys', category: 'accessories', badge: 'Creator Pick', image_url: 'images/stream-deck.jpg', emoji: '🕹️', price: 13499.00, original_price: 15999.00, rating: 4.9, stock_quantity: 30, seller_email: 'seller@madhanmart.com', seller_name: 'Tech Deals Official' }
    ];

    const customProducts = JSON.parse(localStorage.getItem('madhan_mart_custom_products') || '[]');
    const deletedIds = JSON.parse(localStorage.getItem('madhan_mart_deleted_products') || '[]');

    const all = [...customProducts, ...defaults].filter(p => !deletedIds.includes(p.id));
    if (category && category !== 'all') {
      return all.filter(p => p.category === category);
    }
    return all;
  },

  // --------------------------------------------------------------------------
  // 3. Orders Database (Orders, Status Updates & Multi-Role Querying)
  // --------------------------------------------------------------------------
  async createOrder(items, totalAmount, targetUser = null, orderDetails = {}) {
    const sb = getSupabase();

    let userId = null;
    let userEmail = 'buyer@madhanmart.com';

    if (targetUser && targetUser.email) {
      userEmail = targetUser.email.trim().toLowerCase();
      userId = targetUser.id;
    } else {
      const localUser = localStorage.getItem('madhan_mart_current_user');
      if (localUser) {
        try {
          const parsed = JSON.parse(localUser);
          if (parsed.email) userEmail = parsed.email.trim().toLowerCase();
          if (parsed.id) userId = parsed.id;
        } catch (e) {}
      }
    }

    const orderCode = '#MM-' + Math.floor(10000 + Math.random() * 90000);

    const orderPayload = {
      order_code: orderCode,
      user_email: userEmail,
      total_amount: totalAmount,
      status: 'Pending',
      shipping_address: orderDetails.shipping_address || 'Chennai, Tamil Nadu',
      phone_number: orderDetails.phone_number || '',
      city: orderDetails.city || 'Chennai',
      pincode: orderDetails.pincode || '600025',
      payment_method: orderDetails.payment_method || 'Google Pay / UPI'
    };

    if (userId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
      orderPayload.user_id = userId;
    }

    let orderData = null;
    if (sb) {
      try {
        const { data, error } = await sb.from('orders').insert([orderPayload]).select().single();
        if (!error && data) {
          orderData = data;
        }
      } catch (orderError) {
        console.warn('[SUPABASE] Rich order insert notice:', orderError);
      }
    }

    // Insert order items if order was created in Supabase
    if (sb && items && items.length > 0 && orderData && orderData.id) {
      try {
        const orderItemsToInsert = items.map(item => ({
          order_id: orderData.id,
          product_name: item.name,
          quantity: item.quantity || 1,
          unit_price: item.price
        }));
        await sb.from('order_items').insert(orderItemsToInsert);
      } catch (itemErr) {
        console.warn('[SUPABASE] Order items insert notice:', itemErr);
      }
    }

    const createdOrder = orderData || {
      id: 'ord_' + Date.now(),
      order_code: orderCode,
      total_amount: totalAmount,
      user_email: userEmail,
      status: 'Pending',
      created_at: new Date().toISOString(),
      items: items
    };

    // Store in all orders master array in localStorage
    const masterOrders = JSON.parse(localStorage.getItem('madhan_mart_all_orders') || '[]');
    masterOrders.unshift(createdOrder);
    localStorage.setItem('madhan_mart_all_orders', JSON.stringify(masterOrders));

    return createdOrder;
  },

  // Get Buyer Orders
  async getUserOrders(targetUser = null) {
    const sb = getSupabase();
    let userEmail = null;
    let userId = null;

    if (targetUser && targetUser.email) {
      userEmail = targetUser.email.trim().toLowerCase();
      userId = targetUser.id;
    } else {
      const localUser = localStorage.getItem('madhan_mart_current_user');
      if (localUser) {
        try {
          const parsed = JSON.parse(localUser);
          if (parsed.email) userEmail = parsed.email.trim().toLowerCase();
          if (parsed.id) userId = parsed.id;
        } catch (e) {}
      }
    }

    if (!userEmail && !userId) return [];

    if (sb) {
      try {
        let query = sb.from('orders').select('*');
        if (userId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
          query = query.or(`user_id.eq.${userId},user_email.eq.${userEmail}`);
        } else if (userEmail) {
          query = query.eq('user_email', userEmail);
        }

        const { data, error } = await query.order('created_at', { ascending: false });
        if (!error && data && data.length > 0) return data;
      } catch (e) {
        console.warn('[SUPABASE] Orders query error:', e);
      }
    }

    // Local fallback
    const masterOrders = JSON.parse(localStorage.getItem('madhan_mart_all_orders') || '[]');
    return masterOrders.filter(o => o.user_email && o.user_email.toLowerCase() === userEmail);
  },

  // Admin / Seller: Get All System Orders
  async getAllOrders() {
    const sb = getSupabase();
    if (sb) {
      try {
        const { data, error } = await sb.from('orders').select('*').order('created_at', { ascending: false });
        if (!error && data && data.length > 0) return data;
      } catch (e) {
        console.warn('[SUPABASE] All orders query error:', e);
      }
    }

    return JSON.parse(localStorage.getItem('madhan_mart_all_orders') || '[]');
  },

  // Admin / Seller: Update Order Status (Pending -> Delivered / Cancelled)
  async updateOrderStatus(orderId, newStatus) {
    const sb = getSupabase();
    if (sb) {
      try {
        await sb.from('orders').update({ status: newStatus }).eq('id', orderId);
      } catch (e) {
        console.warn('[SUPABASE] Update order status error:', e);
      }
    }

    const masterOrders = JSON.parse(localStorage.getItem('madhan_mart_all_orders') || '[]');
    const idx = masterOrders.findIndex(o => o.id === orderId || o.order_code === orderId);
    if (idx !== -1) {
      masterOrders[idx].status = newStatus;
      localStorage.setItem('madhan_mart_all_orders', JSON.stringify(masterOrders));
    }
    return true;
  },

  // --------------------------------------------------------------------------
  // 4. Admin Management (All Users)
  // --------------------------------------------------------------------------
  async getAllUsers() {
    const sb = getSupabase();
    let cloudUsers = [];

    if (sb) {
      try {
        const { data, error } = await sb.from('users').select('*').order('created_at', { ascending: false });
        if (!error && data) {
          cloudUsers = data;
        }
      } catch (e) {
        console.warn('[SUPABASE] All users query error:', e);
      }
    }

    const localUsers = JSON.parse(localStorage.getItem('madhan_mart_users') || '[]');
    
    // Combine and deduplicate users
    const userMap = new Map();
    BUILTIN_DEMO_ACCOUNTS.forEach(u => userMap.set(u.email.toLowerCase(), u));
    cloudUsers.forEach(u => userMap.set(u.email.toLowerCase(), u));
    localUsers.forEach(u => userMap.set(u.email.toLowerCase(), {
      ...u,
      role: u.role || 'buyer'
    }));

    return Array.from(userMap.values());
  },

  // --------------------------------------------------------------------------
  // 5. Product Reviews (Buyer Ratings & Comments)
  // --------------------------------------------------------------------------
  async getReviews(productId) {
    const sb = getSupabase();
    if (sb) {
      try {
        const { data, error } = await sb.from('reviews').select('*').eq('product_id', productId).order('created_at', { ascending: false });
        if (!error && data) return data;
      } catch (e) {}
    }

    const localReviews = JSON.parse(localStorage.getItem('madhan_mart_reviews') || '[]');
    return localReviews.filter(r => r.product_id === productId);
  },

  async addReview(reviewData) {
    const sb = getSupabase();
    const newRev = {
      product_id: reviewData.product_id,
      user_email: reviewData.user_email || 'buyer@madhanmart.com',
      user_name: reviewData.user_name || 'Buyer',
      rating: parseInt(reviewData.rating) || 5,
      comment: reviewData.comment || 'Great product!',
      created_at: new Date().toISOString()
    };

    if (sb) {
      try {
        const { data, error } = await sb.from('reviews').insert([newRev]).select().single();
        if (!error && data) return data;
      } catch (e) {}
    }

    const localReviews = JSON.parse(localStorage.getItem('madhan_mart_reviews') || '[]');
    newRev.id = 'rev_' + Date.now();
    localReviews.unshift(newRev);
    localStorage.setItem('madhan_mart_reviews', JSON.stringify(localReviews));
    return newRev;
  }
};

/**
 * MADHAN MART - Supabase Client Integration
 * Dedicated Table Architecture: Buyers (public.buyers), Sellers (public.sellers), Admins (public.admins)
 */

const SUPABASE_CONFIG = {
  url: 'https://jpmsviyournhtjaqmzfr.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpwbXN2aXlvdXJuaHRqYXFtemZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAzMzM3MDUsImV4cCI6MjEwNTkwOTcwNX0.-4tHZXqV19QCXizVX2QfAEvrhiBJqMrx803clppJPsk'
};

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

function generateClientUUID() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch (e) {}
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

window.MadhanMartSupabase = {
  get client() {
    return getSupabase();
  },

  // --------------------------------------------------------------------------
  // 1. Role-Specific Dedicated Table Registration
  // --------------------------------------------------------------------------
  async signUp(email, password, fullName, role = 'buyer', extraData = {}) {
    const sb = getSupabase();
    if (!sb) throw new Error('Supabase client is loading. Please try again.');

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = fullName.trim();
    const cleanPassword = password;
    const cleanRole = (role || 'buyer').toLowerCase();
    const storeName = extraData.storeName || `${cleanName}'s Store`;

    let authUserId = null;

    // 1. Insert into Master public.users table
    try {
      await sb.from('users').upsert([{
        full_name: cleanName,
        email: cleanEmail,
        role: cleanRole,
        password_hash: cleanPassword
      }], { onConflict: 'email' });
    } catch (e) {
      console.warn('[SUPABASE] Master user sync notice:', e);
    }

    // 2. Insert into Role-Specific Dedicated Table (public.sellers / public.buyers / public.admins)
    if (cleanRole === 'seller') {
      try {
        const { error: sellerErr } = await sb.from('sellers').upsert([{
          full_name: cleanName,
          email: cleanEmail,
          store_name: storeName,
          password_hash: cleanPassword
        }], { onConflict: 'email' });

        if (sellerErr) console.warn('[SUPABASE] Seller table insert notice:', sellerErr);
      } catch (sellerEx) {
        console.warn('[SUPABASE] Seller table exception:', sellerEx);
      }

      // Local backup for sellers
      const localSellers = JSON.parse(localStorage.getItem('madhan_mart_sellers') || '[]');
      localSellers.push({ fullName: cleanName, email: cleanEmail, storeName, password: cleanPassword, role: 'seller' });
      localStorage.setItem('madhan_mart_sellers', JSON.stringify(localSellers));

    } else if (cleanRole === 'buyer') {
      try {
        const { error: buyerErr } = await sb.from('buyers').upsert([{
          full_name: cleanName,
          email: cleanEmail,
          password_hash: cleanPassword
        }], { onConflict: 'email' });

        if (buyerErr) console.warn('[SUPABASE] Buyer table insert notice:', buyerErr);
      } catch (buyerEx) {
        console.warn('[SUPABASE] Buyer table exception:', buyerEx);
      }

      // Local backup for buyers
      const localBuyers = JSON.parse(localStorage.getItem('madhan_mart_buyers') || '[]');
      localBuyers.push({ fullName: cleanName, email: cleanEmail, password: cleanPassword, role: 'buyer' });
      localStorage.setItem('madhan_mart_buyers', JSON.stringify(localBuyers));
    }

    // Local general user store
    const localUsers = JSON.parse(localStorage.getItem('madhan_mart_users') || '[]');
    localUsers.push({ fullName: cleanName, email: cleanEmail, password: cleanPassword, role: cleanRole, storeName });
    localStorage.setItem('madhan_mart_users', JSON.stringify(localUsers));

    // 3. Register with Supabase Auth API
    try {
      const { data: authData } = await sb.auth.signUp({
        email: cleanEmail,
        password: cleanPassword,
        options: {
          data: {
            full_name: cleanName,
            role: cleanRole,
            store_name: storeName
          }
        }
      });
      if (authData && authData.user) {
        authUserId = authData.user.id;
      }
    } catch (authEx) {}

    return { email: cleanEmail, fullName: cleanName, role: cleanRole, id: authUserId };
  },

  // --------------------------------------------------------------------------
  // 2. Strict Dedicated Table Login & Role Isolation Enforcement
  // --------------------------------------------------------------------------
  async signIn(email, password, requestedRole = 'buyer') {
    const sb = getSupabase();
    if (!sb) throw new Error('Supabase client is not ready.');

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password;
    const cleanRole = (requestedRole || 'buyer').toLowerCase();

    // 1. Verify User Role from Dedicated Table / Master Table
    let userRecord = null;
    let actualRole = null;
    let fullName = cleanEmail.split('@')[0];

    // Check Cloud Database
    if (cleanRole === 'seller') {
      try {
        const { data: sellerData } = await sb.from('sellers').select('*').eq('email', cleanEmail).maybeSingle();
        if (sellerData) {
          userRecord = sellerData;
          actualRole = 'seller';
          fullName = sellerData.full_name || fullName;
        }
      } catch (e) {}

      // If not found in sellers, check if registered in buyers or admins to provide clear feedback
      if (!userRecord) {
        try {
          const { data: bData } = await sb.from('buyers').select('*').eq('email', cleanEmail).maybeSingle();
          if (bData) {
            throw new Error('This account is registered as a Buyer. Please switch to the Buyer login tab.');
          }
          const { data: aData } = await sb.from('admins').select('*').eq('email', cleanEmail).maybeSingle();
          if (aData) {
            throw new Error('This account is an Administrator. Please switch to the Admin login tab.');
          }
        } catch (e) {
          if (e.message && e.message.includes('registered as') || e.message.includes('Administrator')) throw e;
        }

        // Check local store
        const localSellers = JSON.parse(localStorage.getItem('madhan_mart_sellers') || '[]');
        const matchedSeller = localSellers.find(s => s.email.toLowerCase() === cleanEmail);
        if (matchedSeller) {
          userRecord = matchedSeller;
          actualRole = 'seller';
          fullName = matchedSeller.fullName || fullName;
        } else {
          throw new Error('No Seller account found with this email. Please register as a Seller first.');
        }
      }

    } else if (cleanRole === 'admin') {
      try {
        const { data: adminData } = await sb.from('admins').select('*').eq('email', cleanEmail).maybeSingle();
        if (adminData) {
          userRecord = adminData;
          actualRole = 'admin';
          fullName = adminData.full_name || fullName;
        }
      } catch (e) {}

      // Fallback check for admin in public.users
      if (!userRecord) {
        try {
          const { data: uData } = await sb.from('users').select('*').eq('email', cleanEmail).eq('role', 'admin').maybeSingle();
          if (uData) {
            userRecord = uData;
            actualRole = 'admin';
            fullName = uData.full_name || fullName;
          }
        } catch (e) {}
      }

      if (!userRecord) {
        throw new Error('Access Denied: This email address is not registered in the Administrator registry.');
      }

    } else {
      // Buyer Role Verification
      try {
        const { data: sellerCheck } = await sb.from('sellers').select('*').eq('email', cleanEmail).maybeSingle();
        if (sellerCheck) {
          throw new Error('This account is registered as a Seller. Please switch to the Seller login tab.');
        }

        const { data: adminCheck } = await sb.from('admins').select('*').eq('email', cleanEmail).maybeSingle();
        if (adminCheck) {
          throw new Error('This account is an Administrator. Please switch to the Admin login tab.');
        }

        const { data: buyerData } = await sb.from('buyers').select('*').eq('email', cleanEmail).maybeSingle();
        if (buyerData) {
          userRecord = buyerData;
          actualRole = 'buyer';
          fullName = buyerData.full_name || fullName;
        } else {
          const { data: userData } = await sb.from('users').select('*').eq('email', cleanEmail).maybeSingle();
          if (userData && userData.role !== 'seller' && userData.role !== 'admin') {
            userRecord = userData;
            actualRole = 'buyer';
            fullName = userData.full_name || fullName;
          }
        }
      } catch (e) {
        if (e.message && (e.message.includes('registered as a Seller') || e.message.includes('Administrator'))) throw e;
      }

      // Check local buyers
      if (!userRecord) {
        const localBuyers = JSON.parse(localStorage.getItem('madhan_mart_buyers') || '[]');
        const matchedBuyer = localBuyers.find(b => b.email.toLowerCase() === cleanEmail);
        if (matchedBuyer) {
          userRecord = matchedBuyer;
          actualRole = 'buyer';
          fullName = matchedBuyer.fullName || fullName;
        } else {
          const localUsers = JSON.parse(localStorage.getItem('madhan_mart_users') || '[]');
          const matchedUser = localUsers.find(u => u.email.toLowerCase() === cleanEmail);
          if (matchedUser && matchedUser.role === 'buyer') {
            userRecord = matchedUser;
            actualRole = 'buyer';
            fullName = matchedUser.fullName || fullName;
          } else if (matchedUser && matchedUser.role === 'seller') {
            throw new Error('This account is registered as a Seller. Please switch to the Seller login tab.');
          } else if (matchedUser && matchedUser.role === 'admin') {
            throw new Error('This account is an Administrator. Please switch to the Admin login tab.');
          }
        }
      }

      if (!userRecord) {
        throw new Error('No Buyer account found with this email. Please click "Create Account" below to register.');
      }
    }

    // 2. Validate Password
    let passwordMatched = false;

    // Check Supabase Auth API
    try {
      const { data, error } = await sb.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPassword
      });
      if (!error && data && data.user) {
        passwordMatched = true;
      }
    } catch (e) {}

    // Check Password Hash in DB
    if (!passwordMatched && userRecord) {
      const storedPass = userRecord.password_hash || userRecord.password;
      if (storedPass === cleanPassword || storedPass === 'managed_by_supabase_auth') {
        passwordMatched = true;
      }
    }

    if (!passwordMatched) {
      throw new Error('Incorrect password. Please check your credentials and try again.');
    }

    // 3. Create Session with Strict Locked Role
    const sessionData = {
      id: userRecord.id || userRecord.user_id || 'user_' + Date.now(),
      email: cleanEmail,
      fullName: fullName,
      role: actualRole,
      loginTime: new Date().toISOString()
    };

    localStorage.setItem('madhan_mart_current_user', JSON.stringify(sessionData));
    return sessionData;
  },

  // Sign Out
  async signOut() {
    localStorage.removeItem('madhan_mart_current_user');
    const sb = getSupabase();
    if (sb) {
      try {
        await sb.auth.signOut();
      } catch (e) {}
    }
  },

  // Check Current Session
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
        const role = meta.role || 'buyer';
        const fullName = meta.full_name || meta.name || user.email.split('@')[0];

        const userData = {
          id: user.id,
          email: user.email,
          fullName: fullName,
          role: role
        };

        localStorage.setItem('madhan_mart_current_user', JSON.stringify(userData));
        return userData;
      }
    } catch (e) {}
    return null;
  },

  async getProducts(category = 'all', sellerEmail = null) {
    const sb = getSupabase();
    if (!sb) return this.getLocalProducts(category);

    try {
      let query = sb.from('products').select('*');
      if (category && category !== 'all') {
        query = query.eq('category', category);
      }
      if (sellerEmail) {
        query = query.eq('seller_email', sellerEmail);
      }
      // Sort newest added products first
      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;
      if (!error && data && Array.isArray(data) && data.length > 0) {
        const deletedIds = JSON.parse(localStorage.getItem('madhan_mart_deleted_products') || '[]');
        return data.filter(p => !deletedIds.includes(p.id));
      }
      return this.getLocalProducts(category);
    } catch (e) {
      console.warn('[SUPABASE] getProducts notice:', e);
      return this.getLocalProducts(category);
    }
  },

  async addProduct(product) {
    const sb = getSupabase();
    let productId = product.id;
    if (!productId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(productId)) {
      productId = generateClientUUID();
    }

    const newProduct = {
      id: productId,
      name: product.name,
      category: product.category || 'laptops',
      badge: product.badge || '',
      image_url: product.image_url || 'images/laptop.jpg',
      emoji: product.emoji || '📦',
      price: parseFloat(product.price) || 0,
      original_price: parseFloat(product.original_price) || parseFloat(product.price) * 1.15,
      rating: 5.0,
      stock_quantity: parseInt(product.stock_quantity) || 20,
      seller_email: product.seller_email || '',
      seller_name: product.seller_name || 'Seller Store',
      is_available: true
    };

    let insertedItem = null;

    // 1. Try Supabase Client SDK
    if (sb) {
      try {
        const { data, error } = await sb.from('products').insert([newProduct]).select();
        if (!error && data && data.length > 0) {
          insertedItem = data[0];
          console.log('[SUPABASE] Product successfully saved via SDK:', insertedItem);
        } else if (error) {
          console.warn('[SUPABASE] SDK insert notice:', error);
        }
      } catch (sdkErr) {
        console.warn('[SUPABASE] SDK insert exception:', sdkErr);
      }
    }

    // 2. Direct REST API Fallback (Guaranteed to write directly to Supabase table)
    if (!insertedItem) {
      try {
        const restRes = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/products`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_CONFIG.anonKey,
            'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(newProduct)
        });

        if (restRes.ok) {
          const restData = await restRes.json();
          if (Array.isArray(restData) && restData.length > 0) {
            insertedItem = restData[0];
            console.log('[SUPABASE] Product successfully saved via REST API:', insertedItem);
          }
        } else {
          const errText = await restRes.text();
          console.error('[SUPABASE] REST API insert error:', errText);
          throw new Error(`Supabase Database Error: ${errText}`);
        }
      } catch (restErr) {
        console.error('[SUPABASE] Direct REST error:', restErr);
        throw restErr;
      }
    }

    if (!insertedItem) {
      throw new Error('Could not insert product into Supabase table.');
    }

    // Update local cache
    const localProducts = JSON.parse(localStorage.getItem('madhan_mart_custom_products') || '[]');
    localProducts.unshift(insertedItem);
    localStorage.setItem('madhan_mart_custom_products', JSON.stringify(localProducts));

    return insertedItem;
  },

  async updateProduct(id, updates) {
    const sb = getSupabase();
    let updatedItem = null;

    if (sb) {
      try {
        const { data, error } = await sb.from('products').update(updates).eq('id', id).select();
        if (!error && data && data.length > 0) {
          updatedItem = data[0];
        }
      } catch (e) {}
    }

    if (!updatedItem) {
      try {
        const restRes = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/products?id=eq.${id}`, {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_CONFIG.anonKey,
            'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(updates)
        });
        if (restRes.ok) {
          const restData = await restRes.json();
          if (Array.isArray(restData) && restData.length > 0) updatedItem = restData[0];
        }
      } catch (e) {}
    }

    const localProducts = JSON.parse(localStorage.getItem('madhan_mart_custom_products') || '[]');
    const idx = localProducts.findIndex(p => p.id === id);
    if (idx !== -1) {
      localProducts[idx] = { ...localProducts[idx], ...(updatedItem || updates) };
      localStorage.setItem('madhan_mart_custom_products', JSON.stringify(localProducts));
    }
    return updatedItem || updates;
  },

  async deleteProduct(id) {
    const sb = getSupabase();
    let deletedSuccess = false;

    if (sb) {
      try {
        const { error } = await sb.from('products').delete().eq('id', id);
        if (!error) deletedSuccess = true;
      } catch (e) {}
    }

    if (!deletedSuccess) {
      try {
        const restRes = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/products?id=eq.${id}`, {
          method: 'DELETE',
          headers: {
            'apikey': SUPABASE_CONFIG.anonKey,
            'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
            'Content-Type': 'application/json'
          }
        });
        if (restRes.ok) deletedSuccess = true;
      } catch (e) {}
    }

    const localProducts = JSON.parse(localStorage.getItem('madhan_mart_custom_products') || '[]');
    const filtered = localProducts.filter(p => p.id !== id);
    localStorage.setItem('madhan_mart_custom_products', JSON.stringify(filtered));

    const deletedIds = JSON.parse(localStorage.getItem('madhan_mart_deleted_products') || '[]');
    deletedIds.push(id);
    localStorage.setItem('madhan_mart_deleted_products', JSON.stringify(deletedIds));
    return true;
  },

  getLocalProducts(category = 'all') {
    const defaults = [
      { id: '3e3b915f-0890-4def-afd4-fb4db5ac223d', name: 'PlayStation 5 DualSense Wireless Controller', category: 'consoles', badge: 'Bestseller', image_url: 'images/ps5-controller.jpg', emoji: '🎮', price: 5790.00, original_price: 6490.00, rating: 4.9, stock_quantity: 50, seller_email: 'seller@madhanmart.com', seller_name: 'Official Tech Mart' },
      { id: '2974b341-06d0-48a1-86f3-3cdc973e4bc8', name: 'Razer Huntsman Mini 60% Optical Keyboard', category: 'peripherals', badge: '20% OFF', image_url: 'images/razer-keyboard.jpg', emoji: '⌨️', price: 7999.00, original_price: 9999.00, rating: 4.8, stock_quantity: 35, seller_email: 'seller@madhanmart.com', seller_name: 'Official Tech Mart' },
      { id: 'a0112bac-19cd-45b4-96e9-968ab79d1ead', name: 'HyperX Cloud Alpha Wireless 7.1 Gaming Headset', category: 'audio', badge: 'New', image_url: 'images/hyperx-headset.jpg', emoji: '🎧', price: 12499.00, original_price: 15999.00, rating: 4.9, stock_quantity: 25, seller_email: 'seller@madhanmart.com', seller_name: 'Official Tech Mart' },
      { id: '085d19a8-df99-4a60-adb7-fa8a308a5b69', name: 'Logitech G502 X PLUS Wireless RGB Gaming Mouse', category: 'peripherals', badge: '15% OFF', image_url: 'images/logitech-mouse.jpg', emoji: '🖱️', price: 8495.00, original_price: 9995.00, rating: 4.7, stock_quantity: 40, seller_email: 'seller@madhanmart.com', seller_name: 'Tech Deals' },
      { id: 'd95aa559-11b4-4bc1-b269-02f641063ccc', name: 'ROG Swift OLED 27" 240Hz 0.03ms Gaming Monitor', category: 'hardware', badge: 'Hot Deal', image_url: 'images/rog-monitor.jpg', emoji: '🖥️', price: 64990.00, original_price: 74990.00, rating: 5.0, stock_quantity: 15, seller_email: 'seller@madhanmart.com', seller_name: 'Tech Deals' },
      { id: 'cf66b5da-5995-44ba-8437-6451a3080b15', name: 'Meta Quest 3 128GB All-In-One VR Headset', category: 'consoles', badge: 'Trending', image_url: 'images/meta-quest-vr.jpg', emoji: '🥽', price: 46990.00, original_price: 52990.00, rating: 4.8, stock_quantity: 20, seller_email: 'seller@madhanmart.com', seller_name: 'Tech Deals' },
      { id: 'cdc2db4e-e5bc-47ce-a2ae-f50947b47214', name: 'Secretlab TITAN Evo Ergonomic Gaming Chair', category: 'accessories', badge: 'Top Rated', image_url: 'images/gaming-chair.jpg', emoji: '💺', price: 34999.00, original_price: 41999.00, rating: 4.9, stock_quantity: 10, seller_email: 'seller@madhanmart.com', seller_name: 'Tech Deals' },
      { id: 'b40bc392-4305-4bed-845c-3bd57c31e6fe', name: 'Elgato Stream Deck MK.2 – 15 Macro RGB Keys', category: 'accessories', badge: 'Creator Pick', image_url: 'images/stream-deck.jpg', emoji: '🕹️', price: 13499.00, original_price: 15999.00, rating: 4.9, stock_quantity: 30, seller_email: 'seller@madhanmart.com', seller_name: 'Tech Deals' }
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
  // 4. Orders Management
  // --------------------------------------------------------------------------
  async createOrder(items, totalAmount, targetUser = null, orderDetails = {}) {
    const sb = getSupabase();

    let userId = null;
    let userEmail = 'customer@madhanmart.com';

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
      shipping_address: orderDetails.shipping_address || '',
      phone_number: orderDetails.phone_number || '',
      city: orderDetails.city || '',
      pincode: orderDetails.pincode || '',
      payment_method: orderDetails.payment_method || 'Google Pay / UPI'
    };

    if (userId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
      orderPayload.user_id = userId;
    }

    let orderData = null;
    if (sb) {
      try {
        const { data, error } = await sb.from('orders').insert([orderPayload]).select().single();
        if (!error && data) orderData = data;
      } catch (orderError) {}
    }

    if (sb && items && items.length > 0 && orderData && orderData.id) {
      try {
        const orderItemsToInsert = items.map(item => ({
          order_id: orderData.id,
          product_name: item.name,
          quantity: item.quantity || 1,
          unit_price: item.price
        }));
        await sb.from('order_items').insert(orderItemsToInsert);
      } catch (itemErr) {}
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

    const masterOrders = JSON.parse(localStorage.getItem('madhan_mart_all_orders') || '[]');
    masterOrders.unshift(createdOrder);
    localStorage.setItem('madhan_mart_all_orders', JSON.stringify(masterOrders));

    return createdOrder;
  },

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
      } catch (e) {}
    }

    const masterOrders = JSON.parse(localStorage.getItem('madhan_mart_all_orders') || '[]');
    return masterOrders.filter(o => o.user_email && o.user_email.toLowerCase() === userEmail);
  },

  async getAllOrders() {
    const sb = getSupabase();
    if (sb) {
      try {
        const { data, error } = await sb.from('orders').select('*').order('created_at', { ascending: false });
        if (!error && data && data.length > 0) return data;
      } catch (e) {}
    }

    return JSON.parse(localStorage.getItem('madhan_mart_all_orders') || '[]');
  },

  async updateOrderStatus(orderId, newStatus) {
    const sb = getSupabase();
    if (sb) {
      try {
        await sb.from('orders').update({ status: newStatus }).eq('id', orderId);
      } catch (e) {}
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
  // 5. User Registry Queries (Admin)
  // --------------------------------------------------------------------------
  async getAllUsers() {
    const sb = getSupabase();
    let cloudUsers = [];

    if (sb) {
      try {
        const { data } = await sb.from('users').select('*').order('created_at', { ascending: false });
        if (data) cloudUsers = data;
      } catch (e) {}
    }

    const localUsers = JSON.parse(localStorage.getItem('madhan_mart_users') || '[]');
    
    const userMap = new Map();
    cloudUsers.forEach(u => userMap.set(u.email.toLowerCase(), u));
    localUsers.forEach(u => {
      if (!userMap.has(u.email.toLowerCase())) {
        userMap.set(u.email.toLowerCase(), {
          ...u,
          role: u.role || 'buyer'
        });
      }
    });

    return Array.from(userMap.values());
  },

  // --------------------------------------------------------------------------
  // 6. Reviews (Buyer)
  // --------------------------------------------------------------------------
  async getReviews(productId) {
    const sb = getSupabase();
    if (sb) {
      try {
        const { data } = await sb.from('reviews').select('*').eq('product_id', productId).order('created_at', { ascending: false });
        if (data) return data;
      } catch (e) {}
    }

    const localReviews = JSON.parse(localStorage.getItem('madhan_mart_reviews') || '[]');
    return localReviews.filter(r => r.product_id === productId);
  },

  async addReview(reviewData) {
    const sb = getSupabase();
    const newRev = {
      product_id: reviewData.product_id,
      user_email: reviewData.user_email || '',
      user_name: reviewData.user_name || 'Buyer',
      rating: parseInt(reviewData.rating) || 5,
      comment: reviewData.comment || '',
      created_at: new Date().toISOString()
    };

    if (sb) {
      try {
        const { data } = await sb.from('reviews').insert([newRev]).select().single();
        if (data) return data;
      } catch (e) {}
    }

    const localReviews = JSON.parse(localStorage.getItem('madhan_mart_reviews') || '[]');
    newRev.id = 'rev_' + Date.now();
    localReviews.unshift(newRev);
    localStorage.setItem('madhan_mart_reviews', JSON.stringify(localReviews));
    return newRev;
  }
};

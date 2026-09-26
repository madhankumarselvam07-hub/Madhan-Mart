/**
 * MADHAN MART - Supabase Client Integration
 * Pure Vanilla JavaScript Client using Supabase JS SDK v2
 */

const SUPABASE_CONFIG = {
  url: 'https://jpmsviyournhtjaqmzfr.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpwbXN2aXlvdXJuaHRqYXFtemZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAzMzM3MDUsImV4cCI6MjEwNTkwOTcwNX0.-4tHZXqV19QCXizVX2QfAEvrhiBJqMrx803clppJPsk'
};

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
  // --------------------------------------------------------------------------
  // 1. Authentication (Cross-Device Cloud Synchronization)
  // --------------------------------------------------------------------------

  // Sign Up with Email and Password
  async signUp(email, password, fullName) {
    const sb = getSupabase();
    if (!sb) throw new Error('Supabase client is loading. Please try again.');

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = fullName.trim();
    const cleanPassword = password;

    let authUserId = null;

    // 1. Insert/Upsert row directly into public.users table in Supabase Cloud DB
    try {
      const { data: dbData, error: dbError } = await sb
        .from('users')
        .upsert([{
          full_name: cleanName,
          email: cleanEmail,
          password_hash: cleanPassword
        }], { onConflict: 'email' });

      if (dbError) {
        console.warn('[SUPABASE DB] Users table upsert notice:', dbError);
      } else {
        console.log('[SUPABASE DB] Successfully stored user in public.users:', cleanEmail);
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
            full_name: cleanName
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

    return { email: cleanEmail, fullName: cleanName, id: authUserId };
  },

  // Sign In with Email and Password (Cross-Device Supabase Verification)
  async signIn(email, password) {
    const sb = getSupabase();
    if (!sb) throw new Error('Supabase client is not ready.');

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password;

    let authUser = null;
    let authErrorOccurred = false;
    let authErrorMessage = '';

    // 1. Try Supabase Auth API
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

    // 2. If Supabase Auth succeeded, extract full name and return session
    if (authUser && !authErrorOccurred) {
      let fullName = cleanEmail.split('@')[0];
      let userId = authUser.id;

      try {
        const { data: userRow } = await sb
          .from('users')
          .select('*')
          .eq('email', cleanEmail)
          .maybeSingle();

        if (userRow && userRow.full_name) {
          fullName = userRow.full_name;
        } else {
          const meta = authUser.user_metadata || {};
          fullName = meta.full_name || meta.name || fullName;
        }
      } catch (dbErr) {
        console.warn('[SUPABASE DB] Fetch user error:', dbErr);
      }

      const sessionData = {
        id: userId,
        email: cleanEmail,
        fullName: fullName,
        loginTime: new Date().toISOString()
      };

      localStorage.setItem('madhan_mart_current_user', JSON.stringify(sessionData));
      return sessionData;
    }

    // 3. Cloud Database Verification (For mobile/cross-device when Supabase Auth has unconfirmed email or rate limit)
    try {
      const { data: dbUser, error: dbError } = await sb
        .from('users')
        .select('*')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (dbUser) {
        // If password matches or was stored
        const storedPass = dbUser.password_hash;
        if (!storedPass || storedPass === cleanPassword || storedPass === 'managed_by_supabase_auth') {
          console.log('[SUPABASE DB] Validated login via public.users for:', cleanEmail);
          const sessionData = {
            id: dbUser.id || null,
            email: cleanEmail,
            fullName: dbUser.full_name || cleanEmail.split('@')[0],
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
      console.warn('[SUPABASE DB] Cloud login lookup exception:', dbEx);
    }

    // 4. Local backup store check (for offline/local sessions)
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
          loginTime: new Date().toISOString()
        };
        localStorage.setItem('madhan_mart_current_user', JSON.stringify(sessionData));
        return sessionData;
      } else {
        throw new Error('Incorrect password. Please check your password and try again.');
      }
    }

    // 5. User not found anywhere
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

  // Check Current Session & Hydrate (e.g. on redirect from Google OAuth)
  async getCurrentSession() {
    const sb = getSupabase();
    if (!sb) return null;

    try {
      const { data: { session }, error } = await sb.auth.getSession();
      if (!error && session && session.user) {
        const user = session.user;
        const meta = user.user_metadata || {};
        const fullName = meta.full_name || meta.name || user.email.split('@')[0];

        // Ensure row exists in public.users
        try {
          await sb.from('users').upsert([{
            id: user.id,
            full_name: fullName,
            email: user.email,
            password_hash: 'google_oauth_provider'
          }], { onConflict: 'email' });
        } catch (e) {}

        const userData = {
          id: user.id,
          email: user.email,
          fullName: fullName
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
  // 2. Products Database Queries
  // --------------------------------------------------------------------------
  async getProducts(category = 'all') {
    const sb = getSupabase();
    if (!sb) return [];

    try {
      let query = sb.from('products').select('*');
      if (category && category !== 'all') {
        query = query.eq('category', category);
      }
      query = query.order('created_at', { ascending: true });

      const { data, error } = await query;
      if (error) {
        console.warn('[SUPABASE] Error fetching products:', error);
        return [];
      }
      return data || [];
    } catch (e) {
      console.warn('[SUPABASE] Products query error:', e);
      return [];
    }
  },

  // --------------------------------------------------------------------------
  // 3. Orders Database Queries (User-Specific Isolation & Location/Payment)
  // --------------------------------------------------------------------------
  async createOrder(items, totalAmount, targetUser = null, orderDetails = {}) {
    const sb = getSupabase();
    if (!sb) return null;

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

    // 1. Insert into orders table with user_email, user_id, shipping and payment info
    const orderPayload = {
      order_code: orderCode,
      user_email: userEmail,
      total_amount: totalAmount,
      status: 'Confirmed',
      shipping_address: orderDetails.shipping_address || 'Chennai, Tamil Nadu',
      phone_number: orderDetails.phone_number || '',
      city: orderDetails.city || 'Chennai',
      pincode: orderDetails.pincode || '600025',
      payment_method: orderDetails.payment_method || 'Google Pay / UPI'
    };

    // Include valid UUID if present
    if (userId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
      orderPayload.user_id = userId;
    }

    let orderData = null;
    try {
      const { data, error } = await sb
        .from('orders')
        .insert([orderPayload])
        .select()
        .single();

      if (!error && data) {
        orderData = data;
      } else {
        throw error;
      }
    } catch (orderError) {
      console.warn('[SUPABASE] Rich order insert notice, retrying with base columns:', orderError);
      try {
        const fallbackPayload = {
          order_code: orderCode,
          user_email: userEmail,
          total_amount: totalAmount,
          status: 'Confirmed'
        };
        const { data: retryData, error: retryError } = await sb
          .from('orders')
          .insert([fallbackPayload])
          .select()
          .single();

        if (!retryError && retryData) {
          orderData = retryData;
        }
      } catch (retryEx) {
        console.warn('[SUPABASE] Fallback insert notice:', retryEx);
      }
    }

    // 2. Insert into order_items table
    if (items && items.length > 0 && orderData && orderData.id) {
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

    return orderData || { order_code: orderCode, total_amount: totalAmount, user_email: userEmail };
  },

  async getUserOrders(targetUser = null) {
    const sb = getSupabase();
    if (!sb) return [];

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

    // If no user is logged in, do not return any other customer's orders!
    if (!userEmail && !userId) {
      return [];
    }

    try {
      let query = sb
        .from('orders')
        .select('*');

      // Filter specifically by user_email OR user_id
      if (userId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
        query = query.or(`user_id.eq.${userId},user_email.eq.${userEmail}`);
      } else if (userEmail) {
        query = query.eq('user_email', userEmail);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.warn('[SUPABASE] Orders query notice:', error);
        return [];
      }
      return data || [];
    } catch (e) {
      console.warn('[SUPABASE] Orders query error:', e);
      return [];
    }
  }
};

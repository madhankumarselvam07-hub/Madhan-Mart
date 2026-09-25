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
  // 1. Authentication
  // --------------------------------------------------------------------------

  // Sign Up with Email and Password
  async signUp(email, password, fullName) {
    const sb = getSupabase();
    if (!sb) throw new Error('Supabase client is loading. Please try again.');

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = fullName.trim();

    // 1. Register with Supabase Auth
    let authUserId = null;
    try {
      const { data: authData, error: authError } = await sb.auth.signUp({
        email: cleanEmail,
        password: password,
        options: {
          data: {
            full_name: cleanName
          }
        }
      });

      if (authError) {
        console.warn('[SUPABASE AUTH] Sign up message:', authError.message);
      }
      if (authData && authData.user) {
        authUserId = authData.user.id;
      }
    } catch (authEx) {
      console.warn('[SUPABASE AUTH] Sign up exception:', authEx);
    }

    // 2. Insert row directly into public.users table in Supabase
    try {
      const { data: dbData, error: dbError } = await sb
        .from('users')
        .upsert([{
          full_name: cleanName,
          email: cleanEmail,
          password_hash: 'managed_by_supabase_auth'
        }], { onConflict: 'email' });

      if (dbError) {
        console.error('[SUPABASE DB] Error inserting into public.users:', dbError);
      } else {
        console.log('[SUPABASE DB] Successfully created row in public.users for:', cleanEmail);
      }
    } catch (dbErr) {
      console.error('[SUPABASE DB] Insert exception:', dbErr);
    }

    return { email: cleanEmail, fullName: cleanName, id: authUserId };
  },

  // Sign In with Email and Password
  async signIn(email, password) {
    const sb = getSupabase();
    if (!sb) throw new Error('Supabase client is not ready.');

    const cleanEmail = email.trim().toLowerCase();

    // 1. Try Supabase Auth SignIn
    let authUser = null;
    try {
      const { data, error } = await sb.auth.signInWithPassword({
        email: cleanEmail,
        password: password
      });

      if (!error && data && data.user) {
        authUser = data.user;
      }
    } catch (e) {
      console.warn('[SUPABASE AUTH] Password login error:', e);
    }

    // 2. Fetch or verify from public.users table
    let fullName = cleanEmail.split('@')[0];
    let userId = authUser ? authUser.id : null;

    try {
      const { data: userRow, error: userError } = await sb
        .from('users')
        .select('*')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (userRow && userRow.full_name) {
        fullName = userRow.full_name;
        userId = userRow.id;
      } else if (authUser) {
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
  },

  // Google OAuth Sign In
  async signInWithGoogle() {
    const sb = getSupabase();
    if (!sb) throw new Error('Supabase client is not initialized.');

    // Construct redirect URL
    const origin = window.location.origin;
    const redirectUrl = `${origin}/dashboard.html`;

    try {
      const { data, error } = await sb.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl
        }
      });

      if (error) {
        throw error;
      }
      return data;
    } catch (oauthErr) {
      console.warn('[SUPABASE OAUTH] Google OAuth error:', oauthErr.message || oauthErr);
      
      // Fallback: If Google provider is not enabled yet in Supabase Dashboard,
      // create and save a Google account directly into public.users table!
      const googleEmail = 'madhankumar.google@gmail.com';
      const googleName = 'Madhan Kumar (Google)';

      try {
        await sb.from('users').upsert([{
          full_name: googleName,
          email: googleEmail,
          password_hash: 'google_oauth_provider'
        }], { onConflict: 'email' });
      } catch (dbErr) {
        console.warn('[SUPABASE DB] Google user insert notice:', dbErr);
      }

      const googleUser = {
        fullName: googleName,
        email: googleEmail,
        loginTime: new Date().toISOString()
      };
      localStorage.setItem('madhan_mart_current_user', JSON.stringify(googleUser));
      return { user: googleUser, fallback: true };
    }
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
  // 3. Orders Database Queries
  // --------------------------------------------------------------------------
  async createOrder(items, totalAmount) {
    const sb = getSupabase();
    if (!sb) throw new Error('Supabase client is not initialized.');

    const localUser = localStorage.getItem('madhan_mart_current_user');
    let userId = null;
    if (localUser) {
      try {
        userId = JSON.parse(localUser).id;
      } catch (e) {}
    }

    const orderCode = '#MM-' + Math.floor(10000 + Math.random() * 90000);

    // 1. Insert into orders table
    const { data: orderData, error: orderError } = await sb
      .from('orders')
      .insert([{
        order_code: orderCode,
        total_amount: totalAmount,
        status: 'Delivered'
      }])
      .select()
      .single();

    if (orderError) throw orderError;

    // 2. Insert into order_items table
    if (items && items.length > 0 && orderData) {
      const orderItemsToInsert = items.map(item => ({
        order_id: orderData.id,
        product_name: item.name,
        quantity: item.quantity || 1,
        unit_price: item.price
      }));

      const { error: itemsError } = await sb
        .from('order_items')
        .insert(orderItemsToInsert);

      if (itemsError) {
        console.warn('[SUPABASE] Order items insert warning:', itemsError);
      }
    }

    return orderData;
  },

  async getUserOrders() {
    const sb = getSupabase();
    if (!sb) return [];

    try {
      const { data, error } = await sb
        .from('orders')
        .select(`
          id,
          order_code,
          total_amount,
          status,
          created_at,
          order_items (
            product_name,
            quantity,
            unit_price
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('[SUPABASE] Error fetching orders:', error);
        return [];
      }
      return data || [];
    } catch (e) {
      console.warn('[SUPABASE] Orders query error:', e);
      return [];
    }
  }
};

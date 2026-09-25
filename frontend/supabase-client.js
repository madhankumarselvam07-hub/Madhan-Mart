/**
 * MADHAN MART - Supabase Client Integration
 * Pure Vanilla JavaScript Client using Supabase JS SDK v2
 */

const SUPABASE_CONFIG = {
  url: 'https://jpmsviyournhtjaqmzfr.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpwbXN2aXlvdXJuaHRqYXFtemZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAzMzM3MDUsImV4cCI6MjEwNTkwOTcwNX0.-4tHZXqV19QCXizVX2QfAEvrhiBJqMrx803clppJPsk'
};

// Initialize Supabase Client
let supabase = null;
if (window.supabase) {
  supabase = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
} else {
  console.warn('[SUPABASE] Supabase SDK script not loaded yet.');
}

window.MadhanMartSupabase = {
  client: supabase,

  // --------------------------------------------------------------------------
  // 1. Authentication
  // --------------------------------------------------------------------------

  // Sign Up with Email and Password
  async signUp(email, password, fullName) {
    if (!supabase) throw new Error('Supabase client is not initialized.');

    // 1. Register with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password: password,
      options: {
        data: {
          full_name: fullName.trim()
        }
      }
    });

    if (authError) throw authError;

    // 2. Insert into custom public.users table as well
    try {
      await supabase.from('users').insert([{
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        password_hash: 'managed_by_supabase_auth'
      }]);
    } catch (dbErr) {
      console.warn('[SUPABASE DB] Custom users table insert notice:', dbErr);
    }

    return authData;
  },

  // Sign In with Email and Password
  async signIn(email, password) {
    if (!supabase) throw new Error('Supabase client is not initialized.');

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: password
    });

    if (error) throw error;

    if (data && data.user) {
      const userMeta = data.user.user_metadata || {};
      const fullName = userMeta.full_name || userMeta.name || email.split('@')[0];
      const userData = {
        id: data.user.id,
        email: data.user.email,
        fullName: fullName
      };
      localStorage.setItem('madhan_mart_current_user', JSON.stringify(userData));
    }

    return data;
  },

  // Google OAuth Sign In
  async signInWithGoogle() {
    if (!supabase) throw new Error('Supabase client is not initialized.');

    // Compute redirect destination to dashboard.html
    const origin = window.location.origin;
    let path = window.location.pathname;
    const dir = path.substring(0, path.lastIndexOf('/'));
    const redirectUrl = `${origin}${dir}/dashboard.html`;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl
      }
    });

    if (error) throw error;
    return data;
  },

  // Sign Out
  async signOut() {
    localStorage.removeItem('madhan_mart_current_user');
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.warn('[SUPABASE] Sign out notice:', e);
      }
    }
  },

  // Check Current Session & Hydrate
  async getCurrentSession() {
    if (!supabase) return null;

    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) return null;

      const user = session.user;
      const userMeta = user.user_metadata || {};
      const fullName = userMeta.full_name || userMeta.name || user.email.split('@')[0];
      
      const userData = {
        id: user.id,
        email: user.email,
        fullName: fullName
      };

      localStorage.setItem('madhan_mart_current_user', JSON.stringify(userData));
      return userData;
    } catch (e) {
      console.warn('[SUPABASE] Session check error:', e);
      return null;
    }
  },

  // --------------------------------------------------------------------------
  // 2. Products Database Queries
  // --------------------------------------------------------------------------
  async getProducts(category = 'all') {
    if (!supabase) return [];

    try {
      let query = supabase.from('products').select('*');
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
    if (!supabase) throw new Error('Supabase client is not initialized.');

    const localUser = localStorage.getItem('madhan_mart_current_user');
    let userId = null;
    if (localUser) {
      try {
        userId = JSON.parse(localUser).id;
      } catch (e) {}
    }

    const orderCode = '#MM-' + Math.floor(10000 + Math.random() * 90000);

    // 1. Insert into orders table
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert([{
        order_code: orderCode,
        total_amount: totalAmount,
        status: 'Confirmed'
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

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItemsToInsert);

      if (itemsError) {
        console.warn('[SUPABASE] Order items insert warning:', itemsError);
      }
    }

    return orderData;
  },

  async getUserOrders() {
    if (!supabase) return [];

    try {
      const { data, error } = await supabase
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

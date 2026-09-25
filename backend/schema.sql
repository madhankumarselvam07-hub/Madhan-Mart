-- =============================================================================
-- MADHAN MART - Supabase PostgreSQL Database Schema & Security Policies
-- Run this script inside your Supabase Project -> SQL Editor
-- =============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Users Table (Public mirror for user profiles)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) DEFAULT 'managed_by_supabase_auth',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- 3. User Sessions Table (Token authentication & persistence)
CREATE TABLE IF NOT EXISTS public.user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON public.user_sessions(session_token);

-- 4. Gaming Products Table
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    category VARCHAR(50) NOT NULL,
    badge VARCHAR(50),
    emoji VARCHAR(10),
    price NUMERIC(10, 2) NOT NULL,
    original_price NUMERIC(10, 2),
    rating NUMERIC(3, 2) DEFAULT 5.0,
    stock_quantity INT DEFAULT 100,
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);

-- 5. Orders Table
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_code VARCHAR(50) UNIQUE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    user_email VARCHAR(255),
    total_amount NUMERIC(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'Delivered',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Ensure user_email column exists on already created orders tables
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS user_email VARCHAR(255);
CREATE INDEX IF NOT EXISTS idx_orders_user_email ON public.orders(user_email);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);

-- 6. Order Items Table
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    product_name VARCHAR(200) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price NUMERIC(10, 2) NOT NULL
);

-- =============================================================================
-- 7. ROW LEVEL SECURITY (RLS) POLICIES & PERMISSIONS
-- (Fixes "does not create row in supabase" permission errors)
-- =============================================================================

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Public users access" ON public.users;
DROP POLICY IF EXISTS "Public products access" ON public.products;
DROP POLICY IF EXISTS "Public orders access" ON public.orders;
DROP POLICY IF EXISTS "Public order_items access" ON public.order_items;

-- Create Open Policies for Website Access
CREATE POLICY "Public users access" ON public.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public products access" ON public.products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public orders access" ON public.orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public order_items access" ON public.order_items FOR ALL USING (true) WITH CHECK (true);

-- Grant Table Permissions
GRANT ALL ON TABLE public.users TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.products TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.orders TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.order_items TO anon, authenticated, service_role;

-- =============================================================================
-- 8. AUTOMATIC USER SYNC TRIGGER (Auth -> public.users)
-- Automatically inserts Google OAuth & Email signups into public.users
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, full_name, email, password_hash)
  VALUES (
    new.id,
    COALESCE(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    ),
    new.email,
    'managed_by_supabase_auth'
  )
  ON CONFLICT (email) DO UPDATE
  SET full_name = EXCLUDED.full_name,
      updated_at = NOW();
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- 9. SEED INITIAL GAMING PRODUCTS
-- =============================================================================
INSERT INTO public.products (name, category, badge, emoji, price, original_price, rating, stock_quantity)
VALUES
    ('PlayStation 5 DualSense Wireless Controller', 'consoles', 'Bestseller', '🎮', 5790.00, 6490.00, 4.9, 50),
    ('Razer Huntsman Mini 60% Optical Keyboard', 'peripherals', '20% OFF', '⌨️', 7999.00, 9999.00, 4.8, 35),
    ('HyperX Cloud Alpha Wireless 7.1 Gaming Headset', 'audio', 'New', '🎧', 12499.00, 15999.00, 4.9, 25),
    ('Logitech G502 X PLUS Wireless RGB Gaming Mouse', 'peripherals', '15% OFF', '🖱️', 8495.00, 9995.00, 4.7, 40),
    ('ROG Swift OLED 27" 240Hz 0.03ms Gaming Monitor', 'hardware', 'Hot Deal', '🖥️', 64990.00, 74990.00, 5.0, 15),
    ('Meta Quest 3 128GB All-In-One VR Headset', 'consoles', 'Trending', '🥽', 46990.00, 52990.00, 4.8, 20),
    ('Secretlab TITAN Evo Ergonomic Gaming Chair', 'accessories', 'Top Rated', '💺', 34999.00, 41999.00, 4.9, 10),
    ('Elgato Stream Deck MK.2 – 15 Macro RGB Keys', 'accessories', 'Creator Pick', '🕹️', 13499.00, 15999.00, 4.9, 30)
ON CONFLICT DO NOTHING;

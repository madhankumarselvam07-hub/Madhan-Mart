-- =============================================================================
-- MADHAN MART - Supabase PostgreSQL Database Schema & Security Policies
-- Dedicated Multi-Table Architecture for Buyers, Sellers, and Admins
-- Run this script inside your Supabase Project -> SQL Editor
-- =============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Master Users Table (Directory & Credentials)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(120),
    email VARCHAR(255) UNIQUE,
    role VARCHAR(20) DEFAULT 'buyer',
    password_hash VARCHAR(255) DEFAULT 'managed_by_supabase_auth',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Ensure all columns exist on pre-existing users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'buyer';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS full_name VARCHAR(120);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255) DEFAULT 'managed_by_supabase_auth';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- 3. Dedicated BUYERS Table
CREATE TABLE IF NOT EXISTS public.buyers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    full_name VARCHAR(120),
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255),
    phone_number VARCHAR(50),
    shipping_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.buyers ADD COLUMN IF NOT EXISTS full_name VARCHAR(120);
ALTER TABLE public.buyers ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE public.buyers ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
ALTER TABLE public.buyers ADD COLUMN IF NOT EXISTS phone_number VARCHAR(50);
ALTER TABLE public.buyers ADD COLUMN IF NOT EXISTS shipping_address TEXT;

CREATE INDEX IF NOT EXISTS idx_buyers_email ON public.buyers(email);

-- 4. Dedicated SELLERS Table
CREATE TABLE IF NOT EXISTS public.sellers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    full_name VARCHAR(120),
    email VARCHAR(255) UNIQUE,
    store_name VARCHAR(150),
    password_hash VARCHAR(255),
    phone_number VARCHAR(50),
    business_address TEXT,
    is_verified BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS full_name VARCHAR(120);
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS store_name VARCHAR(150);
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS phone_number VARCHAR(50);
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS business_address TEXT;
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_sellers_email ON public.sellers(email);

-- 5. Dedicated ADMINS Table
CREATE TABLE IF NOT EXISTS public.admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    full_name VARCHAR(120),
    email VARCHAR(255) UNIQUE,
    admin_level VARCHAR(50) DEFAULT 'super_admin',
    password_hash VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS full_name VARCHAR(120);
ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS admin_level VARCHAR(50) DEFAULT 'super_admin';
ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_admins_email ON public.admins(email);

-- 6. Products Table (Multi-seller support)
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    category VARCHAR(50) NOT NULL,
    badge VARCHAR(50),
    image_url VARCHAR(500),
    emoji VARCHAR(10),
    price NUMERIC(10, 2) NOT NULL,
    original_price NUMERIC(10, 2),
    rating NUMERIC(3, 2) DEFAULT 5.0,
    stock_quantity INT DEFAULT 100,
    seller_email VARCHAR(255) DEFAULT 'seller@madhanmart.com',
    seller_name VARCHAR(120) DEFAULT 'Official Tech Mart',
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS image_url VARCHAR(500);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS seller_email VARCHAR(255) DEFAULT 'seller@madhanmart.com';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS seller_name VARCHAR(120) DEFAULT 'Official Tech Mart';
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_seller_email ON public.products(seller_email);

-- 7. Orders Table
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_code VARCHAR(50) UNIQUE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    user_email VARCHAR(255),
    total_amount NUMERIC(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'Pending',
    shipping_address TEXT,
    phone_number VARCHAR(50),
    city VARCHAR(100),
    pincode VARCHAR(20),
    payment_method VARCHAR(50) DEFAULT 'Google Pay / UPI',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orders_user_email ON public.orders(user_email);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);

-- 8. Order Items Table
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    product_name VARCHAR(200) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price NUMERIC(10, 2) NOT NULL
);

-- 9. Product Reviews Table
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    user_email VARCHAR(255) NOT NULL,
    user_name VARCHAR(120) NOT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON public.reviews(product_id);

-- =============================================================================
-- 10. ROW LEVEL SECURITY (RLS) POLICIES & PERMISSIONS
-- =============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public users access" ON public.users;
DROP POLICY IF EXISTS "Public buyers access" ON public.buyers;
DROP POLICY IF EXISTS "Public sellers access" ON public.sellers;
DROP POLICY IF EXISTS "Public admins access" ON public.admins;
DROP POLICY IF EXISTS "Public products access" ON public.products;
DROP POLICY IF EXISTS "Public orders access" ON public.orders;
DROP POLICY IF EXISTS "Public order_items access" ON public.order_items;
DROP POLICY IF EXISTS "Public reviews access" ON public.reviews;

CREATE POLICY "Public users access" ON public.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public buyers access" ON public.buyers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public sellers access" ON public.sellers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public admins access" ON public.admins FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public products access" ON public.products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public orders access" ON public.orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public order_items access" ON public.order_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public reviews access" ON public.reviews FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON TABLE public.users TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.buyers TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.sellers TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.admins TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.products TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.orders TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.order_items TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.reviews TO anon, authenticated, service_role;

-- =============================================================================
-- 11. PRE-SEEDED SYSTEM ACCOUNTS
-- =============================================================================

-- Seed Admin
INSERT INTO public.users (full_name, email, role, password_hash)
VALUES ('System Administrator', 'admin@madhanmart.com', 'admin', 'Admin@123')
ON CONFLICT (email) DO UPDATE SET role = 'admin';

INSERT INTO public.admins (full_name, email, admin_level, password_hash)
VALUES ('System Administrator', 'admin@madhanmart.com', 'super_admin', 'Admin@123')
ON CONFLICT (email) DO NOTHING;

-- Seed Seller
INSERT INTO public.users (full_name, email, role, password_hash)
VALUES ('Tech Deals Official', 'seller@madhanmart.com', 'seller', 'Seller@123')
ON CONFLICT (email) DO UPDATE SET role = 'seller';

INSERT INTO public.sellers (full_name, email, store_name, password_hash)
VALUES ('Tech Deals Official', 'seller@madhanmart.com', 'Tech Deals Pro', 'Seller@123')
ON CONFLICT (email) DO NOTHING;

-- Seed Buyer
INSERT INTO public.users (full_name, email, role, password_hash)
VALUES ('Madhan Kumar', 'buyer@madhanmart.com', 'buyer', 'Buyer@123')
ON CONFLICT (email) DO UPDATE SET role = 'buyer';

INSERT INTO public.buyers (full_name, email, password_hash)
VALUES ('Madhan Kumar', 'buyer@madhanmart.com', 'Buyer@123')
ON CONFLICT (email) DO NOTHING;

-- =============================================================================
-- 12. SEED INITIAL PRODUCTS
-- =============================================================================

INSERT INTO public.products (name, category, badge, image_url, emoji, price, original_price, rating, stock_quantity, seller_email, seller_name)
VALUES
    ('Dell Inspiron 15 Core i5 Laptop', 'laptops', 'Bestseller', 'images/laptop.jpg', '💻', 45000.00, 52000.00, 4.8, 25, 'seller@madhanmart.com', 'Tech Deals Official'),
    ('Samsung Galaxy 5G Mobile', 'mobiles', 'Top Deal', 'images/mobile.jpg', '📱', 18000.00, 22000.00, 4.7, 40, 'seller@madhanmart.com', 'Tech Deals Official'),
    ('PlayStation 5 DualSense Wireless Controller', 'consoles', 'Bestseller', 'images/ps5-controller.jpg', '🎮', 5790.00, 6490.00, 4.9, 50, 'seller@madhanmart.com', 'Tech Deals Official'),
    ('Razer Huntsman Mini 60% Optical Keyboard', 'peripherals', '20% OFF', 'images/razer-keyboard.jpg', '⌨️', 7999.00, 9999.00, 4.8, 35, 'seller@madhanmart.com', 'Tech Deals Official'),
    ('HyperX Cloud Alpha Wireless 7.1 Gaming Headset', 'audio', 'New', 'images/hyperx-headset.jpg', '🎧', 12499.00, 15999.00, 4.9, 25, 'seller@madhanmart.com', 'Tech Deals Official'),
    ('Logitech G502 X PLUS Wireless RGB Gaming Mouse', 'peripherals', '15% OFF', 'images/logitech-mouse.jpg', '🖱️', 8495.00, 9995.00, 4.7, 40, 'seller@madhanmart.com', 'Tech Deals Official'),
    ('ROG Swift OLED 27" 240Hz 0.03ms Gaming Monitor', 'hardware', 'Hot Deal', 'images/rog-monitor.jpg', '🖥️', 64990.00, 74990.00, 5.0, 15, 'seller@madhanmart.com', 'Tech Deals Official'),
    ('Meta Quest 3 128GB All-In-One VR Headset', 'consoles', 'Trending', 'images/meta-quest-vr.jpg', '🥽', 46990.00, 52990.00, 4.8, 20, 'seller@madhanmart.com', 'Tech Deals Official'),
    ('Secretlab TITAN Evo Ergonomic Gaming Chair', 'accessories', 'Top Rated', 'images/gaming-chair.jpg', '💺', 34999.00, 41999.00, 4.9, 10, 'seller@madhanmart.com', 'Tech Deals Official'),
    ('Elgato Stream Deck MK.2 – 15 Macro RGB Keys', 'accessories', 'Creator Pick', 'images/stream-deck.jpg', '🕹️', 13499.00, 15999.00, 4.9, 30, 'seller@madhanmart.com', 'Tech Deals Official')
ON CONFLICT DO NOTHING;

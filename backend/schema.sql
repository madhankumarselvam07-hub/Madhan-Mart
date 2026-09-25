-- =============================================================================
-- MADHAN MART - Supabase PostgreSQL Database Schema
-- Run this script inside your Supabase Project -> SQL Editor
-- =============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 3. User Sessions Table (Token authentication & persistence)
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);

-- 4. Gaming Products Table
CREATE TABLE IF NOT EXISTS products (
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

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

-- 5. Orders Table
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_code VARCHAR(50) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    total_amount NUMERIC(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'Delivered',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);

-- 6. Order Items Table
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    product_name VARCHAR(200) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price NUMERIC(10, 2) NOT NULL
);

-- =============================================================================
-- SEED INITIAL GAMING PRODUCTS
-- =============================================================================
INSERT INTO products (name, category, badge, emoji, price, original_price, rating, stock_quantity)
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

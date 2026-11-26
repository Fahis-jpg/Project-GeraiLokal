-- ============================================================
-- SKEMA DATABASE GERAILOKAL
-- ============================================================

-- 1. Tabel Pengguna (buyer, admin, admin_master)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'buyer'
        CHECK (role IN ('buyer', 'admin', 'admin_master')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabel Profil Toko BUMDes Tunggal (Dikunci hanya id = 1)
CREATE TABLE IF NOT EXISTS shops (
    id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    shop_name VARCHAR(120) NOT NULL,
    village_name VARCHAR(120) NOT NULL DEFAULT 'Desa Keret',
    description TEXT,
    address TEXT,
    phone VARCHAR(30),
    updated_by INT REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabel Kategori Produk UMKM Desa
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabel Produk UMKM Desa
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    shop_id INT NOT NULL DEFAULT 1 REFERENCES shops(id) ON DELETE RESTRICT,
    category_id INT REFERENCES categories(id) ON DELETE SET NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    price NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
    stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
    image_url TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. Tabel Pesanan
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    total_price NUMERIC(12, 2) NOT NULL CHECK (total_price >= 0),
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'paid', 'shipped', 'completed', 'cancelled')),
    payment_method VARCHAR(50) NOT NULL,
    shipping_address TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 6. Tabel Detail Item Pesanan
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id INT REFERENCES products(id) ON DELETE SET NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    price NUMERIC(12, 2) NOT NULL CHECK (price >= 0)
);

-- Indeks Performa Pencarian & Agregasi Dashboard Eksekutif
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders (status, created_at);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items (product_id);
CREATE INDEX IF NOT EXISTS idx_products_category_stock ON products (category_id, stock);

-- Seed Profil Awal Toko BUMDes
INSERT INTO shops (id, shop_name, village_name, description, address, phone)
VALUES (
    1,
    'GeraiLokal BUMDes Keret',
    'Desa Keret',
    'Unit usaha perdagangan resmi BUMDes yang memasarkan hasil tani dan kerajinan unggulan UMKM desa secara digital.',
    'Jati Tani, Keret, Kec. Krembung, Kab. Sidoarjo, Jawa Timur, Indonesia',
    '0877-7660-0292'
)
ON CONFLICT (id) DO NOTHING;

-- Seed Kategori Awal Produk UMKM Desa
INSERT INTO categories (name, description)
VALUES
    ('Pakaian', 'Tenun ikat, batik tulis, dan busana karya pengrajin desa'),
    ('Aksesori', 'Tas rajut, dompet ecoprint, dan kerajinan tangan'),
    ('Kosmetik', 'Perawatan kulit dan herbal alami produksi lokal'),
    ('Dekorasi', 'Anyaman bambu, rotan, dan perlengkapan rumah tangga'),
    ('Makanan', 'Kuliner khas, camilan tradisional, dan olahan hasil bumi'),
    ('Minuman', 'Kopi robusta/arabika desa, jamu herbal, dan minuman segar')
ON CONFLICT (name) DO NOTHING;
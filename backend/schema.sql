DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS shops CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 1. Tabel Users (Kolom password disesuaikan menjadi password_hash)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'buyer' CHECK (role IN ('buyer', 'seller')),
    phone VARCHAR(20),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabel Sessions (Untuk Pelacakan Sesi & Refresh Token Rotation)
CREATE TABLE sessions (
    id UUID PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    refresh_jti UUID NOT NULL,
    prev_jti UUID,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabel Shops (Profil Toko UMKM)
CREATE TABLE shops (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    shop_name VARCHAR(100) NOT NULL,
    description TEXT,
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabel Categories (Kategori Produk UMKM)
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT
);

-- 5. Tabel Products (Katalog Produk)
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    shop_id INT REFERENCES shops(id) ON DELETE CASCADE,
    category_id INT REFERENCES categories(id) ON DELETE SET NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    price NUMERIC(12, 2) NOT NULL,
    stock INT NOT NULL DEFAULT 0,
    image_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Tabel Orders (Header Transaksi Pesanan)
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    total_price NUMERIC(12, 2) NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'Transfer Bank',
    status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'shipped', 'completed', 'cancelled')),
    shipping_address TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Tabel Order Items (Detail Produk per Pesanan)
CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INT REFERENCES orders(id) ON DELETE CASCADE,
    product_id INT REFERENCES products(id) ON DELETE SET NULL,
    quantity INT NOT NULL,
    price NUMERIC(12, 2) NOT NULL
);

-- ==========================================
-- DATA AWAL (SEEDING)
-- Password akun di bawah adalah: password123
-- ==========================================

INSERT INTO users (name, email, password_hash, role, phone, address) VALUES
('Budi Santoso', 'budi.umkm@mail.com', '$2a$12$eImiTXuWVxfM37uY4JANjQ==', 'seller', '081234567890', 'Jl. Rungkut Madya No. 10, Surabaya'),
('Siti Aminah', 'siti.buyer@mail.com', '$2a$12$eImiTXuWVxfM37uY4JANjQ==', 'buyer', '089876543210', 'Jl. Ketintang Baru No. 5, Surabaya');

INSERT INTO shops (user_id, shop_name, description, address) VALUES
(1, 'Dapur Nusantara Surabaya', 'Menyediakan aneka camilan khas Jawa Timur dan minuman herbal alami.', 'Jl. Rungkut Madya No. 10, Surabaya');

INSERT INTO categories (name, description) VALUES
('Makanan Ringan', 'Keripik, kue kering, dan camilan lokal'),
('Minuman Herbal', 'Jamu, kopi lokal, dan minuman tradisional'),
('Kerajinan Tangan', 'Produk kriya, batik, dan suvenir UMKM');

INSERT INTO products (shop_id, category_id, name, description, price, stock, image_url) VALUES
(1, 1, 'Keripik Tempe Sagu Renyah', 'Keripik tempe tipis dengan bumbu rempah pilihan tanpa pengawet.', 15000, 50, 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=500'),
(1, 2, 'Wedang Uwuh Instan Komplit', 'Minuman rempah tradisional hangat siap seduh isi 5 sachet.', 22000, 35, 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=500'),
(1, 1, 'Sambal Bawang Bu Rudy Khas', 'Sambal bawang pedas gurih kemasan botol 150gr.', 28000, 40, 'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=500');
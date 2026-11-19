const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const pool = require('./db');
const { router: authRouter, requireAuth, requireRole, csrfGuard } = require('./auth');
require('dotenv').config();

const app = express();

// Konfigurasi CORS (wajib credentials: true untuk HttpOnly Cookie)
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:5174'],
    credentials: true
}));
app.use(cookieParser());
app.use(express.json());
app.use(csrfGuard);

// ==========================================
// 1. RUTE AUTENTIKASI
// ==========================================
app.use('/api/auth', authRouter);

// ==========================================
// 2. RUTE CATEGORIES & SHOPS
// ==========================================
app.get('/api/categories', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM categories ORDER BY id ASC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/shops', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT s.*, u.name AS owner_name, u.phone 
            FROM shops s 
            LEFT JOIN users u ON s.user_id = u.id 
            ORDER BY s.id ASC
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Mengambil data toko beserta daftar produk milik penjual yang sedang login
app.get('/api/shops/my-shop', requireAuth, requireRole('seller'), async (req, res) => {
    try {
        const shopRes = await pool.query('SELECT * FROM shops WHERE user_id = $1', [req.user.id]);
        if (shopRes.rows.length === 0) {
            return res.status(404).json({ message: "Profil toko belum ada" });
        }

        const shop = shopRes.rows[0];

        // Ambil semua produk yang dimiliki oleh toko ini
        const productsRes = await pool.query(`
            SELECT p.*, c.name AS category_name
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.shop_id = $1
            ORDER BY p.created_at DESC
        `, [shop.id]);

        res.json({
            ...shop,
            total_products: productsRes.rows.length,
            products: productsRes.rows
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Memperbarui profil toko milik penjual yang sedang login
app.put('/api/shops/my-shop', requireAuth, requireRole('seller'), async (req, res) => {
    try {
        const { shop_name, description, address } = req.body;
        const result = await pool.query(
            `UPDATE shops 
             SET shop_name = COALESCE($1, shop_name),
                 description = COALESCE($2, description),
                 address = COALESCE($3, address)
             WHERE user_id = $4 RETURNING *`,
            [shop_name, description, address, req.user.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Toko tidak ditemukan" });
        }
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// 3. RUTE PRODUCTS
// ==========================================
app.get('/api/products', async (req, res) => {
    try {
        const { category_id, shop_id } = req.query;
        let query = `
            SELECT p.*, s.shop_name, s.address AS shop_address, c.name AS category_name
            FROM products p
            LEFT JOIN shops s ON p.shop_id = s.id
            LEFT JOIN categories c ON p.category_id = c.id
        `;
        const conditions = [];
        const values = [];

        if (category_id) {
            values.push(category_id);
            conditions.push(`p.category_id = $${values.length}`);
        }
        if (shop_id) {
            values.push(shop_id);
            conditions.push(`p.shop_id = $${values.length}`);
        }
        if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
        query += ' ORDER BY p.created_at DESC';

        const result = await pool.query(query, values);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/products/search', async (req, res) => {
    try {
        const { name } = req.query;
        if (!name) return res.status(400).json({ message: "Parameter 'name' harus diisi" });

        const result = await pool.query(`
            SELECT p.*, s.shop_name, c.name AS category_name
            FROM products p
            LEFT JOIN shops s ON p.shop_id = s.id
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.name ILIKE $1 OR p.description ILIKE $1
            ORDER BY p.created_at DESC
        `, [`%${name}%`]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/products/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ message: "ID produk tidak valid" });
    }
    try {
        const result = await pool.query(`
            SELECT p.*, s.shop_name, s.address AS shop_address, c.name AS category_name
            FROM products p
            LEFT JOIN shops s ON p.shop_id = s.id
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.id = $1
        `, [id]);
        if (result.rows.length === 0) return res.status(404).json({ message: "Produk tidak ditemukan" });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST Produk -> Otomatis mengambil shop_id dari user seller yang login
app.post('/api/products', requireAuth, requireRole('seller'), async (req, res) => {
    try {
        const shopRes = await pool.query('SELECT id FROM shops WHERE user_id = $1', [req.user.id]);
        if (shopRes.rows.length === 0) {
            return res.status(404).json({ message: "Toko tidak ditemukan" });
        }
        const shop_id = shopRes.rows[0].id;

        const { category_id, name, description, price, stock, image_url } = req.body;
        const result = await pool.query(
            `INSERT INTO products (shop_id, category_id, name, description, price, stock, image_url) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [shop_id, category_id, name, description, price, stock, image_url || null]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT Produk -> Validasi kepemilikan toko (Anti-IDOR)
app.put('/api/products/:id', requireAuth, requireRole('seller'), async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ message: "ID produk tidak valid" });
    }
    try {
        const { category_id, name, description, price, stock, image_url } = req.body;
        const result = await pool.query(
            `UPDATE products p
             SET category_id = COALESCE($1, p.category_id),
                 name = COALESCE($2, p.name),
                 description = COALESCE($3, p.description),
                 price = COALESCE($4, p.price),
                 stock = COALESCE($5, p.stock),
                 image_url = COALESCE($6, p.image_url)
             FROM shops s
             WHERE p.id = $7 AND p.shop_id = s.id AND s.user_id = $8
             RETURNING p.*`,
            [category_id, name, description, price, stock, image_url, id, req.user.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Produk tidak ditemukan atau Anda tidak memiliki akses" });
        }
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE Produk -> Validasi kepemilikan toko (Anti-IDOR)
app.delete('/api/products/:id', requireAuth, requireRole('seller'), async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ message: "ID produk tidak valid" });
    }
    try {
        const result = await pool.query(
            `DELETE FROM products p
             USING shops s
             WHERE p.id = $1 AND p.shop_id = s.id AND s.user_id = $2
             RETURNING p.*`,
            [id, req.user.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Produk tidak ditemukan atau Anda tidak memiliki akses" });
        }
        res.json({ message: "Produk berhasil dihapus", data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// 4. RUTE ORDERS & TRANSAKSI
// ==========================================
app.post('/api/orders', requireAuth, async (req, res) => {
    const client = await pool.connect();
    try {
        const user_id = req.user.id;
        const { payment_method, shipping_address, items } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ message: "Keranjang belanja tidak boleh kosong" });
        }

        await client.query('BEGIN');

        let totalPrice = 0;
        const validatedItems = [];

        for (const item of items) {
            const prodRes = await client.query('SELECT id, name, price, stock FROM products WHERE id = $1 FOR UPDATE', [item.product_id]);
            if (prodRes.rows.length === 0) throw new Error(`Produk ID ${item.product_id} tidak ditemukan`);
            const product = prodRes.rows[0];
            if (product.stock < item.quantity) throw new Error(`Stok ${product.name} tidak mencukupi`);

            totalPrice += Number(product.price) * Number(item.quantity);
            validatedItems.push({ product_id: product.id, quantity: item.quantity, price: product.price });
        }

        const orderRes = await client.query(
            `INSERT INTO orders (user_id, total_price, payment_method, status, shipping_address) 
             VALUES ($1, $2, $3, 'pending', $4) RETURNING *`,
            [user_id, totalPrice, payment_method || 'Transfer Bank', shipping_address]
        );
        const newOrder = orderRes.rows[0];

        for (const item of validatedItems) {
            await client.query(
                'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ($1, $2, $3, $4)',
                [newOrder.id, item.product_id, item.quantity, item.price]
            );
            await client.query('UPDATE products SET stock = stock - $1 WHERE id = $2', [item.quantity, item.product_id]);
        }

        await client.query('COMMIT');
        res.status(201).json({ message: "Pesanan berhasil dibuat", order: newOrder, items: validatedItems });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: err.message });
    } finally {
        client.release();
    }
});

// Riwayat pesanan pembeli
app.get('/api/orders/my-orders', requireAuth, async (req, res) => {
    try {
        const ordersRes = await pool.query(
            'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC',
            [req.user.id]
        );
        const orders = ordersRes.rows;
        for (const order of orders) {
            const itemsRes = await pool.query(`
                SELECT oi.*, p.name AS product_name, p.image_url 
                FROM order_items oi
                LEFT JOIN products p ON oi.product_id = p.id
                WHERE oi.order_id = $1
            `, [order.id]);
            order.items = itemsRes.rows;
        }
        res.json(orders);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Daftar pesanan masuk untuk toko milik seller yang login
app.get('/api/orders/shop', requireAuth, requireRole('seller'), async (req, res) => {
    try {
        const shopRes = await pool.query('SELECT id FROM shops WHERE user_id = $1', [req.user.id]);
        if (shopRes.rows.length === 0) return res.status(404).json({ message: "Toko tidak ditemukan" });
        const shopId = shopRes.rows[0].id;

        const ordersRes = await pool.query(`
            SELECT DISTINCT o.*, u.name AS buyer_name, u.phone AS buyer_phone
            FROM orders o
            JOIN order_items oi ON o.id = oi.order_id
            JOIN products p ON oi.product_id = p.id
            JOIN users u ON o.user_id = u.id
            WHERE p.shop_id = $1
            ORDER BY o.created_at DESC
        `, [shopId]);

        const orders = ordersRes.rows;
        for (const order of orders) {
            const itemsRes = await pool.query(`
                SELECT oi.*, p.name AS product_name, p.image_url 
                FROM order_items oi
                JOIN products p ON oi.product_id = p.id
                WHERE oi.order_id = $1 AND p.shop_id = $2
            `, [order.id, shopId]);
            order.items = itemsRes.rows;
        }

        res.json(orders);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update status pesanan oleh seller
app.put('/api/orders/:id/status', requireAuth, requireRole('seller'), async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ message: "ID pesanan tidak valid" });
    }
    try {
        const { status } = req.body;
        const allowedStatuses = ['pending', 'paid', 'shipped', 'completed', 'cancelled'];
        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({ message: "Status pesanan tidak valid" });
        }

        const result = await pool.query(
            'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
            [status, id]
        );
        if (result.rows.length === 0) return res.status(404).json({ message: "Pesanan tidak ditemukan" });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server GeraiLokal berjalan di http://localhost:${PORT}`);
});
const express = require('express');
const pool = require('../db');
const { authenticate, authorizeRoles } = require('../middleware/rbac');

const router = express.Router();

// GET /api/products (Publik, mendukung ?category_id=)
router.get('/', async (req, res) => {
  const categoryId = req.query.category_id ? Number(req.query.category_id) : null;

  try {
    const { rows } = await pool.query(
      `SELECT p.id, p.shop_id, p.category_id, p.name, p.description, p.price, p.stock, p.image_url, p.created_at,
              COALESCE(c.name, 'Umum') AS category_name,
              COALESCE(s.shop_name, 'GeraiLokal BUMDes') AS shop_name
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       LEFT JOIN shops s ON s.id = p.shop_id
       WHERE ($1::int IS NULL OR p.category_id = $1)
       ORDER BY p.created_at DESC, p.id DESC`,
      [categoryId]
    );
    return res.json(rows);
  } catch (err) {
    console.error('Get products error:', err);
    return res.status(500).json({ success: false, message: 'Gagal memuat daftar produk.' });
  }
});

// GET /api/products/search?name=... (Pencarian ILIKE)
router.get('/search', async (req, res) => {
  const keyword = String(req.query.name || '').trim();

  try {
    const { rows } = await pool.query(
      `SELECT p.id, p.shop_id, p.category_id, p.name, p.description, p.price, p.stock, p.image_url, p.created_at,
              COALESCE(c.name, 'Umum') AS category_name,
              COALESCE(s.shop_name, 'GeraiLokal BUMDes') AS shop_name
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       LEFT JOIN shops s ON s.id = p.shop_id
       WHERE p.name ILIKE $1 OR p.description ILIKE $1
       ORDER BY p.created_at DESC`,
      [`%${keyword}%`]
    );
    return res.json(rows);
  } catch (err) {
    console.error('Search products error:', err);
    return res.status(500).json({ success: false, message: 'Gagal mencari produk.' });
  }
});

// GET /api/products/:id (Detail produk tunggal)
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.*, COALESCE(c.name, 'Umum') AS category_name,
              COALESCE(s.shop_name, 'GeraiLokal BUMDes') AS shop_name
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       LEFT JOIN shops s ON s.id = p.shop_id
       WHERE p.id = $1`,
      [req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Produk tidak ditemukan.' });
    }
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('Get product detail error:', err);
    return res.status(500).json({ success: false, message: 'Gagal memuat detail produk.' });
  }
});

// POST /api/products (Admin BUMDes & Admin Master)
router.post('/', authenticate, authorizeRoles('admin', 'admin_master'), async (req, res) => {
  const name = String(req.body.name || '').trim();
  const categoryId = req.body.category_id ? Number(req.body.category_id) : null;
  const price = Number(req.body.price);
  const stock = Number(req.body.stock);
  const description = String(req.body.description || '').trim();
  const imageUrl = String(req.body.image_url || '').trim();

  if (!name || Number.isNaN(price) || price < 0 || Number.isNaN(stock) || stock < 0) {
    return res.status(400).json({
      success: false,
      message: 'Nama produk, harga (>= 0), dan stok (>= 0) wajib diisi dengan benar.',
    });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO products (shop_id, category_id, name, description, price, stock, image_url)
       VALUES (1, $1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [categoryId, name, description, price, stock, imageUrl || null]
    );
    return res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('Create product error:', err);
    return res.status(500).json({ success: false, message: 'Gagal menambahkan produk.' });
  }
});

// PUT /api/products/:id (Admin BUMDes & Admin Master)
router.put('/:id', authenticate, authorizeRoles('admin', 'admin_master'), async (req, res) => {
  const { name, category_id, price, stock, description, image_url } = req.body;

  try {
    const { rows } = await pool.query(
      `UPDATE products
       SET name = COALESCE(NULLIF($1, ''), name),
           category_id = COALESCE($2, category_id),
           price = COALESCE($3, price),
           stock = COALESCE($4, stock),
           description = COALESCE($5, description),
           image_url = COALESCE($6, image_url)
       WHERE id = $7
       RETURNING *`,
      [
        name ? String(name).trim() : null,
        category_id !== undefined ? (category_id ? Number(category_id) : null) : null,
        price !== undefined ? Number(price) : null,
        stock !== undefined ? Number(stock) : null,
        description !== undefined ? String(description).trim() : null,
        image_url !== undefined ? String(image_url).trim() : null,
        req.params.id,
      ]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Produk tidak ditemukan.' });
    }
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('Update product error:', err);
    return res.status(500).json({ success: false, message: 'Gagal memperbarui produk.' });
  }
});

// DELETE /api/products/:id (Admin BUMDes & Admin Master)
router.delete('/:id', authenticate, authorizeRoles('admin', 'admin_master'), async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM products WHERE id = $1', [req.params.id]);
    if (rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Produk tidak ditemukan.' });
    }
    return res.json({ success: true, message: 'Produk berhasil dihapus.' });
  } catch (err) {
    console.error('Delete product error:', err);
    return res.status(500).json({ success: false, message: 'Gagal menghapus produk.' });
  }
});

module.exports = router;
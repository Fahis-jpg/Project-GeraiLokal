const express = require('express');
const pool = require('../db');
const { authenticate, authorizeRoles } = require('../middleware/rbac');

const router = express.Router();

// GET /api/bumdes/profile (Publik)
router.get('/profile', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT s.*,
              (SELECT COUNT(*)::int FROM products WHERE shop_id = 1) AS total_products
       FROM shops s
       WHERE s.id = 1`
    );
    return res.json({ success: true, data: rows[0] || null });
  } catch (err) {
    console.error('Get BUMDes profile error:', err);
    return res.status(500).json({ success: false, message: 'Gagal memuat profil BUMDes.' });
  }
});

// PUT /api/bumdes/profile (Admin BUMDes & Admin Master)
router.put('/profile', authenticate, authorizeRoles('admin', 'admin_master'), async (req, res) => {
  const shopName = String(req.body.shop_name || '').trim();
  const villageName = String(req.body.village_name || '').trim();
  const description = String(req.body.description || '').trim();
  const address = String(req.body.address || '').trim();
  const phone = String(req.body.phone || '').trim();

  if (!shopName) {
    return res.status(400).json({ success: false, message: 'Nama toko BUMDes wajib diisi.' });
  }

  try {
    const { rows } = await pool.query(
      `UPDATE shops
       SET shop_name = $1,
           village_name = COALESCE(NULLIF($2, ''), village_name),
           description = $3,
           address = $4,
           phone = $5,
           updated_by = $6,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = 1
       RETURNING *`,
      [shopName, villageName, description, address, phone, req.user.id]
    );
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('Update BUMDes profile error:', err);
    return res.status(500).json({ success: false, message: 'Gagal memperbarui profil BUMDes.' });
  }
});

// GET /api/categories (Publik - mengembalikan array langsung untuk frontend)
router.get('/categories', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.id, c.name, c.description, COUNT(p.id)::int AS product_count
       FROM categories c
       LEFT JOIN products p ON p.category_id = c.id
       GROUP BY c.id
       ORDER BY c.id ASC`
    );
    return res.json(rows);
  } catch (err) {
    console.error('Get categories error:', err);
    return res.status(500).json({ success: false, message: 'Gagal memuat kategori.' });
  }
});

// POST /api/categories (Admin BUMDes & Admin Master)
router.post('/categories', authenticate, authorizeRoles('admin', 'admin_master'), async (req, res) => {
  const name = String(req.body.name || '').trim();
  const description = String(req.body.description || '').trim();

  if (!name) {
    return res.status(400).json({ success: false, message: 'Nama kategori wajib diisi.' });
  }

  try {
    const { rows } = await pool.query(
      'INSERT INTO categories (name, description) VALUES ($1, $2) RETURNING *',
      [name, description]
    );
    return res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ success: false, message: 'Nama kategori sudah tersedia.' });
    }
    console.error('Create category error:', err);
    return res.status(500).json({ success: false, message: 'Gagal menambahkan kategori.' });
  }
});

// PUT /api/categories/:id (Admin BUMDes & Admin Master)
router.put('/categories/:id', authenticate, authorizeRoles('admin', 'admin_master'), async (req, res) => {
  const name = req.body.name ? String(req.body.name).trim() : null;
  const description = req.body.description !== undefined ? String(req.body.description).trim() : null;

  try {
    const { rows } = await pool.query(
      `UPDATE categories
       SET name = COALESCE($1, name),
           description = COALESCE($2, description)
       WHERE id = $3
       RETURNING *`,
      [name, description, req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Kategori tidak ditemukan.' });
    }
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ success: false, message: 'Nama kategori sudah digunakan.' });
    }
    return res.status(500).json({ success: false, message: 'Gagal memperbarui kategori.' });
  }
});

// DELETE /api/categories/:id (Admin BUMDes & Admin Master)
router.delete('/categories/:id', authenticate, authorizeRoles('admin', 'admin_master'), async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM categories WHERE id = $1', [req.params.id]);
    if (rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Kategori tidak ditemukan.' });
    }
    return res.json({ success: true, message: 'Kategori berhasil dihapus.' });
  } catch (err) {
    console.error('Delete category error:', err);
    return res.status(500).json({ success: false, message: 'Gagal menghapus kategori.' });
  }
});

module.exports = router;
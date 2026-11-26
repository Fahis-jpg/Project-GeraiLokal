const express = require('express');
const bcrypt = require('bcrypt');
const pool = require('../db');
const { authenticate, authorizeRoles } = require('../middleware/rbac');

const router = express.Router();

router.use(authenticate, authorizeRoles('admin_master'));

// GET /api/admin-master/admins
router.get('/admins', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, email, role, is_active, created_at
       FROM users
       WHERE role = 'admin'
       ORDER BY created_at DESC`
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Get admins error:', err);
    return res.status(500).json({ success: false, message: 'Gagal memuat daftar Admin BUMDes.' });
  }
});

// POST /api/admin-master/admins
router.post('/admins', async (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');

  if (!name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, message: 'Nama dan email valid wajib diisi.' });
  }
  if (password.length < 8 || password.length > 72) {
    return res.status(400).json({ success: false, message: 'Kata sandi harus 8–72 karakter.' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, is_active)
       VALUES ($1, $2, $3, 'admin', TRUE)
       RETURNING id, name, email, role, is_active, created_at`,
      [name, email, passwordHash]
    );
    return res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ success: false, message: 'Email sudah terdaftar.' });
    }
    console.error('Create admin error:', err);
    return res.status(500).json({ success: false, message: 'Gagal membuat akun Admin BUMDes.' });
  }
});

// PUT /api/admin-master/admins/:id
router.put('/admins/:id', async (req, res) => {
  const name = req.body.name ? String(req.body.name).trim() : null;
  const email = req.body.email ? String(req.body.email).trim().toLowerCase() : null;
  const password = req.body.password ? String(req.body.password) : null;

  if (password && (password.length < 8 || password.length > 72)) {
    return res.status(400).json({ success: false, message: 'Kata sandi harus 8–72 karakter.' });
  }

  try {
    const passwordHash = password ? await bcrypt.hash(password, 10) : null;
    const { rows } = await pool.query(
      `UPDATE users
       SET name = COALESCE($1, name),
           email = COALESCE($2, email),
           password_hash = COALESCE($3, password_hash)
       WHERE id = $4 AND role = 'admin'
       RETURNING id, name, email, role, is_active, created_at`,
      [name, email, passwordHash, req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Akun Admin BUMDes tidak ditemukan.' });
    }
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ success: false, message: 'Email sudah digunakan akun lain.' });
    }
    return res.status(500).json({ success: false, message: 'Gagal memperbarui akun Admin BUMDes.' });
  }
});

// PATCH /api/admin-master/admins/:id/status
router.patch('/admins/:id/status', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE users
       SET is_active = $1
       WHERE id = $2 AND role = 'admin'
       RETURNING id, name, email, role, is_active`,
      [Boolean(req.body.is_active), req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Akun Admin BUMDes tidak ditemukan.' });
    }
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('Toggle admin status error:', err);
    return res.status(500).json({ success: false, message: 'Gagal mengubah status akun Admin.' });
  }
});

// DELETE /api/admin-master/admins/:id
router.delete('/admins/:id', async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      `DELETE FROM users WHERE id = $1 AND role = 'admin'`,
      [req.params.id]
    );
    if (rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Akun Admin BUMDes tidak ditemukan.' });
    }
    return res.json({ success: true, message: 'Akun Admin BUMDes berhasil dihapus.' });
  } catch (err) {
    console.error('Delete admin error:', err);
    return res.status(500).json({ success: false, message: 'Gagal menghapus akun Admin BUMDes.' });
  }
});

module.exports = router;
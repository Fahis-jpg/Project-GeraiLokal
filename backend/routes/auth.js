const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { authenticate } = require('../middleware/rbac');

const router = express.Router();

const getCookieOptions = () => {
  const isProd = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 hari
    path: '/',
  };
};

// POST /api/auth/register (role 'buyer')
router.post('/register', async (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');

  if (!name || name.length > 100) {
    return res.status(400).json({
      success: false,
      message: 'Nama lengkap wajib diisi (maksimal 100 karakter).',
    });
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({
      success: false,
      message: 'Format alamat email tidak valid.',
    });
  }
  if (password.length < 8 || password.length > 72) {
    return res.status(400).json({
      success: false,
      message: 'Kata sandi harus terdiri dari 8 hingga 72 karakter.',
    });
  }

  try {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Email sudah terdaftar. Silakan gunakan email lain atau masuk.',
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, is_active)
       VALUES ($1, $2, $3, 'buyer', TRUE)
       RETURNING id, name, email, role, created_at`,
      [name, email, passwordHash]
    );

    return res.status(201).json({
      success: true,
      message: 'Registrasi berhasil.',
      data: rows[0],
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan pada server saat mendaftarkan akun.',
    });
  }
});

// POST /api/auth/login (buyer, admin, admin_master)
router.post('/login', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Email dan kata sandi wajib diisi.',
    });
  }

  try {
    const { rows } = await pool.query(
      'SELECT id, name, email, password_hash, role, is_active FROM users WHERE email = $1',
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Email atau kata sandi tidak cocok.',
      });
    }

    const user = rows[0];
    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Akun Anda dinonaktifkan. Hubungi Admin BUMDes.',
      });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Email atau kata sandi tidak cocok.',
      });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    res.cookie('access_token', token, getCookieOptions());

    return res.json({
      success: true,
      message: 'Login berhasil.',
      data: safeUser,
      access_token: token,
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan pada server saat proses masuk.',
    });
  }
});

// GET atau POST /api/auth/me
router.all('/me', authenticate, (req, res) => {
  return res.json({
    success: true,
    data: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
    },
  });
});

// POST /api/auth/logout
router.post('/logout', (_req, res) => {
  const { maxAge, ...clearOptions } = getCookieOptions();
  res.clearCookie('access_token', clearOptions);
  return res.json({ success: true, message: 'Berhasil keluar.' });
});

module.exports = router;
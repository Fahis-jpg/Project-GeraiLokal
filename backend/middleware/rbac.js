const jwt = require('jsonwebtoken');
const pool = require('../db');

const authenticate = async (req, res, next) => {
  try {
    const cookieToken = req.cookies?.access_token;
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    const token = cookieToken || bearerToken;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Sesi tidak ditemukan. Silakan masuk terlebih dahulu.',
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { rows } = await pool.query(
      'SELECT id, name, email, role, is_active FROM users WHERE id = $1',
      [decoded.id]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Akun pengguna tidak ditemukan.',
      });
    }

    if (!rows[0].is_active) {
      return res.status(403).json({
        success: false,
        message: 'Akun Anda sedang dinonaktifkan. Hubungi Admin Master BUMDes.',
      });
    }

    req.user = rows[0];
    next();
  } catch {
    return res.status(401).json({
      success: false,
      message: 'Sesi kedaluwarsa atau tidak valid. Silakan masuk kembali.',
    });
  }
};

const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Akses ditolak. Anda tidak memiliki izin untuk mengakses fitur ini.',
      });
    }
    next();
  };
};

module.exports = { authenticate, authorizeRoles };
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const pool = require('./db');
const authRoutes = require('./routes/auth');
const bumdesRoutes = require('./routes/bumdes');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const analyticsRoutes = require('./routes/analytics');
const adminMasterRoutes = require('./routes/adminMaster');

const app = express();

// Trust proxy wajib aktif di Vercel agar cookie Secure berjalan benar
app.set('trust proxy', 1);

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  process.env.FRONTEND_URL,
]
  .filter(Boolean)
  .map((origin) => origin.replace(/\/$/, ''));

app.use(
  cors({
    origin(origin, callback) {
      // Izinkan request tanpa origin (Postman/curl) atau origin yang terdaftar
      if (!origin || allowedOrigins.includes(origin.replace(/\/$/, ''))) {
        return callback(null, true);
      }
      return callback(new Error(`Origin ${origin} tidak diizinkan oleh CORS`));
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

// Health Check Endpoint
app.get('/', (_req, res) => {
  res.json({
    success: true,
    service: 'GeraiLokal BUMDes API',
    version: '2.0.0',
  });
});

app.get('/api/health', async (_req, res) => {
  try {
    const dbRes = await pool.query('SELECT NOW() AS server_time');
    res.json({
      success: true,
      database: 'connected',
      server_time: dbRes.rows[0].server_time,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      database: 'disconnected',
      error: err.message,
    });
  }
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/bumdes', bumdesRoutes);
app.use('/api', bumdesRoutes); // Menyediakan /api/categories secara langsung
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/admin-master', adminMasterRoutes);

// 404 Handler
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint API tidak ditemukan.' });
});

// Global Error Handler
app.use((err, _req, res, _next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    success: false,
    message: err.message || 'Terjadi kesalahan internal pada server.',
  });
});

// Jalankan HTTP server hanya saat tidak berjalan sebagai Vercel Serverless Function
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server GeraiLokal BUMDes aktif di http://localhost:${PORT}`);
  });
}

module.exports = app;
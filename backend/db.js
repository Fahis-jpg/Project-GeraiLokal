const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn('PERINGATAN: DATABASE_URL belum diatur di environment variables.');
}

const useSSL =
  process.env.NODE_ENV === 'production' ||
  Boolean(process.env.VERCEL) ||
  (connectionString && (connectionString.includes('neon.tech') || connectionString.includes('sslmode=require')));

const pool = new Pool({
  connectionString,
  ssl: useSSL ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err);
});

module.exports = pool;
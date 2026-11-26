const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const pool = require('./db');
require('dotenv').config();

async function runSeed() {
  try {
    console.log('1. Menjalankan schema.sql ke database Neon...');
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await pool.query(schemaSql);

    console.log('2. Membuat / memperbarui akun Admin Master...');
    const masterName = process.env.ADMIN_MASTER_NAME || 'Admin Master BUMDes';
    const masterEmail = (process.env.ADMIN_MASTER_EMAIL || 'master@gerailokal.id').toLowerCase();
    const masterPassword = process.env.ADMIN_MASTER_PASSWORD || 'MasterBUMDes123!';
    const passwordHash = await bcrypt.hash(masterPassword, 10);

    await pool.query(
      `INSERT INTO users (name, email, password_hash, role, is_active)
       VALUES ($1, $2, $3, 'admin_master', TRUE)
       ON CONFLICT (email) DO UPDATE
       SET name = EXCLUDED.name,
           password_hash = EXCLUDED.password_hash,
           role = 'admin_master',
           is_active = TRUE`,
      [masterName, masterEmail, passwordHash]
    );

    console.log('3. Mengecek produk awal BUMDes...');
    const prodCount = await pool.query('SELECT COUNT(*)::int AS total FROM products');
    if (prodCount.rows[0].total === 0) {
      const catRes = await pool.query('SELECT id, name FROM categories');
      const catMap = Object.fromEntries(catRes.rows.map((c) => [c.name, c.id]));

      const sampleProducts = [
        {
          name: 'Outer Tenun Ikat Kirana',
          category_id: catMap['Pakaian'] || null,
          price: 125000,
          stock: 4,
          description: 'Luaran kasual aksen tenun asli karya pengrajin desa.',
          image_url: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=600',
        },
        {
          name: 'Tas Kain Perca Nusantara',
          category_id: catMap['Aksesori'] || null,
          price: 100000,
          stock: 15,
          description: 'Tas bahu ramah lingkungan dengan kombinasi kain tenun perca.',
          image_url: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=600',
        },
        {
          name: 'Kursi Santai Anyaman Rotan',
          category_id: catMap['Dekorasi'] || null,
          price: 525000,
          stock: 3,
          description: 'Kursi rotan alami buatan tangan pengrajin mebel desa.',
          image_url: 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=600',
        },
        {
          name: 'Dompet Ecoprint Daun Jati',
          category_id: catMap['Aksesori'] || null,
          price: 52500,
          stock: 20,
          description: 'Dompet kanvas motif ecoprint pewarna alami tumbuhan.',
          image_url: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600',
        },
        {
          name: 'Kopi Robusta Lereng Desa 250g',
          category_id: catMap['Minuman'] || null,
          price: 45000,
          stock: 28,
          description: 'Biji kopi sangrai medium roast dari kebun petani lokal.',
          image_url: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=600',
        },
      ];

      for (const item of sampleProducts) {
        await pool.query(
          `INSERT INTO products (shop_id, category_id, name, description, price, stock, image_url)
           VALUES (1, $1, $2, $3, $4, $5, $6)`,
          [item.category_id, item.name, item.description, item.price, item.stock, item.image_url]
        );
      }
    }

    console.log('Seeding selesai!');
    console.log(`Login Admin Master -> Email: ${masterEmail} | Password: ${masterPassword}`);
  } catch (err) {
    console.error('Gagal melakukan seeding:', err);
  } finally {
    await pool.end();
  }
}

runSeed();
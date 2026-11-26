const express = require('express');
const pool = require('../db');
const { authenticate, authorizeRoles } = require('../middleware/rbac');

const router = express.Router();

// POST /api/orders (Checkout - Memotong stok produk secara transaksional)
router.post('/', authenticate, async (req, res) => {
  const { payment_method, shipping_address, items } = req.body;

  if (!shipping_address || !String(shipping_address).trim()) {
    return res.status(400).json({ error: 'Alamat pengiriman wajib diisi.' });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Keranjang belanja tidak boleh kosong.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let totalPrice = 0;
    const validatedItems = [];

    for (const item of items) {
      const productId = Number(item.product_id);
      const quantity = Number(item.quantity);

      if (!productId || !quantity || quantity <= 0) {
        throw new Error('Data item pesanan tidak valid.');
      }

      // Kunci baris produk (FOR UPDATE) agar stok aman dari race condition
      const prodRes = await client.query(
        'SELECT id, name, price, stock FROM products WHERE id = $1 FOR UPDATE',
        [productId]
      );

      if (prodRes.rows.length === 0) {
        throw new Error(`Produk dengan ID ${productId} tidak ditemukan.`);
      }

      const product = prodRes.rows[0];
      if (product.stock < quantity) {
        throw new Error(`Stok "${product.name}" tidak mencukupi (tersisa ${product.stock}).`);
      }

      const lineTotal = Number(product.price) * quantity;
      totalPrice += lineTotal;

      validatedItems.push({
        product_id: product.id,
        quantity,
        price: Number(product.price),
      });
    }

    const orderRes = await client.query(
      `INSERT INTO orders (user_id, total_price, status, payment_method, shipping_address)
       VALUES ($1, $2, 'pending', $3, $4)
       RETURNING *`,
      [
        req.user.id,
        totalPrice,
        String(payment_method || 'QRIS').trim(),
        String(shipping_address).trim(),
      ]
    );
    const newOrder = orderRes.rows[0];

    for (const vItem of validatedItems) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, quantity, price)
         VALUES ($1, $2, $3, $4)`,
        [newOrder.id, vItem.product_id, vItem.quantity, vItem.price]
      );

      await client.query(
        'UPDATE products SET stock = stock - $1 WHERE id = $2',
        [vItem.quantity, vItem.product_id]
      );
    }

    await client.query('COMMIT');
    return res.status(201).json({ success: true, data: newOrder });
  } catch (err) {
    await client.query('ROLLBACK');
    return res.status(400).json({ error: err.message || 'Gagal memproses checkout.' });
  } finally {
    client.release();
  }
});

// GET /api/orders/my-orders (Riwayat pesanan milik user yang login)
router.get('/my-orders', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT o.id, o.total_price, o.status, o.payment_method, o.shipping_address, o.created_at,
              COALESCE(
                json_agg(
                  json_build_object(
                    'id', oi.id,
                    'product_id', oi.product_id,
                    'product_name', COALESCE(p.name, 'Produk Dihapus'),
                    'quantity', oi.quantity,
                    'price', oi.price
                  )
                ) FILTER (WHERE oi.id IS NOT NULL), '[]'
              ) AS items
       FROM orders o
       LEFT JOIN order_items oi ON oi.order_id = o.id
       LEFT JOIN products p ON p.id = oi.product_id
       WHERE o.user_id = $1
       GROUP BY o.id
       ORDER BY o.created_at DESC`,
      [req.user.id]
    );
    return res.json(rows);
  } catch (err) {
    console.error('Get my-orders error:', err);
    return res.status(500).json({ success: false, message: 'Gagal memuat riwayat pesanan.' });
  }
});

// GET /api/orders/manage (Daftar seluruh pesanan masuk ke BUMDes - Admin & Admin Master)
router.get('/manage', authenticate, authorizeRoles('admin', 'admin_master'), async (req, res) => {
  const statusFilter = req.query.status ? String(req.query.status).trim() : null;

  try {
    const { rows } = await pool.query(
      `SELECT o.id, o.total_price, o.status, o.payment_method, o.shipping_address, o.created_at,
              u.name AS buyer_name, u.email AS buyer_email,
              COALESCE(
                json_agg(
                  json_build_object(
                    'id', oi.id,
                    'product_id', oi.product_id,
                    'product_name', COALESCE(p.name, 'Produk Dihapus'),
                    'quantity', oi.quantity,
                    'price', oi.price
                  )
                ) FILTER (WHERE oi.id IS NOT NULL), '[]'
              ) AS items
       FROM orders o
       JOIN users u ON u.id = o.user_id
       LEFT JOIN order_items oi ON oi.order_id = o.id
       LEFT JOIN products p ON p.id = oi.product_id
       WHERE ($1::text IS NULL OR o.status = $1)
       GROUP BY o.id, u.name, u.email
       ORDER BY o.created_at DESC`,
      [statusFilter]
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Manage orders error:', err);
    return res.status(500).json({ success: false, message: 'Gagal memuat pesanan BUMDes.' });
  }
});

// PUT /api/orders/:id/status (Proses status pesanan - Admin & Admin Master)
router.put('/:id/status', authenticate, authorizeRoles('admin', 'admin_master'), async (req, res) => {
  const allowedStatuses = ['pending', 'paid', 'shipped', 'completed', 'cancelled'];
  const nextStatus = String(req.body.status || '').trim();

  if (!allowedStatuses.includes(nextStatus)) {
    return res.status(400).json({ success: false, message: 'Status pesanan tidak valid.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const currentRes = await client.query(
      'SELECT id, status FROM orders WHERE id = $1 FOR UPDATE',
      [req.params.id]
    );
    if (currentRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Pesanan tidak ditemukan.' });
    }

    const prevStatus = currentRes.rows[0].status;

    // Jika dibatalkan dari status aktif, kembalikan stok produk otomatis
    if (prevStatus !== 'cancelled' && nextStatus === 'cancelled') {
      const itemsRes = await client.query(
        'SELECT product_id, quantity FROM order_items WHERE order_id = $1 AND product_id IS NOT NULL',
        [req.params.id]
      );
      for (const item of itemsRes.rows) {
        await client.query(
          'UPDATE products SET stock = stock + $1 WHERE id = $2',
          [item.quantity, item.product_id]
        );
      }
    }

    const updatedRes = await client.query(
      'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
      [nextStatus, req.params.id]
    );

    await client.query('COMMIT');
    return res.json({ success: true, data: updatedRes.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Update order status error:', err);
    return res.status(500).json({ success: false, message: 'Gagal mengubah status pesanan.' });
  } finally {
    client.release();
  }
});

module.exports = router;
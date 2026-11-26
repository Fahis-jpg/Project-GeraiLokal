const express = require('express');
const pool = require('../db');
const { authenticate, authorizeRoles } = require('../middleware/rbac');

const router = express.Router();

// GET /api/analytics/executive?month=2026-11&category_id=1&low_stock_threshold=5
router.get('/executive', authenticate, authorizeRoles('admin', 'admin_master'), async (req, res) => {
  const month = req.query.month && /^\d{4}-\d{2}$/.test(req.query.month) ? req.query.month : null;
  const categoryId = req.query.category_id ? Number(req.query.category_id) : null;
  const threshold = req.query.low_stock_threshold ? Number(req.query.low_stock_threshold) : 5;

  const successStatuses = ['paid', 'shipped', 'completed'];

  try {
    const [
      kpiSalesRes,
      lowStockRes,
      trendRes,
      topProductsRes,
      categoryBreakdownRes,
      availableMonthsRes,
    ] = await Promise.all([
      // 1. Ringkasan KPI: Total Pendapatan, Total Pesanan Berhasil, Total Unit Terjual
      pool.query(
        `SELECT
           COALESCE(SUM(oi.quantity * oi.price), 0)::numeric(14,2) AS total_revenue,
           COUNT(DISTINCT o.id)::int AS total_successful_orders,
           COALESCE(SUM(oi.quantity), 0)::int AS total_units_sold
         FROM orders o
         JOIN order_items oi ON oi.order_id = o.id
         LEFT JOIN products p ON p.id = oi.product_id
         WHERE o.status = ANY($1)
           AND ($2::text IS NULL OR TO_CHAR(o.created_at, 'YYYY-MM') = $2)
           AND ($3::int IS NULL OR p.category_id = $3)`,
        [successStatuses, month, categoryId]
      ),

      // 2. KPI & Daftar Produk dengan Stok Menipis
      pool.query(
        `SELECT p.id, p.name, p.stock, p.price, p.image_url,
                COALESCE(c.name, 'Umum') AS category_name
         FROM products p
         LEFT JOIN categories c ON c.id = p.category_id
         WHERE p.stock <= $1
           AND ($2::int IS NULL OR p.category_id = $2)
         ORDER BY p.stock ASC, p.name ASC`,
        [threshold, categoryId]
      ),

      // 3. Grafik Tren Pendapatan Per Bulan (12 bulan terakhir, mendukung filter kategori)
      pool.query(
        `SELECT
           TO_CHAR(DATE_TRUNC('month', o.created_at), 'YYYY-MM') AS month,
           TO_CHAR(DATE_TRUNC('month', o.created_at), 'Mon YYYY') AS month_label,
           COALESCE(SUM(oi.quantity * oi.price), 0)::numeric(14,2) AS revenue,
           COUNT(DISTINCT o.id)::int AS order_count
         FROM orders o
         JOIN order_items oi ON oi.order_id = o.id
         LEFT JOIN products p ON p.id = oi.product_id
         WHERE o.status = ANY($1)
           AND o.created_at >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '11 months'
           AND ($2::int IS NULL OR p.category_id = $2)
         GROUP BY DATE_TRUNC('month', o.created_at)
         ORDER BY DATE_TRUNC('month', o.created_at) ASC`,
        [successStatuses, categoryId]
      ),

      // 4. Daftar Produk Terlaris (Top-Selling Products, mendukung filter bulan & kategori)
      pool.query(
        `SELECT
           p.id,
           p.name,
           p.price,
           p.stock,
           p.image_url,
           COALESCE(c.name, 'Umum') AS category_name,
           SUM(oi.quantity)::int AS total_sold,
           SUM(oi.quantity * oi.price)::numeric(14,2) AS total_revenue
         FROM order_items oi
         JOIN orders o ON o.id = oi.order_id
         JOIN products p ON p.id = oi.product_id
         LEFT JOIN categories c ON c.id = p.category_id
         WHERE o.status = ANY($1)
           AND ($2::text IS NULL OR TO_CHAR(o.created_at, 'YYYY-MM') = $2)
           AND ($3::int IS NULL OR p.category_id = $3)
         GROUP BY p.id, p.name, p.price, p.stock, p.image_url, c.name
         ORDER BY total_sold DESC, total_revenue DESC
         LIMIT 5`,
        [successStatuses, month, categoryId]
      ),

      // 5. Kontribusi Pendapatan Per Kategori (untuk drill-down kategori)
      pool.query(
        `SELECT
           c.id AS category_id,
           c.name AS category_name,
           COALESCE(SUM(oi.quantity), 0)::int AS total_sold,
           COALESCE(SUM(oi.quantity * oi.price), 0)::numeric(14,2) AS total_revenue
         FROM categories c
         LEFT JOIN products p ON p.category_id = c.id
         LEFT JOIN order_items oi ON oi.product_id = p.id
         LEFT JOIN orders o ON o.id = oi.order_id
           AND o.status = ANY($1)
           AND ($2::text IS NULL OR TO_CHAR(o.created_at, 'YYYY-MM') = $2)
         GROUP BY c.id, c.name
         ORDER BY total_revenue DESC`,
        [successStatuses, month]
      ),

      // 6. Daftar Bulan Tersedia untuk Dropdown Filter
      pool.query(
        `SELECT DISTINCT
           TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS value,
           TO_CHAR(DATE_TRUNC('month', created_at), 'Month YYYY') AS label
         FROM orders
         ORDER BY value DESC`
      ),
    ]);

    return res.json({
      success: true,
      filters: {
        month,
        category_id: categoryId,
        low_stock_threshold: threshold,
      },
      kpi: {
        total_revenue: Number(kpiSalesRes.rows[0].total_revenue),
        total_successful_orders: kpiSalesRes.rows[0].total_successful_orders,
        total_units_sold: kpiSalesRes.rows[0].total_units_sold,
        low_stock_count: lowStockRes.rows.length,
      },
      low_stock_products: lowStockRes.rows.map((r) => ({
        ...r,
        price: Number(r.price),
      })),
      monthly_revenue_trend: trendRes.rows.map((r) => ({
        ...r,
        revenue: Number(r.revenue),
      })),
      top_products: topProductsRes.rows.map((r) => ({
        ...r,
        price: Number(r.price),
        total_revenue: Number(r.total_revenue),
      })),
      category_breakdown: categoryBreakdownRes.rows.map((r) => ({
        ...r,
        total_revenue: Number(r.total_revenue),
      })),
      available_months: availableMonthsRes.rows.map((r) => ({
        value: r.value,
        label: r.label.trim(),
      })),
    });
  } catch (err) {
    console.error('Executive analytics error:', err);
    return res.status(500).json({ success: false, message: 'Gagal memuat data analitik eksekutif.' });
  }
});

module.exports = router;
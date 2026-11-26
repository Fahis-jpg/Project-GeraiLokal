import { useState, useEffect } from 'react';
import api from './api';
import {
  TrendingUp, ShoppingBag, PackageCheck, AlertTriangle,
  Filter, RotateCcw, Award, BarChart3, Layers, ArrowUpRight,
  Calendar, PieChart
} from 'lucide-react';

const formatRupiah = (val) => `Rp ${Number(val || 0).toLocaleString('id-ID')}`;

const DONUT_COLORS = ['#12213E', '#FAB800', '#2D3D59', '#C9AB6D', '#12B76A', '#0BA5EC'];

export default function ExecutiveDashboard({ categories = [], userRole = 'admin' }) {
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadAnalytics = async () => {
      try {
        const params = new URLSearchParams();
        if (selectedMonth) params.append('month', selectedMonth);
        if (selectedCategory) params.append('category_id', selectedCategory);

        const queryString = params.toString();
        const url = queryString
          ? `/analytics/executive?${queryString}`
          : '/analytics/executive';

        const res = await api.get(url);
        if (isMounted && res.data?.success) {
          setAnalytics(res.data);
          setError('');
        }
      } catch (err) {
        if (isMounted) {
          setError(err.response?.data?.message || 'Gagal memuat data analitik eksekutif.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadAnalytics();
    return () => {
      isMounted = false;
    };
  }, [selectedMonth, selectedCategory]);

  const handleMonthFilter = (nextMonth) => {
    setLoading(true);
    setSelectedMonth(nextMonth);
  };

  const handleCategoryFilter = (nextCategory) => {
    setLoading(true);
    setSelectedCategory(nextCategory);
  };

  const kpi = analytics?.kpi || {
    total_revenue: 0,
    total_successful_orders: 0,
    total_units_sold: 0,
    low_stock_count: 0,
  };

  const monthlyTrend = analytics?.monthly_revenue_trend || [];
  const topProducts = analytics?.top_products || [];
  const categoryBreakdown = analytics?.category_breakdown || [];
  const lowStockProducts = analytics?.low_stock_products || [];
  const availableMonths = analytics?.available_months || [];

  const maxMonthlyRevenue = Math.max(1, ...monthlyTrend.map((m) => m.revenue));
  const totalCategoryRevenue = categoryBreakdown.reduce((sum, c) => sum + Number(c.total_revenue || 0), 0);
  const topProductMaxRevenue = Math.max(1, ...topProducts.map((p) => Number(p.total_revenue || 0)));
  const hasActiveFilter = Boolean(selectedMonth || selectedCategory);

  // Metrik turunan eksekutif
  const avgOrderValue =
    kpi.total_successful_orders > 0
      ? Math.round(kpi.total_revenue / kpi.total_successful_orders)
      : 0;
  const avgUnitsPerOrder =
    kpi.total_successful_orders > 0
      ? (kpi.total_units_sold / kpi.total_successful_orders).toFixed(1)
      : '0.0';

  const peakMonth = monthlyTrend.reduce(
    (best, item) => (item.revenue > (best?.revenue || 0) ? item : best),
    null
  );
  const avgMonthlyRevenue =
    monthlyTrend.length > 0
      ? Math.round(monthlyTrend.reduce((s, m) => s + m.revenue, 0) / monthlyTrend.length)
      : 0;

  // Perhitungan segmen SVG Donut Chart
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const donutSegments = categoryBreakdown.reduce((acc, cat, idx) => {
    const val = Number(cat.total_revenue || 0);
    const ratio = totalCategoryRevenue > 0 ? val / totalCategoryRevenue : 0;
    const strokeLength = ratio * circumference;
    const prevOffset = acc.length > 0 ? acc[acc.length - 1].nextOffset : 0;

    acc.push({
      ...cat,
      ratio,
      strokeLength,
      strokeDashoffset: -prevOffset,
      nextOffset: prevOffset + strokeLength,
      color: DONUT_COLORS[idx % DONUT_COLORS.length],
    });
    return acc;
  }, []);

  return (
    <div className="space-y-6">

      {/* 1. EXECUTIVE HERO BANNER & FILTER DRILL-DOWN */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#12213E] via-[#1B2F54] to-[#2D3D59] text-white p-6 sm:p-8 shadow-md">
        <div className="absolute -right-12 -top-12 w-56 h-56 rounded-full bg-[#FAB800]/10 blur-2xl pointer-events-none" />
        <div className="absolute right-24 -bottom-16 w-44 h-44 rounded-full bg-white/5 blur-xl pointer-events-none" />

        <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[#FAB800] text-[11px] font-semibold tracking-wider uppercase">
              <BarChart3 className="w-3.5 h-3.5" />
              <span>
                {userRole === 'admin_master'
                  ? 'Executive Intelligence • Admin Master'
                  : 'Sales Analytics • Admin BUMDes'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Ringkasan Kinerja & Analitik BUMDes
            </h1>
            <p className="text-xs sm:text-sm text-[#D0D5DD] max-w-2xl">
              Pantau pertumbuhan pendapatan, performa produk unggulan desa, dan status stok secara real-time. Klik batang grafik atau kategori untuk drill-down.
            </p>
          </div>

          {/* Kontrol Filter Drill-Down */}
          <div className="flex flex-wrap items-center gap-2.5 bg-white/10 backdrop-blur-xs p-3 rounded-xl border border-white/15 shrink-0">
            <div className="inline-flex items-center gap-1.5 text-xs font-medium text-[#DFCAA0] px-1">
              <Filter className="w-3.5 h-3.5" />
              <span>filter</span>
            </div>

            <select
              value={selectedMonth}
              onChange={(e) => handleMonthFilter(e.target.value)}
              aria-label="Filter Bulan"
              className="h-9 px-3 rounded-lg border border-white/20 bg-[#12213E]/90 text-xs font-medium text-white focus:outline-none focus:border-[#FAB800]"
            >
              <option value="">Semua Bulan</option>
              {availableMonths.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>

            <select
              value={selectedCategory}
              onChange={(e) => handleCategoryFilter(e.target.value)}
              aria-label="Filter Kategori"
              className="h-9 px-3 rounded-lg border border-white/20 bg-[#12213E]/90 text-xs font-medium text-white focus:outline-none focus:border-[#FAB800]"
            >
              <option value="">Semua Kategori</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>

            {hasActiveFilter && (
              <button
                type="button"
                onClick={() => {
                  setLoading(true);
                  setSelectedMonth('');
                  setSelectedCategory('');
                }}
                className="h-9 px-3 rounded-lg bg-[#FAB800] hover:bg-[#FFC833] text-[#12213E] text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer border-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-[#D92D20]/30 bg-[#FFF2F1] text-[#D92D20] text-xs font-medium">
          {error}
        </div>
      )}

      {/* 2. 4 KARTU RINGKASAN KPI DENGAN VISUAL SPARKLINE */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
        {/* KPI 1: Total Pendapatan */}
        <div className="relative overflow-hidden bg-white rounded-2xl border border-[#E8E1D3] p-5 shadow-2xs hover:shadow-md transition-all">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#FAB800] to-[#D4BB80]" />
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold text-[#53647C]">Total Pendapatan</span>
              <p className="text-xl sm:text-2xl font-extrabold text-[#12213E] mt-1.5 tracking-tight">
                {loading ? '...' : formatRupiah(kpi.total_revenue)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#FFF9CC] border border-[#FFE499] text-[#12213E] flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#F5F1E8] flex items-center justify-between">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#12B76A]">
              <ArrowUpRight className="w-3.5 h-3.5" /> Paid, Shipped & Completed
            </span>
            <svg className="w-16 h-6 text-[#FAB800]" viewBox="0 0 64 24" fill="none">
              <path
                d="M2 20L16 14L28 17L44 7L62 3"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        {/* KPI 2: Pesanan Berhasil */}
        <div className="relative overflow-hidden bg-white rounded-2xl border border-[#E8E1D3] p-5 shadow-2xs hover:shadow-md transition-all">
          <div className="absolute top-0 inset-x-0 h-1 bg-[#12213E]" />
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold text-[#53647C]">Pesanan Berhasil</span>
              <p className="text-xl sm:text-2xl font-extrabold text-[#12213E] mt-1.5 tracking-tight">
                {loading ? '...' : `${kpi.total_successful_orders} Transaksi`}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#12213E] text-[#FAB800] flex items-center justify-center shrink-0">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#F5F1E8] flex items-center justify-between text-[11px]">
            <span className="text-[#8F9AAA]">Rata-rata Order (AOV)</span>
            <span className="font-bold text-[#12213E]">{formatRupiah(avgOrderValue)}</span>
          </div>
        </div>

        {/* KPI 3: Total Produk Terjual */}
        <div className="relative overflow-hidden bg-white rounded-2xl border border-[#E8E1D3] p-5 shadow-2xs hover:shadow-md transition-all">
          <div className="absolute top-0 inset-x-0 h-1 bg-[#0BA5EC]" />
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold text-[#53647C]">Total Produk Terjual</span>
              <p className="text-xl sm:text-2xl font-extrabold text-[#12213E] mt-1.5 tracking-tight">
                {loading ? '...' : `${kpi.total_units_sold} Unit`}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#E0F2FE] text-[#0BA5EC] flex items-center justify-center shrink-0">
              <PackageCheck className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#F5F1E8] flex items-center justify-between text-[11px]">
            <span className="text-[#8F9AAA]">Rata-rata per Transaksi</span>
            <span className="font-bold text-[#12213E]">{avgUnitsPerOrder} unit / order</span>
          </div>
        </div>

        {/* KPI 4: Stok Menipis */}
        <div className="relative overflow-hidden bg-white rounded-2xl border border-[#E8E1D3] p-5 shadow-2xs hover:shadow-md transition-all">
          <div
            className={`absolute top-0 inset-x-0 h-1 ${
              kpi.low_stock_count > 0 ? 'bg-[#F79009]' : 'bg-[#12B76A]'
            }`}
          />
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold text-[#53647C]">Stok Menipis (≤ 5)</span>
              <p className="text-xl sm:text-2xl font-extrabold text-[#12213E] mt-1.5 tracking-tight">
                {loading ? '...' : `${kpi.low_stock_count} Produk`}
              </p>
            </div>
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                kpi.low_stock_count > 0
                  ? 'bg-[#FEF3C7] text-[#F79009]'
                  : 'bg-[#ECFDF3] text-[#12B76A]'
              }`}
            >
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#F5F1E8] flex items-center justify-between text-[11px]">
            <span
              className={`font-semibold ${
                kpi.low_stock_count > 0 ? 'text-[#F79009]' : 'text-[#12B76A]'
              }`}
            >
              {kpi.low_stock_count > 0
                ? 'Segera jadwalkan restock pengrajin'
                : 'Kapasitas inventaris aman'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. GRAFIK TREN PENDAPATAN PER BULAN & PRODUK TERLARIS */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Grafik Tren Pendapatan Bulanan (7 Kolom) */}
        <div className="xl:col-span-7 bg-white rounded-2xl border border-[#E8E1D3] p-6 shadow-2xs flex flex-col justify-between">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#12213E]">
                Tren Pendapatan Bulanan
              </h2>
              <p className="text-xs text-[#8F9AAA] mt-0.5">
                Klik pada batang bulan untuk melakukan filter drill-down transaksi
              </p>
            </div>
            {selectedMonth && (
              <span className="px-3 py-1 rounded-full bg-[#FFF9CC] border border-[#FAB800] text-[11px] font-bold text-[#12213E]">
                Filter Aktif: {selectedMonth}
              </span>
            )}
          </div>

          {loading ? (
            <div className="h-64 flex items-center justify-center text-xs text-[#8F9AAA]">
              Menghitung agregasi pendapatan...
            </div>
          ) : monthlyTrend.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center border border-dashed border-[#E8E1D3] rounded-2xl bg-[#FFFDF8] p-6">
              <BarChart3 className="w-8 h-8 text-[#C9AB6D] mb-2" />
              <p className="text-sm font-bold text-[#12213E]">Belum Ada Data Transaksi Berhasil</p>
            </div>
          ) : (
            <div className="relative pt-8 pb-2">
              {/* Garis bantu horizontal latar belakang */}
              <div className="absolute inset-x-0 top-10 bottom-10 flex flex-col justify-between pointer-events-none">
                <div className="border-b border-dashed border-[#E8E1D3] flex justify-end">
                  <span className="text-[10px] text-[#8F9AAA] -mt-4 bg-white px-1">
                    {formatRupiah(maxMonthlyRevenue)}
                  </span>
                </div>
                <div className="border-b border-dashed border-[#E8E1D3] flex justify-end">
                  <span className="text-[10px] text-[#8F9AAA] -mt-4 bg-white px-1">
                    {formatRupiah(Math.round(maxMonthlyRevenue / 2))}
                  </span>
                </div>
                <div className="border-b border-[#E8E1D3]" />
              </div>

              {/* Area Batang Grafik */}
              <div className="relative z-10 h-60 flex items-end gap-3 sm:gap-5 px-3 overflow-x-auto">
                {monthlyTrend.map((item) => {
                  const heightPercent = Math.max(
                    14,
                    Math.round((item.revenue / maxMonthlyRevenue) * 100)
                  );
                  const isSelected = selectedMonth === item.month;
                  return (
                    <button
                      key={item.month}
                      type="button"
                      onClick={() => handleMonthFilter(isSelected ? '' : item.month)}
                      className="group relative flex-1 min-w-[58px] h-full flex flex-col items-center justify-end gap-2 bg-transparent border-0 p-0 cursor-pointer"
                    >
                      {/* Tooltip Hover */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none absolute -top-9 z-20 bg-[#12213E] text-white text-[10px] px-2.5 py-1 rounded-lg shadow-lg whitespace-nowrap">
                        <span className="font-bold text-[#FAB800]">{formatRupiah(item.revenue)}</span>{' '}
                        ({item.order_count} order)
                      </div>

                      {/* Label Singkat di Atas Batang */}
                      <span
                        className={`text-[10px] font-bold whitespace-nowrap ${
                          isSelected ? 'text-[#12213E]' : 'text-[#53647C]'
                        }`}
                      >
                        {item.revenue >= 1000000
                          ? `${(item.revenue / 1000000).toFixed(1)}jt`
                          : `${Math.round(item.revenue / 1000)}rb`}
                      </span>

                      {/* Batang Gradasi */}
                      <div className="w-full max-w-[46px] h-44 flex items-end justify-center">
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className={`w-full rounded-t-xl transition-all duration-300 shadow-xs ${
                            isSelected
                              ? 'bg-gradient-to-t from-[#D99B00] to-[#FAB800] ring-2 ring-[#FAB800]/40'
                              : 'bg-gradient-to-t from-[#12213E] to-[#3B527A] group-hover:from-[#1B2F54] group-hover:to-[#4C6896]'
                          }`}
                        />
                      </div>

                      {/* Nama Bulan */}
                      <span
                        className={`text-[11px] whitespace-nowrap ${
                          isSelected ? 'text-[#12213E] font-extrabold' : 'text-[#8F9AAA] font-medium'
                        }`}
                      >
                        {item.month_label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Footer Ringkasan Statistik Grafik */}
          <div className="mt-5 pt-4 border-t border-[#F5F1E8] flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-4">
              <span className="inline-flex items-center gap-1.5 text-[#53647C]">
                <span className="w-3 h-3 rounded-xs bg-gradient-to-t from-[#12213E] to-[#3B527A]" />
                Pendapatan Normal
              </span>
              <span className="inline-flex items-center gap-1.5 text-[#53647C]">
                <span className="w-3 h-3 rounded-xs bg-[#FAB800]" />
                Bulan Terpilih
              </span>
            </div>

            {peakMonth && (
              <div className="flex items-center gap-4 text-[11px]">
                <span className="inline-flex items-center gap-1 text-[#53647C]">
                  <Calendar className="w-3.5 h-3.5 text-[#C9AB6D]" />
                  Puncak: <strong className="text-[#12213E]">{peakMonth.month_label}</strong>
                </span>
                <span className="text-[#53647C]">
                  Rata-rata: <strong className="text-[#12213E]">{formatRupiah(avgMonthlyRevenue)}</strong>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Leaderboard Produk Terlaris (5 Kolom) */}
        <div className="xl:col-span-5 bg-white rounded-2xl border border-[#E8E1D3] p-6 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-[#12213E] flex items-center gap-2">
                  <Award className="w-5 h-5 text-[#FAB800]" /> Peringkat Produk Terlaris
                </h2>
                <p className="text-xs text-[#8F9AAA] mt-0.5">
                  Top 5 kontributor pendapatan terbesar BUMDes
                </p>
              </div>
            </div>

            {loading ? (
              <div className="py-12 text-center text-xs text-[#8F9AAA]">
                Memuat peringkat produk...
              </div>
            ) : topProducts.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#8F9AAA] border border-dashed border-[#E8E1D3] rounded-xl bg-[#FFFDF8]">
                Belum ada data produk terjual pada filter ini.
              </div>
            ) : (
              <div className="space-y-3.5">
                {topProducts.map((prod, idx) => {
                  const shareWidth = Math.max(
                    10,
                    Math.round((Number(prod.total_revenue) / topProductMaxRevenue) * 100)
                  );
                  const badgeStyle =
                    idx === 0
                      ? 'bg-[#FAB800] text-[#12213E] ring-2 ring-[#FFE499]'
                      : idx === 1
                      ? 'bg-[#E2E8F0] text-[#1E293B]'
                      : idx === 2
                      ? 'bg-[#FDE68A] text-[#92400E]'
                      : 'bg-[#F5F1E8] text-[#53647C]';

                  return (
                    <div
                      key={prod.id}
                      className="p-3.5 rounded-xl bg-[#FFFDF8] border border-[#E8E1D3] hover:border-[#C9AB6D] transition"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-6 h-6 rounded-full text-xs font-extrabold flex items-center justify-center shrink-0 ${badgeStyle}`}
                        >
                          {idx + 1}
                        </span>
                        <img
                          src={
                            prod.image_url ||
                            'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200'
                          }
                          alt={prod.name}
                          className="w-11 h-11 rounded-lg object-cover bg-[#F5F1E8] border border-[#E8E1D3] shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-[#12213E] truncate">{prod.name}</p>
                          <p className="text-[11px] text-[#8F9AAA]">
                            {prod.category_name} •{' '}
                            <span className="text-[#2D3D59] font-semibold">
                              {prod.total_sold} terjual
                            </span>
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-extrabold text-[#12213E]">
                            {formatRupiah(prod.total_revenue)}
                          </p>
                          <p className="text-[10px] text-[#8F9AAA]">Sisa: {prod.stock}</p>
                        </div>
                      </div>

                      {/* Mini Progress Bar Kontribusi */}
                      <div className="mt-2.5 w-full h-1.5 rounded-full bg-[#F5F1E8] overflow-hidden">
                        <div
                          style={{ width: `${shareWidth}%` }}
                          className={`h-full rounded-full ${
                            idx === 0 ? 'bg-[#FAB800]' : 'bg-[#2D3D59]'
                          }`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. DONUT CHART KATEGORI & PERINGATAN STOK MENIPIS */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Kontribusi Per Kategori dengan SVG Donut Chart */}
        <div className="xl:col-span-7 bg-white rounded-2xl border border-[#E8E1D3] p-6 shadow-2xs">
          <div className="flex items-start justify-between mb-5">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#12213E] flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#2D3D59]" /> Proporsi Pendapatan Per Kategori
              </h2>
              <p className="text-xs text-[#8F9AAA] mt-0.5">
                Klik kategori untuk menyaring KPI dan tren bulanan secara spesifik
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 items-center gap-6">
            {/* SVG Donut Ring */}
            <div className="md:col-span-5 flex flex-col items-center justify-center">
              <div className="relative w-40 h-40 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 140 140">
                  <circle
                    cx="70"
                    cy="70"
                    r={radius}
                    fill="transparent"
                    stroke="#F5F1E8"
                    strokeWidth="16"
                  />
                  {totalCategoryRevenue > 0 &&
                    donutSegments.map((seg) => (
                      <circle
                        key={seg.category_id}
                        cx="70"
                        cy="70"
                        r={radius}
                        fill="transparent"
                        stroke={seg.color}
                        strokeWidth="16"
                        strokeDasharray={`${seg.strokeLength} ${circumference}`}
                        strokeDashoffset={seg.strokeDashoffset}
                        className="transition-all duration-500 cursor-pointer hover:opacity-80"
                        onClick={() =>
                          handleCategoryFilter(
                            String(selectedCategory) === String(seg.category_id)
                              ? ''
                              : String(seg.category_id)
                          )
                        }
                      />
                    ))}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-4">
                  <PieChart className="w-4 h-4 text-[#C9AB6D] mb-0.5" />
                  <span className="text-[10px] font-medium text-[#8F9AAA]">Total Kategori</span>
                  <span className="text-sm font-extrabold text-[#12213E]">
                    {categoryBreakdown.length}
                  </span>
                </div>
              </div>
            </div>

            {/* Daftar Bar Kategori Interaktif */}
            <div className="md:col-span-7 space-y-2.5">
              {donutSegments.map((cat) => {
                const percent = Math.round(cat.ratio * 100);
                const isSelected = String(selectedCategory) === String(cat.category_id);
                return (
                  <button
                    key={cat.category_id}
                    type="button"
                    onClick={() => handleCategoryFilter(isSelected ? '' : String(cat.category_id))}
                    className={`w-full text-left p-3 rounded-xl border transition cursor-pointer ${
                      isSelected
                        ? 'bg-[#FFF9CC]/70 border-[#FAB800] shadow-2xs'
                        : 'bg-[#FFFDF8] border-[#E8E1D3] hover:border-[#C9AB6D]'
                    }`}
                  >
                    <div className="flex justify-between items-center text-xs mb-1.5">
                      <span className="inline-flex items-center gap-2 font-bold text-[#12213E]">
                        <span
                          style={{ backgroundColor: cat.color }}
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                        />
                        {cat.category_name}
                      </span>
                      <span className="font-bold text-[#2D3D59]">
                        {formatRupiah(cat.total_revenue)}{' '}
                        <span className="ml-1 px-1.5 py-0.5 rounded bg-[#F5F1E8] text-[10px] text-[#12213E]">
                          {percent}%
                        </span>
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-[#F5F1E8] overflow-hidden">
                      <div
                        style={{
                          width: `${Math.max(percent, cat.total_revenue > 0 ? 6 : 0)}%`,
                          backgroundColor: isSelected ? '#FAB800' : cat.color,
                        }}
                        className="h-full rounded-full transition-all duration-300"
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Peringatan Stok Menipis (5 Kolom) */}
        <div className="xl:col-span-5 bg-white rounded-2xl border border-[#E8E1D3] p-6 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#12213E] flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-[#F79009]" /> Monitoring Stok Menipis
              </h2>
              <p className="text-xs text-[#8F9AAA] mt-0.5">
                Produk dengan sisa persediaan ≤ 5 unit
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-[#FEF3C7] text-[#F79009] text-xs font-bold">
              {lowStockProducts.length} Item
            </span>
          </div>

          {lowStockProducts.length === 0 ? (
            <div className="py-12 text-center text-xs font-medium text-[#12B76A] bg-[#ECFDF3]/70 rounded-2xl border border-[#12B76A]/20">
              Seluruh stok produk BUMDes berada dalam batas aman.
            </div>
          ) : (
            <div className="space-y-3">
              {lowStockProducts.map((item) => {
                const stockMeter = Math.min(100, Math.round((Number(item.stock) / 5) * 100));
                return (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl bg-[#FFFDF8] border border-[#E8E1D3] space-y-2"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#12213E] truncate">{item.name}</p>
                        <p className="text-[11px] text-[#8F9AAA]">
                          {item.category_name} • {formatRupiah(item.price)}
                        </p>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 ${
                          item.stock === 0
                            ? 'bg-[#FFF2F1] text-[#D92D20] border border-[#D92D20]/20'
                            : 'bg-[#FEF3C7] text-[#F79009] border border-[#F79009]/20'
                        }`}
                      >
                        {item.stock === 0 ? 'Habis (0)' : `Sisa ${item.stock} unit`}
                      </span>
                    </div>

                    <div className="w-full h-1.5 rounded-full bg-[#F5F1E8] overflow-hidden">
                      <div
                        style={{ width: `${stockMeter}%` }}
                        className={`h-full rounded-full ${
                          item.stock === 0 ? 'bg-[#D92D20]' : 'bg-[#F79009]'
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
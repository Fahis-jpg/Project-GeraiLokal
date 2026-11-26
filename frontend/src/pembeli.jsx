import { useState, useEffect, useRef } from 'react';
import api from './api';
import {
  Search, ShoppingBag, User, LogOut, Trash2,
  X, ShoppingCart, ChevronLeft, ChevronRight,
  ChevronDown, ArrowRight, Truck, RotateCcw, Award, Headphones,
  Star, Shirt, Sparkles, Home, Utensils, Coffee, Sprout, Tag
} from 'lucide-react';
import ProductOverview from './ProductOverview';

const DEFAULT_CATEGORIES = [
  { id: 'cat-1', name: 'Pakaian', icon: Shirt },
  { id: 'cat-2', name: 'Aksesori', icon: ShoppingBag },
  { id: 'cat-3', name: 'Kosmetik', icon: Sparkles },
  { id: 'cat-4', name: 'Dekorasi', icon: Home },
  { id: 'cat-5', name: 'Makanan', icon: Utensils },
  { id: 'cat-6', name: 'Minuman', icon: Coffee },
];

const getCategoryIcon = (name = '') => {
  const lower = name.toLowerCase();
  if (lower.includes('pakaian') || lower.includes('baju') || lower.includes('tenun')) return Shirt;
  if (lower.includes('aksesori') || lower.includes('tas') || lower.includes('dompet')) return ShoppingBag;
  if (lower.includes('kosmetik') || lower.includes('perawatan') || lower.includes('herbal')) return Sparkles;
  if (lower.includes('dekorasi') || lower.includes('rumah') || lower.includes('anyaman')) return Home;
  if (lower.includes('makanan') || lower.includes('kuliner') || lower.includes('camilan')) return Utensils;
  if (lower.includes('minuman') || lower.includes('kopi') || lower.includes('jamu')) return Coffee;
  if (lower.includes('tani') || lower.includes('organik') || lower.includes('ternak')) return Sprout;
  return Tag;
};

export default function StorefrontApp({
  user,
  products,
  categories,
  bumdesProfile,
  loading,
  onFetchProducts,
  onSearchProducts,
  onRefreshData,
  onOpenAuth,
  onSwitchToAdmin,
  onLogout,
}) {
  // Navigasi Halaman Toko
  const [activePage, setActivePage] = useState('catalog'); // 'catalog' | 'product' | 'orders'
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Promo & Newsletter
  const [promoIndex, setPromoIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(23 * 3600 + 45 * 60 + 12);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterStatus, setNewsletterStatus] = useState('');

  // Keranjang & Pesanan Pembeli
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [shippingAddress, setShippingAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('QRIS');
  const [checkoutError, setCheckoutError] = useState('');
  const [myOrders, setMyOrders] = useState([]);

  const catalogSectionRef = useRef(null);
  const categorySectionRef = useRef(null);
  const promoSectionRef = useRef(null);

  const promoAnnouncements = [
    'Diskon 15% untuk pembelian pertama! Kode: GLBARU',
    'Gratis Ongkir ke seluruh Pulau Jawa minimal belanja Rp 150.000',
    'Dukung 100% produk asli pengrajin dan petani UMKM Nusantara',
  ];

  // Countdown Promo Spesial
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 23 * 3600 + 45 * 60 + 12));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Muat Riwayat Pesanan Pembeli
  useEffect(() => {
    let active = true;
    if (activePage === 'orders' && user) {
      api.get('/orders/my-orders')
        .then((res) => {
          if (active) setMyOrders(res.data);
        })
        .catch(console.error);
    }
    return () => {
      active = false;
    };
  }, [activePage, user]);

  const hours = String(Math.floor(timeLeft / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((timeLeft % 3600) / 60)).padStart(2, '0');
  const seconds = String(timeLeft % 60).padStart(2, '0');

  const handleSearchSubmit = async (e) => {
    e.preventDefault();
    setActivePage('catalog');
    setSelectedCategory('');
    await onSearchProducts(searchQuery);
    catalogSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleCategoryClick = async (catId) => {
    setSelectedCategory(catId);
    setSearchQuery('');
    setActivePage('catalog');
    await onFetchProducts(catId);
    catalogSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const openProductDetail = (product) => {
    setSelectedProduct(product);
    setActivePage('product');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const addToCart = (product, qty = 1) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        const nextQty = Math.min(existing.quantity + qty, product.stock);
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: nextQty } : item
        );
      }
      return [...prev, { ...product, quantity: Math.min(qty, product.stock) }];
    });
  };

  const removeFromCart = (id) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const totalCartAmount = cart.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);

  const handleCheckout = async (e) => {
    e.preventDefault();
    setCheckoutError('');
    if (!user) {
      setShowCart(false);
      onOpenAuth();
      return;
    }
    if (!shippingAddress.trim()) {
      setCheckoutError('Alamat lengkap pengiriman wajib diisi.');
      return;
    }
    try {
      await api.post('/orders', {
        payment_method: paymentMethod,
        shipping_address: shippingAddress.trim(),
        items: cart.map((item) => ({ product_id: item.id, quantity: item.quantity })),
      });
      alert('Pesanan berhasil dibuat! Stok produk telah diperbarui.');
      setCart([]);
      setShippingAddress('');
      setShowCart(false);
      await onRefreshData();
    } catch (err) {
      setCheckoutError(err.response?.data?.error || 'Gagal membuat pesanan');
    }
  };

  const handleNewsletterSubmit = (e) => {
    e.preventDefault();
    if (!newsletterEmail.trim()) return;
    setNewsletterStatus('Terima kasih telah berlangganan Kabar Desa GeraiLokal!');
    setNewsletterEmail('');
  };

  const displayCategories = categories.length > 0
    ? categories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        icon: getCategoryIcon(cat.name),
      }))
    : DEFAULT_CATEGORIES;

  const featuredPromoProduct = products[0] || {
    id: 'promo-1',
    name: 'Outer Tenun Ikat Kirana',
    description: 'Luaran kasual aksen tenun asli',
    price: 125000,
    stock: 4,
    image_url: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=500',
  };

  const isAdminRole = user?.role === 'admin' || user?.role === 'admin_master';

  return (
    <div className="min-h-screen flex flex-col bg-[#FFFDF8] text-[#12213E]">
      {/* 1. TOP ANNOUNCEMENT BAR */}
      <div className="bg-[#12213E] text-white text-[11px] sm:text-xs py-2 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-6">
          <button
            type="button"
            onClick={() =>
              setPromoIndex((prev) => (prev - 1 + promoAnnouncements.length) % promoAnnouncements.length)
            }
            aria-label="Promo sebelumnya"
            className="text-white/70 hover:text-white transition cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <p className="font-normal tracking-wide text-center">{promoAnnouncements[promoIndex]}</p>
          <button
            type="button"
            onClick={() => setPromoIndex((prev) => (prev + 1) % promoAnnouncements.length)}
            aria-label="Promo berikutnya"
            className="text-white/70 hover:text-white transition cursor-pointer"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. MAIN NAVBAR */}
      <header className="sticky top-0 z-30 bg-[#FFFDF8]/95 backdrop-blur border-b border-[#E8E1D3]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-[72px] flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => {
              setActivePage('catalog');
              setSelectedCategory('');
              setSearchQuery('');
              onFetchProducts('');
            }}
            className="flex items-center gap-2 cursor-pointer bg-transparent border-0 p-0"
          >
            <img
              src="/Images/Logo.png"
              alt="GeraiLokal"
              className="w-8 h-8 object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <span className="font-bold text-lg sm:text-xl tracking-tight text-[#12213E]">
              Gerai<span className="text-[#FAB800]">Lokal</span>
            </span>
          </button>

          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center gap-7 text-[13px] font-medium text-[#2D3D59]">
            <button
              type="button"
              onClick={() => setActivePage('catalog')}
              className={`hover:text-[#12213E] transition cursor-pointer bg-transparent border-0 p-0 ${
                activePage === 'catalog' ? 'text-[#12213E] font-semibold' : ''
              }`}
            >
              Beranda
            </button>
            <button
              type="button"
              onClick={() => {
                setActivePage('catalog');
                setTimeout(() => catalogSectionRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
              }}
              className="hover:text-[#12213E] transition cursor-pointer bg-transparent border-0 p-0"
            >
              Toko
            </button>
            <button
              type="button"
              onClick={() => {
                setActivePage('catalog');
                setTimeout(() => categorySectionRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
              }}
              className="hover:text-[#12213E] transition cursor-pointer bg-transparent border-0 p-0"
            >
              Kategori
            </button>
            <button
              type="button"
              onClick={() => {
                setActivePage('catalog');
                setTimeout(() => promoSectionRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
              }}
              className="hover:text-[#12213E] transition cursor-pointer bg-transparent border-0 p-0"
            >
              Penawaran
            </button>
            <button
              type="button"
              onClick={() => setActivePage(user ? 'orders' : 'catalog')}
              className="inline-flex items-center gap-1 hover:text-[#12213E] transition cursor-pointer bg-transparent border-0 p-0"
            >
              <span>Halaman</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#8F9AAA]" />
            </button>
          </nav>

          {/* Search Input & Action Icons */}
          <div className="flex items-center gap-3 sm:gap-4">
            <form onSubmit={handleSearchSubmit} className="hidden md:flex items-center w-56 lg:w-64">
              <div className="relative w-full">
                <input
                  type="text"
                  placeholder="Cari produk"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-9 pl-3.5 pr-9 rounded-lg border border-[#D0D5DD] bg-white text-xs text-[#12213E] placeholder:text-[#8F9AAA] focus:outline-none focus:border-[#2D3D59] transition"
                />
                <button
                  type="submit"
                  aria-label="Cari"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#2D3D59] hover:text-[#12213E] cursor-pointer bg-transparent border-0 p-0"
                >
                  <Search className="w-4 h-4" />
                </button>
              </div>
            </form>

            {/* Cart Icon */}
            <button
              type="button"
              onClick={() => setShowCart(true)}
              aria-label="Keranjang Belanja"
              className="relative p-2 text-[#12213E] hover:bg-[#F5F1E8] rounded-full transition cursor-pointer bg-transparent border-0"
            >
              <ShoppingCart className="w-5 h-5" />
              {cart.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-[#FAB800] text-[#12213E] text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {cart.reduce((s, i) => s + i.quantity, 0)}
                </span>
              )}
            </button>

            {/* User Icon / Dropdown */}
            {user ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowUserMenu((prev) => !prev)}
                  className="flex items-center gap-1.5 py-1.5 px-2.5 rounded-full hover:bg-[#F5F1E8] text-[#12213E] text-xs font-medium transition cursor-pointer bg-transparent border border-[#E8E1D3]"
                >
                  <User className="w-4 h-4 text-[#2D3D59]" />
                  <span className="hidden sm:inline max-w-[100px] truncate">{user.name}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-[#8F9AAA]" />
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl border border-[#E8E1D3] shadow-lg py-1.5 z-40 text-xs">
                    <div className="px-3.5 py-2 border-b border-[#F5F1E8]">
                      <p className="font-semibold text-[#12213E] truncate">{user.name}</p>
                      <p className="text-[11px] text-[#8F9AAA] uppercase font-medium">
                        {user.role === 'admin_master'
                          ? 'Admin Master'
                          : user.role === 'admin'
                          ? 'Admin BUMDes'
                          : 'Pembeli'}
                      </p>
                    </div>

                    {isAdminRole && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowUserMenu(false);
                          onSwitchToAdmin();
                        }}
                        className="w-full text-left px-3.5 py-2 hover:bg-[#FFF9CC]/60 text-[#12213E] font-semibold flex items-center gap-2 cursor-pointer bg-transparent border-0"
                      >
                        Kembali ke Panel Admin
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setActivePage('orders');
                        setShowUserMenu(false);
                      }}
                      className="w-full text-left px-3.5 py-2 hover:bg-[#F5F1E8] text-[#2D3D59] font-medium flex items-center gap-2 cursor-pointer bg-transparent border-0"
                    >
                      Pesanan Saya
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowUserMenu(false);
                        onLogout();
                      }}
                      className="w-full text-left px-3.5 py-2 hover:bg-[#FFF2F1] text-[#D92D20] font-medium flex items-center gap-2 cursor-pointer bg-transparent border-0 border-t border-[#F5F1E8] mt-1"
                    >
                      <LogOut className="w-3.5 h-3.5" /> Keluar
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={onOpenAuth}
                aria-label="Masuk atau Daftar"
                title="Masuk / Daftar"
                className="p-2 text-[#12213E] hover:bg-[#F5F1E8] rounded-full transition cursor-pointer bg-transparent border-0"
              >
                <User className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* KONTEN UTAMA ETALASE */}
      <main className="flex-1">
        {activePage === 'catalog' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-10 sm:space-y-12">
            {/* 3. HERO BANNER */}
            <section className="relative overflow-hidden rounded-2xl bg-[#12213E] text-white px-6 py-10 sm:px-12 sm:py-14 shadow-sm">
              <div className="grid grid-cols-1 lg:grid-cols-12 items-center gap-8">
                <div className="lg:col-span-7 space-y-4 z-10">
                  <p className="text-[11px] sm:text-xs font-semibold tracking-[0.14em] uppercase text-[#FAB800]">
                    SELAMAT DATANG DI {bumdesProfile?.shop_name?.toUpperCase() || 'GERAILOKAL'}
                  </p>
                  <h1 className="text-3xl sm:text-5xl font-bold leading-[1.15] tracking-tight text-white">
                    KARYA TANGAN
                    <br />
                    NUSANTARA
                  </h1>
                  <p className="text-lg sm:text-2xl italic font-medium text-[#DFCAA0]">
                    Asli Lokal, Kualitas Terbaik
                  </p>
                  <p className="text-xs sm:text-sm text-[#D0D5DD] max-w-md leading-relaxed">
                    {bumdesProfile?.description ||
                      'Temukan berbagai macam produk berkualitas tinggi yang dipilih sendiri hanya untuk Anda'}
                  </p>
                  <div className="pt-2 flex flex-wrap items-center gap-3.5">
                    <button
                      type="button"
                      onClick={() => catalogSectionRef.current?.scrollIntoView({ behavior: 'smooth' })}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#D4BB80] hover:bg-[#C9AB6D] active:bg-[#B8AA93] text-white text-xs font-semibold tracking-wider uppercase transition cursor-pointer border-0"
                    >
                      <span>BELANJA SEKARANG</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => categorySectionRef.current?.scrollIntoView({ behavior: 'smooth' })}
                      className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg border border-white/40 hover:border-white hover:bg-white/10 text-white text-xs font-semibold tracking-wider uppercase transition cursor-pointer bg-transparent"
                    >
                      JELAJAHI KOLEKSI
                    </button>
                  </div>
                </div>

                {/* Kolase Produk Hero Kanan */}
                <div className="lg:col-span-5 flex justify-center lg:justify-end">
                  <div className="relative w-full max-w-sm">
                    <img
                      src="https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=700&auto=format&fit=crop&q=80"
                      alt="Koleksi Kerajinan Nusantara"
                      className="w-full h-64 sm:h-72 object-cover rounded-2xl border border-white/15 shadow-xl"
                    />
                    <div className="absolute -bottom-3 -left-3 bg-[#FFFDF8] text-[#12213E] px-3.5 py-2 rounded-xl border border-[#E8E1D3] shadow-md">
                      <p className="text-[10px] font-medium text-[#8F9AAA]">100% Pengrajin Lokal</p>
                      <p className="text-xs font-bold text-[#12213E]">
                        {bumdesProfile?.village_name || 'Kurasi BUMDes Nusantara'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* 4. VALUE PROPOSITION BAR */}
            <section className="bg-white rounded-xl border border-[#E8E1D3] px-5 py-4 sm:px-8 sm:py-5 shadow-2xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-lg bg-[#FFFDF8] border border-[#E8E1D3] flex items-center justify-center text-[#12213E] shrink-0">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xs sm:text-sm font-semibold text-[#12213E]">Gratis Ongkir</h2>
                    <p className="text-[11px] text-[#8F9AAA]">Min. belanja 150.000</p>
                  </div>
                </div>

                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-lg bg-[#FFFDF8] border border-[#E8E1D3] flex items-center justify-center text-[#12213E] shrink-0">
                    <RotateCcw className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xs sm:text-sm font-semibold text-[#12213E]">Pengembalian Mudah</h2>
                    <p className="text-[11px] text-[#8F9AAA]">Dalam 30 hari</p>
                  </div>
                </div>

                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-lg bg-[#FFFDF8] border border-[#E8E1D3] flex items-center justify-center text-[#12213E] shrink-0">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xs sm:text-sm font-semibold text-[#12213E]">Kualitas Premium</h2>
                    <p className="text-[11px] text-[#8F9AAA]">100% produk asli lokal</p>
                  </div>
                </div>

                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-lg bg-[#FFFDF8] border border-[#E8E1D3] flex items-center justify-center text-[#12213E] shrink-0">
                    <Headphones className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xs sm:text-sm font-semibold text-[#12213E]">Bantuan 24 Jam</h2>
                    <p className="text-[11px] text-[#8F9AAA]">Siap membantu</p>
                  </div>
                </div>
              </div>
            </section>

            {/* 5. KATEGORI PRODUK */}
            <section ref={categorySectionRef} className="space-y-5">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-lg sm:text-xl font-bold text-[#12213E]">Kategori Produk</h2>
                <button
                  type="button"
                  onClick={() => handleCategoryClick('')}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#2D3D59] hover:bg-[#12213E] active:bg-[#8F9AAA] text-white text-xs font-medium transition cursor-pointer border-0"
                >
                  <span>Semua Kategori</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div
                className={`grid grid-cols-2 sm:grid-cols-3 gap-3.5 ${
                  displayCategories.length === 6 ? 'lg:grid-cols-6' : 'lg:grid-cols-7'
                }`}
              >
                {displayCategories.map((cat) => {
                  const IconComponent = cat.icon;
                  const isActive = String(selectedCategory) === String(cat.id);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleCategoryClick(isActive ? '' : cat.id)}
                      className={`group flex flex-col items-center justify-center p-4 rounded-xl border transition-all cursor-pointer ${
                        isActive
                          ? 'bg-[#F4EDDF] border-[#C9AB6D] shadow-sm'
                          : 'bg-white border-[#E8E1D3] hover:border-[#D5CBBB] hover:shadow-md'
                      }`}
                    >
                      <div className="w-11 h-11 rounded-lg bg-[#FFF9CC] group-hover:bg-[#FFE499] flex items-center justify-center text-[#2D3D59] mb-2.5 transition">
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-medium text-[#12213E] text-center line-clamp-1">
                        {cat.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* 6. PROMO SPESIAL HARI INI */}
            <section
              ref={promoSectionRef}
              className="rounded-2xl bg-[#12213E] p-6 sm:p-8 text-white shadow-sm"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 items-center gap-6 lg:gap-8">
                <div className="lg:col-span-5 space-y-3">
                  <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[#FAB800]">
                    PROMO SPESIAL HARI INI
                  </p>
                  <h2 className="text-2xl sm:text-3xl font-bold text-white">Stok Terbatas!</h2>
                  <p className="text-xs sm:text-sm text-[#D0D5DD] leading-relaxed">
                    Nikmati potongan hingga 50% khusus hari ini untuk produk pilihan!
                  </p>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (featuredPromoProduct && typeof featuredPromoProduct.id === 'number') {
                          addToCart(featuredPromoProduct);
                          setShowCart(true);
                        } else {
                          catalogSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
                        }
                      }}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#D4BB80] hover:bg-[#C9AB6D] active:bg-[#B8AA93] text-white text-xs font-semibold transition cursor-pointer border-0"
                    >
                      <span>Beli Sekarang</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="lg:col-span-7">
                  <div className="bg-white text-[#12213E] rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row items-center gap-5 shadow-md">
                    <img
                      src={
                        featuredPromoProduct.image_url ||
                        'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=500'
                      }
                      alt={featuredPromoProduct.name}
                      className="w-full sm:w-44 h-44 object-cover rounded-lg bg-[#F5F1E8] shrink-0"
                    />
                    <div className="flex-1 w-full space-y-2">
                      <h3 className="text-base sm:text-lg font-bold text-[#12213E] line-clamp-1">
                        {featuredPromoProduct.name}
                      </h3>
                      <p className="text-xs text-[#8F9AAA] line-clamp-1">
                        {featuredPromoProduct.description || 'Luaran kasual aksen tenun asli'}
                      </p>
                      <div className="flex items-baseline gap-2.5 pt-1">
                        <span className="text-base sm:text-lg font-bold text-[#12213E]">
                          Rp {Number(featuredPromoProduct.price).toLocaleString('id-ID')}
                        </span>
                        <span className="text-xs text-[#8F9AAA] line-through">
                          Rp {(Number(featuredPromoProduct.price) * 2).toLocaleString('id-ID')}
                        </span>
                      </div>
                      <p className="text-[11px] font-medium text-[#53647C]">
                        Tersisa {featuredPromoProduct.stock ?? 4} produk lagi
                      </p>

                      <div className="flex items-center gap-2 pt-1.5">
                        <span className="w-9 h-9 rounded-md bg-[#FFD566] text-[#12213E] font-bold text-sm flex items-center justify-center">
                          {hours}
                        </span>
                        <span className="font-bold text-[#12213E]">:</span>
                        <span className="w-9 h-9 rounded-md bg-[#FFD566] text-[#12213E] font-bold text-sm flex items-center justify-center">
                          {minutes}
                        </span>
                        <span className="font-bold text-[#12213E]">:</span>
                        <span className="w-9 h-9 rounded-md bg-[#FFD566] text-[#12213E] font-bold text-sm flex items-center justify-center">
                          {seconds}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* 7. PRODUK PILIHAN (GRID 5 KOLOM) */}
            <section ref={catalogSectionRef} className="space-y-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-[#12213E]">Produk Pilihan</h2>
                  {(selectedCategory || searchQuery) && (
                    <p className="text-xs text-[#8F9AAA] mt-0.5">
                      Menampilkan hasil filter{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCategory('');
                          setSearchQuery('');
                          onFetchProducts('');
                        }}
                        className="text-[#2D3D59] font-semibold underline cursor-pointer bg-transparent border-0 p-0"
                      >
                        Reset filter
                      </button>
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory('');
                    setSearchQuery('');
                    onFetchProducts('');
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#2D3D59] hover:bg-[#12213E] active:bg-[#8F9AAA] text-white text-xs font-medium transition cursor-pointer border-0"
                >
                  <span>Semua Produk</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {loading ? (
                <div className="text-center py-14 text-sm text-[#8F9AAA]">
                  Memuat katalog produk Nusantara...
                </div>
              ) : products.length === 0 ? (
                <div className="text-center py-14 bg-white rounded-xl border border-[#E8E1D3] text-sm text-[#8F9AAA]">
                  Produk tidak ditemukan.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                  {products.map((product, idx) => {
                    const discountPercent = [20, 30, 20, 20, 50][idx % 5];
                    return (
                      <div
                        key={product.id}
                        className="group bg-white rounded-xl border border-[#E8E1D3] overflow-hidden shadow-2xs hover:shadow-[0_10px_25px_-5px_rgba(18,33,62,0.12)] hover:-translate-y-0.5 active:scale-[0.99] transition-all flex flex-col"
                      >
                        <div
                          onClick={() => openProductDetail(product)}
                          className="relative aspect-square bg-[#F5F1E8] overflow-hidden cursor-pointer"
                        >
                          <img
                            src={
                              product.image_url ||
                              'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500'
                            }
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#FFF9CC] border border-[#E8E1D3] text-[#12213E] text-[10px] font-semibold">
                            % {discountPercent}%
                          </span>
                        </div>

                        <div className="p-3.5 flex-1 flex flex-col">
                          <div className="flex items-center gap-1 text-[11px] text-[#8F9AAA] mb-1">
                            <Star className="w-3.5 h-3.5 fill-[#FAB800] text-[#FAB800]" />
                            <span className="font-semibold text-[#12213E]">4.9</span>
                            <span>|</span>
                            <span>1rb+ terjual</span>
                          </div>

                          <h3
                            onClick={() => openProductDetail(product)}
                            className="text-xs sm:text-sm font-semibold text-[#12213E] hover:text-[#2D3D59] line-clamp-1 mb-1 cursor-pointer"
                          >
                            {product.name}
                          </h3>

                          <p className="text-sm font-bold text-[#12213E] mb-3">
                            Rp {Number(product.price).toLocaleString('id-ID')}
                          </p>

                          <div className="mt-auto pt-2 flex items-center justify-between gap-2">
                            <span className="text-[11px] text-[#8F9AAA] truncate">
                              {product.shop_name || bumdesProfile?.shop_name || 'BUMDes'}
                            </span>
                            <button
                              type="button"
                              disabled={product.stock <= 0}
                              onClick={() => addToCart(product)}
                              title={product.stock <= 0 ? 'Stok Habis' : 'Tambah ke Keranjang'}
                              className="w-8 h-8 rounded-full bg-[#2D3D59] hover:bg-[#12213E] active:bg-[#8F9AAA] disabled:bg-[#D0D5DD] text-white flex items-center justify-center shrink-0 transition cursor-pointer border-0"
                            >
                              <ShoppingCart className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}

        {/* HALAMAN DETAIL PRODUK */}
        {activePage === 'product' && selectedProduct && (
          <ProductOverview
            key={selectedProduct.id}
            product={selectedProduct}
            onAddToCart={(prod, qty) => addToCart(prod, qty)}
            onBuyNow={(prod, qty) => {
              addToCart(prod, qty);
              setShowCart(true);
            }}
            onBack={() => {
              setSelectedProduct(null);
              setActivePage('catalog');
            }}
          />
        )}

        {/* RIWAYAT PESANAN PEMBELI */}
        {activePage === 'orders' && (
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-[#12213E] flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-[#2D3D59]" /> Riwayat Pesanan Saya
              </h2>
              <button
                type="button"
                onClick={() => setActivePage('catalog')}
                className="text-xs font-semibold text-[#2D3D59] hover:text-[#12213E] underline cursor-pointer bg-transparent border-0"
              >
                Kembali Belanja
              </button>
            </div>
            {myOrders.length === 0 ? (
              <div className="bg-white p-8 rounded-xl border border-[#E8E1D3] text-center text-sm text-[#8F9AAA]">
                Belum ada riwayat transaksi pesanan.
              </div>
            ) : (
              <div className="space-y-4">
                {myOrders.map((order) => (
                  <div key={order.id} className="bg-white p-5 rounded-xl border border-[#E8E1D3] shadow-2xs">
                    <div className="flex flex-wrap justify-between items-center border-b border-[#F5F1E8] pb-3 mb-3 gap-2">
                      <div>
                        <span className="text-xs text-[#8F9AAA]">
                          Order #{order.id} • {new Date(order.created_at).toLocaleDateString('id-ID')}
                        </span>
                        <p className="text-sm font-medium text-[#2D3D59]">Metode: {order.payment_method}</p>
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs font-semibold uppercase bg-[#FFF9CC] text-[#12213E]">
                        {order.status}
                      </span>
                    </div>
                    <div className="space-y-2 mb-3">
                      {order.items?.map((item) => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span>
                            {item.product_name} <span className="text-[#8F9AAA]">x{item.quantity}</span>
                          </span>
                          <span className="font-medium">
                            Rp {(Number(item.price) * item.quantity).toLocaleString('id-ID')}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t border-[#F5F1E8]">
                      <span className="text-xs text-[#8F9AAA]">Alamat: {order.shipping_address}</span>
                      <span className="font-bold text-[#12213E]">
                        Total: Rp {Number(order.total_price).toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* 8. FOOTER */}
      <footer className="bg-[#12213E] text-white mt-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-10 border-b border-white/15">
            <div className="md:col-span-4 space-y-4">
              <div className="inline-flex items-center gap-2 bg-white px-3.5 py-2 rounded-lg">
                <img
                  src="/Images/Logo.png"
                  alt="GeraiLokal"
                  className="w-6 h-6 object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <span className="font-bold text-base text-[#12213E]">
                  Gerai<span className="text-[#FAB800]">Lokal</span>
                </span>
              </div>
              <p className="text-xs text-[#D0D5DD] leading-relaxed max-w-xs">
                {bumdesProfile?.description ||
                  'Platform e-commerce resmi pemberdayaan hasil tani dan UMKM desa secara digital, aman, dan terpercaya.'}
              </p>
            </div>

            <div className="md:col-span-2 space-y-3">
              <h3 className="text-xs font-bold tracking-wider uppercase text-white">Tautan Cepat</h3>
              <ul className="space-y-2 text-xs text-[#D0D5DD]">
                <li>
                  <button
                    type="button"
                    onClick={() => setActivePage('catalog')}
                    className="hover:text-[#FAB800] transition cursor-pointer bg-transparent border-0 p-0"
                  >
                    Beranda
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => catalogSectionRef.current?.scrollIntoView({ behavior: 'smooth' })}
                    className="hover:text-[#FAB800] transition cursor-pointer bg-transparent border-0 p-0"
                  >
                    Toko
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => categorySectionRef.current?.scrollIntoView({ behavior: 'smooth' })}
                    className="hover:text-[#FAB800] transition cursor-pointer bg-transparent border-0 p-0"
                  >
                    Kategori
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => promoSectionRef.current?.scrollIntoView({ behavior: 'smooth' })}
                    className="hover:text-[#FAB800] transition cursor-pointer bg-transparent border-0 p-0"
                  >
                    Penawaran
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setActivePage(user ? 'orders' : 'catalog')}
                    className="hover:text-[#FAB800] transition cursor-pointer bg-transparent border-0 p-0"
                  >
                    Halaman
                  </button>
                </li>
              </ul>
            </div>

            <div className="md:col-span-2 space-y-3">
              <h3 className="text-xs font-bold tracking-wider uppercase text-white">Informasi</h3>
              <ul className="space-y-2 text-xs text-[#D0D5DD]">
                <li>
                  <a href="#tentang" onClick={(e) => e.preventDefault()} className="hover:text-[#FAB800] transition">
                    Tentang Kami
                  </a>
                </li>
                <li>
                  <a href="#cara-belanja" onClick={(e) => e.preventDefault()} className="hover:text-[#FAB800] transition">
                    Cara Belanja
                  </a>
                </li>
              </ul>
            </div>

            <div className="md:col-span-4 space-y-3">
              <h3 className="text-xs font-bold tracking-wider uppercase text-white">
                Langganan Kabar Desa
              </h3>
              <form onSubmit={handleNewsletterSubmit} className="flex items-stretch">
                <input
                  type="email"
                  required
                  placeholder="Masukkan email Anda"
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  className="flex-1 h-10 px-3.5 rounded-l-lg bg-white text-[#12213E] text-xs placeholder:text-[#8F9AAA] focus:outline-none border-0"
                />
                <button
                  type="submit"
                  className="h-10 px-5 rounded-r-lg bg-[#FAB800] hover:bg-[#FFC833] text-[#12213E] text-xs font-semibold transition cursor-pointer border-0"
                >
                  Kirim
                </button>
              </form>
              {newsletterStatus && (
                <p className="text-[11px] text-[#FFE499]">{newsletterStatus}</p>
              )}
            </div>
          </div>

          <p className="pt-6 text-center text-[11px] text-[#8F9AAA]">
            © 2026 {bumdesProfile?.shop_name || 'GeraiLokal'} - Platform E-Commerce UMKM Desa. All rights reserved.
          </p>
        </div>
      </footer>

      {/* DRAWER KERANJANG BELANJA */}
      {showCart && (
        <div
          onClick={() => setShowCart(false)}
          className="fixed inset-0 z-50 bg-[#12213E]/50 flex justify-end"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#FFFDF8] w-full max-w-md h-full p-6 flex flex-col justify-between shadow-xl"
          >
            <div>
              <div className="flex justify-between items-center border-b border-[#E8E1D3] pb-4 mb-4">
                <h3 className="font-bold text-lg text-[#12213E]">Keranjang Belanja</h3>
                <button
                  type="button"
                  onClick={() => setShowCart(false)}
                  className="p-1.5 hover:bg-[#F5F1E8] rounded-lg text-[#12213E] cursor-pointer bg-transparent border-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {cart.length === 0 ? (
                <p className="text-[#8F9AAA] text-sm text-center py-12">Keranjang masih kosong.</p>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {cart.map((item) => (
                    <div key={item.id} className="flex justify-between items-center border-b border-[#E8E1D3] pb-2.5">
                      <div>
                        <p className="text-sm font-semibold text-[#12213E]">{item.name}</p>
                        <p className="text-xs text-[#8F9AAA]">
                          {item.quantity} x Rp {Number(item.price).toLocaleString('id-ID')}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.id)}
                        className="text-[#D92D20] p-1 hover:bg-[#FFF2F1] rounded cursor-pointer bg-transparent border-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <form onSubmit={handleCheckout} className="border-t border-[#E8E1D3] pt-4 space-y-3">
                <div className="flex justify-between font-bold text-base text-[#12213E]">
                  <span>Total Belanja</span>
                  <span>Rp {totalCartAmount.toLocaleString('id-ID')}</span>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#2D3D59] mb-1">
                    Alamat Pengiriman
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="Alamat lengkap pengiriman..."
                    value={shippingAddress}
                    onChange={(e) => {
                      setShippingAddress(e.target.value);
                      if (checkoutError) setCheckoutError('');
                    }}
                    className={`w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-none ${
                      checkoutError
                        ? 'border-[#D92D20]'
                        : 'border-[#D0D5DD] focus:border-[#2D3D59]'
                    }`}
                  />
                  {checkoutError && (
                    <p className="text-xs text-[#D92D20] mt-1">{checkoutError}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#2D3D59] mb-1">
                    Metode Pembayaran
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 border border-[#D0D5DD] rounded-lg text-sm bg-white focus:outline-none focus:border-[#2D3D59]"
                  >
                    <option value="QRIS">QRIS</option>
                    <option value="Transfer Bank">Transfer Bank</option>
                    <option value="COD">COD (Bayar di Tempat)</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full bg-[#2D3D59] hover:bg-[#12213E] active:bg-[#8F9AAA] text-white py-2.5 rounded-lg font-medium text-sm transition cursor-pointer border-0"
                >
                  Checkout Sekarang
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
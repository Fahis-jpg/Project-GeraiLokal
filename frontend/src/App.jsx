import { useState, useEffect, useRef } from 'react';
import api from './api';
import {
  Search, ShoppingBag, User, LogOut, Plus, Trash2,
  Package, CheckCircle, X, ShoppingCart, ChevronLeft, ChevronRight,
  ChevronDown, ArrowRight, Truck, RotateCcw, Award, Headphones,
  Star, Shirt, Sparkles, Home, Utensils, Coffee, Sprout, Tag
} from 'lucide-react';
import Login from './Login';
import Register from './Register';
import ProductOverview from './ProductOverview';

const DEFAULT_CATEGORIES = [
  { id: 'cat-1', name: 'Pakaian', icon: Shirt },
  { id: 'cat-2', name: 'Aksesori', icon: Sparkles },
  { id: 'cat-3', name: 'Kosmetik', icon: Sparkles },
  { id: 'cat-4', name: 'Dekorasi', icon: Home },
  { id: 'cat-5', name: 'Kebersihan', icon: Sparkles },
  { id: 'cat-6', name: 'Makanan', icon: Utensils },
  { id: 'cat-7', name: 'Minuman', icon: Coffee },
  { id: 'cat-8', name: 'Hasil Tani', icon: Sprout },
];

const getCategoryIcon = (name = '') => {
  const lower = name.toLowerCase();
  if (lower.includes('pakaian') || lower.includes('baju') || lower.includes('tenun')) return Shirt;
  if (lower.includes('makanan') || lower.includes('kuliner') || lower.includes('sembako')) return Utensils;
  if (lower.includes('minuman') || lower.includes('kopi') || lower.includes('herbal')) return Coffee;
  if (lower.includes('dekorasi') || lower.includes('rumah') || lower.includes('kerajinan')) return Home;
  if (lower.includes('tani') || lower.includes('organik') || lower.includes('ternak')) return Sprout;
  return Tag;
};

export default function App() {
  // State Utama
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // State Navigasi & Modal
  const [activeTab, setActiveTab] = useState('catalog'); // 'catalog' | 'orders' | 'seller'
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [loginNotice, setLoginNotice] = useState('');
  const [showCart, setShowCart] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterStatus, setNewsletterStatus] = useState('');

  // State Promo Bar & Countdown Timer
  const [promoIndex, setPromoIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(23 * 3600 + 45 * 60 + 12);

  // State Keranjang Belanja
  const [cart, setCart] = useState([]);
  const [shippingAddress, setShippingAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('QRIS');
  const [checkoutError, setCheckoutError] = useState('');

  // State Pesanan & Seller
  const [myOrders, setMyOrders] = useState([]);
  const [myShop, setMyShop] = useState(null);
  const [shopOrders, setShopOrders] = useState([]);
  const [newProduct, setNewProduct] = useState({
    name: '', category_id: '', price: '', stock: '', description: '', image_url: ''
  });

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

  const hours = String(Math.floor(timeLeft / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((timeLeft % 3600) / 60)).padStart(2, '0');
  const seconds = String(timeLeft % 60).padStart(2, '0');

  const fetchProducts = async (catId = selectedCategory) => {
    setLoading(true);
    try {
      const url = catId && !String(catId).startsWith('cat-')
        ? `/products?category_id=${catId}`
        : '/products';
      const res = await api.get(url);
      setProducts(res.data);
    } catch (err) {
      console.error('Gagal memuat produk:', err);
    } finally {
      setLoading(false);
    }
  };

  // Inisialisasi sesi & data awal
  useEffect(() => {
    let active = true;

    const init = async () => {
      try {
        const authRes = await api.post('/auth/me');
        if (active && authRes.data?.success) {
          setUser(authRes.data.data);
        }
      } catch {
        if (active) setUser(null);
      }

      try {
        const [catRes, prodRes] = await Promise.all([
          api.get('/categories'),
          api.get('/products'),
        ]);
        if (active) {
          setCategories(catRes.data);
          setProducts(prodRes.data);
          setLoading(false);
        }
      } catch (err) {
        console.error('Gagal memuat data awal:', err);
        if (active) setLoading(false);
      }
    };

    init();
    return () => {
      active = false;
    };
  }, []);

  // Pencarian Produk (ILIKE)
  const handleSearch = async (e) => {
    e.preventDefault();
    setActiveTab('catalog');
    if (!searchQuery.trim()) {
      fetchProducts('');
      return;
    }
    setLoading(true);
    try {
      const res = await api.get(`/products/search?name=${encodeURIComponent(searchQuery)}`);
      setProducts(res.data);
      catalogSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
    } catch (err) {
      console.error('Gagal mencari produk:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryFilter = (catId) => {
    setSelectedCategory(catId);
    setSearchQuery('');
    fetchProducts(catId);
    catalogSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
      setUser(null);
      setShowUserMenu(false);
      setActiveTab('catalog');
    } catch (err) {
      console.error('Gagal logout:', err);
    }
  };

  // Manajemen Keranjang & Checkout
  const openProductOverview = (product) => {
  setSelectedProduct(product);
  setActiveTab('product');
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
      setAuthMode('login');
      setShowAuthModal(true);
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
        items: cart.map((item) => ({ product_id: item.id, quantity: item.quantity }))
      });
      alert('Pesanan berhasil dibuat! Stok produk telah diperbarui.');
      setCart([]);
      setShippingAddress('');
      setShowCart(false);
      fetchProducts();
    } catch (err) {
      setCheckoutError(err.response?.data?.error || 'Gagal membuat pesanan');
    }
  };

  // Load Data Riwayat Pesanan & Dashboard Seller
  useEffect(() => {
    if (activeTab === 'orders' && user) {
      api.get('/orders/my-orders').then((res) => setMyOrders(res.data)).catch(console.error);
    }
    if (activeTab === 'seller' && user?.role === 'seller') {
      api.get('/shops/my-shop').then((res) => setMyShop(res.data)).catch(console.error);
      api.get('/orders/shop').then((res) => setShopOrders(res.data)).catch(console.error);
    }
  }, [activeTab, user]);

  // Tambah & Hapus Produk oleh Seller
  const handleAddProduct = async (e) => {
    e.preventDefault();
    try {
      await api.post('/products', {
        ...newProduct,
        category_id: Number(newProduct.category_id),
        price: Number(newProduct.price),
        stock: Number(newProduct.stock)
      });
      alert('Produk berhasil ditambahkan!');
      setNewProduct({ name: '', category_id: '', price: '', stock: '', description: '', image_url: '' });
      const shopRes = await api.get('/shops/my-shop');
      setMyShop(shopRes.data);
      fetchProducts();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menambah produk');
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!confirm('Hapus produk ini dari katalog?')) return;
    try {
      await api.delete(`/products/${id}`);
      const shopRes = await api.get('/shops/my-shop');
      setMyShop(shopRes.data);
      fetchProducts();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghapus produk');
    }
  };

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      await api.put(`/orders/${orderId}/status`, { status: newStatus });
      const res = await api.get('/orders/shop');
      setShopOrders(res.data);
    } catch {
      alert('Gagal mengubah status pesanan');
    }
  };

  const handleNewsletterSubmit = (e) => {
    e.preventDefault();
    if (!newsletterEmail.trim()) return;
    setNewsletterStatus('Terima kasih telah berlangganan Kabar Desa GeraiLokal!');
    setNewsletterEmail('');
  };

  // Gabungkan kategori database dengan tampilan kategori landing page
  const displayCategories = categories.length > 0
    ? categories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        icon: getCategoryIcon(cat.name),
      }))
    : DEFAULT_CATEGORIES;

  // Produk sorotan untuk banner Promo Spesial Hari Ini
  const featuredPromoProduct = products[0] || {
    id: 'promo-1',
    name: 'Outer Tenun Ikat Kirana',
    description: 'Luaran kasual aksen tenun asli',
    price: 125000,
    stock: 4,
    image_url: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=500',
  };

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
          <p className="font-normal tracking-wide text-center">
            {promoAnnouncements[promoIndex]}
          </p>
          <button
            type="button"
            onClick={() =>
              setPromoIndex((prev) => (prev + 1) % promoAnnouncements.length)
            }
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
          {/* Logo */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('catalog');
              setSelectedCategory('');
              setSearchQuery('');
              fetchProducts('');
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
              onClick={() => setActiveTab('catalog')}
              className={`hover:text-[#12213E] transition cursor-pointer bg-transparent border-0 p-0 ${
                activeTab === 'catalog' ? 'text-[#12213E] font-semibold' : ''
              }`}
            >
              Beranda
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('catalog');
                setTimeout(() => catalogSectionRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
              }}
              className="hover:text-[#12213E] transition cursor-pointer bg-transparent border-0 p-0"
            >
              Toko
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('catalog');
                setTimeout(() => categorySectionRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
              }}
              className="hover:text-[#12213E] transition cursor-pointer bg-transparent border-0 p-0"
            >
              Kategori
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('catalog');
                setTimeout(() => promoSectionRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
              }}
              className="hover:text-[#12213E] transition cursor-pointer bg-transparent border-0 p-0"
            >
              Penawaran
            </button>
            <button
              type="button"
              onClick={() => setActiveTab(user ? 'orders' : 'catalog')}
              className="inline-flex items-center gap-1 hover:text-[#12213E] transition cursor-pointer bg-transparent border-0 p-0"
            >
              <span>Halaman</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#8F9AAA]" />
            </button>
          </nav>

          {/* Search Input & Action Icons */}
          <div className="flex items-center gap-3 sm:gap-4">
            <form onSubmit={handleSearch} className="hidden md:flex items-center w-56 lg:w-64">
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
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl border border-[#E8E1D3] shadow-lg py-1.5 z-40 text-xs">
                    <div className="px-3.5 py-2 border-b border-[#F5F1E8]">
                      <p className="font-semibold text-[#12213E] truncate">{user.name}</p>
                      <p className="text-[11px] text-[#8F9AAA] capitalize">{user.role}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('orders');
                        setShowUserMenu(false);
                      }}
                      className="w-full text-left px-3.5 py-2 hover:bg-[#F5F1E8] text-[#2D3D59] font-medium flex items-center gap-2 cursor-pointer bg-transparent border-0"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" /> Pesanan Saya
                    </button>
                    {user.role === 'seller' && (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('seller');
                          setShowUserMenu(false);
                        }}
                        className="w-full text-left px-3.5 py-2 hover:bg-[#F5F1E8] text-[#2D3D59] font-medium flex items-center gap-2 cursor-pointer bg-transparent border-0"
                      >
                        <Package className="w-3.5 h-3.5" /> Toko Saya
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full text-left px-3.5 py-2 hover:bg-[#FFF2F1] text-[#D92D20] font-medium flex items-center gap-2 cursor-pointer bg-transparent border-0"
                    >
                      <LogOut className="w-3.5 h-3.5" /> Keluar
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setLoginNotice('');
                  setAuthMode('login');
                  setShowAuthModal(true);
                }}
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

      {/* KONTEN UTAMA */}
      <main className="flex-1">
        {activeTab === 'catalog' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-10 sm:space-y-12">
            {/* 3. HERO BANNER */}
            <section className="relative overflow-hidden rounded-2xl bg-[#12213E] text-white px-6 py-10 sm:px-12 sm:py-14 shadow-sm">
              <div className="grid grid-cols-1 lg:grid-cols-12 items-center gap-8">
                <div className="lg:col-span-7 space-y-4 z-10">
                  <p className="text-[11px] sm:text-xs font-semibold tracking-[0.14em] uppercase text-[#FAB800]">
                    SELAMAT DATANG DI GERAILOKAL
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
                    Temukan berbagai macam produk berkualitas tinggi yang dipilih sendiri hanya untuk Anda
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
                      <p className="text-xs font-bold text-[#12213E]">Kurasi UMKM Nusantara</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* 4. VALUE PROPOSITION BAR (4 FITUR) */}
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
                  onClick={() => handleCategoryFilter('')}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#2D3D59] hover:bg-[#12213E] active:bg-[#8F9AAA] text-white text-xs font-medium transition cursor-pointer border-0"
                >
                  <span>Semua Kategori</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3.5">
                {displayCategories.map((cat) => {
                  const IconComponent = cat.icon;
                  const isActive = String(selectedCategory) === String(cat.id);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleCategoryFilter(isActive ? '' : cat.id)}
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

            {/* 6. PROMO SPESIAL HARI INI BANNER */}
            <section
              ref={promoSectionRef}
              className="rounded-2xl bg-[#12213E] p-6 sm:p-8 text-white shadow-sm"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 items-center gap-6 lg:gap-8">
                {/* Kiri: Info Promo */}
                <div className="lg:col-span-5 space-y-3">
                  <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[#FAB800]">
                    PROMO SPESIAL HARI INI
                  </p>
                  <h2 className="text-2xl sm:text-3xl font-bold text-white">
                    Stok Terbatas!
                  </h2>
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

                {/* Kanan: Kartu Produk Sorotan + Countdown */}
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

                      {/* Countdown Timer Boxes */}
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
                          fetchProducts('');
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
                    fetchProducts('');
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
                        {/* Foto Produk + Badge Diskon */}
                        <div
                          onClick={() => openProductOverview(product)}
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

                        {/* Detail Produk */}
                        <div className="p-3.5 flex-1 flex flex-col">
                          <div className="flex items-center gap-1 text-[11px] text-[#8F9AAA] mb-1">
                            <Star className="w-3.5 h-3.5 fill-[#FAB800] text-[#FAB800]" />
                            <span className="font-semibold text-[#12213E]">4.9</span>
                            <span>|</span>
                            <span>1rb+ terjual</span>
                          </div>

                          <h3
                            onClick={() => openProductOverview(product)}
                            className="text-xs sm:text-sm font-semibold text-[#12213E] hover:text-[#2D3D59] line-clamp-1 mb-1 cursor-pointer"
                          >
                            {product.name}
                          </h3>

                          <p className="text-sm font-bold text-[#12213E] mb-3">
                            Rp {Number(product.price).toLocaleString('id-ID')}
                          </p>

                          <div className="mt-auto pt-2 flex items-center justify-between gap-2">
                            <span className="text-[11px] text-[#8F9AAA] truncate">
                              {product.shop_name || 'Surakarta'}
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

        {/* HALAMAN DETAIL PRODUK (PRODUCT OVERVIEW) */}
        {activeTab === 'product' && selectedProduct && (
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
              setActiveTab('catalog');
            }}
          />
        )}

        {/* TAB 2: RIWAYAT PESANAN PEMBELI */}
        {activeTab === 'orders' && (
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-[#12213E] flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-[#2D3D59]" /> Riwayat Pesanan Saya
              </h2>
              <button
                type="button"
                onClick={() => setActiveTab('catalog')}
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

        {/* TAB 3: DASHBOARD PENJUAL UMKM */}
        {activeTab === 'seller' && myShop && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
            <div className="bg-white p-6 rounded-xl border border-[#E8E1D3] shadow-2xs flex flex-wrap justify-between items-center gap-4">
              <div>
                <span className="text-xs font-semibold text-[#FAB800] uppercase">Profil Toko UMKM</span>
                <h2 className="text-2xl font-bold text-[#12213E]">{myShop.shop_name}</h2>
                <p className="text-sm text-[#8F9AAA]">{myShop.description || 'Belum ada deskripsi toko.'}</p>
              </div>
              <div className="bg-[#FFF9CC] px-5 py-3 rounded-xl text-center border border-[#E8E1D3]">
                <p className="text-xs text-[#2D3D59]">Total Produk</p>
                <p className="text-2xl font-bold text-[#12213E]">{myShop.total_products}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Form Tambah Produk */}
              <form
                onSubmit={handleAddProduct}
                className="bg-white p-6 rounded-xl border border-[#E8E1D3] shadow-2xs space-y-4 h-fit"
              >
                <h3 className="font-bold text-lg text-[#12213E] flex items-center gap-2">
                  <Plus className="w-5 h-5 text-[#2D3D59]" /> Tambah Produk Baru
                </h3>
                <div>
                  <label className="block text-xs font-medium text-[#2D3D59] mb-1">Nama Produk</label>
                  <input
                    required
                    type="text"
                    placeholder="Contoh: Tas Kain Perca"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                    className="w-full px-3 py-2 border border-[#D0D5DD] rounded-lg text-sm focus:outline-none focus:border-[#2D3D59]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#2D3D59] mb-1">Kategori</label>
                  <select
                    required
                    value={newProduct.category_id}
                    onChange={(e) => setNewProduct({ ...newProduct, category_id: e.target.value })}
                    className="w-full px-3 py-2 border border-[#D0D5DD] rounded-lg text-sm focus:outline-none focus:border-[#2D3D59]"
                  >
                    <option value="">Pilih Kategori</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#2D3D59] mb-1">Harga (Rp)</label>
                    <input
                      required
                      type="number"
                      placeholder="100000"
                      value={newProduct.price}
                      onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                      className="w-full px-3 py-2 border border-[#D0D5DD] rounded-lg text-sm focus:outline-none focus:border-[#2D3D59]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#2D3D59] mb-1">Stok</label>
                    <input
                      required
                      type="number"
                      placeholder="10"
                      value={newProduct.stock}
                      onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })}
                      className="w-full px-3 py-2 border border-[#D0D5DD] rounded-lg text-sm focus:outline-none focus:border-[#2D3D59]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#2D3D59] mb-1">URL Gambar Produk</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={newProduct.image_url}
                    onChange={(e) => setNewProduct({ ...newProduct, image_url: e.target.value })}
                    className="w-full px-3 py-2 border border-[#D0D5DD] rounded-lg text-sm focus:outline-none focus:border-[#2D3D59]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#2D3D59] mb-1">Deskripsi</label>
                  <textarea
                    placeholder="Deskripsi singkat produk"
                    rows="3"
                    value={newProduct.description}
                    onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                    className="w-full px-3 py-2 border border-[#D0D5DD] rounded-lg text-sm focus:outline-none focus:border-[#2D3D59]"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-[#2D3D59] hover:bg-[#12213E] active:bg-[#8F9AAA] text-white py-2.5 rounded-lg text-sm font-medium transition cursor-pointer border-0"
                >
                  Simpan Produk
                </button>
              </form>

              {/* Daftar Produk & Pesanan Masuk */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white p-6 rounded-xl border border-[#E8E1D3] shadow-2xs">
                  <h3 className="font-bold text-lg text-[#12213E] mb-4 flex items-center gap-2">
                    <Package className="w-5 h-5 text-[#2D3D59]" /> Katalog Produk Toko
                  </h3>
                  <div className="divide-y divide-[#F5F1E8]">
                    {myShop.products?.map((p) => (
                      <div key={p.id} className="py-3 flex items-center justify-between gap-4">
                        <div>
                          <p className="font-semibold text-[#12213E]">{p.name}</p>
                          <p className="text-xs text-[#8F9AAA]">
                            {p.category_name} • Rp {Number(p.price).toLocaleString('id-ID')} • Stok: {p.stock}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteProduct(p.id)}
                          className="p-2 text-[#D92D20] hover:bg-[#FFF2F1] rounded-lg cursor-pointer bg-transparent border-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pesanan Masuk */}
                <div className="bg-white p-6 rounded-xl border border-[#E8E1D3] shadow-2xs">
                  <h3 className="font-bold text-lg text-[#12213E] mb-4 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-[#12B76A]" /> Pesanan Masuk
                  </h3>
                  {shopOrders.length === 0 ? (
                    <p className="text-sm text-[#8F9AAA]">Belum ada pesanan masuk.</p>
                  ) : (
                    <div className="space-y-4">
                      {shopOrders.map((ord) => (
                        <div key={ord.id} className="p-4 border border-[#E8E1D3] rounded-lg space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="font-semibold text-sm text-[#12213E]">
                              Order #{ord.id} - {ord.buyer_name}
                            </span>
                            <select
                              value={ord.status}
                              onChange={(e) => handleUpdateOrderStatus(ord.id, e.target.value)}
                              className="text-xs border border-[#D0D5DD] rounded px-2 py-1 bg-[#FFFDF8] font-medium text-[#12213E]"
                            >
                              <option value="pending">Pending</option>
                              <option value="paid">Paid (Dibayar)</option>
                              <option value="shipped">Shipped (Dikirim)</option>
                              <option value="completed">Completed (Selesai)</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                          </div>
                          <p className="text-xs text-[#8F9AAA]">Alamat: {ord.shipping_address}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 8. FOOTER */}
      <footer className="bg-[#12213E] text-white mt-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-10 border-b border-white/15">
            {/* Kolom Brand */}
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
                Platform e-commerce resmi pemberdayaan hasil tani dan UMKM desa secara digital, aman, dan terpercaya.
              </p>
            </div>

            {/* Tautan Cepat */}
            <div className="md:col-span-2 space-y-3">
              <h3 className="text-xs font-bold tracking-wider uppercase text-white">Tautan Cepat</h3>
              <ul className="space-y-2 text-xs text-[#D0D5DD]">
                <li>
                  <button
                    type="button"
                    onClick={() => setActiveTab('catalog')}
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
                    onClick={() => setActiveTab(user ? 'orders' : 'catalog')}
                    className="hover:text-[#FAB800] transition cursor-pointer bg-transparent border-0 p-0"
                  >
                    Halaman
                  </button>
                </li>
              </ul>
            </div>

            {/* Informasi */}
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

            {/* Langganan Kabar Desa */}
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
            © 2026 GeraiLokal - Platform E-Commerce UMKM Desa. All rights reserved.
          </p>
        </div>
      </footer>

      {/* DRAWER KERANJANG BELANJA */}
      {showCart && (
        <div
          onClick={() => setShowCart(false)}
          className="fixed inset-0 z-50 bg-[#12213E]/50 flex justify-end">
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#FFFDF8] w-full max-w-md h-full p-6 flex flex-col justify-between shadow-xl">
            
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

      {/* MODAL LOGIN & REGISTER */}
      {showAuthModal && authMode === 'login' && (
        <Login
          initialNotice={loginNotice}
          onLoginSuccess={(userData) => {
            setUser(userData);
            setLoginNotice('');
            setShowAuthModal(false);
          }}
          onSwitchToRegister={() => {
            setLoginNotice('');
            setAuthMode('register');
          }}
          onClose={() => {
            setLoginNotice('');
            setShowAuthModal(false);
          }}
        />
      )}

      {showAuthModal && authMode === 'register' && (
        <Register
          onRegisterSuccess={(noticeMsg) => {
            setLoginNotice(noticeMsg);
            setAuthMode('login');
          }}
          onSwitchToLogin={() => setAuthMode('login')}
          onClose={() => setShowAuthModal(false)}
        />
      )}
    </div>
  );
}
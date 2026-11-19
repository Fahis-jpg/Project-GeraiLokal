import { useState, useEffect } from 'react';
import api from './api';
import {
  Store, Search, ShoppingBag, User, LogOut, Plus, Trash2,
  Package, CheckCircle, X, Tag, MapPin, ShoppingCart
} from 'lucide-react';

export default function App() {
  // State Utama
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // State Navigasi & Modal
  const [activeTab, setActiveTab] = useState('catalog'); // 'catalog' | 'orders' | 'seller'
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [showCart, setShowCart] = useState(false);

  // State Keranjang Belanja
  const [cart, setCart] = useState([]);
  const [shippingAddress, setShippingAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('QRIS');

  // State Form Auth
  const [authForm, setAuthForm] = useState({
    name: '', email: '', password: '', role: 'buyer', shop_name: ''
  });
  const [authError, setAuthError] = useState('');

  // State Pesanan & Seller
  const [myOrders, setMyOrders] = useState([]);
  const [myShop, setMyShop] = useState(null);
  const [shopOrders, setShopOrders] = useState([]);
  const [newProduct, setNewProduct] = useState({
    name: '', category_id: '', price: '', stock: '', description: '', image_url: ''
  });

  const fetchProducts = async (catId = selectedCategory) => {
    setLoading(true);
    try {
      const url = catId ? `/products?category_id=${catId}` : '/products';
      const res = await api.get(url);
      setProducts(res.data);
    } catch (err) {
      console.error('Gagal memuat produk:', err);
    } finally {
      setLoading(false);
    }
  };

  // 1. Inisialisasi sesi & data awal saat halaman pertama kali dibuka
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
    if (!searchQuery.trim()) {
      fetchProducts('');
      return;
    }
    setLoading(true);
    try {
      const res = await api.get(`/products/search?name=${encodeURIComponent(searchQuery)}`);
      setProducts(res.data);
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
  };

  // Autentikasi (Login & Register)
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (authMode === 'register') {
        await api.post('/auth/register', authForm);
        alert('Registrasi berhasil! Silakan login dengan akun baru Anda.');
        setAuthMode('login');
      } else {
        const res = await api.post('/auth/login', {
          email: authForm.email,
          password: authForm.password
        });
        setUser(res.data.data);
        setShowAuthModal(false);
        setAuthForm({ name: '', email: '', password: '', role: 'buyer', shop_name: '' });
      }
    } catch (err) {
      const errData = err.response?.data;
      if (errData?.errors) {
        const firstErr = Object.values(errData.errors).flat()[0];
        setAuthError(firstErr);
      } else {
        setAuthError(errData?.message || 'Terjadi kesalahan autentikasi');
      }
    }
  };

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
      setUser(null);
      setActiveTab('catalog');
    } catch (err) {
      console.error('Gagal logout:', err);
    }
  };

  // Manajemen Keranjang & Checkout
  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) return prev;
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (id) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const totalCartAmount = cart.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);

  const handleCheckout = async (e) => {
    e.preventDefault();
    if (!user) {
      setShowCart(false);
      setShowAuthModal(true);
      return;
    }
    try {
      await api.post('/orders', {
        payment_method: paymentMethod,
        shipping_address: shippingAddress,
        items: cart.map((item) => ({ product_id: item.id, quantity: item.quantity }))
      });
      alert('Pesanan berhasil dibuat! Stok produk telah diperbarui.');
      setCart([]);
      setShippingAddress('');
      setShowCart(false);
      fetchProducts();
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal membuat pesanan');
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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      {/* NAVBAR */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div
            onClick={() => setActiveTab('catalog')}
            className="flex items-center gap-2 cursor-pointer text-emerald-600 font-bold text-xl"
          >
            <Store className="w-7 h-7" />
            <span>Gerai<span className="text-slate-900">Lokal</span></span>
          </div>

          {/* Search Bar */}
          {activeTab === 'catalog' && (
            <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md">
              <div className="relative w-full">
                <input
                  type="text"
                  placeholder="Cari produk UMKM lokal..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-full border border-slate-300 text-sm focus:outline-none focus:border-emerald-500"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
              </div>
            </form>
          )}

          {/* Menu Kanan */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCart(true)}
              className="relative p-2 text-slate-600 hover:text-emerald-600 rounded-full hover:bg-slate-100"
            >
              <ShoppingCart className="w-5 h-5" />
              {cart.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-emerald-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-semibold">
                  {cart.reduce((s, i) => s + i.quantity, 0)}
                </span>
              )}
            </button>

            {user ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('orders')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                    activeTab === 'orders' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Pesanan Saya
                </button>
                {user.role === 'seller' && (
                  <button
                    onClick={() => setActiveTab('seller')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                      activeTab === 'seller' ? 'bg-emerald-600 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                    }`}
                  >
                    Toko Saya
                  </button>
                )}
                <div className="hidden sm:flex items-center gap-1.5 pl-2 border-l border-slate-200 text-sm font-medium text-slate-700">
                  <User className="w-4 h-4 text-emerald-600" />
                  <span>{user.name}</span>
                </div>
                <button
                  onClick={handleLogout}
                  title="Keluar"
                  className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setAuthMode('login'); setShowAuthModal(true); }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
              >
                Masuk / Daftar
              </button>
            )}
          </div>
        </div>
      </header>

      {/* KONTEN UTAMA */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* TAB 1: KATALOG PRODUK */}
        {activeTab === 'catalog' && (
          <>
            {/* Hero Banner */}
            <div className="bg-linear-to-r from-emerald-600 to-teal-700 rounded-2xl p-6 sm:p-10 text-white mb-8 shadow-md">
              <h1 className="text-2xl sm:text-3xl font-bold mb-2">Dukung Produk Asli UMKM Nusantara</h1>
              <p className="text-emerald-100 max-w-2xl text-sm sm:text-base">
                Temukan ragam kuliner khas, minuman herbal alami, hingga kerajinan tangan berkualitas langsung dari pelaku usaha lokal.
              </p>
            </div>

            {/* Filter Kategori */}
            <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6">
              <button
                onClick={() => handleCategoryFilter('')}
                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition ${
                  selectedCategory === '' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                Semua Kategori
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryFilter(cat.id)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition ${
                    selectedCategory === cat.id ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Grid Produk */}
            {loading ? (
              <div className="text-center py-12 text-slate-500">Memuat katalog produk...</div>
            ) : products.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-slate-200 text-slate-500">
                Produk tidak ditemukan.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {products.map((product) => (
                  <div key={product.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition flex flex-col">
                    <img
                      src={product.image_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500'}
                      alt={product.name}
                      className="w-full h-48 object-cover bg-slate-100"
                    />
                    <div className="p-4 flex-1 flex flex-col">
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded w-fit mb-2">
                        <Tag className="w-3 h-3" /> {product.category_name || 'Umum'}
                      </span>
                      <h3 className="font-semibold text-slate-900 line-clamp-1 mb-1">{product.name}</h3>
                      <p className="text-xs text-slate-500 line-clamp-2 mb-3 flex-1">{product.description}</p>
                      <div className="flex items-center gap-1 text-xs text-slate-500 mb-3">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span className="truncate">{product.shop_name}</span>
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                        <div>
                          <p className="text-base font-bold text-emerald-600">
                            Rp {Number(product.price).toLocaleString('id-ID')}
                          </p>
                          <p className="text-[11px] text-slate-400">Stok: {product.stock}</p>
                        </div>
                        <button
                          disabled={product.stock <= 0}
                          onClick={() => addToCart(product)}
                          className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition"
                        >
                          <Plus className="w-3.5 h-3.5" /> Keranjang
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* TAB 2: RIWAYAT PESANAN PEMBELI */}
        {activeTab === 'orders' && (
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-emerald-600" /> Riwayat Pesanan Saya
            </h2>
            {myOrders.length === 0 ? (
              <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-500">
                Belum ada riwayat transaksi pesanan.
              </div>
            ) : (
              <div className="space-y-4">
                {myOrders.map((order) => (
                  <div key={order.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex flex-wrap justify-between items-center border-b border-slate-100 pb-3 mb-3 gap-2">
                      <div>
                        <span className="text-xs text-slate-400">Order #{order.id} • {new Date(order.created_at).toLocaleDateString('id-ID')}</span>
                        <p className="text-sm font-medium text-slate-700">Metode: {order.payment_method}</p>
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs font-semibold uppercase bg-emerald-50 text-emerald-700">
                        {order.status}
                      </span>
                    </div>
                    <div className="space-y-2 mb-3">
                      {order.items?.map((item) => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span>{item.product_name} <span className="text-slate-400">x{item.quantity}</span></span>
                          <span className="font-medium">Rp {(Number(item.price) * item.quantity).toLocaleString('id-ID')}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                      <span className="text-xs text-slate-500">Alamat: {order.shipping_address}</span>
                      <span className="font-bold text-emerald-600">Total: Rp {Number(order.total_price).toLocaleString('id-ID')}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: DASHBOARD PENJUAL UMKM */}
        {activeTab === 'seller' && myShop && (
          <div className="space-y-8">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-wrap justify-between items-center gap-4">
              <div>
                <span className="text-xs font-semibold text-amber-600 uppercase">Profil Toko UMKM</span>
                <h2 className="text-2xl font-bold text-slate-900">{myShop.shop_name}</h2>
                <p className="text-sm text-slate-500">{myShop.description || 'Belum ada deskripsi toko.'}</p>
              </div>
              <div className="bg-emerald-50 px-4 py-3 rounded-lg text-center">
                <p className="text-xs text-emerald-700">Total Produk</p>
                <p className="text-2xl font-bold text-emerald-700">{myShop.total_products}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Form Tambah Produk */}
              <form onSubmit={handleAddProduct} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4 h-fit">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <Plus className="w-5 h-5 text-emerald-600" /> Tambah Produk Baru
                </h3>
                <input
                  required
                  type="text"
                  placeholder="Nama Produk"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
                <select
                  required
                  value={newProduct.category_id}
                  onChange={(e) => setNewProduct({ ...newProduct, category_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                >
                  <option value="">Pilih Kategori</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    required
                    type="number"
                    placeholder="Harga (Rp)"
                    value={newProduct.price}
                    onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                  <input
                    required
                    type="number"
                    placeholder="Stok"
                    value={newProduct.stock}
                    onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
                <input
                  type="url"
                  placeholder="URL Gambar Produk (opsional)"
                  value={newProduct.image_url}
                  onChange={(e) => setNewProduct({ ...newProduct, image_url: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
                <textarea
                  placeholder="Deskripsi singkat produk"
                  rows="3"
                  value={newProduct.description}
                  onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
                <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg text-sm font-medium">
                  Simpan Produk
                </button>
              </form>

              {/* Daftar Produk & Pesanan Masuk */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <Package className="w-5 h-5 text-emerald-600" /> Katalog Produk Toko
                  </h3>
                  <div className="divide-y divide-slate-100">
                    {myShop.products?.map((p) => (
                      <div key={p.id} className="py-3 flex items-center justify-between gap-4">
                        <div>
                          <p className="font-semibold text-slate-800">{p.name}</p>
                          <p className="text-xs text-slate-500">
                            {p.category_name} • Rp {Number(p.price).toLocaleString('id-ID')} • Stok: {p.stock}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteProduct(p.id)}
                          className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pesanan Masuk ke Toko */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-emerald-600" /> Pesanan Masuk
                  </h3>
                  {shopOrders.length === 0 ? (
                    <p className="text-sm text-slate-500">Belum ada pesanan masuk.</p>
                  ) : (
                    <div className="space-y-4">
                      {shopOrders.map((ord) => (
                        <div key={ord.id} className="p-4 border border-slate-200 rounded-lg space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="font-semibold text-sm">Order #{ord.id} - {ord.buyer_name}</span>
                            <select
                              value={ord.status}
                              onChange={(e) => handleUpdateOrderStatus(ord.id, e.target.value)}
                              className="text-xs border border-slate-300 rounded px-2 py-1 bg-slate-50 font-medium"
                            >
                              <option value="pending">Pending</option>
                              <option value="paid">Paid (Dibayar)</option>
                              <option value="shipped">Shipped (Dikirim)</option>
                              <option value="completed">Completed (Selesai)</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                          </div>
                          <p className="text-xs text-slate-500">Alamat: {ord.shipping_address}</p>
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

      {/* DRAWER KERANJANG BELANJA */}
      {showCart && (
        <div className="fixed inset-0 z-50 bg-black/40 flex justify-end">
          <div className="bg-white w-full max-w-md h-full p-6 flex flex-col justify-between shadow-xl">
            <div>
              <div className="flex justify-between items-center border-b border-slate-200 pb-4 mb-4">
                <h3 className="font-bold text-lg">Keranjang Belanja</h3>
                <button onClick={() => setShowCart(false)} className="p-1 hover:bg-slate-100 rounded">
                  <X className="w-5 h-5" />
                </button>
              </div>
              {cart.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-10">Keranjang masih kosong.</p>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {cart.map((item) => (
                    <div key={item.id} className="flex justify-between items-center border-b border-slate-100 pb-2">
                      <div>
                        <p className="text-sm font-semibold">{item.name}</p>
                        <p className="text-xs text-slate-500">
                          {item.quantity} x Rp {Number(item.price).toLocaleString('id-ID')}
                        </p>
                      </div>
                      <button onClick={() => removeFromCart(item.id)} className="text-rose-500 p-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <form onSubmit={handleCheckout} className="border-t border-slate-200 pt-4 space-y-3">
                <div className="flex justify-between font-bold text-base">
                  <span>Total Belanja</span>
                  <span className="text-emerald-600">Rp {totalCartAmount.toLocaleString('id-ID')}</span>
                </div>
                <input
                  required
                  type="text"
                  placeholder="Alamat lengkap pengiriman..."
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                >
                  <option value="QRIS">QRIS</option>
                  <option value="Transfer Bank">Transfer Bank</option>
                  <option value="COD">COD (Bayar di Tempat)</option>
                </select>
                <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-lg font-medium text-sm">
                  Checkout Sekarang
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL LOGIN & REGISTER */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">
                {authMode === 'login' ? 'Masuk ke GeraiLokal' : 'Daftar Akun Baru'}
              </h3>
              <button onClick={() => setShowAuthModal(false)} className="p-1 hover:bg-slate-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            {authError && (
              <div className="bg-rose-50 text-rose-600 text-xs p-3 rounded-lg mb-4 border border-rose-200">
                {authError}
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-3">
              {authMode === 'register' && (
                <>
                  <input
                    required
                    type="text"
                    placeholder="Nama Lengkap"
                    value={authForm.name}
                    onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                  <select
                    value={authForm.role}
                    onChange={(e) => setAuthForm({ ...authForm, role: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  >
                    <option value="buyer">Daftar sebagai Pembeli</option>
                    <option value="seller">Daftar sebagai Penjual UMKM</option>
                  </select>
                  {authForm.role === 'seller' && (
                    <input
                      required
                      type="text"
                      placeholder="Nama Toko UMKM Anda"
                      value={authForm.shop_name}
                      onChange={(e) => setAuthForm({ ...authForm, shop_name: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    />
                  )}
                </>
              )}

              <input
                required
                type="email"
                placeholder="Email"
                value={authForm.email}
                onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
              <input
                required
                type="password"
                placeholder="Password (minimal 8 karakter)"
                value={authForm.password}
                onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />

              <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-lg font-medium text-sm">
                {authMode === 'login' ? 'Masuk' : 'Daftar Sekarang'}
              </button>
            </form>

            <p className="text-center text-xs text-slate-500 mt-4">
              {authMode === 'login' ? 'Belum punya akun? ' : 'Sudah punya akun? '}
              <button
                type="button"
                onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setAuthError(''); }}
                className="text-emerald-600 font-semibold hover:underline"
              >
                {authMode === 'login' ? 'Daftar di sini' : 'Masuk di sini'}
              </button>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
import { useState, useEffect } from 'react';
import api from './api';
import {
  Building2, Package, Tags, ClipboardList, Pencil, Trash2
} from 'lucide-react';

export default function AdminPanel({
  categories = [],
  onDataUpdated,
}) {
  const [subTab, setSubTab] = useState('products');
  const [refreshKey, setRefreshKey] = useState(0);

  const [shopForm, setShopForm] = useState({
    shop_name: '',
    village_name: '',
    description: '',
    address: '',
    phone: '',
  });
  const [savingShop, setSavingShop] = useState(false);

  const [products, setProducts] = useState([]);
  const [editingProductId, setEditingProductId] = useState(null);
  const [productForm, setProductForm] = useState({
    name: '',
    category_id: '',
    price: '',
    stock: '',
    description: '',
    image_url: '',
  });

  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '' });

  const [orders, setOrders] = useState([]);
  const [orderStatusFilter, setOrderStatusFilter] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadOperationalData = async () => {
      try {
        const [profileRes, prodRes, ordRes] = await Promise.all([
          api.get('/bumdes/profile'),
          api.get('/products'),
          api.get(
            orderStatusFilter
              ? `/orders/manage?status=${orderStatusFilter}`
              : '/orders/manage'
          ),
        ]);

        if (!isMounted) return;

        if (profileRes.data?.data) {
          const s = profileRes.data.data;
          setShopForm({
            shop_name: s.shop_name || '',
            village_name: s.village_name || '',
            description: s.description || '',
            address: s.address || '',
            phone: s.phone || '',
          });
        }
        setProducts(prodRes.data || []);
        setOrders(ordRes.data?.data || []);
      } catch (err) {
        console.error('Gagal memuat data operasional BUMDes:', err);
      }
    };

    loadOperationalData();
    return () => {
      isMounted = false;
    };
  }, [orderStatusFilter, refreshKey]);

  const handleSaveShopProfile = async (e) => {
    e.preventDefault();
    setSavingShop(true);
    try {
      await api.put('/bumdes/profile', shopForm);
      alert('Profil toko BUMDes berhasil diperbarui!');
      onDataUpdated?.();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal memperbarui profil BUMDes.');
    } finally {
      setSavingShop(false);
    }
  };

  const resetProductForm = () => {
    setEditingProductId(null);
    setProductForm({
      name: '',
      category_id: '',
      price: '',
      stock: '',
      description: '',
      image_url: '',
    });
  };

  const startEditProduct = (prod) => {
    setEditingProductId(prod.id);
    setProductForm({
      name: prod.name || '',
      category_id: prod.category_id || '',
      price: prod.price ?? '',
      stock: prod.stock ?? '',
      description: prod.description || '',
      image_url: prod.image_url || '',
    });
  };

  const handleSubmitProduct = async (e) => {
    e.preventDefault();
    const payload = {
      name: productForm.name,
      category_id: productForm.category_id ? Number(productForm.category_id) : null,
      price: Number(productForm.price),
      stock: Number(productForm.stock),
      description: productForm.description,
      image_url: productForm.image_url,
    };

    try {
      if (editingProductId) {
        await api.put(`/products/${editingProductId}`, payload);
        alert('Produk berhasil diperbarui!');
      } else {
        await api.post('/products', payload);
        alert('Produk baru berhasil ditambahkan!');
      }
      resetProductForm();
      setRefreshKey((prev) => prev + 1);
      onDataUpdated?.();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyimpan produk.');
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!confirm('Hapus produk ini dari katalog BUMDes?')) return;
    try {
      await api.delete(`/products/${id}`);
      setRefreshKey((prev) => prev + 1);
      onDataUpdated?.();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghapus produk.');
    }
  };

  const resetCategoryForm = () => {
    setEditingCategoryId(null);
    setCategoryForm({ name: '', description: '' });
  };

  const handleSubmitCategory = async (e) => {
    e.preventDefault();
    try {
      if (editingCategoryId) {
        await api.put(`/categories/${editingCategoryId}`, categoryForm);
        alert('Kategori berhasil diperbarui!');
      } else {
        await api.post('/categories', categoryForm);
        alert('Kategori baru berhasil ditambahkan!');
      }
      resetCategoryForm();
      onDataUpdated?.();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyimpan kategori.');
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!confirm('Hapus kategori ini? Produk di dalamnya akan tetap ada dengan kategori Umum.')) return;
    try {
      await api.delete(`/categories/${id}`);
      onDataUpdated?.();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghapus kategori.');
    }
  };

  const handleStatusChange = async (orderId, nextStatus) => {
    try {
      await api.put(`/orders/${orderId}/status`, { status: nextStatus });
      setRefreshKey((prev) => prev + 1);
      onDataUpdated?.();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal memperbarui status pesanan.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="bg-white rounded-2xl border border-[#E8E1D3] p-5 sm:p-6 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#C9AB6D]">
            Pusat Operasional BUMDes
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-[#12213E]">
            {shopForm.shop_name || 'Pengelolaan Toko BUMDes'}
          </h1>
        </div>

        <div className="flex flex-wrap gap-2">
          {[
            { id: 'products', label: 'Produk UMKM', icon: Package },
            { id: 'orders', label: 'Pesanan Masuk', icon: ClipboardList },
            { id: 'categories', label: 'Kategori', icon: Tags },
            { id: 'profile', label: 'Profil BUMDes', icon: Building2 },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = subTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSubTab(tab.id)}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer border-0 ${
                  active
                    ? 'bg-[#12213E] text-white'
                    : 'bg-[#F5F1E8] text-[#2D3D59] hover:bg-[#E8E1D3]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB A: CRUD PRODUK UMKM */}
      {subTab === 'products' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleSubmitProduct}
            className="lg:col-span-4 bg-white p-6 rounded-2xl border border-[#E8E1D3] shadow-2xs space-y-3.5 h-fit"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-base text-[#12213E]">
                {editingProductId ? 'Edit Produk UMKM' : 'Tambah Produk Baru'}
              </h2>
              {editingProductId && (
                <button
                  type="button"
                  onClick={resetProductForm}
                  className="text-xs text-[#D92D20] hover:underline bg-transparent border-0 cursor-pointer"
                >
                  Batal Edit
                </button>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-[#2D3D59] mb-1">Nama Produk</label>
              <input
                required
                type="text"
                value={productForm.name}
                onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                placeholder="Contoh: Outer Tenun Ikat Kirana"
                className="w-full px-3 py-2 border border-[#D0D5DD] rounded-lg text-xs bg-white focus:outline-none focus:border-[#2D3D59]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#2D3D59] mb-1">Kategori</label>
              <select
                required
                value={productForm.category_id}
                onChange={(e) => setProductForm({ ...productForm, category_id: e.target.value })}
                className="w-full px-3 py-2 border border-[#D0D5DD] rounded-lg text-xs bg-white focus:outline-none focus:border-[#2D3D59]"
              >
                <option value="">Pilih Kategori</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#2D3D59] mb-1">Harga (Rp)</label>
                <input
                  required
                  type="number"
                  min="0"
                  value={productForm.price}
                  onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                  placeholder="125000"
                  className="w-full px-3 py-2 border border-[#D0D5DD] rounded-lg text-xs bg-white focus:outline-none focus:border-[#2D3D59]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#2D3D59] mb-1">Stok</label>
                <input
                  required
                  type="number"
                  min="0"
                  value={productForm.stock}
                  onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
                  placeholder="10"
                  className="w-full px-3 py-2 border border-[#D0D5DD] rounded-lg text-xs bg-white focus:outline-none focus:border-[#2D3D59]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#2D3D59] mb-1">URL Gambar</label>
              <input
                type="url"
                value={productForm.image_url}
                onChange={(e) => setProductForm({ ...productForm, image_url: e.target.value })}
                placeholder="https://..."
                className="w-full px-3 py-2 border border-[#D0D5DD] rounded-lg text-xs bg-white focus:outline-none focus:border-[#2D3D59]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#2D3D59] mb-1">Deskripsi Produk</label>
              <textarea
                rows="3"
                value={productForm.description}
                onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                placeholder="Deskripsi detail produk UMKM desa..."
                className="w-full px-3 py-2 border border-[#D0D5DD] rounded-lg text-xs bg-white focus:outline-none focus:border-[#2D3D59]"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-lg bg-[#2D3D59] hover:bg-[#12213E] active:bg-[#8F9AAA] text-white text-xs font-semibold transition cursor-pointer border-0"
            >
              {editingProductId ? 'Simpan Perubahan' : 'Tambah Produk ke Katalog'}
            </button>
          </form>

          <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-[#E8E1D3] shadow-2xs">
            <h2 className="font-bold text-base text-[#12213E] mb-4">
              Daftar Produk BUMDes ({products.length})
            </h2>
            <div className="divide-y divide-[#F5F1E8]">
              {products.map((p) => (
                <div key={p.id} className="py-3.5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={
                        p.image_url ||
                        'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200'
                      }
                      alt={p.name}
                      className="w-12 h-12 rounded-lg object-cover bg-[#F5F1E8] shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#12213E] truncate">{p.name}</p>
                      <p className="text-xs text-[#8F9AAA]">
                        {p.category_name} • Rp {Number(p.price).toLocaleString('id-ID')} •{' '}
                        <span
                          className={
                            p.stock <= 5 ? 'text-[#F79009] font-semibold' : 'text-[#53647C]'
                          }
                        >
                          Stok: {p.stock}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => startEditProduct(p)}
                      title="Edit Produk & Stok"
                      className="p-2 text-[#2D3D59] hover:bg-[#F5F1E8] rounded-lg cursor-pointer bg-transparent border-0"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteProduct(p.id)}
                      title="Hapus Produk"
                      className="p-2 text-[#D92D20] hover:bg-[#FFF2F1] rounded-lg cursor-pointer bg-transparent border-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB B: PROSES PESANAN MASUK */}
      {subTab === 'orders' && (
        <div className="bg-white p-6 rounded-2xl border border-[#E8E1D3] shadow-2xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-bold text-base text-[#12213E]">
              Pesanan Masuk BUMDes ({orders.length})
            </h2>
            <select
              value={orderStatusFilter}
              onChange={(e) => setOrderStatusFilter(e.target.value)}
              className="h-9 px-3 rounded-lg border border-[#D0D5DD] bg-[#FFFDF8] text-xs font-medium text-[#12213E]"
            >
              <option value="">Semua Status</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid (Dibayar)</option>
              <option value="shipped">Shipped (Dikirim)</option>
              <option value="completed">Completed (Selesai)</option>
              <option value="cancelled">Cancelled (Dibatalkan)</option>
            </select>
          </div>

          {orders.length === 0 ? (
            <p className="text-xs text-[#8F9AAA] py-8 text-center">Belum ada pesanan masuk.</p>
          ) : (
            <div className="space-y-4">
              {orders.map((ord) => (
                <div
                  key={ord.id}
                  className="p-4 rounded-xl border border-[#E8E1D3] bg-[#FFFDF8] space-y-2.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-sm font-bold text-[#12213E]">
                        Order #{ord.id} — {ord.buyer_name}
                      </span>
                      <p className="text-[11px] text-[#8F9AAA]">
                        {ord.buyer_email} • {new Date(ord.created_at).toLocaleString('id-ID')} •{' '}
                        {ord.payment_method}
                      </p>
                    </div>

                    <select
                      value={ord.status}
                      onChange={(e) => handleStatusChange(ord.id, e.target.value)}
                      className="h-8 px-2.5 rounded-lg border border-[#D0D5DD] bg-white text-xs font-semibold text-[#12213E]"
                    >
                      <option value="pending">Pending</option>
                      <option value="paid">Paid (Dibayar)</option>
                      <option value="shipped">Shipped (Dikirim)</option>
                      <option value="completed">Completed (Selesai)</option>
                      <option value="cancelled">Cancelled (Batalkan & Kembalikan Stok)</option>
                    </select>
                  </div>

                  <div className="text-xs text-[#2D3D59] space-y-1 border-t border-[#E8E1D3] pt-2">
                    {ord.items?.map((it) => (
                      <div key={it.id} className="flex justify-between">
                        <span>
                          {it.product_name} × {it.quantity}
                        </span>
                        <span className="font-medium">
                          Rp {(Number(it.price) * it.quantity).toLocaleString('id-ID')}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap justify-between items-center text-xs pt-2 border-t border-[#E8E1D3]">
                    <span className="text-[#8F9AAA]">Alamat: {ord.shipping_address}</span>
                    <span className="font-bold text-[#12213E]">
                      Total: Rp {Number(ord.total_price).toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB C: CRUD KATEGORI */}
      {subTab === 'categories' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleSubmitCategory}
            className="lg:col-span-4 bg-white p-6 rounded-2xl border border-[#E8E1D3] shadow-2xs space-y-4 h-fit"
          >
            <h2 className="font-bold text-base text-[#12213E]">
              {editingCategoryId ? 'Edit Kategori' : 'Tambah Kategori Baru'}
            </h2>
            <div>
              <label className="block text-xs font-medium text-[#2D3D59] mb-1">Nama Kategori</label>
              <input
                required
                type="text"
                value={categoryForm.name}
                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                placeholder="Contoh: Kerajinan Bambu"
                className="w-full px-3 py-2 border border-[#D0D5DD] rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#2D3D59] mb-1">Deskripsi</label>
              <textarea
                rows="3"
                value={categoryForm.description}
                onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                placeholder="Deskripsi singkat kategori..."
                className="w-full px-3 py-2 border border-[#D0D5DD] rounded-lg text-xs"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-lg bg-[#2D3D59] hover:bg-[#12213E] text-white text-xs font-semibold cursor-pointer border-0"
              >
                {editingCategoryId ? 'Simpan' : 'Tambah Kategori'}
              </button>
              {editingCategoryId && (
                <button
                  type="button"
                  onClick={resetCategoryForm}
                  className="px-3 py-2.5 rounded-lg bg-[#F5F1E8] text-[#12213E] text-xs font-semibold cursor-pointer border-0"
                >
                  Batal
                </button>
              )}
            </div>
          </form>

          <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-[#E8E1D3] shadow-2xs">
            <h2 className="font-bold text-base text-[#12213E] mb-4">
              Daftar Kategori Produk ({categories.length})
            </h2>
            <div className="divide-y divide-[#F5F1E8]">
              {categories.map((cat) => (
                <div key={cat.id} className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-[#12213E]">{cat.name}</p>
                    <p className="text-xs text-[#8F9AAA]">{cat.description || 'Tidak ada deskripsi'}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCategoryId(cat.id);
                        setCategoryForm({ name: cat.name, description: cat.description || '' });
                      }}
                      className="p-2 text-[#2D3D59] hover:bg-[#F5F1E8] rounded-lg cursor-pointer bg-transparent border-0"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteCategory(cat.id)}
                      className="p-2 text-[#D92D20] hover:bg-[#FFF2F1] rounded-lg cursor-pointer bg-transparent border-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB D: PROFIL TOKO BUMDES */}
      {subTab === 'profile' && (
        <form
          onSubmit={handleSaveShopProfile}
          className="max-w-2xl bg-white p-6 rounded-2xl border border-[#E8E1D3] shadow-2xs space-y-4"
        >
          <h2 className="font-bold text-base text-[#12213E]">Identitas Resmi Toko BUMDes</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#2D3D59] mb-1">Nama Toko BUMDes</label>
              <input
                required
                type="text"
                value={shopForm.shop_name}
                onChange={(e) => setShopForm({ ...shopForm, shop_name: e.target.value })}
                className="w-full px-3 py-2 border border-[#D0D5DD] rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#2D3D59] mb-1">Nama Desa</label>
              <input
                type="text"
                value={shopForm.village_name}
                onChange={(e) => setShopForm({ ...shopForm, village_name: e.target.value })}
                className="w-full px-3 py-2 border border-[#D0D5DD] rounded-lg text-xs"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#2D3D59] mb-1">Nomor Telepon / WA</label>
              <input
                type="text"
                value={shopForm.phone}
                onChange={(e) => setShopForm({ ...shopForm, phone: e.target.value })}
                className="w-full px-3 py-2 border border-[#D0D5DD] rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#2D3D59] mb-1">Alamat Kantor BUMDes</label>
              <input
                type="text"
                value={shopForm.address}
                onChange={(e) => setShopForm({ ...shopForm, address: e.target.value })}
                className="w-full px-3 py-2 border border-[#D0D5DD] rounded-lg text-xs"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#2D3D59] mb-1">Deskripsi Toko BUMDes</label>
            <textarea
              rows="3"
              value={shopForm.description}
              onChange={(e) => setShopForm({ ...shopForm, description: e.target.value })}
              className="w-full px-3 py-2 border border-[#D0D5DD] rounded-lg text-xs"
            />
          </div>
          <button
            type="submit"
            disabled={savingShop}
            className="px-5 py-2.5 rounded-lg bg-[#2D3D59] hover:bg-[#12213E] text-white text-xs font-semibold cursor-pointer border-0"
          >
            {savingShop ? 'Menyimpan...' : 'Simpan Profil BUMDes'}
          </button>
        </form>
      )}
    </div>
  );
}
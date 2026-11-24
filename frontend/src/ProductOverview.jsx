import { useState } from 'react';
import { ShoppingCart, ArrowLeft, Store, Tag } from 'lucide-react';

const formatRupiahDecimal = (value) => {
  const num = Number(value) || 0;
  return `Rp. ${num.toLocaleString('id-ID', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export default function ProductOverview({
  product,
  onAddToCart,
  onBuyNow,
  onBack,
}) {
  const [quantity, setQuantity] = useState(1);
  const [activeThumb, setActiveThumb] = useState(0);
  const [addedFeedback, setAddedFeedback] = useState(false);

  if (!product) return null;

  const maxStock = Number(product.stock) > 0 ? Number(product.stock) : 0;
  const primaryImage =
    product.image_url ||
    'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=700';

  // Galeri 4 thumbnail (menggunakan gambar utama + variasi sudut pandang)
  const galleryImages =
    Array.isArray(product.images) && product.images.length > 0
      ? product.images
      : [
          primaryImage,
          primaryImage,
          primaryImage,
          primaryImage,
        ];

  const handleDecrease = () => {
    setQuantity((prev) => (prev > 1 ? prev - 1 : 1));
  };

  const handleIncrease = () => {
    if (maxStock <= 0) return;
    setQuantity((prev) => (prev < maxStock ? prev + 1 : maxStock));
  };

  const handleAddClick = () => {
    if (maxStock <= 0) return;
    onAddToCart(product, quantity);
    setAddedFeedback(true);
    setTimeout(() => setAddedFeedback(false), 1800);
  };

  const handleBuyNowClick = () => {
    if (maxStock <= 0) return;
    onBuyNow(product, quantity);
  };

  // Pecah deskripsi berdasarkan baris baru agar rapi per paragraf
  const descriptionParagraphs = product.description
    ? product.description.split(/\n+/).filter(Boolean)
    : [
        `Hadirkan sentuhan tradisi yang elegan ke dalam gaya harianmu bersama ${product.name} dari GeraiLokal. Dibuat dengan material pilihan berkualitas tinggi yang nyaman digunakan sepanjang hari.`,
        'Dipadukan dengan detail pengerjaan khas pengrajin lokal Nusantara sehingga cocok untuk kebutuhan sehari-hari maupun acara spesial.',
      ];

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Navigasi Kembali */}
      <div className="mb-6">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-medium text-[#53647C] hover:text-[#12213E] transition cursor-pointer bg-transparent border-0 p-0"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Katalog Produk</span>
        </button>
      </div>

      {/* Layout Utama 2 Kolom */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* KOLOM KIRI: Galeri Foto Utama & 4 Thumbnail */}
        <div className="lg:col-span-5 space-y-4">
          <div className="aspect-square w-full rounded-2xl bg-[#F5F1E8] border border-[#E8E1D3] overflow-hidden shadow-2xs">
            <img
              src={galleryImages[activeThumb]}
              alt={product.name}
              className="w-full h-full object-cover transition-all duration-300"
            />
          </div>

          {/* 4 Thumbnail */}
          <div className="grid grid-cols-4 gap-3 sm:gap-4">
            {galleryImages.map((imgUrl, index) => {
              const isSelected = activeThumb === index;
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => setActiveThumb(index)}
                  className={`aspect-square rounded-xl overflow-hidden bg-[#F5F1E8] border-2 transition cursor-pointer p-0 ${
                    isSelected
                      ? 'border-[#12213E] shadow-xs'
                      : 'border-[#E8E1D3] opacity-80 hover:opacity-100 hover:border-[#8F9AAA]'
                  }`}
                >
                  <img
                    src={imgUrl}
                    alt={`${product.name} tampilan ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* KOLOM KANAN: Detail Produk, Harga, Stepper & Tombol Aksi */}
        <div className="lg:col-span-7 space-y-5">
          {/* Info Toko & Kategori */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-[#53647C]">
            {product.category_name && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#FFF9CC] border border-[#E8E1D3] text-[#12213E] font-medium">
                <Tag className="w-3 h-3" />
                {product.category_name}
              </span>
            )}
            {product.shop_name && (
              <span className="inline-flex items-center gap-1.5 font-medium text-[#2D3D59]">
                <Store className="w-3.5 h-3.5 text-[#8F9AAA]" />
                {product.shop_name}
              </span>
            )}
            <span className="text-[#8F9AAA]">
              • Stok: <strong className="text-[#12213E]">{maxStock}</strong>
            </span>
          </div>

          {/* Judul Produk */}
          <h1 className="text-2xl sm:text-[32px] font-semibold text-[#12213E] leading-tight tracking-tight">
            {product.name}
          </h1>

          {/* Harga Utama & Harga Coret */}
          <div className="flex flex-wrap items-baseline gap-3">
            <span className="text-xl sm:text-2xl font-medium text-[#12213E]">
              {formatRupiahDecimal(product.price)}
            </span>
            <span className="text-sm sm:text-lg text-[#8F9AAA] line-through">
              {formatRupiahDecimal(Number(product.price) * 2)}
            </span>
          </div>

          {/* Garis Pembatas */}
          <hr className="border-0 border-t border-[#D0D5DD]" />

          {/* Deskripsi Produk */}
          <div className="space-y-3 text-xs sm:text-[13px] text-[#2D3D59] leading-[1.8]">
            {descriptionParagraphs.map((paragraph, idx) => (
              <p key={idx}>{paragraph}</p>
            ))}
          </div>

          {/* Stepper Jumlah (- 1 +) */}
          <div className="pt-2">
            <div className="inline-flex items-center h-11 rounded-lg border border-[#8F9AAA] bg-white px-2">
              <button
                type="button"
                onClick={handleDecrease}
                disabled={quantity <= 1 || maxStock <= 0}
                aria-label="Kurangi jumlah"
                className="w-8 h-8 flex items-center justify-center text-base font-medium text-[#12213E] hover:bg-[#F5F1E8] disabled:text-[#D0D5DD] rounded transition cursor-pointer bg-transparent border-0"
              >
                −
              </button>
              <span className="w-10 text-center text-sm font-medium text-[#12213E] select-none">
                {maxStock > 0 ? quantity : 0}
              </span>
              <button
                type="button"
                onClick={handleIncrease}
                disabled={quantity >= maxStock || maxStock <= 0}
                aria-label="Tambah jumlah"
                className="w-8 h-8 flex items-center justify-center text-base font-medium text-[#12213E] hover:bg-[#F5F1E8] disabled:text-[#D0D5DD] rounded transition cursor-pointer bg-transparent border-0"
              >
                +
              </button>
            </div>
          </div>

          {/* Tombol Aksi: TAMBAH KE KERANJANG & BELI SEKARANG */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 max-w-xl">
            <button
              type="button"
              disabled={maxStock <= 0}
              onClick={handleAddClick}
              className="h-12 px-5 rounded-lg border border-[#2D3D59] bg-white hover:bg-[#F5F1E8] active:bg-[#E8E1D3] disabled:border-[#D0D5DD] disabled:text-[#8F9AAA] text-[#12213E] text-xs font-bold tracking-wider uppercase flex items-center justify-center gap-2.5 transition cursor-pointer"
            >
              <span>
                {maxStock <= 0
                  ? 'STOK HABIS'
                  : addedFeedback
                  ? 'DITAMBAHKAN ✓'
                  : 'TAMBAH KE KERANJANG'}
              </span>
              <ShoppingCart className="w-4 h-4" />
            </button>

            <button
              type="button"
              disabled={maxStock <= 0}
              onClick={handleBuyNowClick}
              className="h-12 px-5 rounded-lg border-0 bg-[#2D3D59] hover:bg-[#12213E] active:bg-[#8F9AAA] disabled:bg-[#D0D5DD] text-white text-xs font-bold tracking-wider uppercase flex items-center justify-center transition cursor-pointer shadow-2xs"
            >
              BELI SEKARANG
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
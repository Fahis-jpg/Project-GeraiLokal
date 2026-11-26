import { useState, useEffect } from 'react';
import api from './api';
import { ShieldCheck, UserPlus, Pencil, Trash2, Power } from 'lucide-react';

export default function AdminMasterPanel() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadAdmins = async () => {
      try {
        const res = await api.get('/admin-master/admins');
        if (isMounted) {
          setAdmins(res.data?.data || []);
          setErrorMsg('');
        }
      } catch (err) {
        if (isMounted) {
          setErrorMsg(err.response?.data?.message || 'Gagal memuat daftar Admin BUMDes.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadAdmins();
    return () => {
      isMounted = false;
    };
  }, [refreshKey]);

  const triggerReload = () => {
    setLoading(true);
    setRefreshKey((prev) => prev + 1);
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({ name: '', email: '', password: '' });
    setErrorMsg('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      if (editingId) {
        const payload = { name: form.name, email: form.email };
        if (form.password) payload.password = form.password;
        await api.put(`/admin-master/admins/${editingId}`, payload);
        alert('Akun Admin BUMDes berhasil diperbarui.');
      } else {
        await api.post('/admin-master/admins', form);
        alert('Akun Admin BUMDes baru berhasil dibuat.');
      }
      resetForm();
      triggerReload();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal menyimpan akun Admin BUMDes.');
    }
  };

  const handleToggleActive = async (admin) => {
    try {
      await api.patch(`/admin-master/admins/${admin.id}/status`, {
        is_active: !admin.is_active,
      });
      triggerReload();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mengubah status akun.');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Hapus permanen akun Admin BUMDes ini?')) return;
    try {
      await api.delete(`/admin-master/admins/${id}`);
      triggerReload();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghapus akun Admin BUMDes.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="bg-white rounded-2xl border border-[#E8E1D3] p-6 shadow-2xs">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#C9AB6D]">
          <ShieldCheck className="w-4 h-4" /> Kontrol Akses Admin Master
        </span>
        <h1 className="text-xl sm:text-2xl font-bold text-[#12213E] mt-1">
          Manajemen Akun Admin BUMDes
        </h1>
        <p className="text-xs text-[#8F9AAA] mt-0.5">
          Akun pengelola BUMDes hanya dapat dibuat dan dikelola melalui panel ini.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-4 bg-white p-6 rounded-2xl border border-[#E8E1D3] shadow-2xs space-y-4 h-fit"
        >
          <h2 className="font-bold text-base text-[#12213E] flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-[#2D3D59]" />
            <span>{editingId ? 'Edit Admin BUMDes' : 'Buat Akun Admin BUMDes'}</span>
          </h2>

          {errorMsg && (
            <p className="p-2.5 rounded-lg bg-[#FFF2F1] border border-[#D92D20]/30 text-[#D92D20] text-xs">
              {errorMsg}
            </p>
          )}

          <div>
            <label className="block text-xs font-medium text-[#2D3D59] mb-1">Nama Lengkap</label>
            <input
              required
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Contoh: Budi Santoso (Staf BUMDes)"
              className="w-full px-3 py-2 border border-[#D0D5DD] rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#2D3D59] mb-1">Email Login</label>
            <input
              required
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="admin.bumdes@gerailokal.id"
              className="w-full px-3 py-2 border border-[#D0D5DD] rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#2D3D59] mb-1">
              {editingId ? 'Kata Sandi Baru (kosongkan jika tetap)' : 'Kata Sandi (min. 8 karakter)'}
            </label>
            <input
              required={!editingId}
              type="password"
              minLength={8}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Minimal 8 karakter"
              className="w-full px-3 py-2 border border-[#D0D5DD] rounded-lg text-xs"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-lg bg-[#2D3D59] hover:bg-[#12213E] text-white text-xs font-semibold cursor-pointer border-0"
            >
              {editingId ? 'Simpan Perubahan' : 'Daftarkan Admin BUMDes'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="px-3 py-2.5 rounded-lg bg-[#F5F1E8] text-[#12213E] text-xs font-semibold cursor-pointer border-0"
              >
                Batal
              </button>
            )}
          </div>
        </form>

        <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-[#E8E1D3] shadow-2xs">
          <h2 className="font-bold text-base text-[#12213E] mb-4">
            Daftar Akun Admin BUMDes ({admins.length})
          </h2>

          {loading ? (
            <p className="text-xs text-[#8F9AAA] py-8 text-center">Memuat daftar admin...</p>
          ) : admins.length === 0 ? (
            <p className="text-xs text-[#8F9AAA] py-8 text-center border border-dashed border-[#E8E1D3] rounded-xl">
              Belum ada akun Admin BUMDes. Silakan buat melalui formulir di samping.
            </p>
          ) : (
            <div className="divide-y divide-[#F5F1E8]">
              {admins.map((adm) => (
                <div
                  key={adm.id}
                  className="py-3.5 flex flex-wrap items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-[#12213E]">{adm.name}</p>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          adm.is_active
                            ? 'bg-[#ECFDF3] text-[#12B76A]'
                            : 'bg-[#FFF2F1] text-[#D92D20]'
                        }`}
                      >
                        {adm.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </div>
                    <p className="text-xs text-[#8F9AAA]">
                      {adm.email} • Dibuat {new Date(adm.created_at).toLocaleDateString('id-ID')}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(adm)}
                      title={adm.is_active ? 'Nonaktifkan Akun' : 'Aktifkan Akun'}
                      className="p-2 text-[#53647C] hover:bg-[#F5F1E8] rounded-lg cursor-pointer bg-transparent border-0"
                    >
                      <Power className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(adm.id);
                        setForm({ name: adm.name, email: adm.email, password: '' });
                      }}
                      title="Edit / Reset Password"
                      className="p-2 text-[#2D3D59] hover:bg-[#F5F1E8] rounded-lg cursor-pointer bg-transparent border-0"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(adm.id)}
                      title="Hapus Akun"
                      className="p-2 text-[#D92D20] hover:bg-[#FFF2F1] rounded-lg cursor-pointer bg-transparent border-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
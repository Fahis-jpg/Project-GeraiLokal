import { useState, useEffect } from 'react';
import api from './api';
import Pembeli from './pembeli';
import AdminWorkspace from './AdminWorkspace';
import Login from './Login';
import Register from './Register';

export default function App() {
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [bumdesProfile, setBumdesProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Mode Tampilan: 'storefront' (Etalase Pembeli) | 'admin' (Workspace Admin & Admin Master)
  const [viewMode, setViewMode] = useState('Pembeli'); 

  // Modal Autentikasi
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'    
  const [loginNotice, setLoginNotice] = useState('');

  // Inisialisasi Sesi Login & Data Katalog Awal
  useEffect(() => {
    let active = true;

    const init = async () => {
      try {
        const authRes = await api.get('/auth/me');
        if (active && authRes.data?.success) {
          const loggedInUser = authRes.data.data;
          setUser(loggedInUser);
          if (loggedInUser.role === 'admin' || loggedInUser.role === 'admin_master') {
            setViewMode('admin');
          }
        }
      } catch {
        if (active) setUser(null);
      }

      try {
        const [catRes, prodRes, profileRes] = await Promise.all([
          api.get('/categories'),
          api.get('/products'),
          api.get('/bumdes/profile'),
        ]);
        if (active) {
          setCategories(catRes.data);
          setProducts(prodRes.data);
          if (profileRes.data?.data) setBumdesProfile(profileRes.data.data);
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

  const refreshAllData = async () => {
    try {
      const [catRes, prodRes, profileRes] = await Promise.all([
        api.get('/categories'),
        api.get('/products'),
        api.get('/bumdes/profile'),
      ]);
      setCategories(catRes.data);
      setProducts(prodRes.data);
      if (profileRes.data?.data) setBumdesProfile(profileRes.data.data);
    } catch (err) {
      console.error('Gagal menyegarkan data:', err);
    }
  };

  const fetchProductsByCategory = async (catId = '') => {
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

  const searchProductsByName = async (query = '') => {
    if (!query.trim()) {
      await fetchProductsByCategory('');
      return;
    }
    setLoading(true);
    try {
      const res = await api.get(`/products/search?name=${encodeURIComponent(query)}`);
      setProducts(res.data);
    } catch (err) {
      console.error('Gagal mencari produk:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error('Gagal logout:', err);
    } finally {
      localStorage.removeItem('gl_access_token');
      setUser(null);
      setViewMode('Pembeli');
    }
  };

  const isAdminRole = user?.role === 'admin' || user?.role === 'admin_master';

  return (
    <>
      {isAdminRole && viewMode === 'admin' ? (
        <AdminWorkspace
          user={user}
          categories={categories}
          onDataUpdated={refreshAllData}
          onSwitchToStorefront={() => setViewMode('Pembeli')}
          onLogout={handleLogout}
        />
      ) : (
        <Pembeli
          user={user}
          products={products}
          categories={categories}
          bumdesProfile={bumdesProfile}
          loading={loading}
          onFetchProducts={fetchProductsByCategory}
          onSearchProducts={searchProductsByName}
          onRefreshData={refreshAllData}
          onOpenAuth={() => {
            setLoginNotice('');
            setAuthMode('login');
            setShowAuthModal(true);
          }}
          onSwitchToAdmin={() => setViewMode('admin')}
          onLogout={handleLogout}
        />
      )}

      {/* MODAL LOGIN & REGISTER */}
      {showAuthModal && authMode === 'login' && (
        <Login
          initialNotice={loginNotice}
          onLoginSuccess={(userData) => {
            setUser(userData);
            setLoginNotice('');
            setShowAuthModal(false);
            if (userData.role === 'admin' || userData.role === 'admin_master') {
              setViewMode('admin');
            } else {
              setViewMode('Pembeli');
            }
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
    </>
  );
}
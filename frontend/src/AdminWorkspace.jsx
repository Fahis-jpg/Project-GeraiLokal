import { useState } from 'react';
import {
  BarChart3, Building2, ShieldCheck, Store, LogOut,
  PanelLeftClose, PanelLeftOpen
} from 'lucide-react';
import ExecutiveDashboard from './ExecutiveDashboard';
import AdminPanel from './AdminPanel';
import AdminMasterPanel from './AdminMasterPanel';

export default function AdminWorkspace({
  user,
  categories = [],
  onDataUpdated,
  onSwitchToStorefront,
  onLogout,
}) {
  const [activeAdminTab, setActiveAdminTab] = useState('analytics'); // 'analytics' | 'bumdes' | 'admin_master'
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const adminNavItems = [
    { id: 'analytics', label: 'Dashboard', icon: BarChart3 },
    ...(user?.role === 'admin'
      ? [{ id: 'bumdes', label: 'Kelola Toko & Produk', icon: Building2 }]
      : []),
    ...(user?.role === 'admin_master'
      ? [{ id: 'admin_master', label: 'Kelola Admin BUMDes', icon: ShieldCheck }]
      : []),
  ];

  const userInitial = (user?.name || 'A').charAt(0).toUpperCase();

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#F7F4EC] text-[#12213E]">
      {/* SIDEBAR NAVIGASI ADMIN (COLLAPSIBLE) */}
      <aside
        className={`w-full bg-[#12213E] text-white flex flex-col justify-between shrink-0 lg:sticky lg:top-0 lg:h-screen transition-all duration-300 ${
          isSidebarCollapsed ? 'lg:w-20' : 'lg:w-68'
        }`}
      >
        <div>
          {/* Header Brand Sidebar + Tombol Collapse */}
          <div
            className={`px-4 py-5 border-b border-white/10 flex items-center ${
              isSidebarCollapsed ? 'lg:justify-center' : 'justify-between px-5'
            }`}
          >
            {!isSidebarCollapsed && (
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-[#FAB800] text-[#12213E] font-extrabold text-sm flex items-center justify-center shadow-xs shrink-0">
                  GL
                </div>
                <div className="truncate">
                  <span className="font-bold text-base tracking-tight block leading-none">
                    Gerai<span className="text-[#FAB800]">Lokal</span>
                  </span>
                  <span className="text-[10px] text-[#DFCAA0] tracking-wider uppercase font-medium">
                    Panel Pengelola
                  </span>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setIsSidebarCollapsed((prev) => !prev)}
              title={isSidebarCollapsed ? 'Perluas Sidebar' : 'Perkecil Sidebar'}
              aria-label={isSidebarCollapsed ? 'Perluas Sidebar' : 'Perkecil Sidebar'}
              className="hidden lg:flex w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-[#DFCAA0] hover:text-white items-center justify-center transition cursor-pointer border-0 shrink-0"
            >
              {isSidebarCollapsed ? (
                <PanelLeftOpen className="w-4 h-4" />
              ) : (
                <PanelLeftClose className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Daftar Menu Sesuai Role */}
          <nav className="p-3.5 flex lg:flex-col gap-1.5 overflow-x-auto">
            {adminNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeAdminTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  title={isSidebarCollapsed ? item.label : undefined}
                  onClick={() => setActiveAdminTab(item.id)}
                  className={`flex items-center gap-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer border-0 whitespace-nowrap ${
                    isSidebarCollapsed ? 'lg:justify-center lg:px-0 px-3.5' : 'px-3.5'
                  } ${
                    isActive
                      ? 'bg-[#FAB800] text-[#12213E] shadow-xs'
                      : 'text-white/80 hover:bg-white/10 hover:text-white bg-transparent'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className={isSidebarCollapsed ? 'lg:hidden' : ''}>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Info Profil & Tombol Aksi Bawah */}
        <div className="p-3.5 border-t border-white/10 space-y-2.5">
          {isSidebarCollapsed ? (
            <div
              title={`${user?.name} (${
                user?.role === 'admin_master' ? 'Admin Master' : 'Admin BUMDes'
              })`}
              className="hidden lg:flex w-10 h-10 mx-auto rounded-xl bg-white/10 border border-white/15 text-[#FAB800] font-bold text-xs items-center justify-center"
            >
              {userInitial}
            </div>
          ) : (
            <div className="px-3 py-2.5 rounded-xl bg-white/5 border border-white/10">
              <p className="text-xs font-bold text-white truncate">{user?.name}</p>
              <p className="text-[10px] text-[#FAB800] uppercase font-semibold tracking-wider mt-0.5">
                {user?.role === 'admin_master' ? 'Admin Master' : 'Admin BUMDes'}
              </p>
            </div>
          )}

          <button
            type="button"
            title={isSidebarCollapsed ? 'Lihat Etalase Toko' : undefined}
            onClick={onSwitchToStorefront}
            className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-medium transition cursor-pointer border-0 ${
              isSidebarCollapsed ? 'lg:px-0 px-3.5' : 'px-3.5'
            }`}
          >
            <Store className="w-3.5 h-3.5 text-[#FAB800] shrink-0" />
            <span className={isSidebarCollapsed ? 'lg:hidden' : ''}>Lihat Etalase Toko</span>
          </button>

          <button
            type="button"
            title={isSidebarCollapsed ? 'Keluar' : undefined}
            onClick={onLogout}
            className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-[#D92D20]/15 hover:bg-[#D92D20]/25 text-[#FCA5A5] text-xs font-semibold transition cursor-pointer border-0 ${
              isSidebarCollapsed ? 'lg:px-0 px-3.5' : 'px-3.5'
            }`}
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" />
            <span className={isSidebarCollapsed ? 'lg:hidden' : ''}>Keluar</span>
          </button>
        </div>
      </aside>

      {/* AREA KONTEN ADMIN */}
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 transition-all duration-300">
        <div className="max-w-7xl mx-auto">
          {activeAdminTab === 'analytics' && (
            <ExecutiveDashboard categories={categories} userRole={user?.role} />
          )}

          {activeAdminTab === 'bumdes' && user?.role === 'admin' && (
            <AdminPanel
              categories={categories}
              onDataUpdated={onDataUpdated}
            />
          )}

          {activeAdminTab === 'admin_master' && user?.role === 'admin_master' && (
            <AdminMasterPanel />
          )}
        </div>
      </main>
    </div>
  );
}
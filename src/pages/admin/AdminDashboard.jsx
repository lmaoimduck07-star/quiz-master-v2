import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity, Users, Shield, Settings, LogOut, Sun, Moon,
  LayoutDashboard, Menu, X, BookOpen, GraduationCap, Wrench
} from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { useAuth } from '@/context/AuthContext';
import { useMaintenance } from '@/context/MaintenanceContext';
import { useTheme } from '@/context/ThemeContext';
import { useDevice } from '@/hooks/useDevice';
import { LiveMonitor } from '@/components/admin/pc/live-monitor/LiveMonitor';
import { UserManager } from '@/components/admin/pc/UserManager';
import { AuditLogViewer } from '@/components/admin/pc/AuditLogViewer';
import { SystemSettings } from '@/components/admin/pc/SystemSettings';
import { AdminMobileBlock } from '@/components/admin/mobile/AdminMobileBlock';

const NAV_ITEMS = [
  { id: 'live_monitor', label: 'Live Monitor', icon: Activity, desc: 'Giám sát thi realtime' },
  { id: 'users', label: 'Người Dùng & Quyền', icon: Users, desc: 'Quản lý đa vai trò' },
  { id: 'audit', label: 'Nhật Ký Kiểm Tra', icon: Shield, desc: 'Lịch sử thao tác' },
  { id: 'settings', label: 'Cài Đặt Hệ Thống', icon: Settings, desc: 'Bảo trì, dọn dẹp & AI' },
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { currentUser, activeRole, setActiveRole, logout } = useAuth();
  const { isMaintenance } = useMaintenance() || {};
  const { theme, toggleTheme } = useTheme();
  const { isMobile } = useDevice();
  const [activeTab, setActiveTab] = useState('live_monitor');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (isMobile) {
    return <AdminMobileBlock />;
  }

  const handleLogout = async () => {
    navigate('/login', { replace: true });
    await logout();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col md:flex-row font-sans transition-colors duration-200">
      {/* Sidebar Desktop - Kích thước w-72 đồng bộ chuẩn với Giảng viên */}
      <aside className="hidden md:flex flex-col w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shrink-0 select-none">
        {/* Brand header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/25">
              <LayoutDashboard className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-black text-base tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                Quiz Master
                <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                  Admin
                </span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">Trung Tâm Quản Trị</p>
            </div>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Phân Hệ Quản Trị
          </div>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-sm font-semibold transition-all duration-150 text-left cursor-pointer ${
                  isActive
                    ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800/60 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <div
                  className={`p-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                </div>
                <div className="truncate">
                  <div className="font-bold text-sm leading-tight">{item.label}</div>
                  <div className="text-[11px] font-normal text-slate-400 dark:text-slate-500 truncate mt-0.5">
                    {item.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </nav>

        {/* User Card & Logout */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 shadow-sm mb-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white font-black text-sm shrink-0">
              {currentUser?.displayName?.[0]?.toUpperCase() || currentUser?.email?.[0]?.toUpperCase() || 'A'}
            </div>
            <div className="truncate flex-1">
              <div className="font-bold text-xs truncate text-slate-900 dark:text-white">
                {currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Admin'}
              </div>
              <div className="text-[11px] text-purple-600 dark:text-purple-400 font-medium">
                Quản Trị Viên (Admin)
              </div>
            </div>
            <button
              onClick={toggleTheme}
              title={`Chuyển sang chế độ ${theme === 'dark' ? 'Sáng' : 'Tối'}`}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>

          {/* Quick Role Switchers */}
          <div className="space-y-1.5 mb-3">
            <div className="px-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Chuyển đổi phân hệ
            </div>

            {/* Nút 1: Giao Diện Giảng Viên */}
            <div className="relative rounded-xl overflow-hidden">
              <button
                onClick={() => {
                  if (isMaintenance) return;
                  setActiveRole('Lecturer');
                  navigate('/lecturer/dashboard');
                }}
                disabled={isMaintenance}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors cursor-pointer shadow-sm active:scale-[0.98] disabled:cursor-not-allowed"
              >
                <BookOpen className="h-3.5 w-3.5 shrink-0" />
                <span>Giao Diện Giảng Viên</span>
              </button>

              {isMaintenance && (
                <div className="absolute inset-0 z-10 rounded-xl bg-amber-100/75 dark:bg-amber-950/65 backdrop-blur-[2px] border border-amber-300/80 dark:border-amber-700/60 flex items-center justify-between px-3 select-none pointer-events-none animate-fade-in shadow-xs">
                  <div className="flex items-center gap-2 text-amber-800/80 dark:text-amber-300/80 text-xs font-semibold min-w-0">
                    <BookOpen className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                    <span className="truncate">Giao Diện Giảng Viên</span>
                  </div>
                  <span className="flex items-center gap-1 text-[10px] font-extrabold uppercase text-amber-800 dark:text-amber-300 bg-amber-200/80 dark:bg-amber-900/70 border border-amber-400/60 dark:border-amber-600/60 px-2 py-0.5 rounded-md shrink-0 shadow-xs">
                    <Wrench className="h-2.5 w-2.5 animate-spin" />
                    Bảo trì
                  </span>
                </div>
              )}
            </div>

            {/* Nút 2: Giao Diện Học Sinh */}
            <div className="relative rounded-xl overflow-hidden">
              <button
                onClick={() => {
                  if (isMaintenance) return;
                  setActiveRole('Student');
                  navigate('/client/dashboard');
                }}
                disabled={isMaintenance}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/30 border border-brand-200 dark:border-brand-800/50 hover:bg-brand-100 dark:hover:bg-brand-900/30 transition-colors cursor-pointer shadow-sm active:scale-[0.98] disabled:cursor-not-allowed"
              >
                <GraduationCap className="h-3.5 w-3.5 shrink-0" />
                <span>Giao Diện Học Sinh</span>
              </button>

              {isMaintenance && (
                <div className="absolute inset-0 z-10 rounded-xl bg-brand-100/75 dark:bg-brand-950/65 backdrop-blur-[2px] border border-brand-300/80 dark:border-brand-700/60 flex items-center justify-between px-3 select-none pointer-events-none animate-fade-in shadow-xs">
                  <div className="flex items-center gap-2 text-brand-800/80 dark:text-brand-300/80 text-xs font-semibold min-w-0">
                    <GraduationCap className="h-3.5 w-3.5 shrink-0 text-brand-600 dark:text-brand-400" />
                    <span className="truncate">Giao Diện Học Sinh</span>
                  </div>
                  <span className="flex items-center gap-1 text-[10px] font-extrabold uppercase text-brand-800 dark:text-brand-300 bg-brand-200/80 dark:bg-brand-900/70 border border-brand-400/60 dark:border-brand-600/60 px-2 py-0.5 rounded-md shrink-0 shadow-xs">
                    <Wrench className="h-2.5 w-2.5 animate-spin" />
                    Bảo trì
                  </span>
                </div>
              )}
            </div>
          </div>

          <Button
            variant="ghost"
            onClick={handleLogout}
            icon={LogOut}
            className="w-full justify-center text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30"
          >
            Đăng Xuất
          </Button>
        </div>
      </aside>

      {/* Main Content Area - Chiều cao đầy đủ, cuộn mượt khi cần nhưng fit gọn trong 1 màn hình */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top bar for small screen toggle and status */}
        <header className="md:hidden flex items-center justify-between p-3.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-brand-500 flex items-center justify-center text-white font-bold text-xs">
              QM
            </div>
            <span className="font-black text-slate-900 dark:text-white text-sm">Admin Panel</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </header>

        {/* Mobile dropdown nav if opened on small desktop view */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-3 space-y-1.5">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold ${
                  activeTab === item.id
                    ? 'bg-brand-500 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </button>
            ))}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-1.5">
              {/* Nút Mobile 1: Giảng viên */}
              <div className="relative rounded-xl overflow-hidden">
                <button
                  onClick={() => {
                    if (isMaintenance) return;
                    setActiveRole('Lecturer');
                    navigate('/lecturer/dashboard');
                  }}
                  disabled={isMaintenance}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                >
                  <BookOpen className="h-3.5 w-3.5" /> Giao diện Giảng viên
                </button>
                {isMaintenance && (
                  <div className="absolute inset-0 z-10 rounded-xl bg-amber-100/75 dark:bg-amber-950/65 backdrop-blur-[2px] border border-amber-300/80 dark:border-amber-700/60 flex items-center justify-between px-3 select-none pointer-events-none shadow-xs">
                    <div className="flex items-center gap-2 text-amber-800/80 dark:text-amber-300/80 text-xs font-semibold min-w-0">
                      <BookOpen className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                      <span className="truncate">Giao diện Giảng viên</span>
                    </div>
                    <span className="flex items-center gap-1 text-[10px] font-extrabold uppercase text-amber-800 dark:text-amber-300 bg-amber-200/80 dark:bg-amber-900/70 border border-amber-400/60 dark:border-amber-600/60 px-2 py-0.5 rounded-md shrink-0 shadow-xs">
                      <Wrench className="h-2.5 w-2.5 animate-spin" />
                      Bảo trì
                    </span>
                  </div>
                )}
              </div>

              {/* Nút Mobile 2: Học sinh */}
              <div className="relative rounded-xl overflow-hidden">
                <button
                  onClick={() => {
                    if (isMaintenance) return;
                    setActiveRole('Student');
                    navigate('/client/dashboard');
                  }}
                  disabled={isMaintenance}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-950/30"
                >
                  <GraduationCap className="h-3.5 w-3.5" /> Giao diện Học sinh
                </button>
                {isMaintenance && (
                  <div className="absolute inset-0 z-10 rounded-xl bg-brand-100/75 dark:bg-brand-950/65 backdrop-blur-[2px] border border-brand-300/80 dark:border-brand-700/60 flex items-center justify-between px-3 select-none pointer-events-none shadow-xs">
                    <div className="flex items-center gap-2 text-brand-800/80 dark:text-brand-300/80 text-xs font-semibold min-w-0">
                      <GraduationCap className="h-3.5 w-3.5 shrink-0 text-brand-600 dark:text-brand-400" />
                      <span className="truncate">Giao diện Học sinh</span>
                    </div>
                    <span className="flex items-center gap-1 text-[10px] font-extrabold uppercase text-brand-800 dark:text-brand-300 bg-brand-200/80 dark:bg-brand-900/70 border border-brand-400/60 dark:border-brand-600/60 px-2 py-0.5 rounded-md shrink-0 shadow-xs">
                      <Wrench className="h-2.5 w-2.5 animate-spin" />
                      Bảo trì
                    </span>
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"
            >
              <LogOut className="h-3.5 w-3.5" /> Đăng xuất
            </button>
          </div>
        )}

        {/* Dynamic Tab Body - Rộng toàn màn hình (Full Width Edge-to-Edge) theo yêu cầu người dùng */}
        <div className="flex-1 p-4 sm:p-5 lg:p-6 overflow-y-auto w-full flex flex-col">
          {activeTab === 'live_monitor' && <LiveMonitor />}
          {activeTab === 'users' && <UserManager />}
          {activeTab === 'audit' && <AuditLogViewer />}
          {activeTab === 'settings' && <SystemSettings />}
        </div>
      </main>
    </div>
  );
}

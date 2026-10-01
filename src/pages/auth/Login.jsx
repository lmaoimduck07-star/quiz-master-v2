import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap, ShieldCheck, Sparkles, Shield, BookOpen,
  ArrowRight, LogOut, CheckCircle2, UserCheck, Wrench
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useMaintenance } from '@/context/MaintenanceContext';
import { Button } from '@/components/common/Button';

export default function Login() {
  const navigate = useNavigate();
  const {
    loginWithGoogle,
    currentUser,
    userProfile,
    setActiveRole,
    availableRoles = ['Student'],
    isAdmin,
    isLecturer,
    authError,
    setAuthError,
    logout
  } = useAuth();
  const { isMaintenance } = useMaintenance() || {};

  const [loading, setLoading] = useState(false);

  // Danh sách vai trò khả dụng cho tài khoản
  const userRoles = availableRoles.length > 0
    ? availableRoles
    : (isAdmin ? ['Admin', 'Lecturer', 'Student'] : isLecturer ? ['Lecturer', 'Student'] : ['Student']);

  // Tự động chuyển hướng chỉ khi không trong chế độ bảo trì hoặc nếu là Admin trong chế độ bảo trì
  useEffect(() => {
    if (currentUser && userProfile) {
      if (isMaintenance) {
        if (isAdmin) {
          setActiveRole('Admin');
          navigate('/admin/dashboard', { replace: true });
        }
        return;
      }

      if (userRoles.length === 1 && userRoles[0] === 'Student') {
        setActiveRole('Student');
        navigate('/client/dashboard', { replace: true });
      }
    }
  }, [currentUser, userProfile, userRoles, isMaintenance, isAdmin, setActiveRole, navigate]);

  const handleLogin = async () => {
    setLoading(true);
    setAuthError?.(null);
    try {
      const loginPromise = loginWithGoogle();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Quá thời gian kết nối Google. Vui lòng thử lại.')), 15000)
      );

      const result = await Promise.race([loginPromise, timeoutPromise]);
      if (!result) return;

      const roles = result.availableRoles || ['Student'];

      // Khi bảo trì: Nếu là Admin, chuyển thẳng vào Admin Dashboard
      if (isMaintenance) {
        if (roles.includes('Admin')) {
          setActiveRole('Admin');
          navigate('/admin/dashboard', { replace: true });
          return;
        }
      }

      if (roles.length === 1 && roles[0] === 'Student') {
        setActiveRole('Student');
        navigate('/client/dashboard', { replace: true });
      }
      // Nếu có nhiều hơn 1 role (Admin hoặc Lecturer), giao diện sẽ hiển thị các thẻ chọn role ngay lập tức
    } catch (err) {
      console.error('[Login] error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRole = (targetRole) => {
    setActiveRole(targetRole);
    if (targetRole === 'Admin') {
      navigate('/admin/dashboard', { replace: true });
    } else if (targetRole === 'Lecturer') {
      navigate('/lecturer/dashboard', { replace: true });
    } else {
      navigate('/client/dashboard', { replace: true });
    }
  };

  const roleConfigs = {
    Admin: {
      title: 'Quản Trị Viên (Admin)',
      badge: 'Toàn quyền hệ thống',
      desc: 'Giám sát LiveMonitor thời gian thực, quản lý tài khoản, cấu hình & bảo trì hệ thống',
      icon: Shield,
      cardClass: 'bg-purple-950/40 border-purple-500/40 hover:border-purple-400 hover:bg-purple-900/40 text-purple-300',
      iconClass: 'bg-purple-600 text-white',
      badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    },
    Lecturer: {
      title: 'Giảng Viên (Lecturer)',
      badge: 'Quản lý môn & đề thi',
      desc: 'Tạo môn học, ngân hàng câu hỏi AI, quản lý đề thi trắc nghiệm và theo dõi bảng điểm',
      icon: BookOpen,
      cardClass: 'bg-amber-950/40 border-amber-500/40 hover:border-amber-400 hover:bg-amber-900/40 text-amber-300',
      iconClass: 'bg-amber-600 text-white',
      badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    },
    Student: {
      title: 'Thí Sinh / Học Sinh (Student)',
      badge: 'Luyện tập & Thi',
      desc: 'Tham gia luyện tập trắc nghiệm, làm bài thi mô phỏng và xem lại lịch sử làm bài',
      icon: GraduationCap,
      cardClass: 'bg-blue-950/40 border-blue-500/40 hover:border-blue-400 hover:bg-blue-900/40 text-blue-300',
      iconClass: 'bg-brand-600 text-white',
      badgeClass: 'bg-brand-500/20 text-brand-300 border-brand-500/30',
    },
  };

  const isLoggedInWithMultiRole = currentUser && userRoles.length > 1;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 text-white relative overflow-hidden font-sans">
      {/* Glow shapes */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-brand-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-lg w-full bg-slate-900/90 backdrop-blur-2xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative z-10">
        {/* Logo & Brand */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-violet-500 flex items-center justify-center mx-auto shadow-lg shadow-brand-500/30">
            <GraduationCap className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center justify-center gap-1.5">
              Quiz Master <span className="text-brand-400">v2</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Nền tảng thi trắc nghiệm & luyện tập trực tuyến thông minh
            </p>
          </div>
        </div>

        {/* Feature Highlights (Chỉ hiển thị khi chưa đăng nhập) */}
        {!isLoggedInWithMultiRole && (
          <div className="space-y-2">
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-800/50 border border-slate-800 text-xs">
              <Sparkles className="h-4 w-4 text-amber-400 shrink-0" />
              <span className="text-slate-300">Nhận diện đề thi tự động bằng Gemini Vision AI</span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-800/50 border border-slate-800 text-xs">
              <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
              <span className="text-slate-300">Giám sát phòng thi thời gian thực chống gian lận</span>
            </div>
          </div>
        )}

        {/* Maintenance mode notice (Hiển thị khi tài khoản đã đăng nhập multi-role để thông báo các vai trò bị khóa) */}
        {isMaintenance && isLoggedInWithMultiRole && (
          <div className="p-3.5 bg-amber-950/70 border border-amber-500/50 rounded-2xl text-xs text-amber-200 flex items-start gap-3 shadow-lg shadow-amber-950/40">
            <Wrench className="h-5 w-5 text-amber-400 shrink-0 mt-0.5 animate-spin" />
            <div>
              <div className="font-bold text-amber-300 text-sm">Hệ thống đang bảo trì</div>
              <div className="text-[11px] text-amber-200/90 mt-1 leading-relaxed">
                Hệ thống đang trong thời gian bảo trì kỹ thuật. Các vai trò Giảng viên và Thí sinh tạm thời bị khóa. Bạn chỉ có thể truy cập bằng vai trò Quản trị viên (Admin).
              </div>
            </div>
          </div>
        )}

        {/* Error message if any */}
        {authError && (
          <div className="p-3.5 bg-red-950/60 border border-red-800 rounded-2xl text-xs text-red-300 font-semibold text-center">
            {authError}
          </div>
        )}

        {/* NẾU ĐÃ ĐĂNG NHẬP VÀ CÓ NHIỀU VAI TRÒ (MULTI-ROLE) */}
        {isLoggedInWithMultiRole ? (
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                  {currentUser?.displayName?.[0]?.toUpperCase() || currentUser?.email?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="truncate">
                  <div className="text-sm font-bold text-white truncate">
                    {currentUser?.displayName || currentUser?.email?.split('@')[0]}
                  </div>
                  <div className="text-xs text-emerald-400 flex items-center gap-1 font-semibold">
                    <UserCheck className="h-3.5 w-3.5 inline" />
                    Đa vai trò: {userRoles.join(' • ')}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={async () => {
                  await logout();
                }}
                title="Đăng xuất / Đổi tài khoản khác"
                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-xl transition-all"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 text-center">
                Chọn vai trò truy cập phiên này:
              </div>
              <p className="text-[11px] text-slate-400 text-center leading-relaxed">
                Bạn có thể chuyển đổi linh hoạt giữa các giao diện bất kỳ lúc nào
              </p>
            </div>

            <div className="space-y-3 pt-1">
              {userRoles.map((roleKey) => {
                const cfg = roleConfigs[roleKey] || roleConfigs.Student;
                const Icon = cfg.icon;

                const isLockedByMaintenance = isMaintenance && roleKey !== 'Admin';

                return (
                  <button
                    key={roleKey}
                    type="button"
                    disabled={isLockedByMaintenance}
                    onClick={() => !isLockedByMaintenance && handleSelectRole(roleKey)}
                    className={`w-full p-4 rounded-2xl border text-left transition-all flex items-start gap-3.5 group ${
                      isLockedByMaintenance
                        ? 'opacity-40 cursor-not-allowed bg-slate-900 border-slate-800'
                        : `cursor-pointer active:scale-[0.99] ${cfg.cardClass}`
                    }`}
                  >
                    <div className={`p-2.5 rounded-xl shrink-0 ${isLockedByMaintenance ? 'bg-slate-800 text-slate-500' : cfg.iconClass} shadow-md`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-bold text-sm text-white">
                          {cfg.title}
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                          isLockedByMaintenance
                            ? 'bg-rose-950/60 text-rose-400 border-rose-800'
                            : cfg.badgeClass
                        }`}>
                          {isLockedByMaintenance ? 'Khóa do bảo trì' : cfg.badge}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300/80 mt-1 leading-relaxed">
                        {isLockedByMaintenance ? 'Chức năng này tạm ngưng trong thời gian bảo trì hệ thống.' : cfg.desc}
                      </p>
                      {!isLockedByMaintenance && (
                        <div className="mt-2.5 flex items-center gap-1 text-[11px] font-bold text-white group-hover:translate-x-1 transition-transform">
                          <span>Truy cập giao diện</span>
                          <ArrowRight className="h-3 w-3" />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="pt-2 text-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  await logout();
                }}
                className="text-xs text-slate-400 hover:text-rose-400"
              >
                Đăng xuất hoặc đổi tài khoản khác
              </Button>
            </div>
          </div>
        ) : (
          /* NẾU CHƯA ĐĂNG NHẬP: Nút Google Login hoặc Overlay Thông Báo Bảo Trì */
          <div className="space-y-4 pt-1">
            {isMaintenance ? (
              /* GIAO DIỆN OVERLAY BẢO TRÌ PHỦ LÊN NÚT GOOGLE LOGIN */
              <div className="relative rounded-2xl overflow-hidden border border-amber-500/50 bg-slate-950/90 backdrop-blur-xl p-4 sm:p-5 shadow-2xl shadow-amber-950/50 space-y-3.5">
                {/* Nền nút Google login gốc bị làm mờ phía sau để tạo hiệu ứng overlay chân thực */}
                <div className="absolute inset-0 flex items-center justify-center opacity-10 blur-[2px] pointer-events-none select-none">
                  <div className="w-11/12 h-12 bg-white rounded-2xl flex items-center justify-center gap-3">
                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                    </svg>
                    <span className="font-bold text-slate-900">Tiếp tục với Google</span>
                  </div>
                </div>

                {/* Header Overlay: Trạng thái bảo trì */}
                <div className="relative z-10 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                      <Wrench className="h-4 w-4 animate-spin" />
                    </div>
                    <div>
                      <div className="text-xs font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                        Hệ Thống Đang Bảo Trì
                      </div>
                      <div className="text-[10px] text-amber-400/80 font-mono">HTTP 503 • Server Lock</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                    TẠM KHÓA
                  </span>
                </div>

                {/* Nội dung thông báo bảo trì */}
                <div className="relative z-10 text-xs text-slate-300 leading-relaxed bg-amber-950/40 p-3 rounded-xl border border-amber-500/20">
                  Tạm ngừng đăng nhập đối với <span className="text-white font-bold">Thí sinh</span> &amp; <span className="text-white font-bold">Giảng viên</span> để bảo toàn dữ liệu. Chỉ tài khoản <span className="text-amber-300 font-bold">Quản trị viên (Admin)</span> mới có quyền truy cập.
                </div>

                {/* Nút Đăng Nhập Dành Riêng Cho Quản Trị Viên (Admin OAuth) */}
                <div className="relative z-10 pt-1">
                  <button
                    type="button"
                    onClick={handleLogin}
                    disabled={loading}
                    className="w-full h-12 bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm rounded-2xl shadow-lg transition-all duration-200 flex items-center justify-center gap-3 active:scale-[0.98] cursor-pointer disabled:opacity-60 group"
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                    </svg>
                    <span>{loading ? 'Đang kết nối Google...' : 'Đăng nhập Quản trị viên (Admin OAuth)'}</span>
                    <Shield className="h-4 w-4 text-purple-600 ml-0.5 group-hover:scale-110 transition-transform" />
                  </button>
                </div>

                {/* Footer Overlay: Chuyển sang xem trang bảo trì chi tiết */}
                <div className="relative z-10 pt-1 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/80">
                  <span>Cần hỗ trợ kỹ thuật?</span>
                  <button
                    type="button"
                    onClick={() => navigate('/maintenance')}
                    className="text-amber-400 hover:text-amber-300 hover:underline flex items-center gap-1 font-medium cursor-pointer"
                  >
                    <span>Xem chi tiết trang bảo trì</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ) : (
              /* GIAO DIỆN BÌNH THƯỜNG KHI HỆ THỐNG KHÔNG BẢO TRÌ */
              <>
                <button
                  type="button"
                  onClick={handleLogin}
                  disabled={loading}
                  className="w-full h-12 bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm rounded-2xl shadow-lg transition-all duration-200 flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  <span>{loading ? 'Đang kết nối Google...' : 'Tiếp tục với Google'}</span>
                </button>

                <p className="text-[11px] text-slate-500 text-center">
                  Sử dụng email cá nhân hoặc tài khoản trường học để đăng nhập
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

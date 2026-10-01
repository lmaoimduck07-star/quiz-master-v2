import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wrench,
  Clock,
  ShieldCheck,
  RefreshCw,
  LogIn,
  CheckCircle2,
  Sparkles,
  Server,
  Database,
  Activity,
  Cpu,
  Zap,
  ArrowRight,
  ShieldAlert,
  Radio,
  Timer,
  Check,
  AlertTriangle
} from 'lucide-react';
import { useMaintenance } from '@/context/MaintenanceContext';
import { useAuth } from '@/context/AuthContext';
import confetti from 'canvas-confetti';

export default function SystemMaintenance() {
  const navigate = useNavigate();
  const { isMaintenance, loading: maintenanceLoading, maintenanceData, refreshMaintenance } = useMaintenance();
  const { currentUser, isAdmin, logout } = useAuth() || {};

  const [checking, setChecking] = useState(false);
  const [justUnblocked, setJustUnblocked] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [countdown, setCountdown] = useState(25);
  const [pingLatency, setPingLatency] = useState(null);
  const [lastCheckedTime, setLastCheckedTime] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const wasMaintenanceRef = useRef(false);

  // 1. Đảm bảo các tài khoản Học sinh / Giảng viên bị đăng xuất an toàn khi ở trang bảo trì (Admin TUYỆT ĐỐI không bị logout)
  useEffect(() => {
    const isCachedAdmin = typeof window !== 'undefined' && localStorage.getItem('qm_is_admin') === 'true';
    if (isMaintenance && currentUser && !isAdmin && !isCachedAdmin) {
      logout?.('Tự động đăng xuất do hệ thống đang trong chế độ bảo trì');
    }
  }, [isMaintenance, currentUser, isAdmin, logout]);

  // 2. Quản lý trạng thái mở cửa và tự động chuyển hướng về trang login/admin
  useEffect(() => {
    // Nếu đang tải dữ liệu trạng thái từ máy chủ, không xử lý vội
    if (maintenanceLoading) return;

    if (isMaintenance) {
      // Hệ thống ĐANG BẢO TRÌ: Ghi nhớ và tuyệt đối không hiển thị thông báo đã mở
      wasMaintenanceRef.current = true;
      setJustUnblocked(false);
      return;
    }

    // Đến đây nghĩa là !isMaintenance (Hệ thống ĐÃ MỞ CỬA):
    const targetPath = isAdmin ? '/admin/dashboard' : '/login';

    if (wasMaintenanceRef.current) {
      // Trường hợp 1: Chuyển từ trạng thái đang bảo trì sang mở cửa
      setJustUnblocked(true);
      try {
        confetti({
          particleCount: 90,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#10b981', '#6366f1', '#f59e0b', '#3b82f6']
        });
      } catch (_) {}

      const timer = setTimeout(() => {
        navigate(targetPath, { replace: true });
      }, 1500);

      return () => clearTimeout(timer);
    } else {
      // Trường hợp 2: Hệ thống vốn dĩ không bảo trì mà người dùng truy cập /maintenance -> chuyển hướng ngay lập tức
      navigate(targetPath, { replace: true });
    }
  }, [isMaintenance, maintenanceLoading, isAdmin, navigate]);

  // 3. Đếm thời gian bảo trì đã trôi qua (live elapsed timer)
  useEffect(() => {
    const startedAt = maintenanceData?.startedAt;
    const startMs = startedAt ? new Date(startedAt).getTime() : Date.now();

    const updateTimer = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((now - startMs) / 1000));
      setElapsedSeconds(diff);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [maintenanceData?.startedAt]);

  // 4. Đồng hồ đếm ngược tự động kiểm tra trạng thái mỗi 25s
  useEffect(() => {
    if (!isMaintenance) return;
    const cdInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          handleAutoCheck();
          return 25;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(cdInterval);
  }, [isMaintenance]);

  const handleAutoCheck = async () => {
    const t0 = performance.now();
    try {
      const data = await refreshMaintenance();
      const t1 = performance.now();
      setPingLatency(Math.round(t1 - t0));
      setLastCheckedTime(new Date().toLocaleTimeString('vi-VN'));

      // Kiểm tra chính xác trạng thái từ server
      const isMaint = data ? (data.enabled !== undefined ? !!data.enabled : !!data.isMaintenance) : isMaintenance;
      if (!isMaint) {
        wasMaintenanceRef.current = true;
        setJustUnblocked(true);
        setTimeout(() => {
          navigate(isAdmin ? '/admin/dashboard' : '/login', { replace: true });
        }, 1200);
      }
    } catch (_) {}
  };

  const handleManualCheck = async () => {
    if (checking) return;
    setChecking(true);
    setStatusMessage('');
    const t0 = performance.now();

    try {
      const data = await refreshMaintenance();
      const t1 = performance.now();
      setPingLatency(Math.max(12, Math.round(t1 - t0)));
      setLastCheckedTime(new Date().toLocaleTimeString('vi-VN'));
      setCountdown(25);

      // Kiểm tra chính xác trạng thái từ server
      const isMaint = data ? (data.enabled !== undefined ? !!data.enabled : !!data.isMaintenance) : isMaintenance;

      if (!isMaint) {
        // Hệ thống đã thực sự mở cửa lại
        wasMaintenanceRef.current = true;
        setJustUnblocked(true);
        try {
          confetti({
            particleCount: 90,
            spread: 80,
            origin: { y: 0.6 },
            colors: ['#10b981', '#6366f1', '#f59e0b', '#3b82f6']
          });
        } catch (_) {}
        setTimeout(() => {
          navigate(isAdmin ? '/admin/dashboard' : '/login', { replace: true });
        }, 1200);
      } else {
        // Hệ thống vẫn đang trong chế độ bảo trì
        setJustUnblocked(false);
        setStatusMessage('Máy chủ phản hồi tốt — Hệ thống hiện vẫn đang trong chế độ bảo trì.');
      }
    } catch (err) {
      setStatusMessage('Không thể kết nối đến máy chủ. Đang thử lại...');
    } finally {
      setTimeout(() => setChecking(false), 500);
    }
  };

  // Định dạng thời gian
  const formatElapsed = (sec) => {
    const hours = Math.floor(sec / 3600);
    const minutes = Math.floor((sec % 3600) / 60);
    const seconds = sec % 60;
    if (hours > 0) {
      return `${hours}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
    }
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const defaultMessage =
    'Hệ thống Quiz Master đang trong quá trình bảo trì định kỳ nhằm nâng cấp máy chủ, tối ưu hiệu năng cơ sở dữ liệu và bảo đảm an toàn dữ liệu khảo thí.';

  const displayMessage = maintenanceData?.message?.trim() || defaultMessage;
  const expectedTime = maintenanceData?.expectedEndTime?.trim() || 'Dự kiến hoàn thành trong ít phút';
  const startTime = maintenanceData?.startedAt
    ? new Date(maintenanceData.startedAt).toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })
    : 'Vừa kích hoạt';

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col items-center justify-between p-4 sm:p-6 md:p-10 relative overflow-hidden select-none font-sans">
      {/* ── Background Cyber Ambient Gradients ──────────────────────────────── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Glow orb 1 - Amber/Orange warm accent */}
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[720px] h-[480px] bg-gradient-to-b from-amber-500/15 via-orange-600/10 to-transparent rounded-full blur-[140px] animate-pulse duration-1000" />
        
        {/* Glow orb 2 - Deep Indigo/Brand accent */}
        <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[150px] animate-pulse delay-700" />
        
        {/* Glow orb 3 - Cyan subtle accent */}
        <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] bg-sky-500/10 rounded-full blur-[130px]" />

        {/* Technical grid mask */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b18_1px,transparent_1px),linear-gradient(to_bottom,#1e293b18_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_45%,#000_70%,transparent_100%)] opacity-80" />
      </div>

      {/* ── Top Header / Brand Bar ─────────────────────────────────────────── */}
      <header className="relative z-10 w-full max-w-4xl mx-auto flex items-center justify-between py-2 px-1">
        {/* Logo and Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-600 via-indigo-600 to-amber-500 p-0.5 shadow-lg shadow-brand-500/20 flex items-center justify-center">
            <div className="w-full h-full bg-slate-950/90 rounded-[14px] flex items-center justify-center">
              <Server className="h-5 w-5 text-amber-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-base tracking-tight text-white">Quiz Master</span>
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/30">
                v2.0
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">Hệ Thống Khảo Thí & Đánh Giá Trực Tuyến</p>
          </div>
        </div>

        {/* Live Status Pill */}
        <div className="hidden sm:flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 shadow-inner backdrop-blur-md">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
          </span>
          <span className="text-[11px] font-bold text-amber-300 tracking-wide uppercase">
            Bảo trì hệ thống
          </span>
          <span className="text-slate-600">•</span>
          <span className="text-[11px] font-mono text-slate-400">HTTP 503</span>
        </div>
      </header>

      {/* ── Main Container ─────────────────────────────────────────────────── */}
      <main className="relative z-10 w-full max-w-3xl mx-auto my-auto py-6">
        {/* Unblocked Success Alert Banner - Chỉ hiển thị khi hệ thống THỰC SỰ đã tắt bảo trì */}
        {justUnblocked && !isMaintenance && (
          <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-emerald-950/90 to-slate-900/90 border border-emerald-500/50 text-emerald-300 flex items-center justify-center gap-3 animate-slide-up shadow-2xl shadow-emerald-950/60 backdrop-blur-xl">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div className="text-left">
              <div className="font-black text-sm sm:text-base text-white">Hệ Thống Đã Mở Cửa Trở Lại!</div>
              <div className="text-xs text-emerald-300/90">
                Quá trình bảo trì đã hoàn tất xuất sắc. Đang tự động chuyển hướng bạn...
              </div>
            </div>
          </div>
        )}

        {/* Main Card */}
        <div className="relative bg-slate-900/70 backdrop-blur-2xl border border-slate-800/90 rounded-3xl p-6 sm:p-10 shadow-2xl shadow-black/80 text-center overflow-hidden">
          {/* Subtle inner highlight top border */}
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />

          {/* Central High-Tech Animated Core */}
          <div className="relative w-32 h-32 mx-auto mb-7 flex items-center justify-center">
            {/* Outer dotted orbital ring - rotates clockwise */}
            <div className="absolute inset-0 rounded-full border border-dashed border-amber-500/25 animate-[spin_25s_linear_infinite]" />
            
            {/* Middle decorative ring - rotates counter-clockwise */}
            <div className="absolute inset-2 rounded-full border border-slate-800 animate-[spin_18s_linear_infinite_reverse]" />
            <div className="absolute inset-2 rounded-full border-t border-r border-amber-400/40 animate-[spin_12s_linear_infinite]" />

            {/* Glowing neon blur aura */}
            <div className="absolute inset-4 rounded-2xl bg-gradient-to-tr from-amber-500/25 via-orange-500/20 to-indigo-500/20 blur-xl animate-pulse" />

            {/* Center glass container */}
            <div className="relative w-20 h-20 rounded-2xl bg-slate-950/90 border border-amber-500/40 flex items-center justify-center shadow-2xl shadow-black/80 backdrop-blur-xl">
              <Wrench className="h-9 w-9 text-amber-400 animate-[spin_12s_linear_infinite]" />
              
              {/* Corner status pulse dot */}
              <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-500 border-2 border-slate-950 shadow-md shadow-amber-500/50">
                <div className="w-full h-full rounded-full bg-amber-400 animate-ping opacity-75" />
              </div>
            </div>
          </div>

          {/* Headline & Title */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] font-black tracking-widest uppercase mb-4 shadow-sm">
            <Radio className="h-3.5 w-3.5 animate-pulse" />
            ĐANG BẢO TRÌ & NÂNG CẤP MÁY CHỦ
          </div>

          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white mb-3">
            Hệ Thống Đang Tạm Dừng Phục Vụ
          </h1>

          {/* Custom Message Container with terminal-style design */}
          <div className="mb-7 p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 text-left relative overflow-hidden">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 shrink-0 mt-0.5">
                <AlertTriangle className="h-4.5 w-4.5" />
              </div>
              <div className="flex-1">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>Thông Báo Từ Quản Trị Viên</span>
                  <span className="text-[10px] text-slate-500 lowercase font-mono">system.status/broadcast</span>
                </div>
                <p className="text-slate-200 text-xs sm:text-sm leading-relaxed font-medium">
                  {displayMessage}
                </p>
              </div>
            </div>
          </div>

          {/* Live Operational Grid (4 status cards) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-7 text-left">
            {/* Card 1: Thời gian kích hoạt & Đã trôi qua */}
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <Clock className="h-4 w-4 text-slate-400" />
                  <span>Thời Gian Bắt Đầu</span>
                </div>
                <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                  {formatElapsed(elapsedSeconds)}
                </span>
              </div>
              <div className="text-sm font-bold text-slate-200 truncate">
                {startTime}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 font-medium">
                Thời gian máy chủ bắt đầu ngắt kết nối thí sinh
              </div>
            </div>

            {/* Card 2: Dự kiến hoàn tất */}
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 hover:border-amber-500/30 transition">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
                  <Sparkles className="h-4 w-4 text-amber-400" />
                  <span>Dự Kiến Mở Cửa</span>
                </div>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Đúng tiến độ
                </span>
              </div>
              <div className="text-sm font-black text-amber-300 truncate">
                {expectedTime}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 font-medium">
                Tự động chuyển hướng khi hoàn tất
              </div>
            </div>

            {/* Card 3: An toàn dữ liệu */}
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition sm:col-span-2">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0 mt-0.5">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                      Dữ Liệu Khảo Thí Được Bảo Lưu Toàn Vẹn
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 font-mono">100% Encrypted</span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    Tất cả kết quả, bài thi đang làm dở và ngân hàng câu hỏi đều đã được sao lưu an toàn trên máy chủ đám mây. Bạn không cần lo lắng về việc mất mát dữ liệu.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Sub-services status breakdown */}
          <div className="mb-7 p-3.5 rounded-2xl bg-slate-950/40 border border-slate-800/60 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div className="p-2 rounded-xl bg-slate-900/50 border border-slate-800/50">
                <div className="text-[10px] text-slate-400 font-bold">Xác Thực (Auth)</div>
                <div className="text-xs font-semibold text-amber-400 mt-0.5 flex items-center justify-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Admin Only
                </div>
              </div>

              <div className="p-2 rounded-xl bg-slate-900/50 border border-slate-800/50">
                <div className="text-[10px] text-slate-400 font-bold">Database V2</div>
                <div className="text-xs font-semibold text-sky-400 mt-0.5 flex items-center justify-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" /> Tối ưu hóa
                </div>
              </div>

              <div className="p-2 rounded-xl bg-slate-900/50 border border-slate-800/50">
                <div className="text-[10px] text-slate-400 font-bold">Realtime Monitor</div>
                <div className="text-xs font-semibold text-slate-400 mt-0.5 flex items-center justify-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> Tạm dừng
                </div>
              </div>

              <div className="p-2 rounded-xl bg-slate-900/50 border border-slate-800/50">
                <div className="text-[10px] text-slate-400 font-bold">Trí Tuệ AI Gemini</div>
                <div className="text-xs font-semibold text-emerald-400 mt-0.5 flex items-center justify-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Sẵn sàng
                </div>
              </div>
            </div>
          </div>

          {/* Feedback & Ping Banner */}
          {statusMessage && (
            <div className="mb-5 p-3 rounded-xl bg-slate-800/60 border border-slate-700 text-xs text-slate-300 animate-fade-in flex items-center justify-center gap-2">
              <Check className="h-4 w-4 text-emerald-400" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            {/* Manual Check Button */}
            <button
              onClick={handleManualCheck}
              disabled={checking}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm border border-slate-700/80 transition-all duration-150 flex items-center justify-center gap-2 shadow-md hover:shadow-lg disabled:opacity-60 cursor-pointer active:scale-95"
            >
              <RefreshCw
                className={`h-4 w-4 text-amber-400 transition-transform ${checking ? 'animate-spin' : ''}`}
              />
              <span>{checking ? 'Đang kiểm tra kết nối...' : 'Kiểm tra trạng thái'}</span>
              <span className="text-[10px] font-mono text-slate-400 ml-1 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                {countdown}s
              </span>
            </button>

            {/* Admin Bypass or Login Button */}
            {currentUser && isAdmin ? (
              <button
                onClick={() => navigate('/admin/dashboard')}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-brand-600 via-indigo-600 to-indigo-700 hover:from-brand-500 hover:to-indigo-600 text-white font-bold text-sm shadow-xl shadow-brand-500/25 transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <LogIn className="h-4 w-4" />
                <span>Bảng Điều Khiển Quản Trị</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={() => navigate('/login')}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-950 hover:bg-slate-900 text-slate-300 hover:text-white font-bold text-sm border border-slate-800 hover:border-slate-700 transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <LogIn className="h-4 w-4 text-slate-400" />
                <span>Đăng nhập Quản trị viên</span>
              </button>
            )}
          </div>

          {/* Footer info inside card */}
          <div className="mt-8 pt-5 border-t border-slate-800/80 text-[11px] text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500/80" />
              <span>Máy chủ: SG-CORE-NODE-01</span>
              {pingLatency && (
                <span className="text-slate-400 font-mono">({pingLatency}ms)</span>
              )}
            </div>
            {lastCheckedTime && (
              <div className="text-slate-500">
                Kiểm tra gần nhất: <span className="text-slate-400 font-mono">{lastCheckedTime}</span>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ── Page Footer ────────────────────────────────────────────────────── */}
      <footer className="relative z-10 w-full max-w-4xl mx-auto py-3 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-slate-900/60">
        <div>
          © {new Date().getFullYear()} <span className="font-bold text-slate-400">Quiz Master V2</span>. Bản quyền hệ thống khảo thí trực tuyến.
        </div>
        <div className="flex items-center gap-3">
          <span className="hover:text-slate-400 transition cursor-pointer">Trung tâm hỗ trợ</span>
          <span>•</span>
          <span className="hover:text-slate-400 transition cursor-pointer">Báo cáo sự cố kỹ thuật</span>
        </div>
      </footer>
    </div>
  );
}

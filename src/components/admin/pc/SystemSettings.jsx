import React, { useState, useEffect } from 'react';
import {
  Settings, Key, Database, Wrench, Shield, CheckCircle,
  AlertTriangle, Eye, EyeOff, Save, RefreshCw, Sparkles
} from 'lucide-react';
import { Button } from '../../common/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../common/Card';
import { Badge } from '../../common/Badge';
import { useMaintenance } from '../../../context/MaintenanceContext';
import { saveGeminiApiKey, hasGeminiApiKey } from '../../../utils/gemini';
import { runDatabaseCleanup } from '../../../services/db/cleanupService';
import { addAuditLog } from '../../../services/db/auditService';

export function SystemSettings() {
  const { isMaintenance, message, setSystemMaintenance } = useMaintenance() || {};

  // Gemini API Key state
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [keySaved, setKeySaved] = useState(false);
  const [testingKey, setTestingKey] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // Maintenance state
  const [maintMode, setMaintMode] = useState(isMaintenance || false);
  const [maintMsg, setMaintMsg] = useState(message || '');
  const [savingMaint, setSavingMaint] = useState(false);

  // Cleanup state
  const [cleaning, setCleaning] = useState(false);
  const [cleanReport, setCleanReport] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem('qm_gemini_api_key') || '';
    setApiKey(saved);
  }, []);

  useEffect(() => {
    setMaintMode(isMaintenance || false);
    if (message) setMaintMsg(message);
  }, [isMaintenance, message]);

  const handleSaveApiKey = () => {
    saveGeminiApiKey(apiKey);
    setKeySaved(true);
    setTimeout(() => setKeySaved(false), 3000);
    setTestResult(null);
  };

  const handleTestApiKey = async () => {
    if (!apiKey.trim()) return;
    setTestingKey(true);
    const candidateModels = [
      'gemini-3.5-flash-lite',
      'gemini-3.5-flash',
      'gemini-3.6-flash',
      'gemini-3.7-flash',
      'gemini-3.8-flash',
      'gemini-2.5-flash',
    ];
    setTestResult(null);
    try {
      let success = false;
      let lastMessage = '';

      for (const model of candidateModels) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`;
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: 'Ping' }] }] })
          });
          if (res.ok) {
            setTestResult({ success: true, message: `Kết nối thành công! Gemini API Key hoạt động bình thường (${model}).` });
            success = true;
            break;
          } else {
            const data = await res.json().catch(() => ({}));
            lastMessage = data.error?.message || `Lỗi HTTP ${res.status}`;
          }
        } catch (err) {
          lastMessage = err.message || 'Không thể kết nối đến máy chủ Google Gemini';
        }
      }

      if (!success) {
        setTestResult({ success: false, message: lastMessage });
      }
    } finally {
      setTestingKey(false);
    }
  };

  const handleToggleMaintenance = async () => {
    setSavingMaint(true);
    try {
      const next = !maintMode;
      await setSystemMaintenance(next, maintMsg);
      setMaintMode(next);
      addAuditLog({
        category: 'System',
        action: `${next ? 'Kích hoạt' : 'Tắt'} chế độ bảo trì toàn hệ thống`,
        severity: 'Warning'
      });
    } finally {
      setSavingMaint(false);
    }
  };

  const handleRunCleanup = async () => {
    setCleaning(true);
    try {
      const report = await runDatabaseCleanup();
      setCleanReport(report);
      addAuditLog({
        category: 'System',
        action: 'Thực hiện dọn dẹp Database thủ công',
        severity: 'Info'
      });
    } finally {
      setCleaning(false);
    }
  };

  return (
    <div className="space-y-6 w-full pb-10">
      {/* Header bar - To rõ, thoáng đãng */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 px-6 py-4 rounded-2xl shadow-sm w-full">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 shrink-0">
            <Settings className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
              Cài Đặt & Cấu Hình Hệ Thống
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Quản lý Gemini AI API Key, chế độ bảo trì và bảo dưỡng dữ liệu Firestore
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2">
          {maintMode ? (
            <Badge variant="danger" className="text-xs font-semibold px-3 py-1 animate-pulse">
              Đang bảo trì
            </Badge>
          ) : (
            <Badge variant="success" className="text-xs font-semibold px-3 py-1">
              Hệ thống hoạt động
            </Badge>
          )}
        </div>
      </div>

      {/* Box 1: Gemini API Key - Thoáng đãng, không dính vạch */}
      <Card className="border border-slate-200/90 dark:border-slate-800/90 shadow-sm w-full">
        <CardHeader className="px-6 py-4.5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400">
                <Key className="h-4.5 w-4.5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                  Cấu Hình Google Gemini AI Key
                </CardTitle>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Phục vụ tính năng Import đề thi tự động bằng AI và Nhận diện câu hỏi từ hình ảnh
                </p>
              </div>
            </div>
            {hasGeminiApiKey() ? (
              <Badge variant="success" className="text-xs px-3 py-1 font-semibold">
                ✓ Đã có Key
              </Badge>
            ) : (
              <Badge variant="warning" className="text-xs px-3 py-1 font-semibold">
                Chưa có Key
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="px-6 py-6 space-y-4">
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            API Key được lưu an toàn trực tiếp trên trình duyệt này (LocalStorage), không chia sẻ với bên thứ ba và không gửi lên máy chủ trung gian.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            <div className="relative flex-1">
              <input
                type={showKey ? 'text' : 'password'}
                placeholder="Dán mã API Key của bạn vào đây (ví dụ: AIzaSy...)"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full h-11 px-4 pr-11 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-500 text-slate-900 dark:text-white font-mono"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <div className="flex gap-2.5 shrink-0">
              <Button
                variant="primary"
                size="md"
                onClick={handleSaveApiKey}
                icon={Save}
                className="h-11 px-6 text-xs font-bold rounded-xl shadow-sm"
              >
                {keySaved ? 'Đã lưu!' : 'Lưu Key'}
              </Button>

              <Button
                variant="outline"
                size="md"
                onClick={handleTestApiKey}
                loading={testingKey}
                disabled={!apiKey.trim()}
                className="h-11 px-5 text-xs font-semibold rounded-xl"
              >
                Kiểm tra kết nối
              </Button>
            </div>
          </div>

          {testResult && (
            <div
              className={`p-3.5 rounded-xl border text-xs font-medium flex items-center gap-2.5 ${
                testResult.success
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-300'
                  : 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:border-red-900 dark:text-red-300'
              }`}
            >
              {testResult.success ? <CheckCircle className="h-4 w-4 shrink-0" /> : <AlertTriangle className="h-4 w-4 shrink-0" />}
              <span>{testResult.message}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Box 2: Maintenance Mode - Thoáng đãng, không dính vạch */}
      <Card className="border border-slate-200/90 dark:border-slate-800/90 shadow-sm w-full">
        <CardHeader className="px-6 py-4.5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                <Wrench className="h-4.5 w-4.5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                  Chế Độ Bảo Trì Hệ Thống
                </CardTitle>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Tạm dừng thi đối với học sinh. Quản trị viên và Giảng viên vẫn đăng nhập và thao tác bình thường.
                </p>
              </div>
            </div>
            {maintMode ? (
              <Badge variant="danger" className="text-xs px-3 py-1 font-semibold animate-pulse">
                Đang bảo trì
              </Badge>
            ) : (
              <Badge variant="success" className="text-xs px-3 py-1 font-semibold">
                Hệ thống mở
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="px-6 py-6 space-y-4">
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Khi bật, tất cả học sinh đang truy cập hoặc cố gắng vào làm bài thi sẽ thấy thông điệp bảo trì và bị khóa chức năng nộp bài thi mới.
          </p>

          <div className="flex flex-col sm:flex-row items-end gap-3 pt-1">
            <div className="flex-1 space-y-2 w-full">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Thông điệp hiển thị tới thí sinh khi truy cập
              </label>
              <input
                type="text"
                value={maintMsg}
                onChange={(e) => setMaintMsg(e.target.value)}
                placeholder="Hệ thống đang bảo trì định kỳ. Vui lòng quay lại sau ít phút."
                className="w-full h-11 px-4 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 text-slate-900 dark:text-white"
              />
            </div>
            <Button
              variant={maintMode ? 'danger' : 'outline'}
              size="md"
              onClick={handleToggleMaintenance}
              loading={savingMaint}
              className="h-11 px-7 text-xs font-bold rounded-xl shrink-0 whitespace-nowrap shadow-sm"
            >
              {maintMode ? 'Tắt Chế Độ Bảo Trì' : 'Bật Chế Độ Bảo Trì'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Box 3: Database Cleanup - Chữ nét, rõ ràng, không mờ */}
      <Card className="border border-slate-200/90 dark:border-slate-800/90 shadow-sm w-full">
        <CardHeader className="px-6 py-4.5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500">
                <Database className="h-4.5 w-4.5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                  Công Cụ Dọn Dẹp & Tối Ưu Database
                </CardTitle>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Thanh lọc phiên thi treo quá 24h, xóa các bản ghi audit logs cũ và tối ưu các chỉ mục Firestore
                </p>
              </div>
            </div>
            <Badge variant="info" className="text-xs px-3 py-1 font-semibold">
              Firestore Safe
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="px-6 py-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="space-y-1.5 flex-1">
              <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Dọn Dẹp Dữ Liệu Rác & Tối Ưu Tự Động
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                Hệ thống sẽ quét và giải phóng các phiên thi mồ côi hoặc treo quá 24 giờ một cách an toàn mà không làm gián đoạn bài thi đang diễn ra.
              </p>
            </div>

            <Button
              variant="outline"
              size="md"
              onClick={handleRunCleanup}
              loading={cleaning}
              icon={RefreshCw}
              className="h-11 px-6 text-xs font-bold rounded-xl shrink-0 whitespace-nowrap bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 hover:border-purple-500 hover:text-purple-600 dark:hover:text-purple-400 shadow-sm"
            >
              {cleaning ? 'Đang dọn dẹp...' : 'Chạy Dọn Dẹp Database'}
            </Button>
          </div>

          {cleanReport && (
            <div className="p-4 rounded-xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/60">
              <div className="text-xs font-bold text-purple-900 dark:text-purple-200 mb-2">
                Kết quả dọn dẹp gần nhất:
              </div>
              <div className="flex flex-wrap items-center gap-6 text-xs font-semibold text-slate-800 dark:text-slate-200">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  Audit logs đã xóa: <strong className="text-purple-600 dark:text-purple-400 font-bold">{cleanReport.oldAuditLogs}</strong>
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  Chuẩn hóa ExamID: <strong className="text-purple-600 dark:text-purple-400 font-bold">{cleanReport.normalizedExamIds}</strong>
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                  Dữ liệu rác đã dọn: <strong className="text-purple-600 dark:text-purple-400 font-bold">{cleanReport.ghostExamsDeleted}</strong>
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

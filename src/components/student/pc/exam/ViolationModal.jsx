import React, { useEffect } from 'react';
import { ShieldAlert, AlertTriangle, X } from 'lucide-react';
import { Button } from '../../../common/Button';

export function ViolationModal({ violation, onClose }) {
  useEffect(() => {
    if (!violation) return;
    const timer = setTimeout(() => {
      onClose();
    }, 5000); // Tự động đóng sau 5s nếu học sinh không bấm
    return () => clearTimeout(timer);
  }, [violation, onClose]);

  if (!violation) return null;

  const { type, count, message } = violation;
  const isLastWarning = count >= 2;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border-2 border-red-500 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 text-center animate-slide-up">
        <div className="w-16 h-16 rounded-3xl bg-red-100 dark:bg-red-950/60 text-red-600 flex items-center justify-center mx-auto animate-bounce">
          <ShieldAlert className="h-8 w-8" />
        </div>

        <div>
          <div className="inline-block px-3 py-1 rounded-full bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 font-black text-xs uppercase tracking-wider mb-2">
            Cảnh báo vi phạm lần {count}/3
          </div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white">
            {isLastWarning ? 'CẢNH BÁO VI PHẠM CUỐI CÙNG' : 'PHÁT HIỆN HÀNH VI RỜI MÀN HÌNH'}
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-350 mt-1 leading-relaxed">
            {message || 'Bạn đã chuyển tab hoặc thoát khỏi màn hình thi bắt buộc.'}
          </p>
        </div>

        <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-2xl text-[11px] text-red-700 dark:text-red-300 font-semibold text-left">
          ⚠️ Quy chế: Vi phạm lần thứ 3 sẽ khiến bài thi bị <strong>tự động nộp ngay lập tức</strong> và ghi nhận lỗi vào hệ thống giám sát.
        </div>

        <Button
          variant="danger"
          onClick={onClose}
          className="w-full"
        >
          Tôi đã hiểu, tiếp tục làm bài
        </Button>
      </div>
    </div>
  );
}

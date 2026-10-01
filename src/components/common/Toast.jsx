import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  CheckCircle2, AlertTriangle, XCircle, Info, X, Sparkles, Eye, Edit3, Trash2
} from 'lucide-react';
import { cn } from '../../utils/helpers';

/**
 * Toast Item Component
 */
function ToastItem({ toast, onDismiss }) {
  const { id, type = 'success', title, message, duration = 4000 } = toast;
  const [progress, setProgress] = useState(100);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (duration <= 0) return;
    const intervalTime = 50;
    const step = (intervalTime / duration) * 100;

    const timer = setInterval(() => {
      if (!isPaused) {
        setProgress((prev) => {
          if (prev <= step) {
            clearInterval(timer);
            onDismiss(id);
            return 0;
          }
          return prev - step;
        });
      }
    }, intervalTime);

    return () => clearInterval(timer);
  }, [duration, id, isPaused, onDismiss]);

  const config = {
    success: {
      icon: CheckCircle2,
      iconColor: 'text-emerald-500 dark:text-emerald-400',
      badgeBg: 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800/80',
      barColor: 'bg-gradient-to-r from-emerald-500 to-teal-400',
      defaultTitle: 'Thao tác thành công',
    },
    info: {
      icon: Info,
      iconColor: 'text-blue-500 dark:text-blue-400',
      badgeBg: 'bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800/80',
      barColor: 'bg-gradient-to-r from-blue-500 to-indigo-400',
      defaultTitle: 'Thông tin hệ thống',
    },
    view: {
      icon: Eye,
      iconColor: 'text-brand-500 dark:text-brand-400',
      badgeBg: 'bg-brand-50 dark:bg-brand-950/50 border-brand-200 dark:border-brand-800/80',
      barColor: 'bg-gradient-to-r from-brand-500 to-indigo-400',
      defaultTitle: 'Đang xem bài thi',
    },
    edit: {
      icon: Edit3,
      iconColor: 'text-amber-500 dark:text-amber-400',
      badgeBg: 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800/80',
      barColor: 'bg-gradient-to-r from-amber-500 to-orange-400',
      defaultTitle: 'Đã cập nhật kết quả',
    },
    danger: {
      icon: Trash2,
      iconColor: 'text-rose-500 dark:text-rose-400',
      badgeBg: 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800/80',
      barColor: 'bg-gradient-to-r from-rose-500 to-red-600',
      defaultTitle: 'Đã xóa dữ liệu',
    },
    warning: {
      icon: AlertTriangle,
      iconColor: 'text-amber-500 dark:text-amber-400',
      badgeBg: 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800/80',
      barColor: 'bg-gradient-to-r from-amber-500 to-yellow-400',
      defaultTitle: 'Cảnh báo',
    },
  };

  const currentConfig = config[type] || config.success;
  const IconComponent = currentConfig.icon;

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      role="alert"
      className={cn(
        'group relative overflow-hidden rounded-2xl w-full max-w-sm sm:max-w-md',
        'bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl',
        'border border-slate-200/80 dark:border-slate-800/80',
        'shadow-[0_16px_36px_-6px_rgba(0,0,0,0.18)] dark:shadow-[0_20px_45px_-10px_rgba(0,0,0,0.6)]',
        'transition-all duration-300 ease-out animate-slide-up select-none'
      )}
    >
      <div className="p-4 flex items-start gap-3">
        {/* Icon Badge */}
        <div className={cn('p-2.5 rounded-xl border shrink-0', currentConfig.badgeBg)}>
          <IconComponent className={cn('h-5 w-5', currentConfig.iconColor)} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white truncate">
              {title || currentConfig.defaultTitle}
            </h4>
            <span className="text-[10px] font-medium text-slate-400 shrink-0">
              Vừa xong
            </span>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed break-words font-medium">
            {message}
          </p>
        </div>

        {/* Dismiss Button */}
        <button
          type="button"
          onClick={() => onDismiss(id)}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition shrink-0"
          title="Đóng thông báo"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Countdown Progress Bar */}
      {duration > 0 && (
        <div className="w-full h-1 bg-slate-100 dark:bg-slate-800/60 overflow-hidden">
          <div
            className={cn('h-full transition-all duration-75 ease-linear', currentConfig.barColor)}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Toast Container — Always renders in document.body via Portal at bottom-right
 */
export function ToastOverlay({ toasts = [], onDismiss }) {
  if (toasts.length === 0) return null;

  return createPortal(
    <div
      aria-live="polite"
      className="fixed bottom-6 right-6 z-[99999] flex flex-col-reverse gap-3 pointer-events-auto max-w-sm sm:max-w-md w-full"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>,
    document.body
  );
}

export default ToastOverlay;

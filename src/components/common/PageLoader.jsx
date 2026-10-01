import React from 'react';
import { cn } from '../../utils/helpers';

export function Spinner({ className = 'h-5 w-5', ...props }) {
  return (
    <svg
      className={cn('animate-spin text-current', className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      {...props}
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

export function PageLoader({ message = 'Đang tải dữ liệu...' }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300">
      <div className="relative mb-4">
        <div className="w-12 h-12 rounded-full border-4 border-brand-500/20 border-t-brand-500 animate-spin" />
      </div>
      <p className="text-sm font-medium animate-pulse">{message}</p>
    </div>
  );
}

export default PageLoader;


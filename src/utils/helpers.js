import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind class names conditionally
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Parse any date/timestamp representation to a valid JS Date object
 */
export function parseDate(dateInput) {
  if (!dateInput) return null;
  if (typeof dateInput === 'object' && !(dateInput instanceof Date)) {
    if (typeof dateInput.toDate === 'function') {
      return dateInput.toDate();
    }
    if (dateInput.seconds != null) {
      return new Date(dateInput.seconds * 1000);
    }
    if (dateInput._seconds != null) {
      return new Date(dateInput._seconds * 1000);
    }
    if (Object.keys(dateInput).length === 0) {
      return null;
    }
  }
  const d = new Date(dateInput);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Format timestamp or ISO string to local date time
 */
export function formatDateTime(dateInput) {
  const date = parseDate(dateInput);
  if (!date) return '—';
  return date.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

/**
 * Format seconds to MM:SS or HH:MM:SS
 */
export function formatSeconds(totalSeconds) {
  if (totalSeconds == null || isNaN(totalSeconds)) return '00:00';
  const sec = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) {
    return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  }
  return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
}

/**
 * Format relative elapsed time (e.g. "5 phút trước")
 */
export function formatRelativeTime(dateInput) {
  const date = parseDate(dateInput);
  if (!date) return '—';
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSec < 60) return 'Vừa xong';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} phút trước`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} giờ trước`;
  return `${Math.floor(diffSec / 86400)} ngày trước`;
}

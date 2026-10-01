import { useState, useEffect } from 'react';

/**
 * useDevice — Nhận diện thiết bị dựa trên User-Agent và Pointer Capabilities.
 * KHÔNG dựa đơn thuần vào window.innerWidth để tránh kích hoạt giao diện mobile
 * khi người dùng thu nhỏ cửa sổ trên máy tính.
 */
export function useDevice() {
  const [deviceInfo, setDeviceInfo] = useState(() => {
    if (typeof window === 'undefined') {
      return { isMobile: false, isTablet: false, isDesktop: true };
    }

    const ua = navigator.userAgent || '';
    const isTouch = navigator.maxTouchPoints > 1;

    // iPadOS báo cáo là Macintosh nhưng có touch points
    const isIPad = /Macintosh/i.test(ua) && isTouch;

    const isMobileUA = /Android|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    const isTabletUA = /iPad/i.test(ua) || isIPad;

    const isMobile = isMobileUA && !isTabletUA;
    const isTablet = isTabletUA;
    const isDesktop = !isMobile && !isTablet;

    return { isMobile, isTablet, isDesktop };
  });

  useEffect(() => {
    // Có thể hỗ trợ cập nhật nếu cần
  }, []);

  return deviceInfo;
}

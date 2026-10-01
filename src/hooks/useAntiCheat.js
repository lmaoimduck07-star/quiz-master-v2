import { useEffect, useRef, useState, useCallback } from 'react';

const VIOLATION_COOLDOWN_MS = 3000; // 3s cooldown giữa các vi phạm
const MAX_VIOLATIONS = 3;

/**
 * useAntiCheat — Hệ thống giám sát phòng thi chống gian lận (không dùng alert())
 *
 * @param {Object} options
 * @param {string} options.sessionId ID phiên thi
 * @param {boolean} options.enabled Kích hoạt hay không (thường bật cho mode='simulation')
 * @param {Function} options.onViolation Callback khi có vi phạm { type, count, message }
 * @param {Function} options.onAutoSubmit Callback khi vi phạm quá số lần cho phép
 */
export function useAntiCheat({
  sessionId,
  enabled = false,
  onViolation,
  onAutoSubmit,
}) {
  const [violationCount, setViolationCount] = useState(0);
  const lastViolationTimeRef = useRef(0);
  const violationCountRef = useRef(0);
  const isAutoSubmittingRef = useRef(false);

  const handleTriggerViolation = useCallback((type, message) => {
    if (!enabled || isAutoSubmittingRef.current) return;

    const now = Date.now();
    if (now - lastViolationTimeRef.current < VIOLATION_COOLDOWN_MS) {
      return; // Bỏ qua nếu đang trong cooldown
    }
    lastViolationTimeRef.current = now;

    violationCountRef.current += 1;
    const currentCount = violationCountRef.current;
    setViolationCount(currentCount);

    if (onViolation) {
      onViolation({
        type,
        count: currentCount,
        message: message || `Phát hiện hành vi rời màn hình thi (${currentCount}/${MAX_VIOLATIONS})`,
      });
    }

    if (currentCount >= MAX_VIOLATIONS) {
      isAutoSubmittingRef.current = true;
      if (onAutoSubmit) {
        onAutoSubmit(`Vi phạm quy chế thi quá ${MAX_VIOLATIONS} lần: ${type}`);
      }
    }
  }, [enabled, onViolation, onAutoSubmit]);

  useEffect(() => {
    if (!enabled) return;

    // 1. Chuyển tab hoặc ẩn cửa sổ
    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleTriggerViolation('tab_switch', 'Bạn đã rời khỏi tab thi hoặc chuyển sang cửa sổ khác');
      }
    };

    // 2. Mất focus khỏi cửa sổ
    const handleWindowBlur = () => {
      handleTriggerViolation('window_blur', 'Cửa sổ thi bị mất tiêu điểm');
    };

    // 3. Thay đổi kích thước cửa sổ (chia đôi màn hình)
    const handleResize = () => {
      if (window.innerWidth < 1024 || window.innerHeight < 600) {
        handleTriggerViolation('screen_resize', 'Màn hình thi bị thu nhỏ dưới kích thước chuẩn');
      }
    };

    // 4. Thoát toàn màn hình
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        handleTriggerViolation('fullscreen_exit', 'Bạn đã thoát khỏi chế độ toàn màn hình bắt buộc');
      }
    };

    // 5. Chặn chuột phải
    const handleContextMenu = (e) => {
      e.preventDefault();
    };

    // 6. Chặn các phím chức năng F1-F12, DevTools, Inspect
    const handleKeyDown = (e) => {
      // Chặn F1-F12
      if (e.key >= 'F1' && e.key <= 'F12') {
        e.preventDefault();
        handleTriggerViolation('key_f_press', `Phím ${e.key} bị vô hiệu hóa trong phòng thi`);
        return;
      }
      // Chặn Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C (DevTools)
      if (e.ctrlKey && e.shiftKey && ['I', 'J', 'C', 'i', 'j', 'c'].includes(e.key)) {
        e.preventDefault();
        handleTriggerViolation('devtools_shortcut', 'Tổ hợp phím mở công cụ nhà phát triển bị chặn');
        return;
      }
      // Chặn Ctrl+U (View Source)
      if (e.ctrlKey && (e.key === 'u' || e.key === 'U')) {
        e.preventDefault();
        handleTriggerViolation('view_source', 'Tổ hợp phím xem mã nguồn bị chặn');
        return;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('resize', handleResize);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown);

    // 7. Chặn mở nhiều tab thi cùng lúc qua BroadcastChannel
    let channel = null;
    try {
      channel = new BroadcastChannel(`qm_exam_${sessionId || 'active'}`);
      channel.postMessage({ type: 'CHECK_EXISTING' });
      channel.onmessage = (event) => {
        if (event.data?.type === 'CHECK_EXISTING') {
          channel.postMessage({ type: 'EXISTING_DETECTED' });
        } else if (event.data?.type === 'EXISTING_DETECTED') {
          handleTriggerViolation('multiple_tabs', 'Phát hiện bài thi đang mở trên tab khác');
        }
      };
    } catch (_) {}

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
      if (channel) channel.close();
    };
  }, [enabled, sessionId, handleTriggerViolation]);

  return {
    violationCount,
    maxViolations: MAX_VIOLATIONS,
    remainingViolations: Math.max(0, MAX_VIOLATIONS - violationCount),
  };
}

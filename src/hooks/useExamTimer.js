import { useState, useEffect, useRef, useCallback } from 'react';
import { formatSeconds } from '../utils/helpers';

/**
 * useExamTimer — Đếm ngược thời gian làm bài thi, chống stale closure
 *
 * @param {number} initialSeconds Tổng số giây làm bài
 * @param {Function} onTimeUp Callback gọi khi hết thời gian
 * @param {boolean} active Có đang đếm hay không (mặc định true)
 */
export function useExamTimer(initialSeconds, onTimeUp, active = true) {
  const [remaining, setRemaining] = useState(initialSeconds || 0);
  const remainingRef = useRef(initialSeconds || 0);
  const onTimeUpRef = useRef(onTimeUp);

  useEffect(() => {
    onTimeUpRef.current = onTimeUp;
  }, [onTimeUp]);

  useEffect(() => {
    remainingRef.current = initialSeconds || 0;
    setRemaining(initialSeconds || 0);
  }, [initialSeconds]);

  useEffect(() => {
    if (!active || remainingRef.current <= 0) return;

    const timer = setInterval(() => {
      remainingRef.current -= 1;
      const current = remainingRef.current;

      setRemaining(current);

      if (current <= 0) {
        clearInterval(timer);
        if (onTimeUpRef.current) {
          onTimeUpRef.current();
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [active]);

  const isWarning = remaining <= 300 && remaining > 0; // Còn dưới 5 phút
  const isDanger = remaining <= 60 && remaining > 0;   // Còn dưới 1 phút
  const isTimeUp = remaining <= 0;

  return {
    remaining,
    formattedTime: formatSeconds(remaining),
    isWarning,
    isDanger,
    isTimeUp,
    remainingRef,
  };
}

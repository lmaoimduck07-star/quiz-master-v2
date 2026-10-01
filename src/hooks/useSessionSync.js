import { useState, useEffect, useRef } from 'react';
import { subscribeMySession } from '../services/db/sessionService';

/**
 * useSessionSync — Đồng bộ phiên thi realtime và lắng nghe lệnh Admin (khóa, gửi tin nhắn)
 */
export function useSessionSync(sessionId, { onTerminated, onAdminMessage } = {}) {
  const [session, setSession] = useState(null);
  const seenRef = useRef(false);
  const lastMsgTimeRef = useRef(null);
  const onTerminatedRef = useRef(onTerminated);
  const onAdminMessageRef = useRef(onAdminMessage);

  useEffect(() => {
    onTerminatedRef.current = onTerminated;
    onAdminMessageRef.current = onAdminMessage;
  }, [onTerminated, onAdminMessage]);

  useEffect(() => {
    if (!sessionId) return;

    const unsub = subscribeMySession(sessionId, (snap) => {
      if (snap) {
        seenRef.current = true;
        setSession(snap);

        // Phát hiện Admin khóa từ xa
        if (snap.status === 'terminated') {
          if (onTerminatedRef.current) onTerminatedRef.current();
        }

        // Phát hiện Admin gửi tin nhắn (chỉ trigger khi timestamp thay đổi)
        if (snap.adminMessage && snap.adminMessageTime !== lastMsgTimeRef.current) {
          lastMsgTimeRef.current = snap.adminMessageTime;
          if (onAdminMessageRef.current) {
            onAdminMessageRef.current(snap.adminMessage);
          }
        }
      } else if (seenRef.current) {
        // Session bị xóa sau khi đã từng tồn tại → coi như kết thúc
        if (onTerminatedRef.current) onTerminatedRef.current();
      }
    });

    return () => unsub();
  }, [sessionId]);

  return session;
}

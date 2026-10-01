import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../services/firebase';

const MaintenanceContext = createContext();
const CACHE_KEY = 'qm_maintenance_state';

function loadCachedMaintenance() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        isMaintenance: !!parsed.isMaintenance,
        message: parsed.message || 'Hệ thống đang được bảo trì định kỳ. Vui lòng quay lại sau ít phút.',
        maintenanceData: parsed.maintenanceData || null,
      };
    }
  } catch (_) {}
  return {
    isMaintenance: false,
    message: 'Hệ thống đang được bảo trì định kỳ. Vui lòng quay lại sau ít phút.',
    maintenanceData: null,
  };
}

export function MaintenanceProvider({ children }) {
  const [maintenance, setMaintenance] = useState(loadCachedMaintenance);
  const [loading, setLoading] = useState(true);
  const isMountedRef = useRef(true);

  const applyMaintenanceState = useCallback((state) => {
    setMaintenance(state);
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(state));
    } catch (_) {}
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    let unsubSnapshot = null;

    const setupListener = () => {
      if (unsubSnapshot) {
        try { unsubSnapshot(); } catch (_) {}
        unsubSnapshot = null;
      }

      try {
        unsubSnapshot = onSnapshot(
          doc(db, 'systemSettings', 'general'),
          (snap) => {
            if (!isMountedRef.current) return;
            if (snap.exists()) {
              const data = snap.data();
              const isMaint = !!data.isMaintenance;
              const msg = data.maintenanceMessage || 'Hệ thống đang được bảo trì định kỳ. Vui lòng quay lại sau ít phút.';
              applyMaintenanceState({
                isMaintenance: isMaint,
                message: msg,
                maintenanceData: {
                  enabled: isMaint,
                  message: msg,
                  startedAt: data.startedAt,
                  expectedEndTime: data.expectedEndTime,
                  ...data,
                },
              });
            }
            setLoading(false);
          },
          async (err) => {
            console.warn('[MaintenanceContext] onSnapshot warning:', err);
            // Fallback: Thử getDoc nếu onSnapshot bị lỗi quyền
            try {
              const snap = await getDoc(doc(db, 'systemSettings', 'general'));
              if (snap.exists() && isMountedRef.current) {
                const data = snap.data();
                const isMaint = !!data.isMaintenance;
                const msg = data.maintenanceMessage || 'Hệ thống đang được bảo trì định kỳ. Vui lòng quay lại sau ít phút.';
                applyMaintenanceState({
                  isMaintenance: isMaint,
                  message: msg,
                  maintenanceData: {
                    enabled: isMaint,
                    message: msg,
                    startedAt: data.startedAt,
                    expectedEndTime: data.expectedEndTime,
                    ...data,
                  },
                });
              }
            } catch (_) {}
            if (isMountedRef.current) setLoading(false);
          }
        );
      } catch (err) {
        console.warn('[MaintenanceContext] setupListener failed:', err);
      }
    };

    // Khởi tạo listener ngay lập tức
    setupListener();

    // Tự động kết nối lại listener khi trạng thái Auth thay đổi (ví dụ Admin vừa đăng nhập)
    const unsubAuth = onAuthStateChanged(auth, () => {
      setupListener();
    });

    // Safety timeout để không bị treo màn hình loading quá 800ms
    const safetyTimer = setTimeout(() => {
      if (isMountedRef.current) setLoading(false);
    }, 800);

    return () => {
      isMountedRef.current = false;
      clearTimeout(safetyTimer);
      if (unsubSnapshot) {
        try { unsubSnapshot(); } catch (_) {}
      }
      unsubAuth();
    };
  }, [applyMaintenanceState]);

  const refreshMaintenance = async () => {
    try {
      const snap = await getDoc(doc(db, 'systemSettings', 'general'));
      if (snap.exists()) {
        const data = snap.data();
        const isMaint = !!data.isMaintenance;
        const msg = data.maintenanceMessage || 'Hệ thống đang được bảo trì định kỳ. Vui lòng quay lại sau ít phút.';
        const state = {
          isMaintenance: isMaint,
          message: msg,
          maintenanceData: {
            enabled: isMaint,
            message: msg,
            startedAt: data.startedAt,
            expectedEndTime: data.expectedEndTime,
            ...data,
          },
        };
        applyMaintenanceState(state);
        return state.maintenanceData;
      }
    } catch (e) {
      console.error('[MaintenanceContext] refresh error:', e);
    }
    return null;
  };

  const setSystemMaintenance = async (isMaint, message, extra = {}) => {
    const startedAt = isMaint
      ? (maintenance.maintenanceData?.startedAt || new Date().toISOString())
      : null;
    const msg = message || maintenance.message;

    // Cập nhật state và localStorage ngay lập tức (Optimistic Update)
    const nextState = {
      isMaintenance: isMaint,
      message: msg,
      maintenanceData: {
        enabled: isMaint,
        message: msg,
        startedAt,
        expectedEndTime: extra.expectedEndTime || maintenance.maintenanceData?.expectedEndTime || null,
        ...extra,
      },
    };
    applyMaintenanceState(nextState);

    // Ghi dữ liệu vào Firestore
    await setDoc(doc(db, 'systemSettings', 'general'), {
      isMaintenance: isMaint,
      maintenanceMessage: msg,
      startedAt,
      updatedAt: new Date().toISOString(),
      ...extra,
    }, { merge: true });
  };

  return (
    <MaintenanceContext.Provider value={{ ...maintenance, loading, setSystemMaintenance, refreshMaintenance }}>
      {children}
    </MaintenanceContext.Provider>
  );
}

export function useMaintenance() {
  return useContext(MaintenanceContext);
}

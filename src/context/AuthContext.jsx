import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db, loginWithGoogle, logoutUser } from '../services/firebase';
import {
  getUser,
  upsertUser,
  getAllUsers,
  normalizeRole,
  normalizeRoles,
  recordUserLogin
} from '../services/db/userService';
import { addAuditLog } from '../services/db/auditService';
import { useMaintenance } from './MaintenanceContext';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const { isMaintenance, loading: maintenanceLoading } = useMaintenance() || {};
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(() => {
    try {
      const raw = localStorage.getItem('qm_user_profile');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [activeRole, setActiveRoleState] = useState(() => {
    return localStorage.getItem('qm_active_role') || null;
  });
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const isAutoLoggingOutRef = useRef(false);

  const applyUserProfile = useCallback((profile) => {
    setUserProfile(profile);
    if (profile) {
      try {
        localStorage.setItem('qm_user_profile', JSON.stringify(profile));
        const roles = normalizeRoles(profile.roles, profile.role);
        if (roles.includes('Admin')) {
          localStorage.setItem('qm_is_admin', 'true');
        } else {
          localStorage.removeItem('qm_is_admin');
        }
      } catch (_) {}
    } else {
      try {
        localStorage.removeItem('qm_user_profile');
        localStorage.removeItem('qm_is_admin');
      } catch (_) {}
    }
  }, []);

  const setActiveRole = (newRole) => {
    setActiveRoleState(newRole);
    if (newRole) {
      localStorage.setItem('qm_active_role', newRole);
    } else {
      localStorage.removeItem('qm_active_role');
    }
  };

  useEffect(() => {
    let profileUnsub = null;

    const authUnsub = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        setCurrentUser(fbUser);
        try {
          // Lấy profile từ Firestore (hỗ trợ cả UID và email)
          let existingProfile = await getUser(fbUser.uid, fbUser.email);

          // Kiểm tra xem database đã có tài khoản Admin nào chưa
          let hasAnyAdmin = false;
          try {
            const allUsers = await getAllUsers();
            hasAnyAdmin = allUsers.some((u) => {
              const uRoles = normalizeRoles(u.roles, u.role);
              return uRoles.includes('Admin');
            });
          } catch (_) {}

          const checkRoles = existingProfile ? normalizeRoles(existingProfile.roles, existingProfile.role) : (!hasAnyAdmin ? ['Admin'] : ['Student']);
          const isUserAdmin = checkRoles.includes('Admin');

          // Nếu đang trong chế độ bảo trì và tài khoản không phải Admin -> Đăng xuất ngay, không ghi DB
          if (isMaintenance && !isUserAdmin) {
            try {
              await logoutUser();
            } catch (_) {}
            setCurrentUser(null);
            applyUserProfile(null);
            setActiveRole(null);
            setLoading(false);
            return;
          }

          if (!existingProfile) {
            // Nếu là tài khoản đầu tiên hoặc DB chưa có Admin -> tự động cấp Full Admin
            const assignedRoles = !hasAnyAdmin
              ? ['Admin', 'Lecturer', 'Student']
              : ['Student'];
            const assignedRole = assignedRoles[0];

            const newUserData = {
              uid: fbUser.uid,
              id: fbUser.uid,
              email: fbUser.email,
              displayName: fbUser.displayName || fbUser.email?.split('@')[0] || (assignedRole === 'Admin' ? 'Quản trị viên' : 'Học sinh'),
              photoURL: fbUser.photoURL || '',
              roles: assignedRoles,
              role: assignedRole,
              status: 'Active',
              permissions: { unlimitedPractice: assignedRole === 'Admin' },
            };
            await upsertUser(fbUser.uid, newUserData);
            existingProfile = newUserData;
            applyUserProfile(newUserData);
            addAuditLog({
              user: fbUser.displayName || fbUser.email,
              role: assignedRole,
              category: 'Auth',
              action: `Đăng nhập lần đầu (Google OAuth) - Quyền: ${assignedRoles.join(', ')}`,
              severity: 'Info'
            });
          } else {
            // Chuẩn hóa roles nếu lưu dạng mảng hoặc chuỗi
            let currentRoles = normalizeRoles(existingProfile.roles, existingProfile.role);

            // Nếu hệ thống hoàn toàn chưa có Admin nào -> tự động thăng cấp tài khoản này làm Admin
            if (!hasAnyAdmin && !currentRoles.includes('Admin')) {
              currentRoles = ['Admin', ...currentRoles];
            }

            const primaryRole = currentRoles.includes('Admin')
              ? 'Admin'
              : currentRoles.includes('Lecturer')
                ? 'Lecturer'
                : 'Student';

            existingProfile.roles = currentRoles;
            existingProfile.role = primaryRole;

            await upsertUser(fbUser.uid, {
              roles: currentRoles,
              role: primaryRole,
              photoURL: fbUser.photoURL || existingProfile.photoURL || '',
              displayName: fbUser.displayName || existingProfile.displayName || '',
            });
            await recordUserLogin(fbUser.uid);

            applyUserProfile(existingProfile);
          }

          // Lắng nghe Realtime hồ sơ người dùng để nhận thay đổi role/khóa tài khoản ngay lập tức
          if (profileUnsub) profileUnsub();
          profileUnsub = onSnapshot(doc(db, 'users', fbUser.uid), (snap) => {
            if (snap.exists()) {
              const data = snap.data();
              const normRoles = normalizeRoles(data.roles, data.role);
              const primaryRole = normRoles.includes('Admin')
                ? 'Admin'
                : normRoles.includes('Lecturer')
                  ? 'Lecturer'
                  : 'Student';

              const updated = { id: snap.id, ...data, roles: normRoles, role: primaryRole };
              applyUserProfile(updated);

              // Nếu tài khoản bị khóa
              if (data.status === 'Locked') {
                setAuthError('Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Quản trị viên.');
                logoutUser();
                setActiveRole(null);
                applyUserProfile(null);
              }
            }
          });
        } catch (err) {
          console.error('[AuthContext] Error loading user profile:', err);
        }
      } else {
        setCurrentUser(null);
        applyUserProfile(null);
        setActiveRole(null);
        if (profileUnsub) profileUnsub();
      }
      setLoading(false);
    });

    const safetyTimer = setTimeout(() => {
      setLoading(false);
    }, 1500);

    return () => {
      clearTimeout(safetyTimer);
      authUnsub();
      if (profileUnsub) profileUnsub();
    };
  }, [applyUserProfile]);

  const handleLogin = async () => {
    setAuthError(null);
    try {
      const cred = await loginWithGoogle();
      const fbUser = cred.user;

      let profile = await getUser(fbUser.uid, fbUser.email);
      let userRoles = profile ? normalizeRoles(profile.roles, profile.role) : [];
      let isUserAdmin = userRoles.includes('Admin');

      let hasAnyAdmin = false;
      try {
        const allUsers = await getAllUsers();
        hasAnyAdmin = allUsers.some((u) => {
          const uRoles = normalizeRoles(u.roles, u.role);
          return uRoles.includes('Admin');
        });
        if (!hasAnyAdmin) {
          isUserAdmin = true;
        }
      } catch (_) {}

      // ── CHẶN NGAY LẬP TỨC TRONG THỜI GIAN BẢO TRÌ (TRƯỚC KHI GHI DATABASE) ──
      // Cấm hoàn toàn Student và Giảng viên. Đăng xuất ngay, không ghi DB để tránh treo request!
      if (isMaintenance && !isUserAdmin) {
        try {
          await logoutUser();
        } catch (_) {}
        setCurrentUser(null);
        applyUserProfile(null);
        setActiveRole(null);
        const maintErr = 'Hệ thống đang trong chế độ bảo trì định kỳ. Giảng viên và Thí sinh tạm thời không thể đăng nhập. Chỉ Quản trị viên (Admin) mới có quyền truy cập.';
        setAuthError(maintErr);
        throw new Error(maintErr);
      }

      if (!profile) {
        const assignedRoles = !hasAnyAdmin ? ['Admin', 'Lecturer', 'Student'] : ['Student'];
        const assignedRole = assignedRoles[0];
        profile = {
          uid: fbUser.uid,
          id: fbUser.uid,
          email: fbUser.email,
          displayName: fbUser.displayName || fbUser.email?.split('@')[0] || (assignedRole === 'Admin' ? 'Quản trị viên' : 'Học sinh'),
          photoURL: fbUser.photoURL || '',
          roles: assignedRoles,
          role: assignedRole,
          status: 'Active',
          permissions: { unlimitedPractice: assignedRole === 'Admin' },
        };
        await upsertUser(fbUser.uid, profile);
      } else {
        let currentRoles = normalizeRoles(profile.roles, profile.role);
        if (!hasAnyAdmin && !currentRoles.includes('Admin')) {
          currentRoles = ['Admin', ...currentRoles];
        }
        const primaryRole = currentRoles.includes('Admin')
          ? 'Admin'
          : currentRoles.includes('Lecturer')
            ? 'Lecturer'
            : 'Student';

        profile.roles = currentRoles;
        profile.role = primaryRole;
        await upsertUser(fbUser.uid, { roles: currentRoles, role: primaryRole });
        await recordUserLogin(fbUser.uid);
      }

      const finalRoles = normalizeRoles(profile.roles, profile.role);
      applyUserProfile(profile);

      return {
        user: fbUser,
        profile,
        availableRoles: finalRoles,
        requiresRoleSelection: finalRoles.length > 1,
      };
    } catch (err) {
      console.error('[AuthContext] Login error:', err);
      setAuthError(err.message || 'Đăng nhập không thành công');
      throw err;
    }
  };

  const handleLogout = async (reason = 'Đăng xuất') => {
    try {
      if (currentUser) {
        addAuditLog({
          user: userProfile?.displayName || currentUser?.email || 'User',
          role: activeRole || userProfile?.role || 'Student',
          category: 'Auth',
          action: reason,
          severity: reason.includes('bảo trì') ? 'Warning' : 'Info'
        });
      }
      await logoutUser();
      setCurrentUser(null);
      applyUserProfile(null);
      setActiveRole(null);
    } catch (err) {
      console.error('[AuthContext] Logout error:', err);
    }
  };

  // Tính toán quyền đa vai trò (hỗ trợ cả cache localStorage để chống giật khi reload)
  const cachedIsAdmin = typeof window !== 'undefined' && localStorage.getItem('qm_is_admin') === 'true';
  const userRoles = normalizeRoles(userProfile?.roles, userProfile?.role);
  const isAdmin = userRoles.includes('Admin') || cachedIsAdmin;
  const isLecturer = userRoles.includes('Lecturer') || isAdmin;
  const isStudent = true;

  // ── TỰ ĐỘNG ĐĂNG XUẤT THÍ SINH & GIẢNG VIÊN KHI BẬT BẢO TRÌ ───────────────
  // Khi hệ thống bật bảo trì:
  // - Tài khoản CÓ ROLE ADMIN: Tuyệt đối KHÔNG BỊ ĐẨY RA, giữ nguyên phiên làm việc!
  // - Tài khoản Giảng viên hoặc Thí sinh: Đẩy ra lập tức để tránh xung đột dữ liệu.
  useEffect(() => {
    if (!loading && !maintenanceLoading && isMaintenance && currentUser) {
      // Chỉ kiểm tra khi userProfile đã sẵn sàng để tránh race condition
      if (!userProfile) return;

      const roles = normalizeRoles(userProfile?.roles, userProfile?.role);
      const hasAdminRole = roles.includes('Admin') || cachedIsAdmin;

      // Nếu là Admin, TUYỆT ĐỐI KHÔNG ĐẨY RA
      if (hasAdminRole) {
        return;
      }

      // Đối với Giảng viên và Thí sinh: Đẩy ra ngay lập tức
      if (!isAutoLoggingOutRef.current) {
        isAutoLoggingOutRef.current = true;
        console.warn('[AuthContext] Chế độ bảo trì đã kích hoạt. Đang tự động đăng xuất tài khoản Giảng viên / Thí sinh.');
        setAuthError('Hệ thống đang trong chế độ bảo trì định kỳ. Giảng viên và Thí sinh tạm thời được tự động đăng xuất để bảo đảm an toàn dữ liệu.');
        handleLogout('Tự động đăng xuất do hệ thống bật chế độ bảo trì').finally(() => {
          isAutoLoggingOutRef.current = false;
        });
      }
    }
  }, [isMaintenance, loading, maintenanceLoading, currentUser, userProfile, isAdmin, cachedIsAdmin]);

  // Quyền truy cập khả dụng dựa trên cấp bậc tài khoản
  const availableRoles = userRoles.length > 0
    ? userRoles
    : (isAdmin ? ['Admin', 'Lecturer', 'Student'] : isLecturer ? ['Lecturer', 'Student'] : ['Student']);

  const baseRole = isAdmin ? 'Admin' : isLecturer ? 'Lecturer' : 'Student';
  const currentActiveRole = (activeRole && availableRoles.includes(activeRole)) ? activeRole : baseRole;

  const value = {
    currentUser,
    userProfile,
    role: currentActiveRole,
    activeRole: currentActiveRole,
    rawActiveRole: activeRole,
    setActiveRole,
    baseRole,
    roles: userRoles,
    availableRoles,
    isAdmin,
    isLecturer,
    isStudent,
    loading,
    authError,
    setAuthError,
    loginWithGoogle: handleLogin,
    logout: handleLogout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

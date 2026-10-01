/**
 * userService.js — Atomic CRUD cho collection `users` (Hỗ trợ Đa Vai Trò / Multi-Role)
 */
import {
  collection, doc,
  getDoc, getDocs,
  setDoc, updateDoc, deleteDoc,
  onSnapshot, query, where
} from 'firebase/firestore';
import { db } from '../firebase';
import { sanitize, nowISO, dbError, serverTimestamp } from './baseService';

const COL = 'users';

// ── Chuẩn hóa từng Role riêng lẻ (Case-insensitive & tiếng Việt) ─────────────
export function normalizeRole(role) {
  if (!role) return 'Student';
  const r = String(role).trim().toLowerCase();
  if (r === 'admin' || r === 'administrator' || r === 'quản trị viên' || r === 'quan_tri_vien') return 'Admin';
  if (r === 'lecturer' || r === 'teacher' || r === 'giảng viên' || r === 'giang_vien') return 'Lecturer';
  return 'Student';
}

// ── Chuẩn hóa danh sách đa vai trò (Multi-Role Array) ────────────────────────
export function normalizeRoles(roles, fallbackRole = 'Student') {
  let roleList = [];
  if (Array.isArray(roles)) {
    roleList = roles.map(normalizeRole);
  } else if (roles && typeof roles === 'string') {
    roleList = [normalizeRole(roles)];
  } else if (fallbackRole) {
    roleList = [normalizeRole(fallbackRole)];
  } else {
    roleList = ['Student'];
  }

  // Loại bỏ trùng lặp và giá trị null
  roleList = [...new Set(roleList.filter(Boolean))];
  if (roleList.length === 0) {
    roleList = ['Student'];
  }
  return roleList;
}

// ── Đọc ─────────────────────────────────────────────────────────────────────
export async function getUser(userId, userEmail = null) {
  try {
    if (!userId) return null;
    const snap = await getDoc(doc(db, COL, userId));
    if (snap.exists()) {
      const data = snap.data();
      const roles = normalizeRoles(data.roles, data.role);
      const primaryRole = roles.includes('Admin') ? 'Admin' : roles.includes('Lecturer') ? 'Lecturer' : 'Student';
      return { id: snap.id, ...data, roles, role: primaryRole };
    }

    // Nếu không tìm thấy theo userId, tìm kiếm theo email
    if (userEmail) {
      const q = query(collection(db, COL), where('email', '==', String(userEmail).toLowerCase().trim()));
      const emailSnap = await getDocs(q);
      if (!emailSnap.empty) {
        const foundDoc = emailSnap.docs[0];
        const data = foundDoc.data();
        const roles = normalizeRoles(data.roles, data.role);
        const primaryRole = roles.includes('Admin') ? 'Admin' : roles.includes('Lecturer') ? 'Lecturer' : 'Student';
        const normalized = { id: foundDoc.id, ...data, roles, role: primaryRole };
        if (foundDoc.id !== userId) {
          await setDoc(doc(db, COL, userId), sanitize({ ...normalized, uid: userId }), { merge: true });
        }
        return normalized;
      }
    }
    return null;
  } catch (e) {
    dbError('User', 'getUser', e);
    return null;
  }
}

export async function getAllUsers() {
  try {
    const snap = await getDocs(collection(db, COL));
    return snap.docs.map((d) => {
      const data = d.data();
      const roles = normalizeRoles(data.roles, data.role);
      const primaryRole = roles.includes('Admin') ? 'Admin' : roles.includes('Lecturer') ? 'Lecturer' : 'Student';
      return { id: d.id, ...data, roles, role: primaryRole };
    });
  } catch (e) {
    dbError('User', 'getAllUsers', e);
    return [];
  }
}

// ── Tạo mới hoặc cập nhật thông tin đăng nhập ───────────────────────────────
export async function upsertUser(userId, userData) {
  try {
    const roles = normalizeRoles(userData.roles, userData.role);
    const primaryRole = roles.includes('Admin') ? 'Admin' : roles.includes('Lecturer') ? 'Lecturer' : 'Student';
    const safe = sanitize({
      ...userData,
      roles,
      role: primaryRole,
      lastLoginAt: serverTimestamp()
    });
    await setDoc(doc(db, COL, userId), safe, { merge: true });
    return true;
  } catch (e) {
    dbError('User', 'upsertUser', e);
    return false;
  }
}

export async function createUser(userData) {
  try {
    const roles = normalizeRoles(userData.roles, userData.role);
    const primaryRole = roles.includes('Admin') ? 'Admin' : roles.includes('Lecturer') ? 'Lecturer' : 'Student';
    const safe = sanitize({
      ...userData,
      roles,
      role: primaryRole,
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp()
    });
    await setDoc(doc(db, COL, userData.id || userData.uid), safe);
    return true;
  } catch (e) {
    dbError('User', 'createUser', e);
    return false;
  }
}

export async function recordUserLogin(userId) {
  try {
    if (!userId) return false;
    await setDoc(doc(db, COL, userId), {
      lastLoginAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });
    return true;
  } catch (e) {
    dbError('User', 'recordUserLogin', e);
    return false;
  }
}

export async function updateUser(userId, fields) {
  try {
    const safe = sanitize({
      ...fields,
      updatedAt: serverTimestamp()
    });
    await setDoc(doc(db, COL, userId), safe, { merge: true });
    return true;
  } catch (e) {
    dbError('User', 'updateUser', e);
    return false;
  }
}

// ── Cập nhật đa vai trò (Multi-Role) ─────────────────────────────────────────
export async function updateUserRoles(userId, newRoles) {
  const cleanRoles = normalizeRoles(newRoles);
  const primaryRole = cleanRoles.includes('Admin') ? 'Admin' : cleanRoles.includes('Lecturer') ? 'Lecturer' : 'Student';
  const updateData = {
    roles: cleanRoles,
    role: primaryRole
  };
  // Nếu có vai trò Admin, tự động kích hoạt quyền Unlimited
  if (cleanRoles.includes('Admin')) {
    updateData.permissions = {
      unlimitedPractice: true,
      unlimited: true,
      isUnlimited: true
    };
  }
  return updateUser(userId, updateData);
}

// Bật / tắt một vai trò cụ thể cho người dùng
export async function toggleUserRole(userId, currentRoles = [], roleToToggle) {
  const normRole = normalizeRole(roleToToggle);
  let list = normalizeRoles(currentRoles);

  if (list.includes(normRole)) {
    // Nếu đã có role này -> gỡ bỏ (trừ khi là role duy nhất còn lại)
    if (list.length > 1) {
      list = list.filter((r) => r !== normRole);
    }
  } else {
    // Nếu chưa có -> thêm vào
    list.push(normRole);
  }

  return updateUserRoles(userId, list);
}

export async function changeUserRole(userId, newRole) {
  return updateUserRoles(userId, [newRole]);
}

export async function toggleUserStatus(userId, currentStatus) {
  const newStatus = currentStatus === 'Locked' ? 'Active' : 'Locked';
  return updateUser(userId, { status: newStatus });
}

// Bật / tắt quyền cụ thể (ví dụ: unlimitedPractice)
export async function toggleUserPermission(userId, currentPermissions = {}, permKey = 'unlimitedPractice') {
  const newVal = !currentPermissions[permKey];
  const updatedPerms = {
    ...currentPermissions,
    [permKey]: newVal,
    unlimited: newVal,
    isUnlimited: newVal
  };
  return updateUser(userId, { permissions: updatedPerms });
}

// Cập nhật thông tin profile từ modal chỉnh sửa
export async function updateUserProfile(userId, data) {
  const fields = { ...data };
  if (fields.roles) {
    fields.roles = normalizeRoles(fields.roles);
    fields.role = fields.roles.includes('Admin') ? 'Admin' : fields.roles.includes('Lecturer') ? 'Lecturer' : 'Student';
    // Nếu có vai trò Admin, tự động kích hoạt Unlimited
    if (fields.roles.includes('Admin')) {
      fields.permissions = {
        ...(fields.permissions || {}),
        unlimitedPractice: true,
        unlimited: true,
        isUnlimited: true
      };
    }
  }
  return updateUser(userId, fields);
}

// ── Xóa ─────────────────────────────────────────────────────────────────────
export async function deleteUser(userId) {
  try {
    await deleteDoc(doc(db, COL, userId));
    return true;
  } catch (e) {
    dbError('User', 'deleteUser', e);
    return false;
  }
}

// ── Realtime listener ───────────────────────────────────────────────────────
export function subscribeUsers(callback) {
  return onSnapshot(
    collection(db, COL),
    (snap) =>
      callback(
        snap.docs.map((d) => {
          const data = d.data();
          const roles = normalizeRoles(data.roles, data.role);
          const primaryRole = roles.includes('Admin') ? 'Admin' : roles.includes('Lecturer') ? 'Lecturer' : 'Student';
          return { id: d.id, ...data, roles, role: primaryRole };
        })
      ),
    (err) => {
      dbError('User', 'subscribeUsers', err);
      callback([]);
    }
  );
}

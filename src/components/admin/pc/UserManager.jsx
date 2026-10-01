import React, { useState, useEffect } from 'react';
import {
  Users, Search, Shield, UserCheck, CheckCircle2,
  AlertTriangle, RefreshCw, Check, Plus, BookOpen, GraduationCap,
  Lock, Unlock, Pencil, Trash2, Zap, X
} from 'lucide-react';
import { Button } from '../../common/Button';
import { Card, CardContent } from '../../common/Card';
import { Badge } from '../../common/Badge';
import { Modal } from '../../common/Modal';
import {
  subscribeUsers,
  updateUserRoles,
  toggleUserRole,
  toggleUserStatus,
  toggleUserPermission,
  updateUserProfile,
  deleteUser,
  normalizeRoles
} from '../../../services/db/userService';
import { addAuditLog } from '../../../services/db/auditService';
import { formatDateTime } from '../../../utils/helpers';
import { useAuth } from '../../../context/AuthContext';

const AVAILABLE_ROLES = [
  {
    id: 'Admin',
    label: 'Admin',
    badgeClass: 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800',
    activeClass: 'bg-purple-600 text-white border-purple-500 shadow-sm',
    inactiveClass: 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-purple-600 border-dashed border-slate-300 dark:border-slate-700'
  },
  {
    id: 'Lecturer',
    label: 'Giảng viên',
    badgeClass: 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800',
    activeClass: 'bg-amber-500 text-white border-amber-400 shadow-sm',
    inactiveClass: 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-amber-600 border-dashed border-slate-300 dark:border-slate-700'
  },
  {
    id: 'Student',
    label: 'Student',
    badgeClass: 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800',
    activeClass: 'bg-brand-600 text-white border-brand-500 shadow-sm',
    inactiveClass: 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-brand-600 border-dashed border-slate-300 dark:border-slate-700'
  },
];

export function UserManager() {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [updatingId, setUpdatingId] = useState(null);

  // Modals state
  const [editUser, setEditUser] = useState(null);
  const [deleteModalUser, setDeleteModalUser] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    const unsub = subscribeUsers((list) => {
      setUsers(list || []);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleToggleRole = async (user, targetRole) => {
    const uid = user.id || user.uid;
    const currentRoles = normalizeRoles(user.roles, user.role);
    setUpdatingId(uid);
    try {
      await toggleUserRole(uid, currentRoles, targetRole);
      addAuditLog({
        user: user.displayName || user.email,
        category: 'Security',
        action: `Cập nhật vai trò (${targetRole}) cho tài khoản ${user.email}`,
        severity: 'Warning'
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleToggleStatus = async (user) => {
    const uid = user.id || user.uid;
    setUpdatingId(uid);
    try {
      await toggleUserStatus(uid, user.status);
      addAuditLog({
        user: user.displayName || user.email,
        category: 'Security',
        action: `${user.status === 'Locked' ? 'Mở khóa' : 'Khóa'} tài khoản ${user.email}`,
        severity: 'Warning'
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleToggleUnlimitedPermission = async (user) => {
    const uid = user.id || user.uid;
    const uRoles = normalizeRoles(user.roles, user.role);
    if (uRoles.includes('Admin')) return; // Admin luôn có unlimited

    setUpdatingId(uid);
    try {
      await toggleUserPermission(uid, user.permissions, 'unlimitedPractice');
      addAuditLog({
        user: user.displayName || user.email,
        category: 'Security',
        action: `Cập nhật quyền Unlimited (10p) cho tài khoản ${user.email}`,
        severity: 'Info'
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSaveEditUser = async (e) => {
    e.preventDefault();
    if (!editUser) return;
    setSavingEdit(true);
    try {
      const uid = editUser.id || editUser.uid;
      await updateUserProfile(uid, {
        displayName: editUser.displayName,
        roles: editUser.roles,
        permissions: editUser.permissions || {}
      });
      addAuditLog({
        user: editUser.displayName || editUser.email,
        category: 'Security',
        action: `Quản trị viên chỉnh sửa hồ sơ tài khoản ${editUser.email}`,
        severity: 'Warning'
      });
      setEditUser(null);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteModalUser) return;
    setDeleting(true);
    try {
      const uid = deleteModalUser.id || deleteModalUser.uid;
      await deleteUser(uid);
      addAuditLog({
        user: deleteModalUser.displayName || deleteModalUser.email,
        category: 'Security',
        action: `Quản trị viên đã xóa tài khoản ${deleteModalUser.email}`,
        severity: 'Critical'
      });
      setDeleteModalUser(null);
    } finally {
      setDeleting(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const name = (u.displayName || '').toLowerCase();
    const email = (u.email || '').toLowerCase();
    const id = (u.id || u.uid || '').toLowerCase();
    const q = search.toLowerCase();
    const matchesSearch = name.includes(q) || email.includes(q) || id.includes(q);
    if (!matchesSearch) return false;

    const uRoles = normalizeRoles(u.roles, u.role);
    if (roleFilter === 'Admin' && !uRoles.includes('Admin')) return false;
    if (roleFilter === 'Lecturer' && !uRoles.includes('Lecturer')) return false;
    if (roleFilter === 'Student' && !uRoles.includes('Student')) return false;
    if (roleFilter === 'multi' && uRoles.length < 2) return false;
    if (roleFilter === 'unlimited' && !u.permissions?.unlimitedPractice && !uRoles.includes('Admin')) return false;
    if (roleFilter === 'Locked' && u.status !== 'Locked') return false;

    return true;
  });

  return (
    <div className="space-y-4 w-full flex-1 flex flex-col">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 px-6 py-3.5 rounded-2xl shadow-sm w-full">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 shrink-0">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Quản Lý Người Dùng & Đa Phân Quyền
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold border border-blue-500/20">
                {users.length}
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Cấp nhiều vai trò (Admin, Giảng viên, Student), quyền Unlimited và quản lý tài khoản
            </p>
          </div>
        </div>

        {/* Search & Filter tools */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo tên, email, ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-10 pr-3 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-500 text-slate-800 dark:text-slate-200"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="h-10 px-3.5 text-xs bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none text-slate-700 dark:text-slate-200 font-medium cursor-pointer shrink-0"
          >
            <option value="all">Tất cả vai trò</option>
            <option value="multi">⭐ Đa vai trò (≥2)</option>
            <option value="Admin">👑 Có quyền Admin</option>
            <option value="Lecturer">📚 Có quyền Giảng viên</option>
            <option value="Student">🎓 Có quyền Sinh viên</option>
            <option value="unlimited">⚡ Có quyền Unlimited</option>
            <option value="Locked">🔒 Bị khóa</option>
          </select>
        </div>
      </div>

      {/* Users table - Dựa trên cấu trúc hình ảnh */}
      <Card className="border border-slate-200/90 dark:border-slate-800/90 shadow-sm overflow-hidden flex-1 flex flex-col w-full">
        <CardContent className="p-0 flex-1 flex flex-col">
          {loading ? (
            <div className="py-20 text-center text-slate-400 text-xs flex flex-col items-center justify-center flex-1 gap-3">
              <RefreshCw className="h-6 w-6 animate-spin text-brand-500" />
              Đang tải danh sách tài khoản...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs flex flex-col items-center justify-center flex-1">
              Không tìm thấy người dùng nào phù hợp với bộ lọc.
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto max-h-[calc(100vh-230px)]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-6 py-3.5">Họ và tên</th>
                    <th className="px-6 py-3.5">Vai trò</th>
                    <th className="px-6 py-3.5">Quyền</th>
                    <th className="px-6 py-3.5">Trạng thái</th>
                    <th className="px-6 py-3.5">Đăng nhập gần nhất</th>
                    <th className="px-6 py-3.5 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                  {filteredUsers.map((u) => {
                    const uid = u.id || u.uid;
                    const isUpdating = updatingId === uid;
                    const isLocked = u.status === 'Locked';
                    const uRoles = normalizeRoles(u.roles, u.role);
                    const isAdmin = uRoles.includes('Admin');
                    const hasUnlimited = isAdmin || Boolean(u.permissions?.unlimitedPractice);

                    return (
                      <tr key={uid} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                        {/* 1. Họ và tên */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {u.photoURL ? (
                              <img
                                src={u.photoURL}
                                alt=""
                                className="w-9 h-9 rounded-full border border-slate-200 dark:border-slate-700 object-cover shrink-0"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-brand-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                                {(u.displayName || u.email || 'U').charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="font-bold text-sm text-slate-900 dark:text-white truncate">
                                {u.displayName || 'Chưa đặt tên'}
                              </div>
                              <div className="text-[11px] text-slate-400 dark:text-slate-500 font-mono truncate">
                                ID: {uid.length > 15 ? `U_${uid.slice(0, 10)}...` : uid}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                {u.email}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 2. Vai trò (Multi-Role Pills) */}
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {AVAILABLE_ROLES.map((rDef) => {
                              const hasThisRole = uRoles.includes(rDef.id);
                              if (!hasThisRole) return null;

                              return (
                                <button
                                  key={rDef.id}
                                  type="button"
                                  disabled={isUpdating}
                                  onClick={() => handleToggleRole(u, rDef.id)}
                                  title={`Click để gỡ vai trò ${rDef.label}`}
                                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer select-none active:scale-95 disabled:opacity-50 ${rDef.badgeClass}`}
                                >
                                  <span>{rDef.label}</span>
                                </button>
                              );
                            })}
                            {/* Nút cộng thêm vai trò nhanh */}
                            <button
                              type="button"
                              onClick={() => setEditUser({ ...u, roles: uRoles })}
                              title="Thêm hoặc sửa vai trò"
                              className="p-1 rounded-full border border-dashed border-slate-300 dark:border-slate-700 text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 hover:border-brand-500 transition"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                        </td>

                        {/* 3. Quyền (Unlimited Checkbox) */}
                        <td className="px-6 py-4">
                          {isAdmin ? (
                            /* Admin: Tự động tick sẵn, cố định */
                            <div
                              className="inline-flex items-center gap-2 select-none opacity-60 cursor-default"
                              title="Tài khoản Admin được tự động kích hoạt quyền Unlimited (10p)"
                            >
                              <div className="w-4 h-4 rounded border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 shrink-0">
                                <Check className="h-3 w-3 stroke-[2.5]" />
                              </div>
                              <span className="flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                                <Zap className="h-3.5 w-3.5 text-amber-500/70 shrink-0 fill-amber-500/70" />
                                Unlimited (10p)
                              </span>
                            </div>
                          ) : (
                            /* Giảng viên / Student: Hiện ô tick tương tác để bật/tắt */
                            <label
                              className="inline-flex items-center gap-2 cursor-pointer select-none group"
                              title="Click để bật/tắt quyền Unlimited (10p)"
                            >
                              <input
                                type="checkbox"
                                checked={Boolean(u.permissions?.unlimitedPractice)}
                                disabled={isUpdating}
                                onChange={() => handleToggleUnlimitedPermission(u)}
                                className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-brand-600 focus:ring-brand-500 accent-brand-600 cursor-pointer disabled:cursor-wait"
                              />
                              <span className="flex items-center gap-1 text-xs font-semibold text-slate-700 dark:text-slate-300 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                                <Zap className="h-3.5 w-3.5 text-amber-500 shrink-0 fill-amber-500" />
                                Unlimited (10p)
                              </span>
                            </label>
                          )}
                        </td>

                        {/* 4. Trạng thái */}
                        <td className="px-6 py-4">
                          {isLocked ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 dark:text-rose-400">
                              <Lock className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                              Bị khóa
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                              <UserCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                              Hoạt động
                            </span>
                          )}
                        </td>

                        {/* 5. Đăng nhập gần nhất */}
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300 text-xs font-medium whitespace-nowrap">
                          {formatDateTime(u.lastLoginAt || u.updatedAt || u.createdAt)}
                        </td>

                        {/* 6. Thao tác (Khóa, Sửa, Xóa - theo đúng ảnh) */}
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Nút Khóa / Mở khóa */}
                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={() => handleToggleStatus(u)}
                              title={isLocked ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
                              className={`p-2 rounded-xl border transition-all cursor-pointer active:scale-95 disabled:opacity-50 ${
                                isLocked
                                  ? 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800'
                                  : 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 border-slate-200 dark:border-slate-800'
                              }`}
                            >
                              {isLocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                            </button>

                            {/* Nút Sửa */}
                            <button
                              type="button"
                              onClick={() => setEditUser({ ...u, roles: uRoles })}
                              title="Chỉnh sửa tài khoản"
                              className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/40 border border-slate-200 dark:border-slate-800 transition cursor-pointer active:scale-95"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>

                            {/* Nút Xóa */}
                            <button
                              type="button"
                              disabled={uid === currentUser?.uid}
                              onClick={() => setDeleteModalUser(u)}
                              title={uid === currentUser?.uid ? 'Không thể xóa tài khoản của chính mình' : 'Xóa tài khoản'}
                              className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-800 transition cursor-pointer active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Chỉnh sửa tài khoản */}
      {editUser && (
        <Modal
          isOpen={Boolean(editUser)}
          onClose={() => setEditUser(null)}
          title="Chỉnh Sửa Thông Tin Tài Khoản"
          maxWidth="max-w-md"
        >
          <form onSubmit={handleSaveEditUser} className="p-6 space-y-5">
            {/* Tên hiển thị */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Họ và tên hiển thị
              </label>
              <input
                type="text"
                value={editUser.displayName || ''}
                onChange={(e) => setEditUser({ ...editUser, displayName: e.target.value })}
                className="w-full h-10 px-3.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-500 text-slate-900 dark:text-white"
                required
              />
            </div>

            {/* Email (Readonly) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400">
                Email / Tên định danh
              </label>
              <input
                type="text"
                value={editUser.email || ''}
                disabled
                className="w-full h-10 px-3.5 text-xs bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 dark:text-slate-400 font-mono cursor-not-allowed"
              />
            </div>

            {/* Vai trò (Multi-Role selector) */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Các vai trò phân quyền
              </label>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_ROLES.map((rDef) => {
                  const hasThisRole = (editUser.roles || []).includes(rDef.id);
                  return (
                    <button
                      key={rDef.id}
                      type="button"
                      onClick={() => {
                        let newRoles = [...(editUser.roles || [])];
                        if (hasThisRole) {
                          if (newRoles.length > 1) {
                            newRoles = newRoles.filter((r) => r !== rDef.id);
                          }
                        } else {
                          newRoles.push(rDef.id);
                        }
                        setEditUser({ ...editUser, roles: newRoles });
                      }}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer select-none ${
                        hasThisRole ? rDef.activeClass : rDef.inactiveClass
                      }`}
                    >
                      <span>{rDef.label}</span>
                      {hasThisRole && <Check className="h-3.5 w-3.5" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quyền Unlimited (10p) */}
            {(editUser.roles || []).includes('Admin') ? (
              /* Nếu có role Admin: Tự động kích hoạt sẵn */
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 opacity-80">
                <div className="flex items-center gap-2.5 select-none">
                  <div className="w-4 h-4 rounded border border-slate-300 dark:border-slate-600 bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0">
                    <Check className="h-3 w-3 stroke-[2.5]" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                      <Zap className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                      Quyền Unlimited (10p) — Tự động kích hoạt (Admin)
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Tài khoản có vai trò Admin mặc định được làm bài không giới hạn thời gian
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Nếu chỉ có role Giảng viên / Student: Hiện ô tick tương tác */
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 hover:border-brand-500/50 transition">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={Boolean(editUser.permissions?.unlimitedPractice)}
                    onChange={(e) => {
                      setEditUser({
                        ...editUser,
                        permissions: {
                          ...(editUser.permissions || {}),
                          unlimitedPractice: e.target.checked,
                          unlimited: e.target.checked,
                          isUnlimited: e.target.checked
                        }
                      });
                    }}
                    className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 accent-brand-600 cursor-pointer"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1">
                      <Zap className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                      Quyền Unlimited (10p)
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Cho phép làm bài thi và luyện tập không giới hạn thời gian (không bị dính cooldown)
                    </div>
                  </div>
                </label>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="ghost"
                type="button"
                size="sm"
                onClick={() => setEditUser(null)}
                className="h-10 px-5 text-xs font-semibold rounded-xl"
              >
                Hủy
              </Button>
              <Button
                variant="primary"
                type="submit"
                size="sm"
                loading={savingEdit}
                className="h-10 px-6 text-xs font-bold rounded-xl"
              >
                Lưu Thay Đổi
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Xác nhận xóa tài khoản */}
      {deleteModalUser && (
        <Modal
          isOpen={Boolean(deleteModalUser)}
          onClose={() => setDeleteModalUser(null)}
          title="Xác Nhận Xóa Tài Khoản"
          maxWidth="max-w-md"
        >
          <div className="p-6 space-y-4">
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-900 dark:text-rose-200 text-xs">
              <AlertTriangle className="h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
              <div className="space-y-1">
                <div className="font-bold text-sm">Cảnh báo hành động không thể hoàn tác!</div>
                <p className="leading-relaxed">
                  Bạn có chắc chắn muốn xóa vĩnh viễn tài khoản của <strong>{deleteModalUser.displayName || deleteModalUser.email}</strong> khỏi hệ thống?
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeleteModalUser(null)}
                className="h-10 px-5 text-xs font-semibold rounded-xl"
              >
                Hủy Bỏ
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleConfirmDelete}
                loading={deleting}
                icon={Trash2}
                className="h-10 px-6 text-xs font-bold rounded-xl"
              >
                Xác Nhận Xóa
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}


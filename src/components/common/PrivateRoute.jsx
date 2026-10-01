import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { PageLoader } from './PageLoader';

export function PrivateRoute({ children, roles = [] }) {
  const { currentUser, isAdmin, isLecturer, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <PageLoader message="Đang xác thực thông tin..." />;
  }

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 1. Quản trị viên (Admin) luôn có quyền truy cập vào MỌI route trong hệ thống
  if (isAdmin) {
    return children;
  }

  // 2. Nếu route yêu cầu vai trò Admin mà tài khoản không phải Admin
  if (roles.includes('Admin') && !isAdmin) {
    if (isLecturer) {
      return <Navigate to="/lecturer/dashboard" replace />;
    }
    return <Navigate to="/client/dashboard" replace />;
  }

  // 3. Nếu route yêu cầu vai trò Lecturer mà tài khoản là Student
  if (roles.includes('Lecturer') && !isLecturer) {
    return <Navigate to="/client/dashboard" replace />;
  }

  return children;
}

export default PrivateRoute;

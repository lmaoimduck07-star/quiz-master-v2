import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from '@/context/ThemeContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { MaintenanceProvider, useMaintenance } from '@/context/MaintenanceContext';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { PrivateRoute } from '@/components/common/PrivateRoute';
import { PageLoader } from '@/components/common/PageLoader';

// Pages
import Login from '@/pages/auth/Login';
import AdminDashboard from '@/pages/admin/AdminDashboard';
import LecturerDashboard from '@/pages/lecturer/LecturerDashboard';
import SpectatorView from '@/pages/lecturer/SpectatorView';
import ClientDashboard from '@/pages/student/ClientDashboard';
import MockExam from '@/pages/student/MockExam';
import PracticeReview from '@/pages/student/PracticeReview';
import InstantPractice from '@/pages/student/InstantPractice';
import MistakePractice from '@/pages/student/MistakePractice';
import SystemMaintenance from '@/pages/SystemMaintenance';
import NotFound from '@/pages/NotFound';

/**
 * MaintenanceGuard — Chuyển hướng người dùng sang trang bảo trì nếu hệ thống đang bảo trì,
 * ngoại trừ tài khoản Quản trị viên (Admin).
 */
function MaintenanceGuard({ children }) {
  const { isMaintenance, loading: maintenanceLoading } = useMaintenance();
  const { currentUser, isAdmin, loading: authLoading } = useAuth();
  const location = useLocation();

  const isAllowedPath = location.pathname === '/login' || location.pathname === '/maintenance';
  if (isAllowedPath) {
    return children;
  }

  if (maintenanceLoading || authLoading) {
    return <PageLoader message="Đang kết nối hệ thống..." />;
  }

  // Khi hệ thống đang bảo trì
  if (isMaintenance) {
    // Nếu chưa đăng nhập (người dùng vừa logout hoặc khách truy cập): Chuyển thẳng về trang /login
    if (!currentUser) {
      return <Navigate to="/login" replace />;
    }

    // Nếu là Quản trị viên (Admin): Giữ quyền truy cập các route Quản trị (/admin/*)
    if (isAdmin) {
      // Nếu Admin đang ở các route luyện tập hoặc giảng viên, tự động chuyển về Admin Dashboard để tránh can thiệp dữ liệu
      if (location.pathname.startsWith('/client') || location.pathname.startsWith('/lecturer')) {
        return <Navigate to="/admin/dashboard" replace />;
      }
      return children;
    }

    // Nếu là Giảng viên hoặc Thí sinh đã đăng nhập: Khóa toàn bộ và chuyển hướng về trang bảo trì
    return <Navigate to="/maintenance" replace />;
  }

  return children;
}


/**
 * HomeRedirect — Điều hướng trang chủ '/' dựa trên phiên đăng nhập, vai trò và chế độ bảo trì
 */
function HomeRedirect() {
  const { currentUser, activeRole, isAdmin, isLecturer, loading } = useAuth();
  const { isMaintenance } = useMaintenance();

  if (loading) {
    return <PageLoader message="Đang tải dữ liệu người dùng..." />;
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Nếu đang trong chế độ bảo trì:
  if (isMaintenance) {
    if (isAdmin) {
      return <Navigate to="/admin/dashboard" replace />;
    }
    return <Navigate to="/maintenance" replace />;
  }

  const effectiveRole = activeRole || (isAdmin ? 'Admin' : isLecturer ? 'Lecturer' : 'Student');

  if (effectiveRole === 'Admin') {
    return <Navigate to="/admin/dashboard" replace />;
  }

  if (effectiveRole === 'Lecturer') {
    return <Navigate to="/lecturer/dashboard" replace />;
  }

  return <Navigate to="/client/dashboard" replace />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <MaintenanceProvider>
          <AuthProvider>
            <BrowserRouter>
              <MaintenanceGuard>
                <Routes>
                  {/* Root redirect */}
                  <Route path="/" element={<HomeRedirect />} />

                  {/* Public routes */}
                  <Route path="/login" element={<Login />} />
                  <Route path="/maintenance" element={<SystemMaintenance />} />

                  {/* Admin routes (Admin only) */}
                  <Route
                    path="/admin/dashboard"
                    element={
                      <PrivateRoute roles={['Admin']}>
                        <AdminDashboard />
                      </PrivateRoute>
                    }
                  />

                  {/* Spectator route (Admin and Lecturer) */}
                  <Route
                    path="/admin/spectate/:sessionId"
                    element={
                      <PrivateRoute roles={['Admin', 'Lecturer']}>
                        <SpectatorView />
                      </PrivateRoute>
                    }
                  />

                  {/* Lecturer routes (Lecturer and Admin) */}
                  <Route
                    path="/lecturer/dashboard"
                    element={
                      <PrivateRoute roles={['Lecturer', 'Admin']}>
                        <LecturerDashboard />
                      </PrivateRoute>
                    }
                  />

                  {/* Student routes */}
                  <Route
                    path="/client/dashboard"
                    element={
                      <PrivateRoute>
                        <ClientDashboard />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/client/exam"
                    element={
                      <PrivateRoute>
                        <MockExam />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/client/exam/:urlSessionId"
                    element={
                      <PrivateRoute>
                        <MockExam />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/client/review"
                    element={
                      <PrivateRoute>
                        <PracticeReview />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/client/instant-practice"
                    element={
                      <PrivateRoute>
                        <InstantPractice />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/client/mistake-practice"
                    element={
                      <PrivateRoute>
                        <MistakePractice />
                      </PrivateRoute>
                    }
                  />

                  {/* 404 handler */}
                  <Route path="/404" element={<NotFound />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </MaintenanceGuard>
            </BrowserRouter>
          </AuthProvider>
        </MaintenanceProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Layouts
import PublicLayout from './components/layout/PublicLayout';
import DashboardLayout from './components/layout/DashboardLayout';

// Public Pages
import HomePage from './pages/public/HomePage';
import AuctionListPage from './pages/public/AuctionListPage';
import AuctionDetailPage from './pages/public/AuctionDetailPage';
import VerifyCOAPage from './pages/public/VerifyCOAPage';

// Auth Pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';

// Dashboards
import UserDashboardPage from './pages/user/UserDashboardPage';
import SellerDashboardPage from './pages/seller/SellerDashboardPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';

// Private Route Guard Component
const PrivateRoute: React.FC<{ children: React.ReactNode; allowedRoles?: string[] }> = ({ 
  children, 
  allowedRoles 
}) => {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-navy-deep text-slate-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-gold"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user!.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Views */}
          <Route path="/" element={<PublicLayout />}>
            <Route index element={<HomePage />} />
            <Route path="auctions" element={<AuctionListPage />} />
            <Route path="auctions/:id" element={<AuctionDetailPage />} />
            <Route path="verify" element={<VerifyCOAPage />} />
            <Route path="verify/:coaNumber" element={<VerifyCOAPage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="register" element={<RegisterPage />} />
          </Route>

          {/* Member/User Dashboard Views */}
          <Route 
            path="/dashboard" 
            element={
              <PrivateRoute allowedRoles={['member', 'seller', 'admin', 'superadmin']}>
                <DashboardLayout />
              </PrivateRoute>
            }
          >
            <Route index element={<UserDashboardPage />} />
            <Route path="winnings" element={<UserDashboardPage />} />
            <Route path="shipments" element={<UserDashboardPage />} />
          </Route>

          {/* Seller Dashboard Views */}
          <Route 
            path="/seller" 
            element={
              <PrivateRoute allowedRoles={['seller', 'admin']}>
                <DashboardLayout />
              </PrivateRoute>
            }
          >
            <Route index element={<SellerDashboardPage />} />
            <Route path="add-jersey" element={<SellerDashboardPage />} />
            <Route path="jerseys" element={<SellerDashboardPage />} />
            <Route path="auctions" element={<SellerDashboardPage />} />
            <Route path="sales" element={<SellerDashboardPage />} />
          </Route>

          {/* Admin Dashboard Views */}
          <Route 
            path="/admin" 
            element={
              <PrivateRoute allowedRoles={['admin', 'superadmin']}>
                <DashboardLayout />
              </PrivateRoute>
            }
          >
            <Route index element={<AdminDashboardPage />} />
            <Route path="users" element={<AdminDashboardPage />} />
            <Route path="jerseys" element={<AdminDashboardPage />} />
            <Route path="auctions" element={<AdminDashboardPage />} />
            <Route path="deposits" element={<AdminDashboardPage />} />
            <Route path="payments" element={<AdminDashboardPage />} />
            <Route path="shipments" element={<AdminDashboardPage />} />
            <Route path="certificates" element={<AdminDashboardPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

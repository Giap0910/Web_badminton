import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { CompareProvider } from './context/CompareContext';

import Navbar from './components/Navbar';
import Footer from './components/Footer';
import RacketComparisonBar from './components/RacketComparisonBar';
import AiChatbotWidget from './components/AiChatbotWidget';

// Eager load HomePage for instantaneous initial render (Core Web Vitals LCP)
import HomePage from './pages/HomePage';

// Lazy-loaded Customer & Shop Routes
const ProductsPage = lazy(() => import('./pages/ProductsPage'));
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage'));
const ComparePage = lazy(() => import('./pages/ComparePage'));
const CartPage = lazy(() => import('./pages/CartPage'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
const QRPaymentPage = lazy(() => import('./pages/QRPaymentPage'));
const OrderSuccessPage = lazy(() => import('./pages/OrderSuccessPage'));
const OrderDetailPage = lazy(() => import('./pages/OrderDetailPage'));
const MyOrdersPage = lazy(() => import('./pages/MyOrdersPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const ShippingAddressPage = lazy(() => import('./pages/ShippingAddressPage'));
const ReviewedProductsPage = lazy(() => import('./pages/ReviewedProductsPage'));
const ReturnRequestPage = lazy(() => import('./pages/ReturnRequestPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));

// Lazy-loaded Admin Back-Office Routes
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage'));
const AdminProductsPage = lazy(() => import('./pages/AdminProductsPage'));
const AdminOrdersPage = lazy(() => import('./pages/AdminOrdersPage'));
const AdminCustomersPage = lazy(() => import('./pages/AdminCustomersPage'));
const AdminPaymentsPage = lazy(() => import('./pages/AdminPaymentsPage'));
const AdminVouchersPage = lazy(() => import('./pages/AdminVouchersPage'));
const AdminReviewsPage = lazy(() => import('./pages/AdminReviewsPage'));
const AdminSettingsPage = lazy(() => import('./pages/AdminSettingsPage'));

// High-performance Fallback Spinner
const PageFallbackLoader = () => (
  <div className="min-h-[55vh] flex flex-col items-center justify-center gap-3 py-20">
    <div className="w-10 h-10 border-4 border-secondary border-t-transparent rounded-full animate-spin" />
    <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Đang tải trang...</span>
  </div>
);

// Protected Route Guard for Admin
const AdminRoute = ({ children }) => {
  const { user, isAdmin, loading } = useAuth();
  if (loading) return null;
  if (!user || !isAdmin) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

// Protected Route Guard for Authenticated Users
const PrivateRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function AppContent() {
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';
  const isAdminPage = location.pathname.startsWith('/admin');
  const hideCustomerNav = isAuthPage || isAdminPage;

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-800 antialiased">
      {!hideCustomerNav && <Navbar />}

      <div className="flex-1">
        <Suspense fallback={<PageFallbackLoader />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/products/:id" element={<ProductDetailPage />} />
            <Route path="/compare" element={<ComparePage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route
              path="/checkout"
              element={
                <PrivateRoute>
                  <CheckoutPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/payment/qr/:orderId"
              element={
                <PrivateRoute>
                  <QRPaymentPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/order-success/:orderId"
              element={
                <PrivateRoute>
                  <OrderSuccessPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/orders/:id"
              element={
                <PrivateRoute>
                  <OrderDetailPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/orders/success"
              element={
                <PrivateRoute>
                  <OrderSuccessPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/my-orders"
              element={
                <PrivateRoute>
                  <MyOrdersPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <PrivateRoute>
                  <ProfilePage />
                </PrivateRoute>
              }
            />
            <Route
              path="/shipping-addresses"
              element={
                <PrivateRoute>
                  <ShippingAddressPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/reviewed-products"
              element={
                <PrivateRoute>
                  <ReviewedProductsPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/returns"
              element={
                <PrivateRoute>
                  <ReturnRequestPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <AdminDashboardPage />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/products"
              element={
                <AdminRoute>
                  <AdminProductsPage />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/orders"
              element={
                <AdminRoute>
                  <AdminOrdersPage />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/customers"
              element={
                <AdminRoute>
                  <AdminCustomersPage />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/payments"
              element={
                <AdminRoute>
                  <AdminPaymentsPage />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/vouchers"
              element={
                <AdminRoute>
                  <AdminVouchersPage />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/reviews"
              element={
                <AdminRoute>
                  <AdminReviewsPage />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/settings"
              element={
                <AdminRoute>
                  <AdminSettingsPage />
                </AdminRoute>
              }
            />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </div>

      {!hideCustomerNav && <Footer />}
      {!hideCustomerNav && <RacketComparisonBar />}
      {!hideCustomerNav && <AiChatbotWidget />}
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <CartProvider>
          <CompareProvider>
            <AppContent />
          </CompareProvider>
        </CartProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;

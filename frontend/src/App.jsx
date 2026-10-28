import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { CompareProvider } from './context/CompareContext';

import Navbar from './components/Navbar';
import AdminPageBoundary from './components/AdminPageBoundary';
import Footer from './components/Footer';
import RacketComparisonBar from './components/RacketComparisonBar';
import AiChatbotWidget from './components/AiChatbotWidget';

// Eager load HomePage for instantaneous initial render (Core Web Vitals LCP)
import HomePage from './pages/HomePage';

// Lazy-loaded Customer & Shop Routes
const ProductsPage = lazy(() => import('./pages/ProductsPage'));
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage'));
const RacketGripDetailPage = lazy(() => import('./pages/RacketGripDetailPage'));
const StringDetailPage = lazy(() => import('./pages/StringDetailPage'));
const ShuttlecockDetailPage = lazy(() => import('./pages/ShuttlecockDetailPage'));
const SweatbandDetailPage = lazy(() => import('./pages/SweatbandDetailPage'));
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
export const AdminRoute = ({ children }) => {
  const { user, isAuthenticated, isAdmin, loading, verificationError, retryVerification } = useAuth();
  const location = useLocation();
  if (loading) return <PageFallbackLoader />;
  if (verificationError) return <SessionVerificationError message={verificationError} onRetry={retryVerification} />;
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location.pathname + location.search, returnState: location.state }} />;
  if (!isAdmin) return <p role="alert" className="p-8">Tài khoản này không có quyền quản trị.</p>;
  return <React.Fragment key={user.id}><AdminPageBoundary key={location.pathname + location.search}>{children}</AdminPageBoundary></React.Fragment>;
};

// Protected Route Guard for Authenticated Users
export const PrivateRoute = ({ children }) => {
  const { user, isAuthenticated, loading, verificationError, retryVerification } = useAuth();
  const location = useLocation();
  if (loading) return <PageFallbackLoader />;
  if (verificationError) return <SessionVerificationError message={verificationError} onRetry={retryVerification} />;
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location.pathname + location.search, returnState: location.state }} />;
  return <React.Fragment key={user.id}>{children}</React.Fragment>;
};

export const SessionVerificationError = ({ message, onRetry }) => <div role="alert" className="p-8 text-center space-y-3">
  <p>{message}</p><button type="button" onClick={onRetry} className="rounded-xl bg-slate-900 text-white px-4 py-2">Xác minh lại phiên đăng nhập</button>
</div>;

function AppContent() {
  const location = useLocation();
  const { sessionNotice } = useAuth();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';
  const isAdminPage = location.pathname.startsWith('/admin');
  const hideCustomerNav = isAuthPage || isAdminPage;

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-800 antialiased">
      {!hideCustomerNav && <Navbar />}
      {sessionNotice && <p role="status" className="p-3 text-sm text-center bg-blue-50 text-blue-900">{sessionNotice}</p>}

      <div className="flex-1">
        <Suspense fallback={<PageFallbackLoader />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/products/:id" element={<ProductDetailPage />} />

            {/* 4 Trang Chi Tiết Phụ Kiện Chuyên Biệt Mới */}
            <Route path="/product/racket-grip/:id" element={<ProductDetailPage />} />
            <Route path="/product/string/:id" element={<ProductDetailPage />} />
            <Route path="/product/shuttlecock/:id" element={<ProductDetailPage />} />
            <Route path="/product/sweatband/:id" element={<ProductDetailPage />} />

            {/* Alias tương thích /products/... */}
            <Route path="/products/racket-grip/:id" element={<ProductDetailPage />} />
            <Route path="/products/string/:id" element={<ProductDetailPage />} />
            <Route path="/products/shuttlecock/:id" element={<ProductDetailPage />} />
            <Route path="/products/sweatband/:id" element={<ProductDetailPage />} />
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
              path="/orders/cancel"
              element={
                <PrivateRoute>
                  <Navigate to="/my-orders" replace />
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

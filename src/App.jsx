import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { useAuth } from './context/AuthContext.jsx'
import Spinner from './components/common/Spinner.jsx'

// ─── Public Pages ────────────────────────────────────────────
import Landing from './pages/Landing.jsx'
import Login   from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import VerifyOtp from './pages/VerifyOtp.jsx'

// ─── Student Pages ───────────────────────────────────────────
import MenuPage     from './pages/student/MenuPage.jsx'
import CheckoutPage from './pages/student/CheckoutPage.jsx'
import QRPage       from './pages/student/QRPage.jsx'
import HistoryPage  from './pages/student/HistoryPage.jsx'

// ─── Staff Pages ─────────────────────────────────────────────
import ScannerPage      from './pages/staff/ScannerPage.jsx'
import ActiveOrdersPage from './pages/staff/ActiveOrdersPage.jsx'

// ─── Admin Pages (lazy-loaded — not in student/staff bundle) ─
const DashboardPage   = lazy(() => import('./pages/admin/DashboardPage.jsx'))
const MenuManagerPage = lazy(() => import('./pages/admin/MenuManagerPage.jsx'))
const StockPage       = lazy(() => import('./pages/admin/StockPage.jsx'))
const OrdersPage      = lazy(() => import('./pages/admin/OrdersPage.jsx'))
const FraudPage       = lazy(() => import('./pages/admin/FraudPage.jsx'))

// ─── Role Redirect Map ───────────────────────────────────────
const ROLE_REDIRECT = {
  student: '/student/menu',
  staff:   '/staff/scanner',
  admin:   '/admin/dashboard',
}

// ─── Protected Route ─────────────────────────────────────────
function ProtectedRoute({ children, requiredRole }) {
  const { user, profile, isLoading } = useAuth()

  if (isLoading) return <Spinner fullScreen />
  if (!user)     return <Navigate to="/login" replace />

  if (requiredRole && profile?.role !== requiredRole) {
    const redirect = ROLE_REDIRECT[profile?.role] ?? '/login'
    return <Navigate to={redirect} replace />
  }

  return children
}

// ─── App Router ──────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/"      element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-otp" element={<VerifyOtp />} />

        {/* Student */}
        <Route
          path="/student/menu"
          element={<ProtectedRoute requiredRole="student"><MenuPage /></ProtectedRoute>}
        />
        <Route
          path="/student/checkout"
          element={<ProtectedRoute requiredRole="student"><CheckoutPage /></ProtectedRoute>}
        />
        <Route
          path="/student/qr"
          element={<ProtectedRoute requiredRole="student"><QRPage /></ProtectedRoute>}
        />
        <Route
          path="/student/history"
          element={<ProtectedRoute requiredRole="student"><HistoryPage /></ProtectedRoute>}
        />

        {/* Staff */}
        <Route
          path="/staff/scanner"
          element={<ProtectedRoute requiredRole="staff"><ScannerPage /></ProtectedRoute>}
        />
        <Route
          path="/staff/orders"
          element={<ProtectedRoute requiredRole="staff"><ActiveOrdersPage /></ProtectedRoute>}
        />

        {/* Admin — lazy-loaded */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute requiredRole="admin">
              <Suspense fallback={<Spinner fullScreen />}>
                <DashboardPage />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/menu"
          element={
            <ProtectedRoute requiredRole="admin">
              <Suspense fallback={<Spinner fullScreen />}>
                <MenuManagerPage />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/stock"
          element={
            <ProtectedRoute requiredRole="admin">
              <Suspense fallback={<Spinner fullScreen />}>
                <StockPage />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/orders"
          element={
            <ProtectedRoute requiredRole="admin">
              <Suspense fallback={<Spinner fullScreen />}>
                <OrdersPage />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/fraud"
          element={
            <ProtectedRoute requiredRole="admin">
              <Suspense fallback={<Spinner fullScreen />}>
                <FraudPage />
              </Suspense>
            </ProtectedRoute>
          }
        />

        {/* Catch-all — redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

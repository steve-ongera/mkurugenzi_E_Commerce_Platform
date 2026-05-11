// App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { CartProvider } from './contexts/CartContext'

// Layout
import Navbar     from './components/Navbar'
import Footer     from './components/Footer'
import CartDrawer from './components/CartDrawer'

// Admin layout + pages
import AdminLayout    from './components/admin/AdminLayout'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminProducts  from './pages/admin/AdminProducts'
import AdminReports   from './pages/admin/AdminReports'
import AdminInventory from './pages/admin/AdminInventory'

// Public pages
import Home          from './pages/index'
import Store         from './pages/store'
import ProductDetail from './pages/product_detail'
import Category      from './pages/category'
import Cart          from './pages/cart'
import Checkout      from './pages/checkout'
import Orders        from './pages/orders'
import OrderDetail   from './pages/order_detail'
import Profile       from './pages/profile'
import Login         from './pages/login'
import Register      from './pages/register'

// ── Route guards ──────────────────────────────────────────────────────────────

/** Redirect authenticated users away from login / register.
 *  If they are staff, send them to the admin dashboard. */
function GuestRoute({ children }) {
  const { user } = useAuth()
  if (!user) return children
  return <Navigate to={user.is_staff ? '/admin' : '/'} replace />
}

/** Redirect unauthenticated users to login */
function PrivateRoute({ children }) {
  const { user } = useAuth()
  return user ? children : <Navigate to="/login" replace />
}

/** Only staff / superusers can access admin routes */
function AdminRoute({ children }) {
  const { user } = useAuth()
  if (!user)          return <Navigate to="/login"  replace />
  if (!user.is_staff) return <Navigate to="/"       replace />
  return children
}

// ── Storefront shell ──────────────────────────────────────────────────────────

function AppShell() {
  return (
    <>
      <Navbar />
      <CartDrawer />
      <main className="site-main">
        <Routes>
          {/* Public */}
          <Route path="/"                    element={<Home />} />
          <Route path="/store"               element={<Store />} />
          <Route path="/product/:slug"       element={<ProductDetail />} />
          <Route path="/category/:slug"      element={<Category />} />
          <Route path="/cart"                element={<Cart />} />

          {/* Guest-only */}
          <Route path="/login"    element={<GuestRoute><Login /></GuestRoute>} />
          <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />

          {/* Guest checkout allowed */}
          <Route path="/checkout" element={<Checkout />} />

          {/* Auth-required */}
          <Route path="/orders"         element={<PrivateRoute><Orders /></PrivateRoute>} />
          <Route path="/orders/:number" element={<PrivateRoute><OrderDetail /></PrivateRoute>} />
          <Route path="/profile"        element={<PrivateRoute><Profile /></PrivateRoute>} />

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </>
  )
}

// ── Admin shell ───────────────────────────────────────────────────────────────

function AdminShell() {
  return (
    <AdminRoute>
      <Routes>
        <Route element={<AdminLayout />}>
          <Route index                    element={<AdminDashboard />} />
          <Route path="products"          element={<AdminProducts />} />
          <Route path="reports"           element={<AdminReports />} />
          <Route path="inventory"         element={<AdminInventory />} />
          {/* Placeholder stubs for sidebar links not yet built */}
          <Route path="orders"            element={<AdminPlaceholder title="Orders" />} />
          <Route path="customers"         element={<AdminPlaceholder title="Customers" />} />
          <Route path="coupons"           element={<AdminPlaceholder title="Coupons" />} />
          <Route path="delivery"          element={<AdminPlaceholder title="Delivery" />} />
          <Route path="settings"          element={<AdminPlaceholder title="Settings" />} />
          <Route path="*"                 element={<AdminPlaceholder title="Coming Soon" />} />
        </Route>
      </Routes>
    </AdminRoute>
  )
}

function AdminPlaceholder({ title }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 400, gap: 12, color: 'var(--adm-text-dim)', fontFamily: 'var(--adm-font-mono)' }}>
      <i className="ph ph-hammer" style={{ fontSize: 40 }} />
      <p style={{ fontSize: 14 }}>{title} — coming soon</p>
    </div>
  )
}

function NotFound() {
  return (
    <div className="not-found">
      <div className="not-found-inner">
        <span className="not-found-code">404</span>
        <h1>Page not found</h1>
        <p>The page you're looking for doesn't exist or has been moved.</p>
        <a href="/" className="btn btn-primary">Back to Home</a>
      </div>
    </div>
  )
}

// ── Root export ───────────────────────────────────────────────────────────────

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <Routes>
            {/* All /admin/* routes → AdminShell (no storefront Navbar/Footer) */}
            <Route path="/admin/*" element={<AdminShell />} />

            {/* Everything else → storefront AppShell */}
            <Route path="/*"       element={<AppShell />} />
          </Routes>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
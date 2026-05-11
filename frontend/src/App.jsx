// App.jsx

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { CartProvider } from './contexts/CartContext'

// Layout
import Navbar   from './components/Navbar'
import Footer   from './components/Footer'
import CartDrawer from './components/CartDrawer'

// Pages
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

/** Redirect authenticated users away from login / register */
function GuestRoute({ children }) {
  const { user } = useAuth()
  return user ? <Navigate to="/" replace /> : children
}

/** Redirect unauthenticated users to login */
function PrivateRoute({ children }) {
  const { user } = useAuth()
  return user ? children : <Navigate to="/login" replace />
}

// ── App shell ─────────────────────────────────────────────────────────────────

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

          {/* Checkout — accessible to guests too (guest checkout) */}
          <Route path="/checkout" element={<Checkout />} />

          {/* Auth-required */}
          <Route path="/orders"         element={<PrivateRoute><Orders /></PrivateRoute>} />
          <Route path="/orders/:number" element={<PrivateRoute><OrderDetail /></PrivateRoute>} />
          <Route path="/profile"        element={<PrivateRoute><Profile /></PrivateRoute>} />

          {/* 404 fallback */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      <Footer />
    </>
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
          <AppShell />
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useCart } from '../contexts/CartContext'
import { categories, debounce } from '../utils/api'

export default function Navbar() {
  const { user, logout } = useAuth()
  const { totalUnits, setDrawerOpen } = useCart()
  const navigate = useNavigate()

  const [cats, setCats] = useState([])
  const [search, setSearch] = useState('')
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef(null)

  useEffect(() => {
    categories.tree().then(setCats).catch(() => {})
  }, [])

  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSearch = (e) => {
    e.preventDefault()
    if (search.trim()) {
      navigate(`/store?search=${encodeURIComponent(search.trim())}`)
      setSearch('')
    }
  }

  const handleLogout = async () => {
    await logout()
    setProfileOpen(false)
    navigate('/')
  }

  return (
    <header className="site-header">
      <div className="promo-bar">
        🚀 <strong>Free shipping</strong> on orders over KES 5,000 · Use code <strong>MKURU10</strong> for 10% off your first order
      </div>

      <div className="navbar">
        <Link to="/" className="navbar-logo">
          <div className="navbar-logo-mark">🛍</div>
          <span className="navbar-logo-text">Mkuru<span>genzi</span></span>
        </Link>

        <div className="navbar-search">
          <form className="navbar-search-wrap" onSubmit={handleSearch}>
            <input
              type="text"
              placeholder="Search products, brands, categories…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button type="submit" className="navbar-search-btn">
              <i className="ph ph-magnifying-glass" /> Search
            </button>
          </form>
        </div>

        <div className="navbar-actions">
          {user ? (
            <div style={{ position: 'relative' }} ref={profileRef}>
              <button
                className="nav-action"
                onClick={() => setProfileOpen(!profileOpen)}
              >
                <i className="ph ph-user-circle" />
                <span className="nav-action-label">{user.full_name?.split(' ')[0] || 'Account'}</span>
              </button>
              {profileOpen && (
                <div style={{
                  position: 'absolute', top: '100%', right: 0,
                  background: '#fff', border: '1px solid var(--gray-200)',
                  borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)',
                  minWidth: 180, zIndex: 999, overflow: 'hidden',
                }}>
                  <Link to="/profile" onClick={() => setProfileOpen(false)} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '12px 16px', color: 'var(--gray-700)',
                    fontSize: 14, fontWeight: 500,
                  }}>
                    <i className="ph ph-user" style={{ fontSize: 16 }} /> My Profile
                  </Link>
                  <Link to="/orders" onClick={() => setProfileOpen(false)} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '12px 16px', color: 'var(--gray-700)',
                    fontSize: 14, fontWeight: 500,
                    borderTop: '1px solid var(--gray-100)',
                  }}>
                    <i className="ph ph-package" style={{ fontSize: 16 }} /> My Orders
                  </Link>
                  <button onClick={handleLogout} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '12px 16px', color: 'var(--danger)',
                    fontSize: 14, fontWeight: 500, width: '100%',
                    border: 'none', background: 'none', cursor: 'pointer',
                    borderTop: '1px solid var(--gray-100)',
                  }}>
                    <i className="ph ph-sign-out" style={{ fontSize: 16 }} /> Log Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className="nav-action">
              <i className="ph ph-user" />
              <span className="nav-action-label">Login</span>
            </Link>
          )}

          <Link to="/orders" className="nav-action">
            <i className="ph ph-package" />
            <span className="nav-action-label">Orders</span>
          </Link>

          <button className="nav-action" onClick={() => setDrawerOpen(true)}>
            <i className="ph ph-shopping-cart" />
            <span className="nav-action-label">Cart</span>
            {totalUnits > 0 && (
              <span className="cart-badge">{totalUnits > 99 ? '99+' : totalUnits}</span>
            )}
          </button>
        </div>
      </div>

      <nav className="category-bar">
        <div className="category-bar-inner">
          <Link to="/store" className="cat-link">
            <i className="ph ph-squares-four" /> All Products
          </Link>
          {cats.slice(0, 8).map((c) => (
            <Link key={c.id} to={`/category/${c.slug}`} className="cat-link">
              {c.icon && <span>{c.icon}</span>}
              {c.name}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  )
}
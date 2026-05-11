import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useCart } from '../contexts/CartContext'
import { categories } from '../utils/api'

export default function Navbar() {
  const { user, logout } = useAuth()
  const { totalUnits, setDrawerOpen } = useCart()
  const navigate  = useNavigate()
  const location  = useLocation()

  const [cats,          setCats]          = useState([])
  const [search,        setSearch]        = useState('')
  const [profileOpen,   setProfileOpen]   = useState(false)
  const [drawerOpen,    setDrawerOpen_]   = useState(false)   // mobile sidebar
  const profileRef = useRef(null)

  useEffect(() => {
    categories.tree().then(setCats).catch(() => {})
  }, [])

  // Close drawer on route change
  useEffect(() => { setDrawerOpen_(false) }, [location.pathname])

  // Click-outside profile dropdown
  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Prevent body scroll when drawer open
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [drawerOpen])

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
    setDrawerOpen_(false)
    navigate('/')
  }

  const drawerCategories = cats.slice(0, 12)

  return (
    <>
      <header className="site-header">
        {/* Promo bar */}
        <div className="promo-bar">
          🚀 <strong>Free shipping</strong> over KES 5,000 &nbsp;·&nbsp; Code <strong>MKURU10</strong> = 10% off first order
        </div>

        {/* Main navbar */}
        <div className="navbar">
          {/* Hamburger — mobile only */}
          <button
            className="navbar-menu-btn"
            onClick={() => setDrawerOpen_(true)}
            aria-label="Open menu"
          >
            <i className="bi bi-list" />
          </button>

          {/* Logo */}
          <Link to="/" className="navbar-logo">
            <div className="navbar-logo-mark">
              <i className="bi bi-bag-heart-fill" style={{ fontSize: 16 }} />
            </div>
            <span className="navbar-logo-text">Mkuru<span>genzi</span></span>
          </Link>

          {/* Search */}
          <div className="navbar-search">
            <form className="navbar-search-wrap" onSubmit={handleSearch}>
              <input
                type="text"
                placeholder="Search products, brands…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button type="submit" className="navbar-search-btn">
                <i className="bi bi-search" />
                <span className="btn-text">Search</span>
              </button>
            </form>
          </div>

          {/* Actions */}
          <div className="navbar-actions">
            {user ? (
              <div style={{ position: 'relative' }} ref={profileRef}>
                <button
                  className="nav-action"
                  onClick={() => setProfileOpen(!profileOpen)}
                  aria-label="Account"
                >
                  <i className="bi bi-person-circle" />
                  <span className="nav-action-label">
                    {user.full_name?.split(' ')[0] || 'Account'}
                  </span>
                </button>
                {profileOpen && (
                  <div style={{
                    position: 'absolute', top: 'calc(100% + 4px)', right: 0,
                    background: '#fff', border: '1px solid var(--gray-200)',
                    borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)',
                    minWidth: 176, zIndex: 999, overflow: 'hidden',
                    animation: 'slideInUp .15s ease',
                  }}>
                    <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--gray-100)', background: 'var(--primary-xlight)' }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--gray-900)' }}>{user.full_name || user.email}</div>
                      <div style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 2 }}>{user.email}</div>
                    </div>
                    {[
                      { to: '/profile', icon: 'bi-person',  label: 'My Profile' },
                      { to: '/orders',  icon: 'bi-box-seam', label: 'My Orders' },
                    ].map(item => (
                      <Link key={item.to} to={item.to} onClick={() => setProfileOpen(false)} style={{
                        display: 'flex', alignItems: 'center', gap: 9,
                        padding: '10px 14px', color: 'var(--gray-700)',
                        fontSize: 13, fontWeight: 500,
                        borderBottom: '1px solid var(--gray-100)',
                        transition: 'background .15s',
                      }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--gray-50)'}
                        onMouseLeave={e => e.currentTarget.style.background = ''}
                      >
                        <i className={`bi ${item.icon}`} style={{ fontSize: 15 }} /> {item.label}
                      </Link>
                    ))}
                    <button onClick={handleLogout} style={{
                      display: 'flex', alignItems: 'center', gap: 9,
                      padding: '10px 14px', color: 'var(--danger)',
                      fontSize: 13, fontWeight: 500, width: '100%',
                      border: 'none', background: 'none', cursor: 'pointer',
                    }}>
                      <i className="bi bi-box-arrow-right" style={{ fontSize: 15 }} /> Log Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" className="nav-action">
                <i className="bi bi-person" />
                <span className="nav-action-label">Login</span>
              </Link>
            )}

            <Link to="/orders" className="nav-action desktop-only">
              <i className="bi bi-box-seam" />
              <span className="nav-action-label">Orders</span>
            </Link>

            <button className="nav-action" onClick={() => setDrawerOpen(true)} aria-label="Cart">
              <i className="bi bi-cart3" />
              <span className="nav-action-label">Cart</span>
              {totalUnits > 0 && (
                <span className="cart-badge">{totalUnits > 99 ? '99+' : totalUnits}</span>
              )}
            </button>
          </div>
        </div>

        {/* Category bar */}
        <nav className="category-bar">
          <div className="category-bar-inner">
            <Link to="/store" className="cat-link">
              <i className="bi bi-grid-3x3-gap" /> All
            </Link>
            {cats.slice(0, 8).map((c) => (
              <Link key={c.id} to={`/category/${c.slug}`} className="cat-link">
                {c.icon ? <span>{c.icon}</span> : <i className="bi bi-tag" />}
                {c.name}
              </Link>
            ))}
          </div>
        </nav>
      </header>

      {/* ── Mobile Drawer ──────────────────────────────────────────────── */}
      <div
        className={`drawer-overlay${drawerOpen ? ' open' : ''}`}
        onClick={() => setDrawerOpen_(false)}
      />
      <aside className={`mobile-drawer${drawerOpen ? ' open' : ''}`}>
        <div className="drawer-header">
          <div className="drawer-header-logo">
            <i className="bi bi-bag-heart-fill" /> Mkuru<span>genzi</span>
          </div>
          <button className="drawer-close" onClick={() => setDrawerOpen_(false)} aria-label="Close">
            <i className="bi bi-x-lg" />
          </button>
        </div>

        {/* User bar */}
        <div className="drawer-user-bar">
          <div className="drawer-user-icon">
            <i className="bi bi-person" />
          </div>
          <div>
            {user ? (
              <>
                <div className="drawer-user-name">{user.full_name || user.email}</div>
                <div className="drawer-user-sub">{user.email}</div>
              </>
            ) : (
              <>
                <div className="drawer-user-name">Welcome!</div>
                <div className="drawer-user-sub">
                  <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>Login</Link>
                  {' · '}
                  <Link to="/register" style={{ color: 'var(--primary)', fontWeight: 600 }}>Register</Link>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Main nav */}
        <div className="drawer-section-title">Navigate</div>
        {[
          { to: '/',         icon: 'bi-house',      label: 'Home' },
          { to: '/store',    icon: 'bi-shop',       label: 'All Products' },
          { to: '/orders',   icon: 'bi-box-seam',   label: 'My Orders' },
          { to: '/profile',  icon: 'bi-person',     label: 'My Profile' },
        ].map(item => (
          <Link key={item.to} to={item.to} className="drawer-nav-item">
            <i className={`bi ${item.icon}`} />
            {item.label}
            <i className="bi bi-chevron-right chevron" />
          </Link>
        ))}

        <div className="drawer-divider" />

        {/* Categories */}
        <div className="drawer-section-title">Shop by Category</div>
        {drawerCategories.map(cat => (
          <Link
            key={cat.id}
            to={`/category/${cat.slug}`}
            className="drawer-nav-item"
          >
            <span style={{ fontSize: 17, width: 22, textAlign: 'center' }}>
              {cat.icon || '📦'}
            </span>
            {cat.name}
            <i className="bi bi-chevron-right chevron" />
          </Link>
        ))}

        {user && (
          <>
            <div className="drawer-divider" />
            <button
              onClick={handleLogout}
              className="drawer-nav-item"
              style={{
                color: 'var(--danger)', background: 'none', border: 'none',
                width: '100%', cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              <i className="bi bi-box-arrow-right" style={{ width: 22, textAlign: 'center' }} />
              Log Out
            </button>
          </>
        )}
      </aside>

      {/* ── Mobile Bottom Nav ──────────────────────────────────────────── */}
      <nav className="mobile-bottom-nav">
        <div className="mobile-bottom-nav-inner">
          <Link to="/" className={`bottom-nav-item${location.pathname === '/' ? ' active' : ''}`}>
            <i className="bi bi-house" />
            Home
          </Link>
          <Link to="/store" className={`bottom-nav-item${location.pathname.startsWith('/store') ? ' active' : ''}`}>
            <i className="bi bi-grid" />
            Shop
          </Link>
          <button className="bottom-nav-item" onClick={() => setDrawerOpen(true)}>
            <i className="bi bi-cart3" />
            Cart
            {totalUnits > 0 && (
              <span className="bottom-nav-badge">{totalUnits > 99 ? '99+' : totalUnits}</span>
            )}
          </button>
          <Link to="/orders" className={`bottom-nav-item${location.pathname.startsWith('/orders') ? ' active' : ''}`}>
            <i className="bi bi-box-seam" />
            Orders
          </Link>
          <Link to={user ? '/profile' : '/login'}
            className={`bottom-nav-item${location.pathname.startsWith('/profile') || location.pathname.startsWith('/login') ? ' active' : ''}`}
          >
            <i className="bi bi-person" />
            {user ? 'Account' : 'Login'}
          </Link>
        </div>
      </nav>
    </>
  )
}
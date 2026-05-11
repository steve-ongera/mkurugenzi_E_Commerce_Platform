import { useState } from 'react'
import { Link } from 'react-router-dom'

function FooterAccordion({ title, children }) {
  const [open, setOpen] = useState(false)
  return (
    <div>
      {/* On mobile, show as accordion toggle */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          marginBottom: open ? 10 : 0,
        }}
      >
        <div className="footer-col-title" style={{ margin: 0 }}>{title}</div>
        <i
          className={`bi bi-chevron-${open ? 'up' : 'down'}`}
          style={{ color: 'var(--gray-500)', fontSize: 13 }}
        />
      </button>
      {open && <div className="footer-links" style={{ marginTop: 10 }}>{children}</div>}
    </div>
  )
}

function FooterDesktopCol({ title, children }) {
  return (
    <div>
      <div className="footer-col-title">{title}</div>
      <div className="footer-links">{children}</div>
    </div>
  )
}

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="site-footer">
      <div className="footer-top">
        {/* Brand column */}
        <div>
          <div className="footer-brand-logo">
            <i className="bi bi-bag-heart-fill" style={{ color: '#60a5fa' }} />
            Mkuru<span>genzi</span>
          </div>
          <p className="footer-brand-tagline">
            Kenya's premier online marketplace. Quality products, fast delivery across all 47 counties.
          </p>
          <div className="footer-social">
            <a href="#" className="social-btn" aria-label="Facebook">
              <i className="bi bi-facebook" />
            </a>
            <a href="#" className="social-btn" aria-label="Twitter/X">
              <i className="bi bi-twitter-x" />
            </a>
            <a href="#" className="social-btn" aria-label="Instagram">
              <i className="bi bi-instagram" />
            </a>
            <a href="#" className="social-btn" aria-label="WhatsApp">
              <i className="bi bi-whatsapp" />
            </a>
            <a href="#" className="social-btn" aria-label="YouTube">
              <i className="bi bi-youtube" />
            </a>
          </div>
          <div className="footer-payments">
            <span className="payment-logo mpesa">
              <i className="bi bi-phone" /> M-Pesa
            </span>
            <span className="payment-logo">
              <i className="bi bi-credit-card" /> Visa
            </span>
            <span className="payment-logo">
              <i className="bi bi-credit-card-2-back" /> Mastercard
            </span>
            <span className="payment-logo">
              <i className="bi bi-bank" /> Bank
            </span>
          </div>
        </div>

        {/* Link columns — accordion on mobile, grid on desktop */}
        <div className="footer-cols-grid">
          {/* Mobile: accordion */}
          <div className="d-block" style={{ display: 'none' }}>
            <FooterAccordion title="Shop">
              <Link to="/store">All Products</Link>
              <Link to="/store?flash_deal=true">Flash Deals</Link>
              <Link to="/store?is_featured=true">Featured</Link>
              <Link to="/store?in_stock=true">In Stock</Link>
            </FooterAccordion>
          </div>

          {/* Desktop cols */}
          <FooterDesktopCol title="Shop">
            <Link to="/store">All Products</Link>
            <Link to="/store?flash_deal=true">⚡ Flash Deals</Link>
            <Link to="/store?is_featured=true">Featured</Link>
            <Link to="/store?in_stock=true">In Stock</Link>
            <Link to="/store?sort=-created_at">New Arrivals</Link>
          </FooterDesktopCol>

          <FooterDesktopCol title="Account">
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
            <Link to="/orders">My Orders</Link>
            <Link to="/profile">My Profile</Link>
          </FooterDesktopCol>

          <FooterDesktopCol title="Support">
            <a href="#">Help Centre</a>
            <a href="#">Returns Policy</a>
            <a href="#">Delivery Info</a>
            <a href="#">Contact Us</a>
            <a href="#">Privacy Policy</a>
          </FooterDesktopCol>
        </div>
      </div>

      {/* Delivery trust strip */}
      <div style={{
        borderTop: '1px solid var(--gray-800)',
        borderBottom: '1px solid var(--gray-800)',
        padding: '14px var(--gutter)',
      }}>
        <div style={{
          maxWidth: 'var(--container)',
          margin: '0 auto',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 16,
          justifyContent: 'center',
        }}>
          {[
            { icon: 'bi-truck',          label: 'Nationwide Delivery' },
            { icon: 'bi-shield-check',   label: 'Secure Payments' },
            { icon: 'bi-arrow-counterclockwise', label: 'Easy Returns' },
            { icon: 'bi-headset',        label: '24/7 Support' },
          ].map(item => (
            <div key={item.label} style={{
              display: 'flex', alignItems: 'center', gap: 7,
              fontSize: 12, color: 'var(--gray-400)',
              fontWeight: 500,
            }}>
              <i className={`bi ${item.icon}`} style={{ fontSize: 16, color: '#60a5fa' }} />
              {item.label}
            </div>
          ))}
        </div>
      </div>

      <div className="footer-bottom">
        <span>© {year} Mkurugenzi Ltd. All rights reserved.</span>
        <div className="footer-bottom-links">
          <a href="#">Terms</a>
          <a href="#">Privacy</a>
          <a href="#">Cookies</a>
        </div>
      </div>
    </footer>
  )
}
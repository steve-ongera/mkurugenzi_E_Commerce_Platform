import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-top">
        <div>
          <div className="footer-brand-logo">
            🛍 Mkuru<span>genzi</span>
          </div>
          <p className="footer-brand-tagline">
            Kenya's premier online marketplace. Quality products, fast delivery across all 47 counties.
          </p>
          <div className="footer-social">
            <a href="#" className="social-btn"><i className="ph ph-facebook-logo" /></a>
            <a href="#" className="social-btn"><i className="ph ph-twitter-logo" /></a>
            <a href="#" className="social-btn"><i className="ph ph-instagram-logo" /></a>
            <a href="#" className="social-btn"><i className="ph ph-whatsapp-logo" /></a>
          </div>
          <div className="footer-payments">
            <span className="payment-logo mpesa"><i className="ph ph-phone" /> M-Pesa</span>
            <span className="payment-logo"><i className="ph ph-credit-card" /> Visa</span>
            <span className="payment-logo"><i className="ph ph-credit-card" /> Mastercard</span>
          </div>
        </div>

        <div>
          <div className="footer-col-title">Shop</div>
          <div className="footer-links">
            <Link to="/store">All Products</Link>
            <Link to="/store?flash_deal=true">Flash Deals</Link>
            <Link to="/store?is_featured=true">Featured</Link>
            <Link to="/store?in_stock=true">In Stock</Link>
          </div>
        </div>

        <div>
          <div className="footer-col-title">Account</div>
          <div className="footer-links">
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
            <Link to="/orders">My Orders</Link>
            <Link to="/profile">Profile</Link>
          </div>
        </div>

        <div>
          <div className="footer-col-title">Support</div>
          <div className="footer-links">
            <a href="#">Help Centre</a>
            <a href="#">Returns Policy</a>
            <a href="#">Delivery Info</a>
            <a href="#">Contact Us</a>
            <a href="#">Privacy Policy</a>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} Mkurugenzi Ltd. All rights reserved.</span>
        <div style={{ display: 'flex', gap: 16 }}>
          <a href="#">Terms</a>
          <a href="#">Privacy</a>
          <a href="#">Cookies</a>
        </div>
      </div>
    </footer>
  )
}
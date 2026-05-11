import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../contexts/CartContext'
import { formatKES, imgUrl } from '../utils/api'

export default function Cart() {
  const { items, removeFromCart, updateQty, subtotal } = useCart()
  const navigate = useNavigate()

  if (items.length === 0) {
    return (
      <div className="page-wrap">
        <div className="empty-state" style={{ minHeight: '60vh' }}>
          <div className="empty-state-icon">🛒</div>
          <h3>Your cart is empty</h3>
          <p>Add some products to get started.</p>
          <Link to="/store" className="btn btn-primary">Start Shopping</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="page-wrap">
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 20 }}>
        <i className="ph ph-shopping-cart" style={{ marginRight: 8 }} />
        Shopping Cart
        <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--gray-400)', marginLeft: 8 }}>
          ({items.length} {items.length === 1 ? 'item' : 'items'})
        </span>
      </h1>

      <div className="cart-layout">
        {/* Items */}
        <div>
          <div className="cart-section-title">Cart Items</div>
          {items.map(item => (
            <div key={item.id} className="cart-item">
              <div className="cart-item-img">
                <img src={imgUrl(item.image)} alt={item.name} />
              </div>
              <div className="cart-item-body">
                <div className="cart-item-name">{item.name}</div>
                {item.variant_info && (
                  <div className="cart-item-variant">{item.variant_info}</div>
                )}
                <div style={{ fontSize: 13, color: 'var(--gray-400)', marginBottom: 8 }}>
                  {formatKES(item.price)} each
                </div>
                <div className="cart-item-bottom">
                  <span className="cart-item-price">{formatKES(item.price * item.quantity)}</span>
                  <div className="cart-item-actions">
                    <div className="qty-stepper">
                      <button onClick={() => updateQty(item.id, item.quantity - 1)}>−</button>
                      <span className="qty-stepper-val">{item.quantity}</span>
                      <button onClick={() => updateQty(item.id, item.quantity + 1)}>+</button>
                    </div>
                    <button className="cart-item-remove" onClick={() => removeFromCart(item.id)}>
                      <i className="ph ph-trash" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          <Link to="/store" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, color: 'var(--primary)', fontWeight: 600, marginTop: 8 }}>
            <i className="ph ph-arrow-left" /> Continue Shopping
          </Link>
        </div>

        {/* Summary */}
        <div className="order-summary-box">
          <div className="order-summary-title">Order Summary</div>
          <div className="order-summary-body">
            <div className="order-summary-row">
              <span>Subtotal ({items.length} items)</span>
              <span className="amount">{formatKES(subtotal)}</span>
            </div>
            <div className="order-summary-row">
              <span>Delivery</span>
              <span className="amount" style={{ color: 'var(--success)', fontWeight: 700 }}>Calculated at checkout</span>
            </div>
            <div className="order-summary-row total">
              <span>Estimated Total</span>
              <span className="amount">{formatKES(subtotal)}</span>
            </div>
            <button
              className="btn btn-primary btn-full btn-lg"
              style={{ marginTop: 16 }}
              onClick={() => navigate('/checkout')}
            >
              Proceed to Checkout <i className="ph ph-arrow-right" />
            </button>

            <div style={{
              marginTop: 16, padding: 12, background: 'var(--gray-50)',
              borderRadius: 8, fontSize: 12, color: 'var(--gray-500)',
              display: 'flex', flexDirection: 'column', gap: 6,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className="ph ph-shield-check" style={{ color: 'var(--success)' }} />
                Secure checkout powered by M-Pesa
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className="ph ph-arrow-u-up-left" style={{ color: 'var(--primary)' }} />
                14-day returns on eligible items
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
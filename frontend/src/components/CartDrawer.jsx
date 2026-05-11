import { useCart } from '../contexts/CartContext'
import { Link } from 'react-router-dom'
import { formatKES, imgUrl } from '../utils/api'

export default function CartDrawer() {
  const { items, drawerOpen, setDrawerOpen, removeFromCart, updateQty, subtotal } = useCart()

  if (!drawerOpen) return null

  return (
    <>
      <div className="cart-drawer-overlay" onClick={() => setDrawerOpen(false)} />
      <div className="cart-drawer">
        <div className="cart-drawer-header">
          <h3><i className="ph ph-shopping-cart" style={{ marginRight: 8 }} />Cart ({items.length})</h3>
          <button className="cart-drawer-close" onClick={() => setDrawerOpen(false)}>
            <i className="ph ph-x" />
          </button>
        </div>

        <div className="cart-drawer-body">
          {items.length === 0 ? (
            <div className="cart-drawer-empty">
              <i className="ph ph-shopping-cart-simple" />
              <p>Your cart is empty</p>
              <button className="btn btn-primary btn-sm" onClick={() => setDrawerOpen(false)}>
                Continue Shopping
              </button>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="cart-item" style={{ marginBottom: 8 }}>
                <div className="cart-item-img">
                  <img src={imgUrl(item.image)} alt={item.name} />
                </div>
                <div className="cart-item-body">
                  <div className="cart-item-name">{item.name}</div>
                  {item.variant_info && (
                    <div className="cart-item-variant">{item.variant_info}</div>
                  )}
                  <div className="cart-item-bottom">
                    <span className="cart-item-price">{formatKES(item.price * item.quantity)}</span>
                    <div className="cart-item-actions">
                      <div className="qty-stepper" style={{ height: 32 }}>
                        <button onClick={() => updateQty(item.id, item.quantity - 1)}>−</button>
                        <span className="qty-stepper-val" style={{ fontSize: 13 }}>{item.quantity}</span>
                        <button onClick={() => updateQty(item.id, item.quantity + 1)}>+</button>
                      </div>
                      <button className="cart-item-remove" onClick={() => removeFromCart(item.id)}>
                        <i className="ph ph-trash" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
          <div className="cart-drawer-footer">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontWeight: 700, fontSize: 16 }}>
              <span>Subtotal</span>
              <span style={{ color: 'var(--primary)' }}>{formatKES(subtotal)}</span>
            </div>
            <Link
              to="/checkout"
              className="btn btn-primary btn-full btn-lg"
              onClick={() => setDrawerOpen(false)}
            >
              Checkout <i className="ph ph-arrow-right" />
            </Link>
            <Link
              to="/cart"
              className="btn btn-outline btn-full"
              style={{ marginTop: 8 }}
              onClick={() => setDrawerOpen(false)}
            >
              View Cart
            </Link>
          </div>
        )}
      </div>
    </>
  )
}
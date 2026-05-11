import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { orders as ordersApi, payments, formatKES, formatDate } from '../utils/api'

const TRACKER_STEPS = [
  { key: 'pending',          icon: '📋', label: 'Order Placed' },
  { key: 'confirmed',        icon: '✅', label: 'Confirmed' },
  { key: 'processing',       icon: '⚙️', label: 'Processing' },
  { key: 'shipped',          icon: '🚚', label: 'Shipped' },
  { key: 'out_for_delivery', icon: '📍', label: 'Out for Delivery' },
  { key: 'delivered',        icon: '🎉', label: 'Delivered' },
]

const ORDER_ORDER = ['pending','confirmed','processing','shipped','out_for_delivery','delivered','cancelled']

const STATUS_LABELS = {
  pending:          'status-pending',
  confirmed:        'status-confirmed',
  processing:       'status-processing',
  shipped:          'status-shipped',
  out_for_delivery: 'status-out_for_delivery',
  delivered:        'status-delivered',
  cancelled:        'status-cancelled',
  refunded:         'status-refunded',
}

export default function OrderDetail() {
  const { number } = useParams()
  const [order, setOrder]       = useState(null)
  const [loading, setLoading]   = useState(true)
  const [mpesaPhone, setPhone]  = useState('')
  const [mpesaSending, setSending] = useState(false)
  const [mpesaMsg, setMsg]      = useState('')
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    ordersApi.detail(number)
      .then(setOrder)
      .finally(() => setLoading(false))
  }, [number])

  const handleMpesa = async () => {
    setSending(true)
    setMsg('')
    try {
      await payments.mpesaInitiate(order.order_number, mpesaPhone)
      setMsg('STK push sent! Check your phone for the M-Pesa prompt.')
    } catch (err) {
      setMsg(err.message || 'Failed to send STK push.')
    } finally {
      setSending(false)
    }
  }

  const handleCancel = async () => {
    if (!confirm('Cancel this order?')) return
    setCancelling(true)
    try {
      const updated = await ordersApi.cancel(order.order_number)
      setOrder(updated)
    } catch (err) {
      alert(err.message || 'Could not cancel order.')
    } finally {
      setCancelling(false)
    }
  }

  if (loading) return <div className="loading-center"><div className="spinner spinner-lg" /></div>

  if (!order) return (
    <div className="not-found">
      <div className="not-found-inner">
        <span className="not-found-code">404</span>
        <h1>Order not found</h1>
        <Link to="/orders" className="btn btn-primary">My Orders</Link>
      </div>
    </div>
  )

  const statusIdx   = ORDER_ORDER.indexOf(order.status)
  const isCancelled = order.status === 'cancelled'

  return (
    <div className="page-wrap">
      <nav className="breadcrumb">
        <Link to="/orders">My Orders</Link>
        <span className="breadcrumb-sep">›</span>
        <span className="breadcrumb-current">#{order.order_number}</span>
      </nav>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Order #{order.order_number}</h1>
          <div style={{ fontSize: 13, color: 'var(--gray-400)', marginTop: 4 }}>
            Placed on {formatDate(order.created_at)}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className={`badge ${STATUS_LABELS[order.status] || 'badge-gray'}`} style={{ fontSize: 13, padding: '5px 14px' }}>
            {order.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </span>
          {order.is_cancellable && (
            <button className="btn btn-danger btn-sm" onClick={handleCancel} disabled={cancelling}>
              {cancelling ? 'Cancelling…' : 'Cancel Order'}
            </button>
          )}
        </div>
      </div>

      {/* Tracker */}
      {!isCancelled && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="order-tracker">
            {TRACKER_STEPS.map((s, i) => {
              const idx = ORDER_ORDER.indexOf(s.key)
              const done   = idx < statusIdx
              const active = s.key === order.status
              return (
                <div key={s.key} className={`tracker-step ${done ? 'completed' : active ? 'active' : ''}`}>
                  <div className="tracker-icon">{s.icon}</div>
                  <div className="tracker-label">{s.label}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'start' }}>
        {/* Left: items + delivery */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Items */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="card-header" style={{ padding: '14px 20px', borderBottom: '1px solid var(--gray-100)' }}>
              <div className="card-header-title">Order Items ({order.items?.length})</div>
            </div>
            {order.items?.map(item => (
              <div key={item.id} style={{
                display: 'flex', gap: 14, padding: '14px 20px',
                borderBottom: '1px solid var(--gray-100)', alignItems: 'center',
              }}>
                <div style={{
                  width: 72, height: 72, background: 'var(--gray-50)',
                  borderRadius: 8, overflow: 'hidden', flexShrink: 0,
                  border: '1px solid var(--gray-200)',
                }}>
                  {item.product_image
                    ? <img src={item.product_image} alt={item.product_name} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 6 }} />
                    : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: 28 }}>📦</div>
                  }
                </div>
                <div style={{ flex: 1 }}>
                  <Link to={`/product/${item.product_slug}`} style={{ fontWeight: 600, fontSize: 14, color: 'var(--gray-800)' }}>
                    {item.product_name}
                  </Link>
                  {item.variant_info && <div style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 2 }}>{item.variant_info}</div>}
                  <div style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 4 }}>
                    {formatKES(item.unit_price)} × {item.quantity}
                  </div>
                </div>
                <div style={{ fontWeight: 700, color: 'var(--primary)' }}>{formatKES(item.subtotal)}</div>
              </div>
            ))}
          </div>

          {/* Delivery */}
          <div className="card">
            <div className="card-header">
              <div className="card-header-title">Delivery Information</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 14 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <span style={{ color: 'var(--gray-400)', width: 100, flexShrink: 0 }}>Recipient</span>
                <span style={{ fontWeight: 600 }}>{order.customer_name}</span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <span style={{ color: 'var(--gray-400)', width: 100, flexShrink: 0 }}>County</span>
                <span>{order.county_name}</span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <span style={{ color: 'var(--gray-400)', width: 100, flexShrink: 0 }}>Town</span>
                <span>{order.town_name}</span>
              </div>
              {order.station_name && (
                <>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <span style={{ color: 'var(--gray-400)', width: 100, flexShrink: 0 }}>Station</span>
                    <span>{order.station_name}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <span style={{ color: 'var(--gray-400)', width: 100, flexShrink: 0 }}>Address</span>
                    <span>{order.station_address}</span>
                  </div>
                </>
              )}
              {order.home_address && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <span style={{ color: 'var(--gray-400)', width: 100, flexShrink: 0 }}>Address</span>
                  <span>{order.home_address}</span>
                </div>
              )}
            </div>
          </div>

          {/* M-Pesa retry */}
          {order.payment_method === 'mpesa' && order.payment_status !== 'paid' && !isCancelled && (
            <div className="card">
              <div className="card-header">
                <div className="card-header-title">📱 Pay with M-Pesa</div>
              </div>
              {mpesaMsg && (
                <div className={`alert ${mpesaMsg.includes('sent') ? 'alert-success' : 'alert-danger'}`}>
                  {mpesaMsg}
                </div>
              )}
              <div style={{ display: 'flex', gap: 10 }}>
                <input
                  className="form-control"
                  placeholder="07xx xxx xxx"
                  value={mpesaPhone}
                  onChange={e => setPhone(e.target.value)}
                />
                <button
                  className="btn btn-success"
                  onClick={handleMpesa}
                  disabled={!mpesaPhone || mpesaSending}
                >
                  {mpesaSending ? 'Sending…' : 'Send STK Push'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right: summary */}
        <div className="order-summary-box">
          <div className="order-summary-title">Order Summary</div>
          <div className="order-summary-body">
            <div className="order-summary-row">
              <span>Subtotal</span>
              <span className="amount">{formatKES(order.subtotal)}</span>
            </div>
            <div className="order-summary-row">
              <span>Delivery</span>
              <span className="amount">{formatKES(order.delivery_fee)}</span>
            </div>
            {parseFloat(order.discount) > 0 && (
              <div className="order-summary-row discount">
                <span>Discount</span>
                <span className="amount">-{formatKES(order.discount)}</span>
              </div>
            )}
            <div className="order-summary-row total">
              <span>Total</span>
              <span className="amount">{formatKES(order.total)}</span>
            </div>
            <div className="divider" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--gray-500)' }}>Payment</span>
                <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>
                  {order.payment_method === 'mpesa' ? 'M-Pesa' : order.payment_method}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--gray-500)' }}>Payment Status</span>
                <span className={`badge ${
                  order.payment_status === 'paid' ? 'badge-success' :
                  order.payment_status === 'failed' ? 'badge-danger' : 'badge-warning'
                }`}>
                  {order.payment_status?.replace(/_/g, ' ')}
                </span>
              </div>
              {order.payment_ref && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--gray-500)' }}>Ref</span>
                  <span style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: 12 }}>{order.payment_ref}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
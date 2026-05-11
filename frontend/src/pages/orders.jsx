import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { orders as ordersApi, formatKES, formatDate } from '../utils/api'

const STATUS_LABELS = {
  pending:          { label: 'Pending',           class: 'status-pending' },
  confirmed:        { label: 'Confirmed',          class: 'status-confirmed' },
  processing:       { label: 'Processing',         class: 'status-processing' },
  shipped:          { label: 'Shipped',            class: 'status-shipped' },
  out_for_delivery: { label: 'Out for Delivery',   class: 'status-out_for_delivery' },
  delivered:        { label: 'Delivered',          class: 'status-delivered' },
  cancelled:        { label: 'Cancelled',          class: 'status-cancelled' },
  refunded:         { label: 'Refunded',           class: 'status-refunded' },
}

export default function Orders() {
  const [items, setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage]     = useState(1)
  const [count, setCount]   = useState(0)

  useEffect(() => {
    setLoading(true)
    ordersApi.list(page)
      .then(d => { setItems(d.results || []); setCount(d.count || 0) })
      .finally(() => setLoading(false))
  }, [page])

  if (loading) return (
    <div className="loading-center"><div className="spinner spinner-lg" /></div>
  )

  return (
    <div className="page-wrap">
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>
        <i className="ph ph-package" style={{ marginRight: 8 }} />
        My Orders
        <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--gray-400)', marginLeft: 8 }}>({count} total)</span>
      </h1>

      {items.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📦</div>
          <h3>No orders yet</h3>
          <p>Your order history will appear here.</p>
          <Link to="/store" className="btn btn-primary">Start Shopping</Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {items.map(order => {
            const st = STATUS_LABELS[order.status] || { label: order.status, class: 'badge-gray' }
            return (
              <div key={order.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {/* Header */}
                <div style={{
                  padding: '14px 20px', background: 'var(--gray-50)',
                  borderBottom: '1px solid var(--gray-200)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  flexWrap: 'wrap', gap: 8,
                }}>
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--gray-400)', textTransform: 'uppercase', fontWeight: 600 }}>Order</div>
                      <div style={{ fontWeight: 700, color: 'var(--gray-900)' }}>#{order.order_number}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--gray-400)', textTransform: 'uppercase', fontWeight: 600 }}>Date</div>
                      <div style={{ fontSize: 13, color: 'var(--gray-700)' }}>{formatDate(order.created_at)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--gray-400)', textTransform: 'uppercase', fontWeight: 600 }}>Total</div>
                      <div style={{ fontWeight: 700, color: 'var(--primary)' }}>{formatKES(order.total)}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span className={`badge ${st.class}`}>{st.label}</span>
                    <Link to={`/orders/${order.order_number}`} className="btn btn-sm btn-outline">
                      View Details <i className="ph ph-arrow-right" />
                    </Link>
                  </div>
                </div>

                {/* Items preview */}
                <div style={{ padding: '14px 20px', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {(order.items || []).slice(0, 4).map(item => (
                    <div key={item.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <div style={{
                        width: 48, height: 48, background: 'var(--gray-50)',
                        borderRadius: 6, overflow: 'hidden', flexShrink: 0,
                        border: '1px solid var(--gray-200)',
                      }}>
                        {item.product_image ? (
                          <img src={item.product_image} alt={item.product_name}
                            style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 3 }} />
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: 20 }}>📦</div>
                        )}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.product_name}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>× {item.quantity}</div>
                      </div>
                    </div>
                  ))}
                  {(order.items || []).length > 4 && (
                    <div style={{ display: 'flex', alignItems: 'center', fontSize: 13, color: 'var(--gray-400)' }}>
                      +{order.items.length - 4} more
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {/* Pagination */}
          {Math.ceil(count / 20) > 1 && (
            <div className="pagination">
              <button className="page-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                <i className="ph ph-caret-left" />
              </button>
              <span style={{ fontSize: 13, color: 'var(--gray-500)' }}>Page {page}</span>
              <button className="page-btn" disabled={items.length < 20} onClick={() => setPage(p => p + 1)}>
                <i className="ph ph-caret-right" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
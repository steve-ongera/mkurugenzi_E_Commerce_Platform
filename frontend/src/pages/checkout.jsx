import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../contexts/CartContext'
import { useAuth } from '../contexts/AuthContext'
import { delivery, coupons, orders, payments, formatKES, cart as cartApi } from '../utils/api'

const STEPS = ['Delivery', 'Payment', 'Review']

export default function Checkout() {
  const { items, subtotal, clearCart } = useCart()
  const { user }  = useAuth()
  const navigate  = useNavigate()

  const [step, setStep]             = useState(0)
  const [counties, setCounties]     = useState([])
  const [towns, setTowns]           = useState([])
  const [townDetail, setTownDetail] = useState(null)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')

  // Delivery form
  const [selectedCounty, setCounty] = useState('')
  const [selectedTown, setTown]     = useState('')
  const [deliveryType, setDType]    = useState('station')
  const [selectedStation, setStation] = useState(null)
  const [homeAddress, setHomeAddr]  = useState('')

  // Guest fields
  const [guestEmail, setGEmail]   = useState('')
  const [guestName, setGName]     = useState('')
  const [guestPhone, setGPhone]   = useState('')

  // Payment
  const [payMethod, setPayMethod] = useState('mpesa')
  const [mpesaPhone, setMPhone]   = useState(user?.phone || '')
  const [notes, setNotes]         = useState('')

  // Coupon
  const [couponCode, setCoupon]   = useState('')
  const [couponData, setCouponData] = useState(null)
  const [couponError, setCouponError] = useState('')

  // Result
  const [order, setOrder]         = useState(null)
  const [mpesaSent, setMpesaSent] = useState(false)

  useEffect(() => {
    delivery.counties().then(setCounties).catch(() => {})
  }, [])

  const handleCountyChange = (e) => {
    const slug = e.target.value
    setCounty(slug)
    setTown('')
    setTownDetail(null)
    setStation(null)
    const found = counties.find(c => c.slug === slug)
    setTowns(found?.towns || [])
  }

  const handleTownChange = async (e) => {
    const slug = e.target.value
    setTown(slug)
    setStation(null)
    if (slug) {
      delivery.town(slug).then(setTownDetail).catch(() => {})
    }
  }

  const handleCouponApply = async () => {
    setCouponError('')
    setCouponData(null)
    try {
      const res = await coupons.validate(couponCode, subtotal)
      if (res.valid) setCouponData(res)
      else setCouponError(res.detail)
    } catch {
      setCouponError('Invalid coupon code.')
    }
  }

  const deliveryFee = deliveryType === 'station' && selectedStation
    ? parseFloat(selectedStation.fee)
    : deliveryType === 'home' && townDetail?.home_delivery
    ? parseFloat(townDetail.home_delivery.fee)
    : 0

  const discount  = couponData ? parseFloat(couponData.discount) : 0
  const total     = subtotal + deliveryFee - discount

  const handlePlaceOrder = async () => {
    setError('')
    setLoading(true)
    try {
      const townObj = townDetail
      const payload = {
        items: cartApi.toOrderItems(),
        delivery_type:  deliveryType,
        town_id:        townObj?.id,
        station_id:     deliveryType === 'station' ? selectedStation?.id : null,
        home_address:   deliveryType === 'home' ? homeAddress : '',
        payment_method: payMethod,
        mpesa_phone:    payMethod === 'mpesa' ? mpesaPhone : '',
        coupon_code:    couponCode || '',
        notes,
        guest_email:    !user ? guestEmail : '',
        guest_name:     !user ? guestName  : '',
        guest_phone:    !user ? guestPhone : '',
      }

      const o = await orders.create(payload)
      setOrder(o)
      clearCart()

      // If M-Pesa, trigger STK push
      if (payMethod === 'mpesa') {
        try {
          await payments.mpesaInitiate(o.order_number, mpesaPhone)
          setMpesaSent(true)
        } catch {}
      }

      navigate(`/orders/${o.order_number}`)
    } catch (err) {
      setError(err.message || 'Failed to place order. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (items.length === 0 && !order) {
    return (
      <div className="page-wrap">
        <div className="empty-state">
          <div className="empty-state-icon">🛒</div>
          <h3>Your cart is empty</h3>
          <a href="/store" className="btn btn-primary">Continue Shopping</a>
        </div>
      </div>
    )
  }

  return (
    <div className="page-wrap">
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>Checkout</h1>

      {/* Steps */}
      <div className="checkout-steps" style={{ marginBottom: 28 }}>
        {STEPS.map((s, i) => (
          <div key={s} className={`checkout-step ${i === step ? 'active' : i < step ? 'done' : ''}`}>
            <div className="checkout-step-num">{i < step ? '✓' : i + 1}</div>
            <span className="checkout-step-label">{s}</span>
          </div>
        ))}
      </div>

      <div className="checkout-layout">
        <div>
          {error && <div className="alert alert-danger"><i className="ph ph-warning" />{error}</div>}

          {/* ── Step 0: Delivery ── */}
          {step === 0 && (
            <div className="form-card">
              <div className="form-card-title">Delivery Details</div>
              <div className="form-card-subtitle">Choose how and where you want your order delivered.</div>

              {/* Guest fields */}
              {!user && (
                <>
                  <div style={{
                    background: 'var(--info-light)', borderRadius: 8, padding: '10px 14px',
                    fontSize: 13, color: '#0e7490', marginBottom: 16,
                    display: 'flex', gap: 8, alignItems: 'flex-start',
                  }}>
                    <i className="ph ph-info" style={{ marginTop: 2 }} />
                    Guest checkout. <a href="/register" style={{ color: '#0891b2', fontWeight: 600 }}>Create an account</a> for faster checkouts.
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Full Name <span className="required">*</span></label>
                      <input className="form-control" value={guestName} onChange={e => setGName(e.target.value)} placeholder="John Doe" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Phone <span className="required">*</span></label>
                      <input className="form-control" value={guestPhone} onChange={e => setGPhone(e.target.value)} placeholder="07xx xxx xxx" />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email <span className="required">*</span></label>
                    <input className="form-control" type="email" value={guestEmail} onChange={e => setGEmail(e.target.value)} placeholder="you@example.com" />
                  </div>
                </>
              )}

              {/* County & Town */}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">County <span className="required">*</span></label>
                  <select className="form-select" value={selectedCounty} onChange={handleCountyChange}>
                    <option value="">Select county…</option>
                    {counties.map(c => <option key={c.id} value={c.slug}>{c.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Town <span className="required">*</span></label>
                  <select className="form-select" value={selectedTown} onChange={handleTownChange} disabled={!selectedCounty}>
                    <option value="">Select town…</option>
                    {towns.map(t => <option key={t.id} value={t.slug}>{t.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Delivery type */}
              {townDetail && (
                <>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-700)', marginBottom: 10 }}>
                    Delivery Method
                  </div>
                  <div className="delivery-type-tabs">
                    {townDetail.has_station_delivery && (
                      <div
                        className={`delivery-tab ${deliveryType === 'station' ? 'active' : ''}`}
                        onClick={() => setDType('station')}
                      >
                        <div className="delivery-tab-title">📍 Station Pickup</div>
                        <div className="delivery-tab-sub">Pick up at a nearby station</div>
                        {selectedStation && (
                          <div className="delivery-tab-price">{formatKES(selectedStation.fee)}</div>
                        )}
                      </div>
                    )}
                    {townDetail.has_home_delivery && (
                      <div
                        className={`delivery-tab ${deliveryType === 'home' ? 'active' : ''}`}
                        onClick={() => setDType('home')}
                      >
                        <div className="delivery-tab-title">🏠 Home Delivery</div>
                        <div className="delivery-tab-sub">
                          {townDetail.home_delivery?.eta_display || 'Delivered to your door'}
                        </div>
                        {townDetail.home_delivery && (
                          <div className="delivery-tab-price">{formatKES(townDetail.home_delivery.fee)}</div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Stations list */}
                  {deliveryType === 'station' && townDetail.stations?.length > 0 && (
                    <div style={{ marginTop: 16 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--gray-700)' }}>
                        Select Pickup Station
                      </div>
                      <div className="station-list">
                        {townDetail.stations.map(st => (
                          <div
                            key={st.id}
                            className={`station-item ${selectedStation?.id === st.id ? 'selected' : ''}`}
                            onClick={() => setStation(st)}
                          >
                            <div className="station-radio" />
                            <div className="station-info">
                              <div className="station-name">{st.name}</div>
                              <div className="station-address">{st.address}</div>
                              {st.operating_hours && (
                                <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>{st.operating_hours}</div>
                              )}
                            </div>
                            <div className="station-fee">{formatKES(st.fee)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Home address */}
                  {deliveryType === 'home' && (
                    <div className="form-group" style={{ marginTop: 16 }}>
                      <label className="form-label">Delivery Address <span className="required">*</span></label>
                      <textarea
                        className="form-control"
                        rows={3}
                        placeholder="House number, street, area…"
                        value={homeAddress}
                        onChange={e => setHomeAddr(e.target.value)}
                      />
                    </div>
                  )}
                </>
              )}

              <div className="form-group" style={{ marginTop: 16 }}>
                <label className="form-label">Order Notes (optional)</label>
                <textarea
                  className="form-control"
                  rows={2}
                  placeholder="Any special instructions…"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </div>

              <button
                className="btn btn-primary btn-full btn-lg"
                style={{ marginTop: 8 }}
                disabled={
                  !selectedTown ||
                  (deliveryType === 'station' && !selectedStation) ||
                  (deliveryType === 'home' && !homeAddress) ||
                  (!user && (!guestEmail || !guestName))
                }
                onClick={() => setStep(1)}
              >
                Continue to Payment <i className="ph ph-arrow-right" />
              </button>
            </div>
          )}

          {/* ── Step 1: Payment ── */}
          {step === 1 && (
            <div className="form-card">
              <div className="form-card-title">Payment Method</div>
              <div className="form-card-subtitle">Choose how you want to pay.</div>

              <div className="payment-methods">
                {[
                  { id: 'mpesa', icon: 'mpesa', label: 'M-Pesa', sub: 'Pay via STK push to your phone' },
                  { id: 'card',  icon: 'card',  label: 'Card',   sub: 'Visa / Mastercard' },
                  { id: 'cod',   icon: 'cod',   label: 'Pay on Delivery', sub: 'Cash on delivery' },
                ].map(m => (
                  <div
                    key={m.id}
                    className={`payment-method ${payMethod === m.id ? 'selected' : ''}`}
                    onClick={() => setPayMethod(m.id)}
                  >
                    <div className={`payment-method-icon ${m.icon}`}>
                      {m.id === 'mpesa' ? '📱' : m.id === 'card' ? '💳' : '💵'}
                    </div>
                    <div>
                      <div className="payment-method-name">{m.label}</div>
                      <div className="payment-method-sub">{m.sub}</div>
                    </div>
                  </div>
                ))}
              </div>

              {payMethod === 'mpesa' && (
                <div className="form-group" style={{ marginTop: 16 }}>
                  <label className="form-label">M-Pesa Phone Number <span className="required">*</span></label>
                  <input
                    className="form-control"
                    placeholder="07xx xxx xxx"
                    value={mpesaPhone}
                    onChange={e => setMPhone(e.target.value)}
                  />
                  <div className="form-hint">You'll receive an STK push prompt on this number.</div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button className="btn btn-outline-gray" onClick={() => setStep(0)}>
                  <i className="ph ph-arrow-left" /> Back
                </button>
                <button
                  className="btn btn-primary flex-1"
                  onClick={() => setStep(2)}
                  disabled={payMethod === 'mpesa' && !mpesaPhone}
                >
                  Review Order <i className="ph ph-arrow-right" />
                </button>
              </div>
            </div>
          )}

          {/* ── Step 2: Review ── */}
          {step === 2 && (
            <div className="form-card">
              <div className="form-card-title">Review Your Order</div>
              <div className="form-card-subtitle">Check everything before placing your order.</div>

              {/* Items */}
              <div style={{ marginBottom: 16 }}>
                {items.map(item => (
                  <div key={item.id} style={{
                    display: 'flex', gap: 12, padding: '10px 0',
                    borderBottom: '1px solid var(--gray-100)', alignItems: 'center',
                  }}>
                    <div style={{
                      width: 56, height: 56, background: 'var(--gray-50)',
                      borderRadius: 8, overflow: 'hidden', flexShrink: 0,
                    }}>
                      <img src={item.image || '/placeholder.png'} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 4 }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{item.name}</div>
                      {item.variant_info && <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>{item.variant_info}</div>}
                      <div style={{ fontSize: 13, color: 'var(--gray-500)' }}>Qty: {item.quantity}</div>
                    </div>
                    <div style={{ fontWeight: 700, color: 'var(--primary)' }}>{formatKES(item.price * item.quantity)}</div>
                  </div>
                ))}
              </div>

              {/* Delivery summary */}
              <div style={{ background: 'var(--gray-50)', borderRadius: 8, padding: 12, fontSize: 13, marginBottom: 16 }}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>Delivery Details</div>
                <div style={{ color: 'var(--gray-600)' }}>
                  {deliveryType === 'station' && selectedStation
                    ? `Station: ${selectedStation.name} — ${selectedStation.address}`
                    : `Home delivery: ${homeAddress}`}
                </div>
                <div style={{ color: 'var(--gray-500)', marginTop: 4 }}>
                  Payment: {payMethod === 'mpesa' ? `M-Pesa (${mpesaPhone})` : payMethod === 'card' ? 'Card' : 'Cash on Delivery'}
                </div>
              </div>

              {/* Coupon */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Coupon Code</div>
                <div className="coupon-row">
                  <input
                    className="form-control"
                    placeholder="Enter coupon code"
                    value={couponCode}
                    onChange={e => setCoupon(e.target.value.toUpperCase())}
                  />
                  <button className="btn btn-outline btn-sm" onClick={handleCouponApply}>Apply</button>
                </div>
                {couponError && <div className="form-error">{couponError}</div>}
                {couponData && (
                  <div className="alert alert-success" style={{ marginTop: 8, marginBottom: 0 }}>
                    <i className="ph ph-check" /> Coupon applied! You save {formatKES(couponData.discount)}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-outline-gray" onClick={() => setStep(1)}>
                  <i className="ph ph-arrow-left" /> Back
                </button>
                <button
                  className="btn btn-primary flex-1 btn-lg"
                  onClick={handlePlaceOrder}
                  disabled={loading}
                >
                  {loading ? <><div className="spinner spinner-sm" style={{ borderTopColor: '#fff' }} /> Placing Order…</> : <>Place Order · {formatKES(total)}</>}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Order Summary sidebar */}
        <div className="order-summary-box">
          <div className="order-summary-title">Order Summary</div>
          <div className="order-summary-body">
            {items.map(item => (
              <div key={item.id} className="order-summary-row">
                <span>{item.name} × {item.quantity}</span>
                <span className="amount">{formatKES(item.price * item.quantity)}</span>
              </div>
            ))}
            <div className="divider" />
            <div className="order-summary-row">
              <span>Subtotal</span>
              <span className="amount">{formatKES(subtotal)}</span>
            </div>
            <div className="order-summary-row">
              <span>Delivery</span>
              <span className="amount">{deliveryFee ? formatKES(deliveryFee) : '—'}</span>
            </div>
            {discount > 0 && (
              <div className="order-summary-row discount">
                <span>Discount</span>
                <span className="amount">-{formatKES(discount)}</span>
              </div>
            )}
            <div className="order-summary-row total">
              <span>Total</span>
              <span className="amount">{formatKES(total)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
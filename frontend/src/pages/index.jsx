import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { products, categories, formatKES } from '../utils/api'
import ProductCard from '../components/ProductCard'

function Countdown({ endsAt }) {
  const [time, setTime] = useState({ h: 0, m: 0, s: 0 })

  useEffect(() => {
    const tick = () => {
      const diff = Math.max(0, new Date(endsAt) - Date.now())
      setTime({
        h: Math.floor(diff / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      })
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [endsAt])

  const pad = (n) => String(n).padStart(2, '0')
  return (
    <div className="countdown">
      <div className="countdown-unit">{pad(time.h)}<div style={{ fontSize: 9, opacity: .7 }}>HRS</div></div>
      <div className="countdown-sep">:</div>
      <div className="countdown-unit">{pad(time.m)}<div style={{ fontSize: 9, opacity: .7 }}>MIN</div></div>
      <div className="countdown-sep">:</div>
      <div className="countdown-unit">{pad(time.s)}<div style={{ fontSize: 9, opacity: .7 }}>SEC</div></div>
    </div>
  )
}

function SkeletonGrid({ count = 5 }) {
  return (
    <div className="product-grid product-grid-5">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--gray-200)' }}>
          <div className="skeleton skeleton-img" />
          <div style={{ padding: 12 }}>
            <div className="skeleton skeleton-text" style={{ width: '80%' }} />
            <div className="skeleton skeleton-text" style={{ width: '50%' }} />
            <div className="skeleton skeleton-title" style={{ width: '60%' }} />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Home() {
  const [featured, setFeatured]     = useState([])
  const [flash, setFlash]           = useState([])
  const [cats, setCats]             = useState([])
  const [loadingFeat, setLF]        = useState(true)
  const [loadingFlash, setLFl]      = useState(true)

  const flashDeadline = flash[0]?.flash_deal_ends_at

  useEffect(() => {
    products.list({ is_featured: true, page_size: 10 })
      .then(d => setFeatured(d.results || []))
      .finally(() => setLF(false))

    products.flashDeals()
      .then(d => setFlash(Array.isArray(d) ? d.slice(0, 8) : []))
      .finally(() => setLFl(false))

    categories.tree().then(setCats).catch(() => {})
  }, [])

  return (
    <>
      {/* Hero */}
      <div className="hero">
        <div className="hero-inner">
          <div className="hero-content">
            <div className="hero-tag">
              <span>🇰🇪</span> Kenya's Premier Marketplace
            </div>
            <h1 className="hero-title">
              Shop Smart.<br />
              <em>Delivered Fast.</em>
            </h1>
            <p className="hero-sub">
              Thousands of products, unbeatable prices. Delivered to your door or nearest pickup station across all 47 counties.
            </p>
            <div className="hero-actions">
              <Link to="/store" className="btn btn-warning btn-lg">
                <i className="ph ph-shopping-bag" /> Shop Now
              </Link>
              <Link to="/store?flash_deal=true" className="btn btn-outline" style={{ borderColor: 'rgba(255,255,255,.5)', color: '#fff' }}>
                ⚡ Flash Deals
              </Link>
            </div>
          </div>
          <div className="hero-image" style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,.05) 0%, rgba(255,255,255,.15) 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{ fontSize: 120, opacity: .3 }}>🛍</div>
          </div>
        </div>
      </div>

      {/* Categories strip */}
      {cats.length > 0 && (
        <div style={{ background: '#fff', borderBottom: '1px solid var(--gray-200)', padding: '20px var(--gutter)' }}>
          <div style={{ maxWidth: 'var(--container)', margin: '0 auto' }}>
            <div style={{ display: 'flex', gap: 12, overflowX: 'auto', scrollbarWidth: 'none' }}>
              {cats.map(cat => (
                <Link key={cat.id} to={`/category/${cat.slug}`} style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                  padding: '12px 20px', borderRadius: 12, background: 'var(--gray-50)',
                  border: '1px solid var(--gray-200)', minWidth: 90, flexShrink: 0,
                  transition: 'all .15s', textDecoration: 'none', color: 'var(--gray-700)',
                  fontSize: 12, fontWeight: 600, textAlign: 'center',
                }}>
                  <span style={{ fontSize: 28 }}>{cat.icon || '📦'}</span>
                  {cat.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="page-wrap">
        {/* Flash Deals */}
        {(loadingFlash || flash.length > 0) && (
          <section style={{ marginBottom: 40 }}>
            {flashDeadline && (
              <div className="flash-banner" style={{ borderRadius: 12, marginBottom: 16 }}>
                <div className="flash-banner-label">
                  <i className="ph ph-lightning" /> Flash Deals
                </div>
                <span style={{ color: 'rgba(255,255,255,.7)', fontSize: 13 }}>Ends in:</span>
                <Countdown endsAt={flashDeadline} />
              </div>
            )}

            <div className="section-header">
              <h2 className="section-title">
                <i className="ph ph-lightning" /> Flash Deals
              </h2>
              <Link to="/store?flash_deal=true" className="section-link">
                See all <i className="ph ph-arrow-right" />
              </Link>
            </div>

            {loadingFlash ? <SkeletonGrid count={5} /> : (
              <div className="product-grid product-grid-5">
                {flash.map(p => <ProductCard key={p.id} product={p} />)}
              </div>
            )}
          </section>
        )}

        {/* Featured Products */}
        <section>
          <div className="section-header">
            <h2 className="section-title">
              <i className="ph ph-star" /> Featured Products
            </h2>
            <Link to="/store?is_featured=true" className="section-link">
              See all <i className="ph ph-arrow-right" />
            </Link>
          </div>

          {loadingFeat ? <SkeletonGrid count={5} /> : (
            <div className="product-grid product-grid-5">
              {featured.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
        </section>

        {/* Promo banners */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, margin: '40px 0' }}>
          <div style={{
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--blue-800) 100%)',
            borderRadius: 16, padding: '28px 24px', color: '#fff',
          }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🚚</div>
            <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Station Pickup</h3>
            <p style={{ fontSize: 13, opacity: .8, marginBottom: 16 }}>
              Pick up your order at the nearest station. Low fees, all counties.
            </p>
            <Link to="/store" className="btn btn-warning btn-sm">Shop Now</Link>
          </div>
          <div style={{
            background: 'linear-gradient(135deg, #0f766e 0%, #0d9488 100%)',
            borderRadius: 16, padding: '28px 24px', color: '#fff',
          }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🏠</div>
            <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Home Delivery</h3>
            <p style={{ fontSize: 13, opacity: .8, marginBottom: 16 }}>
              Get it delivered to your door. Fast, safe, and convenient.
            </p>
            <Link to="/store" className="btn btn-sm" style={{ background: '#fff', color: '#0f766e', fontWeight: 700 }}>Shop Now</Link>
          </div>
        </div>
      </div>
    </>
  )
}
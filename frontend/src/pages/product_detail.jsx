import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { products as productsApi, reviews as reviewsApi, formatKES, imgUrl, formatDate } from '../utils/api'
import { useCart } from '../contexts/CartContext'
import { useAuth } from '../contexts/AuthContext'
import ProductCard from '../components/ProductCard'

function Stars({ rating, size = 14 }) {
  return (
    <span>
      {[1,2,3,4,5].map(n => (
        <span key={n} style={{ color: n <= Math.round(rating) ? 'var(--warning)' : 'var(--gray-300)', fontSize: size }}>★</span>
      ))}
    </span>
  )
}

export default function ProductDetail() {
  const { slug } = useParams()
  const { addToCart } = useCart()
  const { user } = useAuth()

  const [product, setProduct]         = useState(null)
  const [related, setRelated]         = useState([])
  const [loading, setLoading]         = useState(true)
  const [activeImg, setActiveImg]     = useState(0)
  const [selectedVariant, setVariant] = useState(null)
  const [qty, setQty]                 = useState(1)
  const [added, setAdded]             = useState(false)

  // Review form
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [reviewData, setReviewData]         = useState({ rating: 5, title: '', body: '' })
  const [reviewError, setReviewError]       = useState('')
  const [reviewSuccess, setReviewSuccess]   = useState(false)

  useEffect(() => {
    setLoading(true)
    productsApi.detail(slug)
      .then(p => {
        setProduct(p)
        setActiveImg(0)
        setVariant(null)
        setQty(1)
      })
      .catch(() => setProduct(null))
      .finally(() => setLoading(false))

    productsApi.related(slug)
      .then(r => setRelated(Array.isArray(r) ? r : []))
      .catch(() => {})
  }, [slug])

  if (loading) return (
    <div className="loading-center"><div className="spinner spinner-lg" /><span>Loading product…</span></div>
  )

  if (!product) return (
    <div className="not-found">
      <div className="not-found-inner">
        <span className="not-found-code">404</span>
        <h1>Product not found</h1>
        <Link to="/store" className="btn btn-primary">Back to Store</Link>
      </div>
    </div>
  )

  const imgs = product.images?.length ? product.images : []
  const currentImg = imgs[activeImg]

  const variantPrice = selectedVariant
    ? parseFloat(selectedVariant.final_price)
    : parseFloat(product.price)

  const handleAddToCart = () => {
    addToCart({
      id: `${product.id}-${selectedVariant?.id || 'base'}`,
      product_id: product.id,
      variant_id: selectedVariant?.id || null,
      name: product.name,
      image: imgs[0]?.image || '',
      price: variantPrice,
      quantity: qty,
      variant_info: selectedVariant ? `${selectedVariant.name}: ${selectedVariant.value}` : '',
      max_stock: selectedVariant ? selectedVariant.stock : product.stock,
    })
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  const handleReview = async (e) => {
    e.preventDefault()
    setReviewError('')
    try {
      await reviewsApi.create({ product: product.id, ...reviewData })
      setReviewSuccess(true)
      setShowReviewForm(false)
      // Refresh product to get new review
      productsApi.detail(slug).then(setProduct)
    } catch (err) {
      setReviewError(err.message || 'Failed to submit review.')
    }
  }

  return (
    <div className="page-wrap">
      {/* Breadcrumbs */}
      <nav className="breadcrumb">
        <Link to="/">Home</Link>
        <span className="breadcrumb-sep">›</span>
        {product.breadcrumbs?.slice(0, -1).map(b => (
          <span key={b.slug}>
            <Link to={`/category/${b.slug}`}>{b.name}</Link>
            <span className="breadcrumb-sep" style={{ margin: '0 6px' }}>›</span>
          </span>
        ))}
        <span className="breadcrumb-current">{product.name}</span>
      </nav>

      <div className="pdp-layout">
        {/* Gallery */}
        <div className="pdp-gallery">
          <div className="pdp-main-img">
            {currentImg ? (
              <img src={imgUrl(currentImg.image)} alt={currentImg.alt_text || product.name} />
            ) : (
              <div style={{ fontSize: 80, opacity: .2 }}>📦</div>
            )}
          </div>
          {imgs.length > 1 && (
            <div className="pdp-thumbs">
              {imgs.map((img, i) => (
                <div
                  key={img.id}
                  className={`pdp-thumb ${i === activeImg ? 'active' : ''}`}
                  onClick={() => setActiveImg(i)}
                >
                  <img src={imgUrl(img.image)} alt={img.alt_text || ''} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info panel */}
        <div className="pdp-info">
          {product.brand && (
            <div className="pdp-brand">{product.brand.name}</div>
          )}
          <h1 className="pdp-title">{product.name}</h1>

          {/* Rating */}
          {product.average_rating > 0 && (
            <div className="pdp-rating">
              <span className="pdp-rating-score">
                <Stars rating={product.average_rating} size={12} />
                {Number(product.average_rating).toFixed(1)}
              </span>
              <span className="pdp-review-count">{product.review_count} reviews</span>
            </div>
          )}

          {/* Price */}
          <div className="pdp-price-block">
            <div className="pdp-price-row">
              <span className="pdp-price">{formatKES(variantPrice)}</span>
              {product.compare_at_price && (
                <>
                  <span className="pdp-price-old">{formatKES(product.compare_at_price)}</span>
                  {product.discount_percent > 0 && (
                    <span className="pdp-discount-badge">-{product.discount_percent}%</span>
                  )}
                </>
              )}
            </div>
            {product.discount_percent > 0 && (
              <div className="pdp-savings">
                You save {formatKES(parseFloat(product.compare_at_price) - variantPrice)}!
              </div>
            )}
          </div>

          {/* Stock badge */}
          {product.in_stock ? (
            <span className="badge badge-success"><i className="ph ph-check" /> In Stock ({product.stock} available)</span>
          ) : (
            <span className="badge badge-danger">Out of Stock</span>
          )}

          {/* Variants */}
          {product.variants?.length > 0 && (
            <div className="pdp-variant-group">
              <div className="pdp-variant-label">
                {product.variants[0].name}:
                {selectedVariant && <span style={{ fontWeight: 400, marginLeft: 6 }}>{selectedVariant.value}</span>}
              </div>
              <div className="pdp-variants">
                {product.variants.map(v => (
                  <button
                    key={v.id}
                    className={`pdp-variant-btn ${selectedVariant?.id === v.id ? 'active' : ''}`}
                    disabled={v.stock === 0}
                    onClick={() => setVariant(v.id === selectedVariant?.id ? null : v)}
                  >
                    {v.value}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-700)', marginBottom: 8 }}>Quantity</div>
            <div className="pdp-qty-row">
              <div className="qty-stepper">
                <button onClick={() => setQty(q => Math.max(1, q - 1))}>−</button>
                <span className="qty-stepper-val">{qty}</span>
                <button onClick={() => setQty(q => Math.min(product.stock, q + 1))}>+</button>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="pdp-cta">
            <button
              className={`btn btn-lg ${added ? 'btn-success' : 'btn-primary'}`}
              disabled={!product.in_stock}
              onClick={handleAddToCart}
            >
              {added ? (
                <><i className="ph ph-check" /> Added!</>
              ) : (
                <><i className="ph ph-shopping-cart" /> Add to Cart</>
              )}
            </button>
            <button className="btn btn-outline btn-lg">
              <i className="ph ph-heart" />
            </button>
          </div>

          {/* Delivery info */}
          <div className="delivery-info-box">
            <div className="delivery-info-row">
              <i className="ph ph-map-pin" />
              <div>
                <div className="delivery-info-label">Delivery Available</div>
                <span>Station pickup or home delivery across all 47 counties</span>
              </div>
            </div>
            <div className="delivery-info-row">
              <i className="ph ph-arrow-u-up-left" />
              <div>
                <div className="delivery-info-label">Returns</div>
                <span>14-day returns on eligible items</span>
              </div>
            </div>
            <div className="delivery-info-row">
              <i className="ph ph-shield-check" />
              <div>
                <div className="delivery-info-label">Buyer Protection</div>
                <span>Shop securely with M-Pesa</span>
              </div>
            </div>
          </div>

          {/* SKU */}
          {product.sku && (
            <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>SKU: {product.sku}</div>
          )}
        </div>
      </div>

      {/* Description */}
      {product.description && (
        <div className="card" style={{ marginTop: 32 }}>
          <div className="card-header">
            <div className="card-header-title">Product Description</div>
          </div>
          <div
            style={{ fontSize: 14, color: 'var(--gray-600)', lineHeight: 1.7 }}
            dangerouslySetInnerHTML={{ __html: product.description }}
          />
        </div>
      )}

      {/* Reviews */}
      <div style={{ marginTop: 32 }}>
        <div className="section-header">
          <h2 className="section-title"><i className="ph ph-star" /> Customer Reviews</h2>
          {user && !showReviewForm && (
            <button className="btn btn-outline btn-sm" onClick={() => setShowReviewForm(true)}>
              Write a Review
            </button>
          )}
        </div>

        {/* Review form */}
        {showReviewForm && (
          <div className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Your Review</h3>
            {reviewError && <div className="alert alert-danger">{reviewError}</div>}
            <form onSubmit={handleReview}>
              <div className="form-group">
                <label className="form-label">Rating</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[1,2,3,4,5].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setReviewData(d => ({ ...d, rating: n }))}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: 28, color: n <= reviewData.rating ? 'var(--warning)' : 'var(--gray-300)',
                      }}
                    >★</button>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Title</label>
                <input
                  className="form-control"
                  placeholder="Summarise your review"
                  value={reviewData.title}
                  onChange={(e) => setReviewData(d => ({ ...d, title: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Review</label>
                <textarea
                  className="form-control"
                  rows={4}
                  placeholder="Share your experience…"
                  value={reviewData.body}
                  onChange={(e) => setReviewData(d => ({ ...d, body: e.target.value }))}
                />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" className="btn btn-primary">Submit Review</button>
                <button type="button" className="btn btn-outline-gray" onClick={() => setShowReviewForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        )}

        {reviewSuccess && <div className="alert alert-success">Review submitted! Thank you.</div>}

        {product.reviews?.length > 0 ? (
          <>
            <div className="review-summary">
              <div className="review-big-score">
                <div className="score">{Number(product.average_rating).toFixed(1)}</div>
                <Stars rating={product.average_rating} size={16} />
                <div className="out-of">{product.review_count} reviews</div>
              </div>
            </div>
            {product.reviews.map(r => (
              <div key={r.id} className="review-card">
                <div className="review-header">
                  <div>
                    <div className="review-user">{r.user_name}</div>
                    <Stars rating={r.rating} size={13} />
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="review-date">{formatDate(r.created_at)}</div>
                    {r.is_verified_purchase && (
                      <div className="review-verified"><i className="ph ph-check-circle" /> Verified Purchase</div>
                    )}
                  </div>
                </div>
                {r.title && <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{r.title}</div>}
                <div className="review-body">{r.body}</div>
              </div>
            ))}
          </>
        ) : (
          <div className="empty-state" style={{ padding: '30px 20px' }}>
            <div className="empty-state-icon" style={{ fontSize: 40 }}>⭐</div>
            <h3>No reviews yet</h3>
            <p>Be the first to review this product.</p>
          </div>
        )}
      </div>

      {/* Related */}
      {related.length > 0 && (
        <div style={{ marginTop: 40 }}>
          <div className="section-header">
            <h2 className="section-title"><i className="ph ph-arrows-out-cardinal" /> Related Products</h2>
          </div>
          <div className="product-grid product-grid-5">
            {related.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        </div>
      )}
    </div>
  )
}
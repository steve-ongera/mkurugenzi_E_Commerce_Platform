import { Link } from 'react-router-dom'
import { useCart } from '../contexts/CartContext'
import { formatKES, imgUrl } from '../utils/api'

function Stars({ rating, count }) {
  return (
    <div className="product-card-stars">
      {[1,2,3,4,5].map(n => (
        <span key={n} className={`star ${n <= Math.round(rating) ? '' : 'empty'}`}>★</span>
      ))}
      {count !== undefined && <span className="review-count">({count})</span>}
    </div>
  )
}

export default function ProductCard({ product }) {
  const { addToCart } = useCart()

  const img = product.primary_image

  const handleAddToCart = (e) => {
    e.preventDefault()
    e.stopPropagation()
    addToCart({
      id: String(product.id),
      product_id: product.id,
      variant_id: null,
      name: product.name,
      image: img?.image || '',
      price: parseFloat(product.price),
      quantity: 1,
      variant_info: '',
      max_stock: product.stock,
    })
  }

  return (
    <Link to={`/product/${product.slug}`} className="product-card">
      <div className="product-card-img">
        <img
          src={imgUrl(img?.image)}
          alt={img?.alt_text || product.name}
          loading="lazy"
        />
        {product.discount_percent > 0 && (
          <span className="product-card-discount">-{product.discount_percent}%</span>
        )}
        {product.is_flash_deal && (
          <span className="product-card-flash">⚡ Flash</span>
        )}
        <button className="product-card-wishlist" onClick={(e) => e.preventDefault()}>
          ♡
        </button>
      </div>

      <div className="product-card-body">
        <div className="product-card-name">{product.name}</div>

        {product.average_rating > 0 && (
          <Stars rating={product.average_rating} count={product.review_count} />
        )}

        <div className="product-card-price">
          <div className="price-row">
            <span className="price-current">{formatKES(product.price)}</span>
            {product.compare_at_price && (
              <span className="price-original">{formatKES(product.compare_at_price)}</span>
            )}
          </div>
        </div>

        {product.in_stock ? (
          <button className="product-card-cta" onClick={handleAddToCart}>
            <i className="ph ph-shopping-cart-simple" /> Add to Cart
          </button>
        ) : (
          <button className="product-card-cta" style={{ background: 'var(--gray-400)' }} disabled>
            Out of Stock
          </button>
        )}
      </div>
    </Link>
  )
}
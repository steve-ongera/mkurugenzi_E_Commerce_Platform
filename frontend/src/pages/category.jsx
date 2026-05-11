import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { products as productsApi, categories } from '../utils/api'
import ProductCard from '../components/ProductCard'

export default function Category() {
  const { slug } = useParams()
  const [cat, setCat]       = useState(null)
  const [items, setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage]     = useState(1)
  const [count, setCount]   = useState(0)

  useEffect(() => {
    categories.detail(slug).then(setCat).catch(() => {})
    setLoading(true)
    productsApi.list({ category: slug, page })
      .then(d => {
        setItems(d.results || [])
        setCount(d.count || 0)
      })
      .finally(() => setLoading(false))
  }, [slug, page])

  const totalPages = Math.ceil(count / 20)

  return (
    <div className="page-wrap">
      <nav className="breadcrumb">
        <Link to="/">Home</Link>
        <span className="breadcrumb-sep">›</span>
        <Link to="/store">Store</Link>
        <span className="breadcrumb-sep">›</span>
        <span className="breadcrumb-current">{cat?.name || slug}</span>
      </nav>

      <div className="section-header">
        <h1 className="section-title">
          <i className="ph ph-tag" /> {cat?.name || 'Category'}
          <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--gray-400)', marginLeft: 8 }}>
            ({count} products)
          </span>
        </h1>
        <Link to="/store" className="btn btn-outline-gray btn-sm">
          <i className="ph ph-arrow-left" /> All Products
        </Link>
      </div>

      {cat?.description && (
        <p style={{ color: 'var(--gray-500)', fontSize: 14, marginBottom: 20 }}>{cat.description}</p>
      )}

      {loading ? (
        <div className="loading-center"><div className="spinner spinner-lg" /></div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📦</div>
          <h3>No products in this category</h3>
          <Link to="/store" className="btn btn-primary">Browse All Products</Link>
        </div>
      ) : (
        <>
          <div className="product-grid">
            {items.map(p => <ProductCard key={p.id} product={p} />)}
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button className="page-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                <i className="ph ph-caret-left" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} className={`page-btn ${p === page ? 'active' : ''}`} onClick={() => setPage(p)}>
                  {p}
                </button>
              ))}
              <button className="page-btn" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
                <i className="ph ph-caret-right" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
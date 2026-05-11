import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { products as productsApi, categories, debounce, formatKES } from '../utils/api'
import ProductCard from '../components/ProductCard'

const ORDERINGS = [
  { label: 'Newest', value: '-created_at' },
  { label: 'Price: Low to High', value: 'price' },
  { label: 'Price: High to Low', value: '-price' },
  { label: 'Name A-Z', value: 'name' },
]

export default function Store() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [items, setItems]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [count, setCount]       = useState(0)
  const [next, setNext]         = useState(null)
  const [prev, setPrev]         = useState(null)
  const [cats, setCats]         = useState([])
  const [page, setPage]         = useState(1)

  // Filter state derived from URL
  const [minPrice, setMinPrice] = useState(searchParams.get('min_price') || '')
  const [maxPrice, setMaxPrice] = useState(searchParams.get('max_price') || '')
  const [inStock,  setInStock]  = useState(searchParams.get('in_stock') === 'true')

  const buildParams = useCallback(() => {
    const p = {}
    const sp = searchParams
    if (sp.get('search'))    p.search    = sp.get('search')
    if (sp.get('category'))  p.category  = sp.get('category')
    if (sp.get('brand'))     p.brand     = sp.get('brand')
    if (sp.get('ordering'))  p.ordering  = sp.get('ordering')
    if (sp.get('is_featured')) p.is_featured = sp.get('is_featured')
    if (sp.get('flash_deal'))  p.flash_deal  = sp.get('flash_deal')
    if (minPrice) p.min_price = minPrice
    if (maxPrice) p.max_price = maxPrice
    if (inStock)  p.in_stock  = true
    p.page = page
    return p
  }, [searchParams, minPrice, maxPrice, inStock, page])

  useEffect(() => {
    setLoading(true)
    productsApi.list(buildParams())
      .then(d => {
        setItems(d.results || [])
        setCount(d.count || 0)
        setNext(d.next)
        setPrev(d.previous)
      })
      .finally(() => setLoading(false))
  }, [buildParams])

  useEffect(() => {
    categories.tree().then(setCats).catch(() => {})
  }, [])

  const updateParam = (key, val) => {
    const sp = new URLSearchParams(searchParams)
    if (val) sp.set(key, val)
    else sp.delete(key)
    sp.delete('page')
    setPage(1)
    setSearchParams(sp)
  }

  const applyPriceFilter = () => {
    setPage(1)
    // triggers buildParams via state change
  }

  const clearFilters = () => {
    setMinPrice('')
    setMaxPrice('')
    setInStock(false)
    setPage(1)
    setSearchParams({})
  }

  const totalPages = Math.ceil(count / 20)

  return (
    <div className="page-wrap">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--gray-900)' }}>
          {searchParams.get('search')
            ? `Results for "${searchParams.get('search')}"`
            : searchParams.get('category')
            ? `Category: ${searchParams.get('category')}`
            : 'All Products'}
          <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--gray-400)', marginLeft: 8 }}>
            ({count} items)
          </span>
        </h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label style={{ fontSize: 13, color: 'var(--gray-500)' }}>Sort:</label>
          <select
            className="form-select"
            style={{ width: 'auto', padding: '8px 32px 8px 12px' }}
            value={searchParams.get('ordering') || '-created_at'}
            onChange={(e) => updateParam('ordering', e.target.value)}
          >
            {ORDERINGS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      <div className="layout-sidebar">
        {/* Sidebar */}
        <aside>
          <div className="filter-panel">
            <div className="filter-panel-header">
              <span><i className="ph ph-funnel" /> Filters</span>
              <button onClick={clearFilters}>Clear all</button>
            </div>

            {/* Category */}
            <div className="filter-section">
              <div className="filter-section-title">Category</div>
              {cats.map(cat => (
                <label key={cat.id} className="filter-option">
                  <input
                    type="radio"
                    name="category"
                    checked={searchParams.get('category') === cat.slug}
                    onChange={() => updateParam('category', cat.slug)}
                  />
                  {cat.name}
                </label>
              ))}
              {searchParams.get('category') && (
                <button
                  onClick={() => updateParam('category', '')}
                  style={{ fontSize: 12, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', marginTop: 4 }}
                >
                  × Clear
                </button>
              )}
            </div>

            {/* Price */}
            <div className="filter-section">
              <div className="filter-section-title">Price (KES)</div>
              <div className="price-range">
                <input
                  type="number"
                  placeholder="Min"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  onBlur={applyPriceFilter}
                />
                <span className="price-range-sep">–</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  onBlur={applyPriceFilter}
                />
              </div>
            </div>

            {/* In Stock */}
            <div className="filter-section">
              <div className="filter-section-title">Availability</div>
              <label className="filter-option">
                <input
                  type="checkbox"
                  checked={inStock}
                  onChange={(e) => { setInStock(e.target.checked); setPage(1) }}
                />
                In Stock Only
              </label>
            </div>

            {/* Flash / Featured */}
            <div className="filter-section">
              <div className="filter-section-title">Type</div>
              <label className="filter-option">
                <input
                  type="checkbox"
                  checked={searchParams.get('flash_deal') === 'true'}
                  onChange={(e) => updateParam('flash_deal', e.target.checked ? 'true' : '')}
                />
                ⚡ Flash Deals
              </label>
              <label className="filter-option">
                <input
                  type="checkbox"
                  checked={searchParams.get('is_featured') === 'true'}
                  onChange={(e) => updateParam('is_featured', e.target.checked ? 'true' : '')}
                />
                ⭐ Featured
              </label>
            </div>
          </div>
        </aside>

        {/* Products */}
        <div>
          {loading ? (
            <div className="loading-center">
              <div className="spinner spinner-lg" />
              <span>Loading products…</span>
            </div>
          ) : items.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📦</div>
              <h3>No products found</h3>
              <p>Try adjusting your filters or search terms.</p>
              <button className="btn btn-primary" onClick={clearFilters}>Clear Filters</button>
            </div>
          ) : (
            <>
              <div className="product-grid">
                {items.map(p => <ProductCard key={p.id} product={p} />)}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="pagination">
                  <button
                    className="page-btn"
                    disabled={!prev}
                    onClick={() => setPage(p => p - 1)}
                  >
                    <i className="ph ph-caret-left" />
                  </button>
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(p => (
                    <button
                      key={p}
                      className={`page-btn ${p === page ? 'active' : ''}`}
                      onClick={() => setPage(p)}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    className="page-btn"
                    disabled={!next}
                    onClick={() => setPage(p => p + 1)}
                  >
                    <i className="ph ph-caret-right" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
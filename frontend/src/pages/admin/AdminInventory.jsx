// pages/admin/AdminInventory.jsx
import { useState, useEffect, useCallback } from 'react'
import { request, formatKES, debounce } from '../../utils/api'

// ── Stock level helpers ────────────────────────────────────────────────────

function stockLevel(stock) {
  if (stock === 0)   return { label: 'Out of Stock', cls: 'adm-badge-red',   fill: 'low',    pct: 0   }
  if (stock < 10)    return { label: 'Low',          cls: 'adm-badge-red',   fill: 'low',    pct: Math.min(stock * 4, 30)  }
  if (stock < 30)    return { label: 'Medium',       cls: 'adm-badge-amber', fill: 'medium', pct: Math.min(stock * 2, 60)  }
  return               { label: 'Good',              cls: 'adm-badge-green', fill: 'high',   pct: Math.min(stock, 100)     }
}

// ── Restock Modal ──────────────────────────────────────────────────────────

function RestockModal({ product, onClose, onRestocked }) {
  const [qty,     setQty]     = useState('')
  const [note,    setNote]    = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const handle = async () => {
    const add = parseInt(qty)
    if (!add || add < 1) { setError('Enter a valid quantity.'); return }
    setLoading(true)
    setError('')
    try {
      // PATCH stock increment
      const newStock = (product.stock || 0) + add
      await request(`/products/${product.slug}/`, {
        method: 'PATCH',
        body: JSON.stringify({ stock: newStock }),
      })
      onRestocked()
    } catch (err) {
      setError(err.message || 'Failed to update stock.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="adm-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="adm-modal" style={{ maxWidth: 420 }}>
        <div className="adm-modal-header">
          <span className="adm-modal-title">Restock Product</span>
          <button className="adm-modal-close" onClick={onClose}><i className="ph ph-x" /></button>
        </div>
        <div className="adm-modal-body">
          {error && <div className="adm-alert adm-alert-error"><i className="ph ph-warning" />{error}</div>}

          <div style={{ background: 'var(--adm-surface-2)', border: '1px solid var(--adm-border)', borderRadius: 6, padding: '12px 16px', marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--adm-text)', marginBottom: 4 }}>{product.name}</div>
            <div style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 12, color: 'var(--adm-text-dim)' }}>
              SKU: {product.sku || '—'} &nbsp;·&nbsp; Current stock: <strong style={{ color: 'var(--adm-amber)' }}>{product.stock}</strong>
            </div>
          </div>

          <div className="adm-form-group">
            <label className="adm-form-label">Units to Add *</label>
            <input
              className="adm-input"
              type="number"
              min="1"
              placeholder="e.g. 50"
              value={qty}
              onChange={e => setQty(e.target.value)}
              autoFocus
            />
          </div>
          <div className="adm-form-group" style={{ marginBottom: 0 }}>
            <label className="adm-form-label">Note (optional)</label>
            <input
              className="adm-input"
              placeholder="e.g. Supplier delivery — batch #12"
              value={note}
              onChange={e => setNote(e.target.value)}
            />
          </div>

          {qty && parseInt(qty) > 0 && (
            <div style={{ marginTop: 14, fontSize: 12, fontFamily: 'var(--adm-font-mono)', color: 'var(--adm-text-dim)' }}>
              New stock will be <strong style={{ color: 'var(--adm-green)' }}>{(product.stock || 0) + parseInt(qty)}</strong> units.
            </div>
          )}
        </div>
        <div className="adm-modal-footer">
          <button className="adm-btn adm-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="adm-btn adm-btn-primary" onClick={handle} disabled={loading}>
            {loading
              ? <><div className="adm-spinner" style={{ width: 14, height: 14 }} /> Saving…</>
              : <><i className="ph ph-plus" /> Add Stock</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20

const FILTER_OPTS = [
  { value: '',        label: 'All Stock Levels' },
  { value: 'out',     label: 'Out of Stock (0)' },
  { value: 'low',     label: 'Low Stock (< 10)' },
  { value: 'medium',  label: 'Medium (10–29)'   },
  { value: 'good',    label: 'Good (≥ 30)'       },
]

export default function AdminInventory() {
  const [products, setProducts] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [total,    setTotal]    = useState(0)
  const [page,     setPage]     = useState(1)
  const [search,   setSearch]   = useState('')
  const [filter,   setFilter]   = useState('')
  const [selected, setSelected] = useState(null)
  const [toast,    setToast]    = useState('')

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      const qs = new URLSearchParams({ page, page_size: PAGE_SIZE })
      if (search) qs.set('search', search)
      // Stock filter applied client-side (API doesn't expose exact stock range filter yet)
      const data = await request(`/products/?${qs}`)
      let results = data.results || data

      // Client-side stock filter
      if (filter === 'out')    results = results.filter(p => p.stock === 0)
      else if (filter === 'low')    results = results.filter(p => p.stock > 0 && p.stock < 10)
      else if (filter === 'medium') results = results.filter(p => p.stock >= 10 && p.stock < 30)
      else if (filter === 'good')   results = results.filter(p => p.stock >= 30)

      setProducts(results)
      setTotal(filter ? results.length : (data.count || results.length))
    } catch { /* swallow */ }
    finally { setLoading(false) }
  }, [page, search, filter])

  useEffect(() => { fetchProducts() }, [fetchProducts])

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const onRestocked = () => {
    setSelected(null)
    fetchProducts()
    showToast('Stock updated successfully.')
  }

  const debouncedSearch = useCallback(debounce(v => { setSearch(v); setPage(1) }, 400), [])

  // Computed stats
  const outOfStock  = products.filter(p => p.stock === 0).length
  const lowStock    = products.filter(p => p.stock > 0 && p.stock < 10).length
  const totalUnits  = products.reduce((s, p) => s + p.stock, 0)
  const totalPages  = Math.ceil(total / PAGE_SIZE)

  return (
    <>
      {/* Header */}
      <div className="adm-page-header">
        <div>
          <div className="adm-page-title">Inventory</div>
          <div className="adm-page-subtitle">Stock levels across all products</div>
        </div>
        <div className="adm-page-actions">
          <button className="adm-btn adm-btn-ghost"><i className="ph ph-download-simple" /> Export</button>
        </div>
      </div>

      {toast && (
        <div className="adm-alert adm-alert-success"><i className="ph ph-check-circle" /> {toast}</div>
      )}

      {/* Stat cards */}
      <div className="adm-stat-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="adm-stat-card green">
          <div className="adm-stat-label">Total Units</div>
          <div className="adm-stat-value">{totalUnits.toLocaleString()}</div>
          <div className="adm-stat-meta">across {products.length} SKUs</div>
          <i className="ph ph-warehouse adm-stat-icon" />
        </div>
        <div className="adm-stat-card red">
          <div className="adm-stat-label">Out of Stock</div>
          <div className="adm-stat-value">{outOfStock}</div>
          <div className="adm-stat-meta down"><i className="ph ph-warning" /> Need restocking</div>
          <i className="ph ph-x-circle adm-stat-icon" />
        </div>
        <div className="adm-stat-card amber">
          <div className="adm-stat-label">Low Stock</div>
          <div className="adm-stat-value">{lowStock}</div>
          <div className="adm-stat-meta">under 10 units</div>
          <i className="ph ph-warning adm-stat-icon" />
        </div>
        <div className="adm-stat-card blue">
          <div className="adm-stat-label">Healthy Stock</div>
          <div className="adm-stat-value">{products.filter(p => p.stock >= 30).length}</div>
          <div className="adm-stat-meta up"><i className="ph ph-check" /> 30+ units</div>
          <i className="ph ph-check-circle adm-stat-icon" />
        </div>
      </div>

      {/* Toolbar */}
      <div className="adm-toolbar">
        <div className="adm-toolbar-search">
          <i className="ph ph-magnifying-glass" />
          <input placeholder="Search products…" onChange={e => debouncedSearch(e.target.value)} />
        </div>
        <select className="adm-select" value={filter} onChange={e => { setFilter(e.target.value); setPage(1) }}>
          {FILTER_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <div className="adm-toolbar-spacer" />
        {(outOfStock > 0 || lowStock > 0) && (
          <span style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 12 }}>
            <span className="adm-badge adm-badge-red">{outOfStock} out</span>
            &nbsp;
            <span className="adm-badge adm-badge-amber">{lowStock} low</span>
          </span>
        )}
      </div>

      {/* Table */}
      <div className="adm-card">
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Level</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7}><div className="adm-loading-center"><div className="adm-spinner" /><span>Loading…</span></div></td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan={7}><div className="adm-empty"><i className="ph ph-warehouse" /><p>No products match this filter.</p></div></td></tr>
              ) : products.map(p => {
                const sl = stockLevel(p.stock)
                return (
                  <tr key={p.id}>
                    <td>
                      <div className="adm-product-cell">
                        <div className="adm-product-thumb">
                          {p.primary_image?.image
                            ? <img src={p.primary_image.image} alt={p.name} />
                            : <i className="ph ph-image" />}
                        </div>
                        <strong>{p.name}</strong>
                      </div>
                    </td>
                    <td className="mono" style={{ color: 'var(--adm-text-dim)' }}>{p.sku || '—'}</td>
                    <td>{p.category_name || '—'}</td>
                    <td className="mono">{formatKES(p.price)}</td>
                    <td>
                      <span style={{ fontFamily: 'var(--adm-font-mono)', fontWeight: 700, color: p.stock === 0 ? 'var(--adm-red)' : p.stock < 10 ? 'var(--adm-amber)' : 'var(--adm-text)' }}>
                        {p.stock}
                      </span>
                    </td>
                    <td style={{ width: 160 }}>
                      <div>
                        <span className={`adm-badge ${sl.cls}`} style={{ marginBottom: 4 }}>{sl.label}</span>
                        <div className="adm-stock-bar">
                          <div className={`adm-stock-fill ${sl.fill}`} style={{ width: `${sl.pct}%` }} />
                        </div>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="adm-btn adm-btn-ghost adm-btn-sm"
                        onClick={() => setSelected(p)}
                      >
                        <i className="ph ph-plus" /> Restock
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="adm-pagination">
            <span className="adm-pagination-info">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
            </span>
            <button className="adm-page-btn" onClick={() => setPage(p => p - 1)} disabled={page === 1}>
              <i className="ph ph-caret-left" />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pg = page <= 3 ? i + 1 : page + i - 2
              if (pg < 1 || pg > totalPages) return null
              return (
                <button key={pg} className={`adm-page-btn ${pg === page ? 'active' : ''}`} onClick={() => setPage(pg)}>{pg}</button>
              )
            })}
            <button className="adm-page-btn" onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>
              <i className="ph ph-caret-right" />
            </button>
          </div>
        )}
      </div>

      {/* Restock modal */}
      {selected && (
        <RestockModal product={selected} onClose={() => setSelected(null)} onRestocked={onRestocked} />
      )}
    </>
  )
}
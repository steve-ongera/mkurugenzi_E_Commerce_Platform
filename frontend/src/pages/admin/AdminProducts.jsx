// pages/admin/AdminProducts.jsx
import { useState, useEffect, useCallback } from 'react'
import { request, formatKES, debounce } from '../../utils/api'

// ── Helpers ────────────────────────────────────────────────────────────────

function StatusBadge({ active }) {
  return active
    ? <span className="adm-badge adm-badge-green">Active</span>
    : <span className="adm-badge adm-badge-gray">Draft</span>
}

const EMPTY_FORM = {
  name: '', slug: '', price: '', compare_at_price: '',
  stock: '', sku: '', short_description: '', description: '',
  is_active: true, is_featured: false, is_flash_deal: false,
  category: '', brand: '',
}

// ── Product Form Modal ─────────────────────────────────────────────────────

function ProductModal({ product, categories, brands, onClose, onSaved }) {
  const isEdit = Boolean(product)
  const [form, setForm]       = useState(isEdit ? { ...product, category: product.category?.id || '', brand: product.brand?.id || '' } : EMPTY_FORM)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    setError('')
    setLoading(true)
    try {
      const payload = {
        ...form,
        price:             parseFloat(form.price)             || 0,
        compare_at_price:  form.compare_at_price ? parseFloat(form.compare_at_price) : null,
        stock:             parseInt(form.stock)               || 0,
        category:          form.category || null,
        brand:             form.brand    || null,
      }
      if (isEdit) {
        await request(`/products/${product.slug}/`, { method: 'PATCH', body: JSON.stringify(payload) })
      } else {
        await request('/products/', { method: 'POST', body: JSON.stringify(payload) })
      }
      onSaved()
    } catch (err) {
      setError(err.message || 'Failed to save product.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="adm-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="adm-modal">
        <div className="adm-modal-header">
          <span className="adm-modal-title">{isEdit ? 'Edit Product' : 'New Product'}</span>
          <button className="adm-modal-close" onClick={onClose}><i className="ph ph-x" /></button>
        </div>
        <div className="adm-modal-body">
          {error && <div className="adm-alert adm-alert-error"><i className="ph ph-warning" />{error}</div>}

          <div className="adm-grid-2" style={{ gap: 14, marginBottom: 0 }}>
            <div className="adm-form-group">
              <label className="adm-form-label">Product Name *</label>
              <input className="adm-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Samsung Galaxy A35" />
            </div>
            <div className="adm-form-group">
              <label className="adm-form-label">SKU</label>
              <input className="adm-input" value={form.sku} onChange={e => set('sku', e.target.value)} placeholder="e.g. SAM-A35-BLK" />
            </div>
            <div className="adm-form-group">
              <label className="adm-form-label">Price (KES) *</label>
              <input className="adm-input" type="number" value={form.price} onChange={e => set('price', e.target.value)} placeholder="0" />
            </div>
            <div className="adm-form-group">
              <label className="adm-form-label">Compare-at Price</label>
              <input className="adm-input" type="number" value={form.compare_at_price} onChange={e => set('compare_at_price', e.target.value)} placeholder="0" />
            </div>
            <div className="adm-form-group">
              <label className="adm-form-label">Stock</label>
              <input className="adm-input" type="number" value={form.stock} onChange={e => set('stock', e.target.value)} placeholder="0" />
            </div>
            <div className="adm-form-group">
              <label className="adm-form-label">Category</label>
              <select className="adm-select" style={{ width: '100%' }} value={form.category} onChange={e => set('category', e.target.value)}>
                <option value="">— None —</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="adm-form-group">
              <label className="adm-form-label">Brand</label>
              <select className="adm-select" style={{ width: '100%' }} value={form.brand} onChange={e => set('brand', e.target.value)}>
                <option value="">— None —</option>
                {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div className="adm-form-group" style={{ display: 'flex', alignItems: 'center', gap: 20, paddingTop: 24 }}>
              {[['is_active', 'Active'], ['is_featured', 'Featured'], ['is_flash_deal', 'Flash Deal']].map(([k, l]) => (
                <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, color: 'var(--adm-text-muted)' }}>
                  <input type="checkbox" className="adm-checkbox" checked={form[k]} onChange={e => set(k, e.target.checked)} />
                  {l}
                </label>
              ))}
            </div>
          </div>

          <div className="adm-form-group">
            <label className="adm-form-label">Short Description</label>
            <input className="adm-input" value={form.short_description} onChange={e => set('short_description', e.target.value)} placeholder="One-liner for product cards" />
          </div>
          <div className="adm-form-group" style={{ marginBottom: 0 }}>
            <label className="adm-form-label">Description</label>
            <textarea className="adm-input adm-textarea" value={form.description} onChange={e => set('description', e.target.value)} placeholder="Full product description…" />
          </div>
        </div>
        <div className="adm-modal-footer">
          <button className="adm-btn adm-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="adm-btn adm-btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? <><div className="adm-spinner" style={{ width: 14, height: 14 }} /> Saving…</> : <><i className="ph ph-check" /> {isEdit ? 'Update' : 'Create'}</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Delete Confirm ─────────────────────────────────────────────────────────

function DeleteConfirm({ product, onClose, onDeleted }) {
  const [loading, setLoading] = useState(false)

  const handle = async () => {
    setLoading(true)
    try {
      await request(`/products/${product.slug}/`, { method: 'DELETE' })
      onDeleted()
    } catch {
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="adm-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="adm-modal" style={{ maxWidth: 400 }}>
        <div className="adm-modal-header">
          <span className="adm-modal-title">Delete Product</span>
          <button className="adm-modal-close" onClick={onClose}><i className="ph ph-x" /></button>
        </div>
        <div className="adm-modal-body">
          <p style={{ color: 'var(--adm-text-muted)', fontSize: 14 }}>
            Are you sure you want to delete <strong style={{ color: 'var(--adm-text)' }}>{product.name}</strong>?
            This action cannot be undone.
          </p>
        </div>
        <div className="adm-modal-footer">
          <button className="adm-btn adm-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="adm-btn adm-btn-danger" onClick={handle} disabled={loading}>
            {loading ? 'Deleting…' : <><i className="ph ph-trash" /> Delete</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────

const PAGE_SIZE = 15

export default function AdminProducts() {
  const [products,   setProducts]   = useState([])
  const [categories, setCategories] = useState([])
  const [brands,     setBrands]     = useState([])
  const [loading,    setLoading]    = useState(true)
  const [total,      setTotal]      = useState(0)
  const [page,       setPage]       = useState(1)
  const [search,     setSearch]     = useState('')
  const [catFilter,  setCatFilter]  = useState('')
  const [modal,      setModal]      = useState(null)  // null | 'create' | 'edit' | 'delete'
  const [selected,   setSelected]   = useState(null)
  const [toast,      setToast]      = useState('')

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      const qs = new URLSearchParams({ page, page_size: PAGE_SIZE })
      if (search)    qs.set('search', search)
      if (catFilter) qs.set('category', catFilter)
      const data = await request(`/products/?${qs}`)
      setProducts(data.results || data)
      setTotal(data.count || (data.results || data).length)
    } catch { /* swallow */ }
    finally { setLoading(false) }
  }, [page, search, catFilter])

  useEffect(() => { fetchProducts() }, [fetchProducts])

  useEffect(() => {
    request('/categories/').then(d => setCategories(d)).catch(() => {})
    request('/brands/').then(d => setBrands(d)).catch(() => {})
  }, [])

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const onSaved = () => {
    setModal(null)
    fetchProducts()
    showToast('Product saved successfully.')
  }

  const onDeleted = () => {
    setModal(null)
    fetchProducts()
    showToast('Product deleted.')
  }

  const debouncedSearch = useCallback(debounce(v => { setSearch(v); setPage(1) }, 400), [])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <>
      {/* Header */}
      <div className="adm-page-header">
        <div>
          <div className="adm-page-title">Products</div>
          <div className="adm-page-subtitle">{total} products in catalogue</div>
        </div>
        <div className="adm-page-actions">
          <button className="adm-btn adm-btn-ghost"><i className="ph ph-download-simple" /> Export</button>
          <button className="adm-btn adm-btn-primary" onClick={() => setModal('create')}>
            <i className="ph ph-plus" /> New Product
          </button>
        </div>
      </div>

      {toast && (
        <div className="adm-alert adm-alert-success" style={{ marginBottom: 16 }}>
          <i className="ph ph-check-circle" /> {toast}
        </div>
      )}

      {/* Toolbar */}
      <div className="adm-toolbar">
        <div className="adm-toolbar-search">
          <i className="ph ph-magnifying-glass" />
          <input placeholder="Search products…" onChange={e => debouncedSearch(e.target.value)} />
        </div>
        <select className="adm-select" value={catFilter} onChange={e => { setCatFilter(e.target.value); setPage(1) }}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.slug}>{c.name}</option>)}
        </select>
        <div className="adm-toolbar-spacer" />
        <span style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 12, color: 'var(--adm-text-dim)' }}>
          Page {page} of {totalPages || 1}
        </span>
      </div>

      {/* Table */}
      <div className="adm-card">
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Status</th>
                <th>Featured</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7}><div className="adm-loading-center"><div className="adm-spinner" /><span>Loading…</span></div></td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan={7}><div className="adm-empty"><i className="ph ph-package" /><p>No products found.</p></div></td></tr>
              ) : products.map(p => (
                <tr key={p.id}>
                  <td>
                    <div className="adm-product-cell">
                      <div className="adm-product-thumb">
                        {p.primary_image?.image
                          ? <img src={p.primary_image.image} alt={p.name} />
                          : <i className="ph ph-image" />}
                      </div>
                      <div>
                        <strong>{p.name}</strong>
                        <div style={{ fontSize: 11, fontFamily: 'var(--adm-font-mono)', color: 'var(--adm-text-dim)', marginTop: 2 }}>{p.sku || '—'}</div>
                      </div>
                    </div>
                  </td>
                  <td>{p.category_name || '—'}</td>
                  <td className="mono">
                    {formatKES(p.price)}
                    {p.compare_at_price && (
                      <span style={{ marginLeft: 6, textDecoration: 'line-through', fontSize: 11, color: 'var(--adm-text-dim)' }}>
                        {formatKES(p.compare_at_price)}
                      </span>
                    )}
                  </td>
                  <td>
                    <span className={`adm-badge ${p.stock === 0 ? 'adm-badge-red' : p.stock < 10 ? 'adm-badge-amber' : 'adm-badge-green'}`}>
                      {p.stock}
                    </span>
                  </td>
                  <td><StatusBadge active={p.is_active} /></td>
                  <td>
                    {p.is_featured
                      ? <span className="adm-badge adm-badge-amber"><i className="ph ph-star-fill" /> Yes</span>
                      : <span style={{ color: 'var(--adm-text-dim)', fontSize: 12 }}>—</span>}
                  </td>
                  <td>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                      <button className="adm-btn adm-btn-ghost adm-btn-sm adm-btn-icon" title="Edit"
                        onClick={() => { setSelected(p); setModal('edit') }}>
                        <i className="ph ph-pencil" />
                      </button>
                      <button className="adm-btn adm-btn-danger adm-btn-sm adm-btn-icon" title="Delete"
                        onClick={() => { setSelected(p); setModal('delete') }}>
                        <i className="ph ph-trash" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="adm-pagination">
            <span className="adm-pagination-info">
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
            </span>
            <button className="adm-page-btn" onClick={() => setPage(p => p - 1)} disabled={page === 1}>
              <i className="ph ph-caret-left" />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pg = page <= 3 ? i + 1 : page + i - 2
              if (pg < 1 || pg > totalPages) return null
              return (
                <button key={pg} className={`adm-page-btn ${pg === page ? 'active' : ''}`} onClick={() => setPage(pg)}>
                  {pg}
                </button>
              )
            })}
            <button className="adm-page-btn" onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>
              <i className="ph ph-caret-right" />
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      {modal === 'create' && (
        <ProductModal categories={categories} brands={brands} onClose={() => setModal(null)} onSaved={onSaved} />
      )}
      {modal === 'edit' && selected && (
        <ProductModal product={selected} categories={categories} brands={brands} onClose={() => setModal(null)} onSaved={onSaved} />
      )}
      {modal === 'delete' && selected && (
        <DeleteConfirm product={selected} onClose={() => setModal(null)} onDeleted={onDeleted} />
      )}
    </>
  )
}
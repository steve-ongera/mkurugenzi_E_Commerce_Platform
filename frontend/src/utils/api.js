/**
 * utils/api.js
 * mkurugenzi.co.ke — centralised API client
 *
 * All requests go through the `request()` helper which:
 *  - Attaches the JWT Bearer token automatically
 *  - Handles 401 → token refresh → retry (once)
 *  - Throws a normalised Error with `error.data` for field-level validation messages
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'

// ── Token helpers ─────────────────────────────────────────────────────────────

export const tokens = {
  getAccess:    ()      => localStorage.getItem('access_token'),
  getRefresh:   ()      => localStorage.getItem('refresh_token'),
  setAccess:    (t)     => localStorage.setItem('access_token', t),
  setRefresh:   (t)     => localStorage.setItem('refresh_token', t),
  setTokens:    (a, r)  => { tokens.setAccess(a); tokens.setRefresh(r) },
  clearTokens:  ()      => { localStorage.removeItem('access_token'); localStorage.removeItem('refresh_token') },
}

// ── User helpers ──────────────────────────────────────────────────────────────

export const userStore = {
  get:   ()    => { try { return JSON.parse(localStorage.getItem('user')) } catch { return null } },
  set:   (u)   => localStorage.setItem('user', JSON.stringify(u)),
  clear: ()    => localStorage.removeItem('user'),
}

// ── Core request helper ───────────────────────────────────────────────────────

let _isRefreshing   = false
let _refreshQueue   = []   // queued callbacks waiting for new token

async function processRefreshQueue(newToken) {
  _refreshQueue.forEach(cb => cb(newToken))
  _refreshQueue = []
}

async function refreshAccessToken() {
  const refresh = tokens.getRefresh()
  if (!refresh) throw new Error('No refresh token')

  const res  = await fetch(`${BASE_URL}/auth/token/refresh/`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ refresh }),
  })

  if (!res.ok) {
    tokens.clearTokens()
    userStore.clear()
    throw new Error('Session expired. Please log in again.')
  }

  const data = await res.json()
  tokens.setAccess(data.access)
  if (data.refresh) tokens.setRefresh(data.refresh)
  return data.access
}

/**
 * Core fetch wrapper.
 * @param {string} endpoint  — relative path e.g. '/products/'
 * @param {object} options   — standard fetch options + optional `guestEmail`
 */
export async function request(endpoint, options = {}) {
  const { guestEmail, ...fetchOptions } = options

  const headers = {
    'Content-Type': 'application/json',
    ...fetchOptions.headers,
  }

  const access = tokens.getAccess()
  if (access) headers['Authorization'] = `Bearer ${access}`
  if (guestEmail) headers['X-Guest-Email'] = guestEmail

  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`

  let res = await fetch(url, { ...fetchOptions, headers })

  // ── Auto-refresh on 401 ───────────────────────────────────────────────────
  if (res.status === 401 && tokens.getRefresh()) {
    if (_isRefreshing) {
      // Queue this request until refresh completes
      return new Promise((resolve, reject) => {
        _refreshQueue.push(async (newToken) => {
          headers['Authorization'] = `Bearer ${newToken}`
          try {
            resolve(await fetch(url, { ...fetchOptions, headers }))
          } catch (err) {
            reject(err)
          }
        })
      }).then(r => parseResponse(r))
    }

    _isRefreshing = true
    try {
      const newToken = await refreshAccessToken()
      processRefreshQueue(newToken)
      headers['Authorization'] = `Bearer ${newToken}`
      res = await fetch(url, { ...fetchOptions, headers })
    } catch (err) {
      throw err
    } finally {
      _isRefreshing = false
    }
  }

  return parseResponse(res)
}

async function parseResponse(res) {
  let data
  const contentType = res.headers.get('content-type') || ''

  try {
    data = contentType.includes('application/json') ? await res.json() : await res.text()
  } catch {
    data = null
  }

  if (!res.ok) {
    const err     = new Error(extractErrorMessage(data) || `Request failed (${res.status})`)
    err.status    = res.status
    err.data      = data         // raw DRF validation errors
    throw err
  }

  return data
}

function extractErrorMessage(data) {
  if (!data) return null
  if (typeof data === 'string') return data
  if (data.detail) return data.detail
  if (data.non_field_errors) return data.non_field_errors.join(' ')
  // Return first field error for convenience
  const firstKey = Object.keys(data)[0]
  if (firstKey) {
    const val = data[firstKey]
    return Array.isArray(val) ? `${firstKey}: ${val[0]}` : String(val)
  }
  return null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const get    = (url, opts)  => request(url, { method: 'GET', ...opts })
const post   = (url, body, opts) => request(url, { method: 'POST',  body: JSON.stringify(body), ...opts })
const patch  = (url, body, opts) => request(url, { method: 'PATCH', body: JSON.stringify(body), ...opts })
const del    = (url, opts)  => request(url, { method: 'DELETE', ...opts })


// ─────────────────────────────────────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────────────────────────────────────

export const auth = {
  /**
   * Register a new account.
   * Returns { user, access, refresh }
   */
  register: (data) => post('/auth/register/', data),

  /**
   * Log in with email + password.
   * Returns { user, access, refresh }
   */
  login: async (email, password) => {
    const data = await post('/auth/login/', { email, password })
    tokens.setTokens(data.access, data.refresh)
    userStore.set(data.user)
    return data
  },

  /**
   * Log out — blacklists refresh token on the server.
   */
  logout: async () => {
    const refresh = tokens.getRefresh()
    try {
      if (refresh) await post('/auth/logout/', { refresh })
    } finally {
      tokens.clearTokens()
      userStore.clear()
    }
  },

  /** Convenience — is there a stored user session? */
  isAuthenticated: () => Boolean(tokens.getAccess() && userStore.get()),
}


// ─────────────────────────────────────────────────────────────────────────────
// PROFILE
// ─────────────────────────────────────────────────────────────────────────────

export const profile = {
  get:            ()     => get('/profile/'),
  update:         (data) => patch('/profile/', data),
  changePassword: (data) => post('/profile/password/', data),
}


// ─────────────────────────────────────────────────────────────────────────────
// CATEGORIES
// ─────────────────────────────────────────────────────────────────────────────

export const categories = {
  /** Full tree of active categories (root → children). */
  tree:   ()     => get('/categories/'),
  detail: (slug) => get(`/categories/${slug}/`),
}


// ─────────────────────────────────────────────────────────────────────────────
// PRODUCTS
// ─────────────────────────────────────────────────────────────────────────────

export const products = {
  /**
   * List products with optional filters.
   * @param {object} params — { category, brand, min_price, max_price,
   *                            in_stock, is_featured, flash_deal,
   *                            search, ordering, page, page_size }
   */
  list: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== '' && v !== null && v !== undefined)
    ).toString()
    return get(`/products/${qs ? `?${qs}` : ''}`)
  },

  detail:     (slug) => get(`/products/${slug}/`),
  related:    (slug) => get(`/products/${slug}/related/`),
  flashDeals: ()     => get('/products/flash-deals/'),
  brands:     ()     => get('/brands/'),
}


// ─────────────────────────────────────────────────────────────────────────────
// REVIEWS
// ─────────────────────────────────────────────────────────────────────────────

export const reviews = {
  create: (data) => post('/reviews/', data),
}


// ─────────────────────────────────────────────────────────────────────────────
// DELIVERY
// ─────────────────────────────────────────────────────────────────────────────

export const delivery = {
  /** All 47 counties with their active towns. */
  counties: () => get('/delivery/counties/'),

  /**
   * Full town detail: active stations (each with individual fee)
   * + home delivery option.
   */
  town:          (townSlug) => get(`/delivery/towns/${townSlug}/`),
  stations:      (townSlug) => get(`/delivery/stations/${townSlug}/`),
  homeDelivery:  (townSlug) => get(`/delivery/home/${townSlug}/`),
}


// ─────────────────────────────────────────────────────────────────────────────
// COUPONS
// ─────────────────────────────────────────────────────────────────────────────

export const coupons = {
  /**
   * Validate a coupon code against a cart subtotal.
   * Returns { valid, discount, discount_type, value, description }
   */
  validate: (code, subtotal) => post('/coupons/validate/', { code, subtotal }),
}


// ─────────────────────────────────────────────────────────────────────────────
// ORDERS
// ─────────────────────────────────────────────────────────────────────────────

export const orders = {
  /**
   * Place an order.
   * Works for both authenticated users and guests.
   *
   * @param {object} payload — see OrderCreateSerializer in serializers.py
   *   {
   *     items:          [{ product_id, variant_id?, quantity }],
   *     delivery_type:  'station' | 'home',
   *     town_id:        number,
   *     station_id?:    number,          // required if station delivery
   *     home_address?:  string,          // required if home delivery
   *     payment_method: 'mpesa' | 'card' | 'cod',
   *     mpesa_phone?:   string,
   *     coupon_code?:   string,
   *     guest_email?:   string,          // required for guest checkout
   *     guest_name?:    string,
   *     guest_phone?:   string,
   *     notes?:         string,
   *   }
   */
  create: (payload) => post('/orders/', payload),

  /** My order history (paginated). Requires auth. */
  list: (page = 1) => get(`/orders/?page=${page}`),

  /**
   * Get a single order by order number.
   * Authenticated users: automatic.
   * Guests: pass guestEmail → sent as X-Guest-Email header.
   */
  detail: (orderNumber, guestEmail) =>
    get(`/orders/${orderNumber}/`, guestEmail ? { guestEmail } : undefined),

  /** Cancel a pending / confirmed order (auth required). */
  cancel: (orderNumber) => post(`/orders/${orderNumber}/cancel/`, {}),
}


// ─────────────────────────────────────────────────────────────────────────────
// PAYMENTS — M-Pesa
// ─────────────────────────────────────────────────────────────────────────────

export const payments = {
  /**
   * Trigger an M-Pesa STK push.
   * @param {string} orderNumber
   * @param {string} phone  — any format: 07xx, 254xx, +254xx
   */
  mpesaInitiate: (orderNumber, phone) =>
    post('/payments/mpesa/initiate/', { order_number: orderNumber, phone }),
}


// ─────────────────────────────────────────────────────────────────────────────
// CART — client-side (localStorage)
// ─────────────────────────────────────────────────────────────────────────────
//
// The backend doesn't have a session cart endpoint; the cart lives in
// localStorage. At checkout, the cart items are POSTed as `items[]`
// inside the order payload.
//
// Shape of a cart item:
// {
//   id:          string (product.id + '-' + variant.id or just product.id)
//   product_id:  number
//   variant_id:  number | null
//   name:        string
//   image:       string
//   price:       number   (final price — already includes variant adjustment)
//   quantity:    number
//   variant_info: string  (e.g. "Size: XL, Colour: Blue")
//   max_stock:   number
// }

const CART_KEY = 'mkurugenzi_cart'

export const cart = {
  getAll: () => {
    try { return JSON.parse(localStorage.getItem(CART_KEY)) || [] }
    catch { return [] }
  },

  save: (items) => localStorage.setItem(CART_KEY, JSON.stringify(items)),

  clear: () => localStorage.removeItem(CART_KEY),

  add: (item) => {
    const items = cart.getAll()
    const idx   = items.findIndex(i => i.id === item.id)
    if (idx > -1) {
      const newQty = items[idx].quantity + (item.quantity || 1)
      items[idx].quantity = Math.min(newQty, items[idx].max_stock)
    } else {
      items.push({ ...item, quantity: item.quantity || 1 })
    }
    cart.save(items)
    return items
  },

  remove: (itemId) => {
    const items = cart.getAll().filter(i => i.id !== itemId)
    cart.save(items)
    return items
  },

  updateQty: (itemId, quantity) => {
    const items = cart.getAll().map(i =>
      i.id === itemId
        ? { ...i, quantity: Math.max(1, Math.min(quantity, i.max_stock)) }
        : i
    )
    cart.save(items)
    return items
  },

  /** Total number of units across all items. */
  totalUnits: () => cart.getAll().reduce((sum, i) => sum + i.quantity, 0),

  /** Cart subtotal in KES. */
  subtotal: () => cart.getAll().reduce((sum, i) => sum + i.price * i.quantity, 0),

  /** Convert cart items to the `items[]` array expected by the order API. */
  toOrderItems: () =>
    cart.getAll().map(i => ({
      product_id: i.product_id,
      variant_id: i.variant_id || null,
      quantity:   i.quantity,
    })),
}


// ─────────────────────────────────────────────────────────────────────────────
// UTILITY FORMATTERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Format a number as Kenyan Shillings.
 * formatKES(1234.5)  →  "KES 1,235"
 */
export function formatKES(amount) {
  if (amount === null || amount === undefined) return '—'
  return `KES ${Number(amount).toLocaleString('en-KE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`
}

/**
 * Format an ISO date string for display.
 * formatDate('2024-03-15T10:22:00Z')  →  "15 Mar 2024, 10:22"
 */
export function formatDate(iso, opts = {}) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-KE', {
    day:    '2-digit',
    month:  'short',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
    ...opts,
  })
}

/**
 * Truncate a string to `max` characters with ellipsis.
 */
export function truncate(str, max = 80) {
  if (!str) return ''
  return str.length > max ? `${str.slice(0, max)}…` : str
}

/**
 * Build a Cloudinary optimised image URL.
 * If the URL is already absolute, return as-is.
 */
export function imgUrl(path, width = 400) {
  if (!path) return '/placeholder.png'
  if (path.startsWith('http')) return path
  const base = import.meta.env.VITE_CLOUDINARY_BASE || ''
  return `${base}${path}`
}

/**
 * Debounce a function (use for search inputs).
 */
export function debounce(fn, delay = 400) {
  let timer
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}
// pages/admin/AdminDashboard.jsx
import { useState, useEffect } from 'react'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'
import { formatKES } from '../../utils/api'

// ── Mock data (replace with real API calls) ────────────────────────────────

const REVENUE_DATA = [
  { month: 'Nov', revenue: 184000, orders: 210 },
  { month: 'Dec', revenue: 312000, orders: 374 },
  { month: 'Jan', revenue: 228000, orders: 267 },
  { month: 'Feb', revenue: 195000, orders: 231 },
  { month: 'Mar', revenue: 264000, orders: 308 },
  { month: 'Apr', revenue: 341000, orders: 402 },
  { month: 'May', revenue: 289000, orders: 336 },
]

const CATEGORY_DATA = [
  { name: 'Electronics', value: 38 },
  { name: 'Fashion',     value: 24 },
  { name: 'Home',        value: 18 },
  { name: 'Beauty',      value: 12 },
  { name: 'Other',       value: 8  },
]

const TOP_PRODUCTS = [
  { name: 'Samsung Galaxy A35',     sold: 142, revenue: 355000, stock: 18 },
  { name: 'Elegance Sneaker - BLK', sold: 98,  revenue: 147000, stock: 34 },
  { name: 'Instant Pot Duo 7-in-1', sold: 76,  revenue: 228000, stock: 7  },
  { name: 'Oraimo FreePods 4',      sold: 213, revenue: 213000, stock: 51 },
  { name: 'Nivea Cellular Serum',   sold: 165, revenue: 82500,  stock: 89 },
]

const RECENT_ORDERS = [
  { number: 'MK-00812', customer: 'Amina Wanjiku', amount: 4800,  status: 'confirmed', method: 'mpesa' },
  { number: 'MK-00811', customer: 'Brian Ochieng', amount: 12400, status: 'delivered', method: 'mpesa' },
  { number: 'MK-00810', customer: 'Guest',         amount: 2200,  status: 'pending',   method: 'cod'   },
  { number: 'MK-00809', customer: 'Mercy Njeri',   amount: 6750,  status: 'shipped',   method: 'mpesa' },
  { number: 'MK-00808', customer: 'David Kamau',   amount: 18900, status: 'delivered', method: 'card'  },
]

const PIE_COLORS = ['#00e87a', '#f5a623', '#4d9fff', '#ff4d4d', '#666e72']

// ── Tooltip ────────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--adm-surface-2)',
      border: '1px solid var(--adm-border)',
      borderRadius: 6,
      padding: '10px 14px',
      fontFamily: 'var(--adm-font-mono)',
      fontSize: 12,
    }}>
      <p style={{ color: 'var(--adm-text-dim)', marginBottom: 6 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: {p.name === 'revenue' ? formatKES(p.value) : p.value}
        </p>
      ))}
    </div>
  )
}

// ── Status badge helper ────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    pending:   'adm-badge-amber',
    confirmed: 'adm-badge-blue',
    shipped:   'adm-badge-blue',
    delivered: 'adm-badge-green',
    cancelled: 'adm-badge-red',
  }
  return <span className={`adm-badge ${map[status] || 'adm-badge-gray'}`}>{status}</span>
}

// ── Stat Card ──────────────────────────────────────────────────────────────
function StatCard({ label, value, meta, metaDir, icon, accent }) {
  return (
    <div className={`adm-stat-card ${accent}`}>
      <div className="adm-stat-label">{label}</div>
      <div className="adm-stat-value">{value}</div>
      <div className={`adm-stat-meta ${metaDir}`}>
        <i className={`ph ${metaDir === 'up' ? 'ph-trend-up' : 'ph-trend-down'}`} />
        {meta}
      </div>
      <i className={`ph ${icon} adm-stat-icon`} />
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [range, setRange] = useState('7m')

  return (
    <>
      {/* Header */}
      <div className="adm-page-header">
        <div>
          <div className="adm-page-title">Dashboard</div>
          <div className="adm-page-subtitle">Monday, 11 May 2026 — overview at a glance</div>
        </div>
        <div className="adm-page-actions">
          <select className="adm-select" value={range} onChange={e => setRange(e.target.value)}>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="7m">Last 7 months</option>
          </select>
          <button className="adm-btn adm-btn-ghost">
            <i className="ph ph-download-simple" /> Export
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="adm-stat-grid">
        <StatCard label="Total Revenue"   value="KES 1.81M" meta="+18% vs last period" metaDir="up"   icon="ph-currency-circle-dollar" accent="green" />
        <StatCard label="Total Orders"    value="2,128"     meta="+12% vs last period" metaDir="up"   icon="ph-receipt"               accent="blue"  />
        <StatCard label="Active Products" value="384"       meta="+6 this week"        metaDir="up"   icon="ph-package"               accent="amber" />
        <StatCard label="Low Stock Items" value="23"        meta="−5 restocked today"  metaDir="down" icon="ph-warning"               accent="red"   />
      </div>

      {/* Revenue chart + Pie */}
      <div className="adm-grid-1-2" style={{ marginBottom: 20 }}>

        {/* Pie — category split */}
        <div className="adm-card">
          <div className="adm-card-header">
            <span className="adm-card-title">Sales by Category</span>
          </div>
          <div className="adm-card-body adm-chart-wrap">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={CATEGORY_DATA}
                  cx="50%" cy="50%"
                  innerRadius={64} outerRadius={96}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {CATEGORY_DATA.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v) => [`${v}%`, 'Share']}
                  contentStyle={{
                    background: 'var(--adm-surface-2)',
                    border: '1px solid var(--adm-border)',
                    borderRadius: 6,
                    fontFamily: 'var(--adm-font-mono)',
                    fontSize: 12,
                  }}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontFamily: 'var(--adm-font-mono)', fontSize: 11, color: 'var(--adm-text-muted)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Area — revenue over time */}
        <div className="adm-card">
          <div className="adm-card-header">
            <span className="adm-card-title">Revenue &amp; Orders</span>
            <span style={{ fontSize: 11, fontFamily: 'var(--adm-font-mono)', color: 'var(--adm-text-dim)' }}>KES</span>
          </div>
          <div className="adm-card-body adm-chart-wrap">
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={REVENUE_DATA} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="grad-rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#00e87a" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#00e87a" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="grad-ord" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#4d9fff" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#4d9fff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left"  tickFormatter={v => `${v/1000}k`} tick={{ fontSize: 10 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <Area yAxisId="left"  type="monotone" dataKey="revenue" stroke="#00e87a" strokeWidth={2} fill="url(#grad-rev)" name="revenue" />
                <Area yAxisId="right" type="monotone" dataKey="orders"  stroke="#4d9fff" strokeWidth={2} fill="url(#grad-ord)" name="orders"  />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Orders bar */}
      <div className="adm-card" style={{ marginBottom: 20 }}>
        <div className="adm-card-header">
          <span className="adm-card-title">Orders per Month</span>
        </div>
        <div className="adm-card-body adm-chart-wrap">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={REVENUE_DATA} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="orders" fill="#00e87a" radius={[3, 3, 0, 0]} name="orders" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top products + recent orders */}
      <div className="adm-grid-2" style={{ marginBottom: 0 }}>

        {/* Top products */}
        <div className="adm-card">
          <div className="adm-card-header">
            <span className="adm-card-title">Top Products</span>
            <a href="/admin/products" style={{ fontSize: 12, color: 'var(--adm-green)', fontFamily: 'var(--adm-font-mono)', textDecoration: 'none' }}>
              View all →
            </a>
          </div>
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Sold</th>
                  <th>Revenue</th>
                  <th>Stock</th>
                </tr>
              </thead>
              <tbody>
                {TOP_PRODUCTS.map((p, i) => (
                  <tr key={i}>
                    <td><strong>{p.name}</strong></td>
                    <td className="mono">{p.sold}</td>
                    <td className="mono">{formatKES(p.revenue)}</td>
                    <td>
                      <span className={`adm-badge ${p.stock < 10 ? 'adm-badge-red' : p.stock < 30 ? 'adm-badge-amber' : 'adm-badge-green'}`}>
                        {p.stock}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent orders */}
        <div className="adm-card">
          <div className="adm-card-header">
            <span className="adm-card-title">Recent Orders</span>
            <a href="/admin/orders" style={{ fontSize: 12, color: 'var(--adm-green)', fontFamily: 'var(--adm-font-mono)', textDecoration: 'none' }}>
              View all →
            </a>
          </div>
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {RECENT_ORDERS.map((o, i) => (
                  <tr key={i}>
                    <td className="mono" style={{ color: 'var(--adm-green)' }}>{o.number}</td>
                    <td><strong>{o.customer}</strong></td>
                    <td className="mono">{formatKES(o.amount)}</td>
                    <td><StatusBadge status={o.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}
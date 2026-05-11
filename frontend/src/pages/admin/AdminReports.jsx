// pages/admin/AdminReports.jsx
import { useState } from 'react'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, PieChart, Pie, Cell,
} from 'recharts'
import { formatKES } from '../../utils/api'

// ── Mock data ──────────────────────────────────────────────────────────────

const MONTHLY = [
  { month: 'Jun 25', revenue: 142000, orders: 168, returns: 4 },
  { month: 'Jul 25', revenue: 189000, orders: 221, returns: 7 },
  { month: 'Aug 25', revenue: 225000, orders: 262, returns: 9 },
  { month: 'Sep 25', revenue: 198000, orders: 230, returns: 6 },
  { month: 'Oct 25', revenue: 271000, orders: 314, returns: 11 },
  { month: 'Nov 25', revenue: 184000, orders: 210, returns: 5 },
  { month: 'Dec 25', revenue: 312000, orders: 374, returns: 14 },
  { month: 'Jan 26', revenue: 228000, orders: 267, returns: 8 },
  { month: 'Feb 26', revenue: 195000, orders: 231, returns: 6 },
  { month: 'Mar 26', revenue: 264000, orders: 308, returns: 10 },
  { month: 'Apr 26', revenue: 341000, orders: 402, returns: 13 },
  { month: 'May 26', revenue: 289000, orders: 336, returns: 9 },
]

const PAYMENT_METHODS = [
  { name: 'M-Pesa',      value: 74, color: '#00e87a' },
  { name: 'Card',        value: 14, color: '#4d9fff' },
  { name: 'Cash on Del', value: 12, color: '#f5a623' },
]

const DELIVERY_SPLIT = [
  { name: 'Station Pick-up', value: 62, color: '#00e87a' },
  { name: 'Home Delivery',   value: 38, color: '#4d9fff' },
]

const TOP_COUNTIES = [
  { name: 'Nairobi',    orders: 1042, revenue: 892000 },
  { name: 'Mombasa',    orders: 318,  revenue: 241000 },
  { name: 'Kisumu',     orders: 187,  revenue: 143000 },
  { name: 'Nakuru',     orders: 164,  revenue: 128000 },
  { name: 'Eldoret',    orders: 98,   revenue: 74000  },
  { name: 'Thika',      orders: 87,   revenue: 62000  },
  { name: 'Nyeri',      orders: 72,   revenue: 54000  },
  { name: 'Machakos',   orders: 61,   revenue: 46000  },
]

const ORDER_STATUS_COUNTS = [
  { status: 'Delivered',  count: 1628 },
  { status: 'Confirmed',  count: 218  },
  { status: 'Shipped',    count: 142  },
  { status: 'Pending',    count: 87   },
  { status: 'Cancelled',  count: 53   },
]

// ── Custom tooltip ─────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--adm-surface-2)', border: '1px solid var(--adm-border)',
      borderRadius: 6, padding: '10px 14px',
      fontFamily: 'var(--adm-font-mono)', fontSize: 12,
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

// ── Pie chart with label ───────────────────────────────────────────────────
function MiniPie({ data, title }) {
  return (
    <div className="adm-card">
      <div className="adm-card-header">
        <span className="adm-card-title">{title}</span>
      </div>
      <div className="adm-card-body adm-chart-wrap">
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" outerRadius={72} paddingAngle={3} dataKey="value">
              {data.map((d, i) => <Cell key={i} fill={d.color} />)}
            </Pie>
            <Tooltip
              formatter={(v) => [`${v}%`, 'Share']}
              contentStyle={{ background: 'var(--adm-surface-2)', border: '1px solid var(--adm-border)', borderRadius: 6, fontFamily: 'var(--adm-font-mono)', fontSize: 12 }}
            />
            <Legend
              iconType="circle" iconSize={8}
              wrapperStyle={{ fontFamily: 'var(--adm-font-mono)', fontSize: 11, color: 'var(--adm-text-muted)' }}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Legend numbers */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          {data.map(d => (
            <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontFamily: 'var(--adm-font-mono)', color: 'var(--adm-text-muted)' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, display: 'inline-block' }} />
              {d.name} <strong style={{ color: d.color }}>{d.value}%</strong>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function AdminReports() {
  const [period, setPeriod] = useState('12m')

  const totalRevenue = MONTHLY.reduce((s, m) => s + m.revenue, 0)
  const totalOrders  = MONTHLY.reduce((s, m) => s + m.orders, 0)
  const totalReturns = MONTHLY.reduce((s, m) => s + m.returns, 0)
  const avgOrder     = Math.round(totalRevenue / totalOrders)

  return (
    <>
      {/* Header */}
      <div className="adm-page-header">
        <div>
          <div className="adm-page-title">Reports</div>
          <div className="adm-page-subtitle">Sales analytics & business intelligence</div>
        </div>
        <div className="adm-page-actions">
          <select className="adm-select" value={period} onChange={e => setPeriod(e.target.value)}>
            <option value="3m">Last 3 months</option>
            <option value="6m">Last 6 months</option>
            <option value="12m">Last 12 months</option>
          </select>
          <button className="adm-btn adm-btn-ghost"><i className="ph ph-download-simple" /> Download CSV</button>
          <button className="adm-btn adm-btn-ghost"><i className="ph ph-printer" /> Print</button>
        </div>
      </div>

      {/* KPI row */}
      <div className="adm-stat-grid">
        <div className="adm-stat-card green">
          <div className="adm-stat-label">Total Revenue</div>
          <div className="adm-stat-value">{formatKES(totalRevenue)}</div>
          <div className="adm-stat-meta up"><i className="ph ph-trend-up" /> +22% YoY</div>
          <i className="ph ph-currency-circle-dollar adm-stat-icon" />
        </div>
        <div className="adm-stat-card blue">
          <div className="adm-stat-label">Total Orders</div>
          <div className="adm-stat-value">{totalOrders.toLocaleString()}</div>
          <div className="adm-stat-meta up"><i className="ph ph-trend-up" /> +17% YoY</div>
          <i className="ph ph-receipt adm-stat-icon" />
        </div>
        <div className="adm-stat-card amber">
          <div className="adm-stat-label">Avg Order Value</div>
          <div className="adm-stat-value">{formatKES(avgOrder)}</div>
          <div className="adm-stat-meta up"><i className="ph ph-trend-up" /> +4% YoY</div>
          <i className="ph ph-chart-bar adm-stat-icon" />
        </div>
        <div className="adm-stat-card red">
          <div className="adm-stat-label">Returns</div>
          <div className="adm-stat-value">{totalReturns}</div>
          <div className="adm-stat-meta down"><i className="ph ph-trend-down" /> −3% YoY</div>
          <i className="ph ph-arrow-u-up-left adm-stat-icon" />
        </div>
      </div>

      {/* Revenue area chart */}
      <div className="adm-card" style={{ marginBottom: 20 }}>
        <div className="adm-card-header">
          <span className="adm-card-title">Revenue Trend (12 months)</span>
          <span style={{ fontSize: 11, fontFamily: 'var(--adm-font-mono)', color: 'var(--adm-text-dim)' }}>KES</span>
        </div>
        <div className="adm-card-body adm-chart-wrap">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={MONTHLY} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#00e87a" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#00e87a" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tickFormatter={v => `${v/1000}k`} tick={{ fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="revenue" stroke="#00e87a" strokeWidth={2} fill="url(#rg)" name="revenue" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Orders line + Order status bar */}
      <div className="adm-grid-2" style={{ marginBottom: 20 }}>
        <div className="adm-card">
          <div className="adm-card-header">
            <span className="adm-card-title">Orders vs Returns</span>
          </div>
          <div className="adm-card-body adm-chart-wrap">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={MONTHLY} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontFamily: 'var(--adm-font-mono)', fontSize: 11 }} />
                <Line type="monotone" dataKey="orders"  stroke="#4d9fff" strokeWidth={2} dot={false} name="orders"  />
                <Line type="monotone" dataKey="returns" stroke="#ff4d4d" strokeWidth={2} dot={false} name="returns" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="adm-card">
          <div className="adm-card-header">
            <span className="adm-card-title">Order Status Breakdown</span>
          </div>
          <div className="adm-card-body adm-chart-wrap">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={ORDER_STATUS_COUNTS} layout="vertical" margin={{ top: 4, right: 8, left: 60, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="status" tick={{ fontSize: 11, fontFamily: 'var(--adm-font-mono)', fill: 'var(--adm-text-muted)' }} width={60} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" radius={[0, 3, 3, 0]} name="orders">
                  {ORDER_STATUS_COUNTS.map((d, i) => {
                    const colors = { Delivered: '#00e87a', Confirmed: '#4d9fff', Shipped: '#4d9fff', Pending: '#f5a623', Cancelled: '#ff4d4d' }
                    return <Cell key={i} fill={colors[d.status] || '#555'} />
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Pie charts */}
      <div className="adm-grid-2" style={{ marginBottom: 20 }}>
        <MiniPie data={PAYMENT_METHODS} title="Payment Method Split" />
        <MiniPie data={DELIVERY_SPLIT}  title="Delivery Method Split" />
      </div>

      {/* Top counties table */}
      <div className="adm-card">
        <div className="adm-card-header">
          <span className="adm-card-title">Top Counties by Revenue</span>
        </div>
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>#</th>
                <th>County</th>
                <th>Orders</th>
                <th>Revenue</th>
                <th>Share</th>
              </tr>
            </thead>
            <tbody>
              {TOP_COUNTIES.map((c, i) => {
                const pct = Math.round((c.revenue / totalRevenue) * 100)
                return (
                  <tr key={c.name}>
                    <td className="mono" style={{ color: 'var(--adm-text-dim)' }}>{i + 1}</td>
                    <td><strong>{c.name}</strong></td>
                    <td className="mono">{c.orders.toLocaleString()}</td>
                    <td className="mono">{formatKES(c.revenue)}</td>
                    <td style={{ width: 140 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="adm-stock-bar" style={{ flex: 1 }}>
                          <div className="adm-stock-fill high" style={{ width: `${pct}%` }} />
                        </div>
                        <span style={{ fontFamily: 'var(--adm-font-mono)', fontSize: 11, color: 'var(--adm-text-dim)', minWidth: 28 }}>{pct}%</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
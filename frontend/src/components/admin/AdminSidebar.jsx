// components/admin/AdminSidebar.jsx
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
 
const NAV = [
  {
    section: 'Overview',
    items: [
      { to: '/admin',           icon: 'ph-squares-four',     label: 'Dashboard' },
      { to: '/admin/reports',   icon: 'ph-chart-line-up',    label: 'Reports' },
    ],
  },
  {
    section: 'Catalogue',
    items: [
      { to: '/admin/products',  icon: 'ph-package',          label: 'Products' },
      { to: '/admin/inventory', icon: 'ph-warehouse',        label: 'Inventory' },
    ],
  },
  {
    section: 'Commerce',
    items: [
      { to: '/admin/orders',    icon: 'ph-receipt',          label: 'Orders',    badge: 4 },
      { to: '/admin/customers', icon: 'ph-users',            label: 'Customers' },
      { to: '/admin/coupons',   icon: 'ph-ticket',           label: 'Coupons' },
    ],
  },
  {
    section: 'Config',
    items: [
      { to: '/admin/delivery',  icon: 'ph-truck',            label: 'Delivery' },
      { to: '/admin/settings',  icon: 'ph-sliders',          label: 'Settings' },
    ],
  },
]
 
export default function AdminSidebar({ collapsed }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
 
  const initials = user?.full_name
    ? user.full_name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : 'AD'
 
  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }
 
  return (
    <aside className={`adm-sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* Logo */}
      <div className="adm-sidebar-logo">
        <div className="adm-sidebar-logo-mark">M</div>
        <div className="adm-sidebar-logo-text">
          Mkuru<span>genzi</span>
          <span className="adm-sidebar-logo-sub">Admin Panel</span>
        </div>
      </div>
 
      {/* Nav */}
      <nav className="adm-sidebar-nav">
        {NAV.map(group => (
          <div key={group.section}>
            <div className="adm-sidebar-section">{group.section}</div>
            {group.items.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/admin'}
                className={({ isActive }) =>
                  `adm-nav-item ${isActive ? 'active' : ''}`
                }
                title={collapsed ? item.label : undefined}
              >
                <i className={`ph ${item.icon}`} />
                <span className="adm-nav-item-label">{item.label}</span>
                {item.badge && !collapsed && (
                  <span className="adm-nav-badge">{item.badge}</span>
                )}
              </NavLink>
            ))}
          </div>
        ))}
 
        {/* Logout */}
        <div style={{ marginTop: 'auto', paddingTop: 16 }}>
          <button
            className="adm-nav-item"
            onClick={handleLogout}
            title={collapsed ? 'Logout' : undefined}
          >
            <i className="ph ph-sign-out" />
            <span className="adm-nav-item-label">Logout</span>
          </button>
        </div>
      </nav>
 
      {/* Footer user */}
      <div className="adm-sidebar-footer">
        <div className="adm-sidebar-user">
          <div className="adm-sidebar-user-avatar">{initials}</div>
          <div className="adm-sidebar-user-info">
            <div className="adm-sidebar-user-name">{user?.full_name || 'Admin'}</div>
            <div className="adm-sidebar-user-role">staff · admin</div>
          </div>
        </div>
      </div>
    </aside>
  )
}
// components/admin/AdminNavbar.jsx
import { useAuth } from '../../contexts/AuthContext'

export default function AdminNavbar({ collapsed, onToggle, pageTitle }) {
  const { user } = useAuth()

  const initials = user?.full_name
    ? user.full_name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : 'AD'

  return (
    <nav className={`adm-navbar ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <button className="adm-navbar-toggle" onClick={onToggle} title="Toggle sidebar">
        <i className="ph ph-list" />
      </button>

      <div className="adm-navbar-breadcrumb">
        <span>admin</span>
        <span>/</span>
        <strong>{pageTitle || 'dashboard'}</strong>
      </div>

      <div className="adm-navbar-spacer" />

      <div className="adm-navbar-search">
        <i className="ph ph-magnifying-glass" />
        <input placeholder="Quick search…" />
      </div>

      <div className="adm-navbar-actions">
        <button className="adm-navbar-icon-btn" title="Notifications">
          <i className="ph ph-bell" />
          <span className="adm-navbar-badge">3</span>
        </button>
        <button className="adm-navbar-icon-btn" title="Settings">
          <i className="ph ph-gear" />
        </button>
        <div className="adm-navbar-avatar" title={user?.full_name || 'Admin'}>
          {initials}
        </div>
      </div>
    </nav>
  )
}
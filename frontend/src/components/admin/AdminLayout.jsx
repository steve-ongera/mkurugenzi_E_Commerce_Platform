// components/admin/AdminLayout.jsx
import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import AdminSidebar from './AdminSidebar'
import AdminNavbar  from './AdminNavbar'
import '../../styles/admin.css'

export default function AdminLayout({ pageTitle }) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="adm-root">
      <AdminSidebar collapsed={collapsed} />
      <div className={`adm-layout ${collapsed ? 'sidebar-collapsed' : ''}`}>
        <AdminNavbar
          collapsed={collapsed}
          onToggle={() => setCollapsed(c => !c)}
          pageTitle={pageTitle}
        />
        <main className="adm-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
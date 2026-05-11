import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { profile as profileApi } from '../utils/api'

export default function Profile() {
  const { user, updateUser } = useAuth()
  const [form, setForm]       = useState({
    full_name: user?.full_name || '',
    phone:     user?.phone     || '',
  })
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [error, setError]     = useState('')

  // Password change
  const [pwForm, setPwForm] = useState({ old_password: '', new_password: '' })
  const [pwSaving, setPwSaving] = useState(false)
  const [pwMsg, setPwMsg]       = useState('')
  const [pwError, setPwError]   = useState('')

  const handleProfileSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      const updated = await profileApi.update(form)
      updateUser(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err.message || 'Failed to update profile.')
    } finally {
      setSaving(false)
    }
  }

  const handlePwChange = async (e) => {
    e.preventDefault()
    setPwSaving(true)
    setPwError('')
    setPwMsg('')
    try {
      await profileApi.changePassword(pwForm)
      setPwMsg('Password changed successfully.')
      setPwForm({ old_password: '', new_password: '' })
    } catch (err) {
      setPwError(err.message || 'Failed to change password.')
    } finally {
      setPwSaving(false)
    }
  }

  return (
    <div className="page-wrap" style={{ maxWidth: 640, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>
        <i className="ph ph-user-circle" style={{ marginRight: 8 }} />
        My Profile
      </h1>

      {/* Avatar + name */}
      <div className="card" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 20 }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: 'var(--primary)', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 30, fontWeight: 700, flexShrink: 0,
        }}>
          {user?.full_name?.[0]?.toUpperCase() || '?'}
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 18 }}>{user?.full_name || 'User'}</div>
          <div style={{ color: 'var(--gray-400)', fontSize: 13 }}>{user?.email}</div>
          {user?.is_verified && (
            <span className="badge badge-success" style={{ marginTop: 4 }}>
              <i className="ph ph-check-circle" /> Verified
            </span>
          )}
        </div>
      </div>

      {/* Profile form */}
      <div className="form-card" style={{ marginBottom: 20 }}>
        <div className="form-card-title">Personal Details</div>
        <div className="form-card-subtitle">Update your name and phone number.</div>

        {error && <div className="alert alert-danger">{error}</div>}
        {saved && <div className="alert alert-success"><i className="ph ph-check" /> Profile updated!</div>}

        <form onSubmit={handleProfileSave}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input
              className="form-control"
              value={form.full_name}
              onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
              placeholder="Your full name"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-control" value={user?.email} disabled />
            <div className="form-hint">Email cannot be changed.</div>
          </div>
          <div className="form-group">
            <label className="form-label">Phone</label>
            <input
              className="form-control"
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              placeholder="07xx xxx xxx"
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? <><div className="spinner spinner-sm" style={{ borderTopColor: '#fff' }} /> Saving…</> : 'Save Changes'}
          </button>
        </form>
      </div>

      {/* Password change */}
      <div className="form-card">
        <div className="form-card-title">Change Password</div>
        <div className="form-card-subtitle">Update your account password.</div>

        {pwError && <div className="alert alert-danger">{pwError}</div>}
        {pwMsg   && <div className="alert alert-success"><i className="ph ph-check" /> {pwMsg}</div>}

        <form onSubmit={handlePwChange}>
          <div className="form-group">
            <label className="form-label">Current Password</label>
            <input
              className="form-control"
              type="password"
              value={pwForm.old_password}
              onChange={e => setPwForm(f => ({ ...f, old_password: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label className="form-label">New Password</label>
            <input
              className="form-control"
              type="password"
              value={pwForm.new_password}
              onChange={e => setPwForm(f => ({ ...f, new_password: e.target.value }))}
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={pwSaving || !pwForm.old_password || !pwForm.new_password}>
            {pwSaving ? 'Changing…' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  )
}
// pages/login.jsx
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const navigate  = useNavigate()

  const [form, setForm]       = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [showPw, setShowPw]   = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await login(form.email, form.password)
      // Staff users → admin dashboard; regular users → storefront home
      if (data?.user?.is_staff) {
        navigate('/admin', { replace: true })
      } else {
        navigate('/', { replace: true })
      }
    } catch (err) {
      setError(err.message || 'Invalid email or password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-mark">🛍</div>
          <div className="auth-logo-name">Mkuru<span>genzi</span></div>
        </div>

        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Welcome back</h1>
        <p style={{ fontSize: 14, color: 'var(--gray-400)', marginBottom: 24 }}>
          Sign in to your account to continue.
        </p>

        {error && (
          <div className="alert alert-danger">
            <i className="ph ph-warning" /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div className="input-with-icon">
              <i className="ph ph-envelope input-icon" />
              <input
                className="form-control"
                type="email"
                placeholder="you@example.com"
                required
                autoFocus
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="input-with-icon">
              <i className="ph ph-lock input-icon" />
              <input
                className="form-control"
                type={showPw ? 'text' : 'password'}
                placeholder="Enter your password"
                required
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              />
              <button
                type="button"
                className="input-icon-right"
                onClick={() => setShowPw(!showPw)}
              >
                <i className={`ph ${showPw ? 'ph-eye-slash' : 'ph-eye'}`} />
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full btn-lg"
            disabled={loading}
            style={{ marginTop: 8 }}
          >
            {loading
              ? <><div className="spinner spinner-sm" style={{ borderTopColor: '#fff' }} /> Signing in…</>
              : <>Sign In <i className="ph ph-arrow-right" /></>}
          </button>
        </form>

        <div className="form-divider">or</div>

        <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--gray-500)' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: 'var(--primary)', fontWeight: 700 }}>Create one</Link>
        </p>

        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--gray-400)', marginTop: 8 }}>
          <Link to="/checkout" style={{ color: 'var(--gray-400)' }}>Continue as guest →</Link>
        </p>
      </div>
    </div>
  )
}
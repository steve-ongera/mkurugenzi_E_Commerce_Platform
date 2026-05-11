import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { auth, userStore, tokens } from '../utils/api'
import { useAuth } from '../contexts/AuthContext'

export default function Register() {
  const { login } = useAuth()
  const navigate  = useNavigate()

  const [form, setForm] = useState({
    email: '', full_name: '', phone: '',
    password: '', password2: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [showPw, setShowPw]   = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (form.password !== form.password2) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      const data = await auth.register(form)
      // Store tokens + user
      tokens.setTokens(data.access, data.refresh)
      userStore.set(data.user)
      // Reload auth context by navigating
      navigate('/')
      window.location.reload()
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-mark">🛍</div>
          <div className="auth-logo-name">Mkuru<span>genzi</span></div>
        </div>

        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Create Account</h1>
        <p style={{ fontSize: 14, color: 'var(--gray-400)', marginBottom: 24 }}>
          Join thousands of shoppers across Kenya.
        </p>

        {error && (
          <div className="alert alert-danger">
            <i className="ph ph-warning" /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name <span className="required">*</span></label>
            <div className="input-with-icon">
              <i className="ph ph-user input-icon" />
              <input
                className="form-control"
                placeholder="Your full name"
                required
                autoFocus
                value={form.full_name}
                onChange={set('full_name')}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Email <span className="required">*</span></label>
              <div className="input-with-icon">
                <i className="ph ph-envelope input-icon" />
                <input
                  className="form-control"
                  type="email"
                  placeholder="you@example.com"
                  required
                  value={form.email}
                  onChange={set('email')}
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <div className="input-with-icon">
                <i className="ph ph-phone input-icon" />
                <input
                  className="form-control"
                  placeholder="07xx xxx xxx"
                  value={form.phone}
                  onChange={set('phone')}
                />
              </div>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Password <span className="required">*</span></label>
              <div className="input-with-icon">
                <i className="ph ph-lock input-icon" />
                <input
                  className="form-control"
                  type={showPw ? 'text' : 'password'}
                  placeholder="Min 8 characters"
                  required
                  value={form.password}
                  onChange={set('password')}
                />
                <button type="button" className="input-icon-right" onClick={() => setShowPw(!showPw)}>
                  <i className={`ph ${showPw ? 'ph-eye-slash' : 'ph-eye'}`} />
                </button>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Confirm Password <span className="required">*</span></label>
              <div className="input-with-icon">
                <i className="ph ph-lock input-icon" />
                <input
                  className="form-control"
                  type="password"
                  placeholder="Repeat password"
                  required
                  value={form.password2}
                  onChange={set('password2')}
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full btn-lg"
            disabled={loading}
            style={{ marginTop: 8 }}
          >
            {loading
              ? <><div className="spinner spinner-sm" style={{ borderTopColor: '#fff' }} /> Creating account…</>
              : <>Create Account <i className="ph ph-arrow-right" /></>}
          </button>
        </form>

        <div className="form-divider">or</div>

        <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--gray-500)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 700 }}>Sign in</Link>
        </p>
      </div>
    </div>
  )
}
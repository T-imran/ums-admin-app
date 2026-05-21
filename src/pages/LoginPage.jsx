import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getApiBaseUrl, getClientId, hasActiveSession, loginWithPassword } from '../auth'

const initialForm = {
  username: '',
  password: '',
}

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState(initialForm)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (hasActiveSession()) {
      navigate('/dashboard', { replace: true })
    }
  }, [navigate])

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitting(true)
    setErrorMessage('')

    try {
      await loginWithPassword(form)
      const nextPath = location.state?.from ?? '/dashboard'
      navigate(nextPath, { replace: true })
    } catch (error) {
      setErrorMessage(error.message || 'Unable to sign in with the provided credentials.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-shell">
      <section className="auth-panel auth-panel--brand">
        <p className="auth-badge">UMS Admin Console</p>
        <h1>Manage your realm with a Keycloak-style custom interface.</h1>
        <p className="auth-copy">
          Sign in with the same Spring Boot authentication endpoint that powers your
          admin APIs, then manage users, roles, and clients from a unified console.
        </p>

        <div className="auth-meta-card">
          <span>Connected client</span>
          <strong>{getClientId()}</strong>
          <p>API base: {getApiBaseUrl()}</p>
        </div>
      </section>

      <section className="auth-panel auth-panel--form">
        <div className="auth-panel-header">
          <p className="section-kicker">Authentication</p>
          <h2>Sign in to continue</h2>
          <p>Use the credentials accepted by `POST /api/v1/auth/login`.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Username
            <input
              value={form.username}
              onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))}
              placeholder="admin"
              autoComplete="username"
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              placeholder="Enter your password"
              autoComplete="current-password"
              required
            />
          </label>

          <button className="primary-button" type="submit" disabled={submitting}>
            {submitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {errorMessage ? <p className="form-message form-message--error">{errorMessage}</p> : null}
      </section>
    </div>
  )
}

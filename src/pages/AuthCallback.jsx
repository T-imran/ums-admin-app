import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  clearSession,
  createSessionFromCallback,
  hasActiveSession,
  redirectToSso,
  setSession,
  validateCallbackParams,
} from '../auth'

export default function AuthCallback() {
  const navigate = useNavigate()
  const location = useLocation()
  const search = location.search
  const params = new URLSearchParams(search)
  const payload = {
    ums_login: params.get('ums_login'),
    client_id: params.get('client_id'),
    state: params.get('state'),
    access_token: params.get('access_token'),
    refresh_token: params.get('refresh_token'),
  }
  const isValidCallback = validateCallbackParams(payload)
  const message = isValidCallback
    ? 'Processing authentication response...'
    : 'Authentication response is missing token data. Redirecting to UMS SSO...'

  useEffect(() => {
    const callbackParams = new URLSearchParams(search)

    if (hasActiveSession()) {
      navigate('/dashboard', { replace: true })
      return
    }

    if (isValidCallback) {
      setSession(createSessionFromCallback(callbackParams))
      navigate('/dashboard', { replace: true })
      return
    }

    clearSession()

    const timeout = window.setTimeout(() => {
      redirectToSso()
    }, 800)

    return () => window.clearTimeout(timeout)
  }, [isValidCallback, navigate, search])

  return (
    <div className="console-shell console-shell--loading">
      <div className="loading-card">
        <div className="brand-lockup brand-lockup--stacked">
          <img className="brand-logo" src="/era-logo.png" alt="ERA Infotech Ltd" />
        </div>
        <p className="section-kicker">SSO Callback</p>
        <h1>Authentication callback</h1>
        <p>{message}</p>
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  clearPendingState,
  clearSession,
  isAuthenticated,
  redirectToSso,
  setSession,
  validateCallbackParams,
} from '../auth'

export default function AuthCallback() {
  const navigate = useNavigate()
  const location = useLocation()
  const [message, setMessage] = useState('Processing authentication response...')

  useEffect(() => {
    if (isAuthenticated()) {
      navigate('/dashboard', { replace: true })
      return
    }

    const params = new URLSearchParams(location.search)
    const ums_login = params.get('ums_login')
    const username = params.get('username')
    const client_id = params.get('client_id')
    const state = params.get('state')

    const payload = { ums_login, client_id, username, state }

    if (validateCallbackParams(payload)) {
      setSession({
        username,
        client_id,
        authenticatedAt: Date.now(),
      })
      clearPendingState()
      navigate('/dashboard', { replace: true })
      return
    }

    clearSession()
    setMessage('Authentication failed or state mismatch. Redirecting to login...')

    const timeout = window.setTimeout(() => {
      redirectToSso()
    }, 600)

    return () => window.clearTimeout(timeout)
  }, [location.search, navigate])

  return (
    <section style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>Authentication callback</h1>
      <p>{message}</p>
    </section>
  )
}

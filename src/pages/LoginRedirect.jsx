import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { hasActiveSession, redirectToSso } from '../auth'

export default function LoginRedirect() {
  const navigate = useNavigate()

  useEffect(() => {
    if (hasActiveSession()) {
      navigate('/dashboard', { replace: true })
      return
    }

    redirectToSso()
  }, [navigate])

  return (
    <div className="console-shell console-shell--loading">
      <div className="loading-card">
        <p className="section-kicker">SSO Redirect</p>
        <h1>Redirecting to UMS SSO...</h1>
        <p>The admin app does not show a local login screen anymore.</p>
      </div>
    </div>
  )
}

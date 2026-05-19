import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { isAuthenticated, redirectToSso } from '../auth'

export default function LoginRedirect() {
  const navigate = useNavigate()

  useEffect(() => {
    if (isAuthenticated()) {
      navigate('/dashboard', { replace: true })
      return
    }

    redirectToSso()
  }, [navigate])

  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>Redirecting to UMS SSO...</h1>
      <p>Please wait while we redirect you to the authentication provider.</p>
    </div>
  )
}

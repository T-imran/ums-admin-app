import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { clearSession, getSession } from '../auth'

export default function Dashboard() {
  const navigate = useNavigate()
  const session = useMemo(() => getSession(), [])
  const username = session?.username ?? 'Administrator'

  function handleLogout() {
    clearSession()
    navigate('/login', { replace: true })
  }

  return (
    <main style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Admin Dashboard</h1>
          <p>Welcome back, <strong>{username}</strong>.</p>
        </div>
        <button type="button" onClick={handleLogout} style={{ padding: '0.75rem 1.25rem' }}>
          Logout
        </button>
      </div>

      <section style={{ marginTop: '2rem' }}>
        <p>
          This app uses the external UMS SSO app for authentication. If you need to
          sign in again, use the logout button and you will be redirected back to SSO.
        </p>
      </section>
    </main>
  )
}

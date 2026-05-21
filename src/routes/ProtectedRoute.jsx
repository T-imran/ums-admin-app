import { Navigate, useLocation } from 'react-router-dom'
import { hasActiveSession } from '../auth'

export default function ProtectedRoute({ children }) {
  const location = useLocation()

  if (hasActiveSession()) {
    return children
  }

  return <Navigate to="/login" state={{ from: location.pathname }} replace />
}

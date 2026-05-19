import { Navigate, useLocation } from 'react-router-dom'
import { isAuthenticated } from '../auth'

export default function ProtectedRoute({ children }) {
  const location = useLocation()

  if (isAuthenticated()) {
    return children
  }

  return <Navigate to="/login" state={{ from: location.pathname }} replace />
}

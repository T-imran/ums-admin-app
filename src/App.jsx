import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AuthCallback from './pages/AuthCallback'
import { getRouterBasename } from './auth'
import Dashboard from './pages/Dashboard'
import LoginRedirect from './pages/LoginRedirect'
import ProtectedRoute from './routes/ProtectedRoute'

function App() {
  return (
    <BrowserRouter basename={getRouterBasename()}>
      <Routes>
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/login" element={<LoginRedirect />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App

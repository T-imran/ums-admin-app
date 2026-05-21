import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import { getRouterBasename } from './auth'
import Dashboard from './pages/Dashboard'
import AuthCallback from './pages/AuthCallback'
import LoginRedirect from './pages/LoginRedirect'
import ProtectedRoute from './routes/ProtectedRoute'

function App() {
  return (
    <BrowserRouter basename={getRouterBasename()}>
      <Routes>
        <Route path="/login" element={<LoginRedirect />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App

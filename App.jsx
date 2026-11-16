import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import Sidebar from './components/Sidebar'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const Assessment = lazy(() => import('./pages/Assessment'))
const History = lazy(() => import('./pages/History'))

export default function App() {
  return (
    <div className="app-wrapper">
      <Sidebar />
      <div className="main-content">
        <Suspense fallback={<div className="loading-center"><div className="spinner" /></div>}>
          <Routes>
            <Route path="/"           element={<Dashboard />} />
            <Route path="/assessment" element={<Assessment />} />
            <Route path="/history"    element={<History />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </div>
    </div>
  )
}

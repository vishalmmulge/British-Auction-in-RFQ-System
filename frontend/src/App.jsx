import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import Layout from './components/Layout'
import { useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import RFQCreate from './pages/RFQCreate'
import AuctionListing from './pages/AuctionListing'
import AuctionDetail from './pages/AuctionDetail'
import SupplierBid from './pages/SupplierBid'
import ActivityHistory from './pages/ActivityHistory'
import ActivityFeed from './pages/ActivityFeed'

function FullPageLoader({ message = 'Loading...' }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-600 font-medium">{message}</p>
      </div>
    </div>
  )
}

// Pages read user, so wait for the session check before rendering them.
function RequireAuth() {
  const { user, loading } = useAuth()
  if (loading) return <FullPageLoader message="Checking your session..." />
  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route element={<RequireAuth />}>
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/rfq/create" element={<RFQCreate />} />
            <Route path="/auctions" element={<AuctionListing />} />
            <Route path="/activity" element={<ActivityFeed />} />
            <Route path="/auctions/activity" element={<Navigate to="/activity" replace />} />
            <Route path="/auctions/:rfqId" element={<AuctionDetail />} />
            <Route path="/auctions/:rfqId/bid" element={<SupplierBid />} />
            <Route path="/auctions/:rfqId/activity" element={<ActivityHistory />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App

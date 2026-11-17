import { Outlet, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { LogOut, LayoutDashboard, List, Activity, CreditCard } from 'lucide-react'

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/auctions', label: 'Auctions', icon: List },
    { path: '/rfq/create', label: 'Create RFQ', icon: CreditCard, role: 'buyer' },
    { path: '/activity', label: 'Activity', icon: Activity },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xl text-indigo-600">RFQ Auction</span>
            </div>
            <div className="flex items-center gap-4">
              {menuItems
                .filter((i) => !i.role || i.role === user?.role)
                .map((i) => {
                  const Icon = i.icon
                  return (
                    <Link
                      key={i.path}
                      to={i.path}
                      className="px-4 py-2 text-sm font-medium rounded-lg transition hover:bg-gray-100"
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      {i.label}
                    </Link>
                  )
                })}
              <div className="flex items-center gap-4 pl-4 border-l border-gray-200">
                <span className="text-sm text-gray-600">{user?.username} ({user?.role})</span>
                <button
                  onClick={logout}
                  className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition"
                >
                  <LogOut className="w-4 h-4 mr-2" /> Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
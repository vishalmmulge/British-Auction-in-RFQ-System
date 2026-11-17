import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { rfqAPI, auctionAPI } from '../api'
import { useAuth } from '../context/AuthContext'

const STATUS_LABELS = {
  draft: 'Draft',
  active: 'Active',
  closed: 'Closed',
  forced_closed: 'Force Closed',
  cancelled: 'Cancelled',
}

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [rfqs, setRfqs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }
    let active = true
    const request = user?.role === 'buyer' ? rfqAPI.list() : auctionAPI.list()
    request
      .then((r) => {
        if (active) setRfqs(r.data)
      })
      .catch(() => {
        if (active) setRfqs([])
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [user])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-slate-600 font-medium">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-gray-600 text-sm">Manage your RFQs and auctions</p>
        </div>
        {user?.role === 'buyer' && (
          <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700" onClick={() => navigate('/rfq/create')}>
            Create RFQ
          </button>
        )}
      </div>
      <div className="bg-white rounded-lg shadow p-6">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b text-gray-600">
              <th className="pb-3">Reference ID</th>
              <th className="pb-3">Name</th>
              <th className="pb-3">Status</th>
              <th className="pb-3">Current Close</th>
            </tr>
          </thead>
          <tbody>
            {rfqs.length === 0 ? (
              <tr>
                <td colSpan="4" className="py-8 text-center text-gray-500">No auctions found</td>
              </tr>
            ) : (
              rfqs.map((r) => {
                const id = r.rfq_id ?? r.id
                return (
                  <tr
                    key={id}
                    className="border-b last:border-0 cursor-pointer hover:bg-gray-50"
                    onClick={() => navigate(`/auctions/${id}`)}
                  >
                    <td className="py-3 font-mono">{r.reference_id}</td>
                    <td className="py-3 text-indigo-600">{r.name}</td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        r.status === 'active' ? 'bg-green-100 text-green-700' :
                        r.status === 'forced_closed' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {STATUS_LABELS[r.status] || r.status}
                      </span>
                    </td>
                    <td className="py-3">
                      {new Date(r.current_closing_time ?? r.current_close_time).toLocaleString()}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
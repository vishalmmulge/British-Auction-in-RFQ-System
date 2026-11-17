import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { auctionAPI, getErrorMessage } from '../api'

const STATUS_LABELS = {
  draft: 'Draft',
  active: 'Active',
  closed: 'Closed',
  forced_closed: 'Force Closed',
  cancelled: 'Cancelled',
}

export default function AuctionListing() {
  const [auctions, setAuctions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    auctionAPI
      .list()
      .then((r) => {
        if (active) setAuctions(r.data)
      })
      .catch((err) => {
        if (active) setError(getErrorMessage(err, 'Could not load auctions'))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  if (loading) return <div className="text-center py-10">Loading auctions...</div>

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Auction Listing</h1>
      </div>
      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">RFQ ID</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">RFQ Name</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Reference</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Lowest Bid</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Current Close</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Forced Close</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Status</th>
            </tr>
          </thead>
          <tbody>
            {auctions.length === 0 && (
              <tr>
                <td colSpan="7" className="py-10 text-center text-gray-500">
                  No auctions yet.
                </td>
              </tr>
            )}
            {auctions.map((a) => (
              <tr key={a.rfq_id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="py-3 px-4 font-mono text-sm">{a.rfq_id}</td>
                <td className="py-3 px-4 text-sm font-medium">
                  <Link to={`/auctions/${a.rfq_id}`} className="text-indigo-600 hover:underline">
                    {a.name}
                  </Link>
                </td>
                <td className="py-3 px-4 text-sm text-gray-600">{a.reference_id}</td>
                <td className="py-3 px-4 text-sm font-medium">
                  {a.lowest_bid != null ? `$${Number(a.lowest_bid).toLocaleString()}` : '—'}
                </td>
                <td className="py-3 px-4 text-sm">{new Date(a.current_closing_time).toLocaleString()}</td>
                <td className="py-3 px-4 text-sm">{new Date(a.forced_closing_time).toLocaleString()}</td>
                <td className="py-3 px-4 text-sm">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    a.status === 'active' ? 'bg-green-100 text-green-700' :
                    a.status === 'forced_closed' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {STATUS_LABELS[a.status] || a.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
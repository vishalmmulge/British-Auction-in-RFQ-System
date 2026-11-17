import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { auctionAPI, getErrorMessage } from '../api'
import { useAuth } from '../context/AuthContext'
import ActivityDetails from '../components/ActivityDetails'

const STATUS_LABELS = {
  draft: 'Draft',
  active: 'Active',
  closed: 'Closed',
  forced_closed: 'Force Closed',
  cancelled: 'Cancelled',
}

export default function AuctionDetail() {
  const { rfqId } = useParams()
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    auctionAPI
      .detail(rfqId)
      .then((r) => {
        if (active) setData(r.data)
      })
      .catch((err) => {
        if (active) setError(getErrorMessage(err, 'Could not load this auction'))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [rfqId])

  if (loading) return <div className="text-center py-10">Loading auction...</div>
  if (error) return <div className="text-center py-10 text-red-600">{error}</div>
  if (!data) return <div className="text-center py-10">Auction not found</div>

  const { rfq, settings, triggers, rankings, all_bids, activities } = data

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">{rfq.name}</h1>
          <p className="text-gray-600 text-sm">{rfq.reference_id}</p>
        </div>
        <div className="flex items-center gap-4">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            rfq.status === 'active' ? 'bg-green-100 text-green-700' :
            rfq.status === 'forced_closed' ? 'bg-red-100 text-red-700' :
            'bg-gray-100 text-gray-700'
          }`}>
            {STATUS_LABELS[rfq.status] || rfq.status}
          </span>
          <span className="text-sm text-gray-600">Extensions: {rfq.extension_count}</span>
          {user?.role === 'supplier' && rfq.status === 'active' && (
            <Link
              to={`/auctions/${rfq.id}/bid`}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm font-medium"
            >
              Submit Bid
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="text-xs text-gray-500">Bid Start</div>
          <div className="font-mono">{new Date(rfq.bid_start_time).toLocaleString()}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="text-xs text-gray-500">Bid Close</div>
          <div className="font-mono">{new Date(rfq.bid_close_time).toLocaleString()}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="text-xs text-gray-500">Current Close</div>
          <div className="font-mono">{new Date(rfq.current_close_time).toLocaleString()}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="text-xs text-gray-500">Forced Close</div>
          <div className="font-mono">{new Date(rfq.forced_close_time).toLocaleString()}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="text-xs text-gray-500">Pickup / Service</div>
          <div className="font-mono">{new Date(rfq.pickup_service_date).toLocaleString()}</div>
        </div>
      </div>

      {settings && (
        <div className="bg-white p-4 rounded-lg shadow border">
          <h3 className="text-sm font-semibold mb-3">Auction Configuration</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-xs text-gray-500">Trigger Window (X)</div>
              <div className="font-mono">{settings.extension_window_minutes} min</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Extension Duration (Y)</div>
              <div className="font-mono">{settings.extension_duration_minutes} min</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Max Extensions</div>
              <div className="font-mono">{settings.max_extensions ?? 'Unlimited'}</div>
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xs text-gray-500">Enabled Triggers</div>
            <div className="flex gap-2">
              {triggers.map((t) => (
                <span key={t} className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded">
                  {t.replace('_', ' ')}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow border">
        <h3 className="text-sm font-semibold p-4 border-b">Current Rankings</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left py-3 px-4 text-sm">Rank</th>
                <th className="text-left py-3 px-4 text-sm">Supplier</th>
                <th className="text-left py-3 px-4 text-sm">Carrier</th>
                <th className="text-left py-3 px-4 text-sm">Total Bid</th>
                <th className="text-left py-3 px-4 text-sm">Freight</th>
                <th className="text-left py-3 px-4 text-sm">Origin</th>
                <th className="text-left py-3 px-4 text-sm">Destination</th>
                <th className="text-left py-3 px-4 text-sm">Transit Time</th>
                <th className="text-left py-3 px-4 text-sm">Validity</th>
              </tr>
            </thead>
            <tbody>
              {rankings.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-8 text-center text-gray-500">No bids yet</td>
                </tr>
              ) : (
                rankings.map((r) => (
                  <tr key={r.bid_id} className="border-t">
                    <td className="py-3 px-4 text-sm font-medium">L{r.rank}</td>
                    <td className="py-3 px-4 text-sm">Supplier #{r.supplier_id}</td>
                    <td className="py-3 px-4 text-sm">{r.carrier_name || '—'}</td>
                    <td className="py-3 px-4 text-sm font-medium">${Number(r.total_amount).toLocaleString()}</td>
                    <td className="py-3 px-4 text-sm">${Number(r.freight_charges).toLocaleString()}</td>
                    <td className="py-3 px-4 text-sm">${Number(r.origin_charges).toLocaleString()}</td>
                    <td className="py-3 px-4 text-sm">${Number(r.destination_charges).toLocaleString()}</td>
                    <td className="py-3 px-4 text-sm">{r.transit_time}</td>
                    <td className="py-3 px-4 text-sm">{r.quote_validity}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow border">
        <h3 className="text-sm font-semibold p-4 border-b">All Bids (lowest price first)</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left py-3 px-4 text-sm">Supplier</th>
                <th className="text-left py-3 px-4 text-sm">Carrier</th>
                <th className="text-left py-3 px-4 text-sm">Total</th>
                <th className="text-left py-3 px-4 text-sm">Freight</th>
                <th className="text-left py-3 px-4 text-sm">Origin</th>
                <th className="text-left py-3 px-4 text-sm">Destination</th>
                <th className="text-left py-3 px-4 text-sm">Transit Time</th>
                <th className="text-left py-3 px-4 text-sm">Validity</th>
                <th className="text-left py-3 px-4 text-sm">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {all_bids.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-8 text-center text-gray-500">No bids yet</td>
                </tr>
              ) : (
                all_bids.map((b) => (
                  <tr key={b.id} className="border-t">
                    <td className="py-3 px-4 text-sm">Supplier #{b.supplier_id}</td>
                    <td className="py-3 px-4 text-sm">{b.carrier_name || '—'}</td>
                    <td className="py-3 px-4 text-sm font-medium">${Number(b.total_amount).toLocaleString()}</td>
                    <td className="py-3 px-4 text-sm">${Number(b.freight_charges).toLocaleString()}</td>
                    <td className="py-3 px-4 text-sm">${Number(b.origin_charges).toLocaleString()}</td>
                    <td className="py-3 px-4 text-sm">${Number(b.destination_charges).toLocaleString()}</td>
                    <td className="py-3 px-4 text-sm">{b.transit_time}</td>
                    <td className="py-3 px-4 text-sm">{b.quote_validity}</td>
                    <td className="py-3 px-4 text-sm">{new Date(b.submitted_at).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow border">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-sm font-semibold">Activity History</h3>
          <Link to={`/auctions/${rfq.id}/activity`} className="text-xs text-indigo-600 hover:underline">
            Open full page
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left py-3 px-4 text-sm font-medium">Time</th>
                <th className="text-left py-3 px-4 text-sm font-medium">Type</th>
                <th className="text-left py-3 px-4 text-sm font-medium">Details</th>
              </tr>
            </thead>
            <tbody>
              {activities.length === 0 ? (
                <tr>
                  <td colSpan="3" className="py-8 text-center text-gray-500">No activity recorded</td>
                </tr>
              ) : (
                activities.map((a) => (
                  <tr key={a.id} className="border-b last:border-0">
                    <td className="py-3 px-4 text-sm font-mono">{new Date(a.created_at).toLocaleString()}</td>
                    <td className="py-3 px-4 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        a.activity_type === 'extension' ? 'bg-indigo-100 text-indigo-700' :
                        a.activity_type === 'bid_placed' ? 'bg-green-100 text-green-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {a.activity_type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm">
                      <ActivityDetails activity={a} />
                    </td>
                  </tr>
                )))
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
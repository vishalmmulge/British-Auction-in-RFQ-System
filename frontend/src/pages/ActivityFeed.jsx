import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { activityAPI, getErrorMessage } from '../api'
import ActivityDetails from '../components/ActivityDetails'

const TYPE_STYLES = {
  extension: 'bg-indigo-100 text-indigo-700',
  bid_placed: 'bg-green-100 text-green-700',
  rank_changed: 'bg-amber-100 text-amber-700',
}

export default function ActivityFeed() {
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    activityAPI
      .listRecent()
      .then((r) => {
        if (!active) return
        setActivities(r.data)
      })
      .catch((err) => {
        if (!active) return
        setError(getErrorMessage(err, 'Could not load activity'))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  if (loading) return <div className="text-center py-10">Loading activity...</div>

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Activity</h1>
        <p className="text-gray-600 text-sm">Latest bids, ranking changes and time extensions across all auctions</p>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left py-3 px-4 text-sm font-medium">Time</th>
                <th className="text-left py-3 px-4 text-sm font-medium">Auction</th>
                <th className="text-left py-3 px-4 text-sm font-medium">Type</th>
                <th className="text-left py-3 px-4 text-sm font-medium">Details</th>
              </tr>
            </thead>
            <tbody>
              {activities.length === 0 ? (
                <tr>
                  <td colSpan="4" className="py-8 text-center text-gray-500">
                    No activity recorded yet
                  </td>
                </tr>
              ) : (
                activities.map((a) => (
                  <tr key={a.id} className="border-b last:border-0">
                    <td className="py-3 px-4 text-sm font-mono whitespace-nowrap">
                      {new Date(a.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      <Link to={`/auctions/${a.rfq_id}`} className="text-indigo-600 hover:underline">
                        {a.rfq_name}
                      </Link>
                      <div className="text-xs text-gray-500 font-mono">{a.reference_id}</div>
                    </td>
                    <td className="py-3 px-4 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs whitespace-nowrap ${TYPE_STYLES[a.activity_type] || 'bg-gray-100 text-gray-700'}`}>
                        {a.activity_type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm">
                      <ActivityDetails activity={a} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

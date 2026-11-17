import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { activityAPI, getErrorMessage } from '../api'
import ActivityDetails from '../components/ActivityDetails'

export default function ActivityHistory() {
  const { rfqId } = useParams()
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    activityAPI
      .list(rfqId)
      .then((r) => {
        if (active) setActivities(r.data)
      })
      .catch((err) => {
        if (active) setError(getErrorMessage(err, 'Could not load activity'))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [rfqId])

  if (loading) return <div className="text-center py-10">Loading activity...</div>

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Activity History</h1>
      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      <div className="bg-white rounded-lg shadow">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
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
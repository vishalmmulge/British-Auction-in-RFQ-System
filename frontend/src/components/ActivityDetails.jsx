export default function ActivityDetails({ activity }) {
  const d = activity.details
  if (!d) return <span>-</span>

  if (activity.activity_type === 'extension') {
    return (
      <div className="space-y-1">
        {d.reason && (
          <div>
            <span className="font-medium">Reason:</span> {d.reason}
          </div>
        )}
        {d.old_close_time && d.new_close_time && (
          <div className="text-xs text-gray-600">
            Close time extended: {new Date(d.old_close_time).toLocaleString()} →{' '}
            {new Date(d.new_close_time).toLocaleString()}
          </div>
        )}
        {d.capped_at_forced_close && (
          <div className="text-xs text-red-600">Capped at the forced close time</div>
        )}
      </div>
    )
  }

  if (activity.activity_type === 'rank_changed') {
    return (
      <div className="text-xs text-gray-700">
        L1 supplier: {d.previous_l1 ?? '—'} → {d.new_l1 ?? '—'}
      </div>
    )
  }

  if (activity.activity_type === 'bid_placed') {
    return (
      <div className="text-xs text-gray-700">
        {d.carrier_name ? `Carrier ${d.carrier_name} · ` : ''}
        {d.submitted_at ? `Submitted ${new Date(d.submitted_at).toLocaleString()}` : 'Bid submitted'}
      </div>
    )
  }

  return <span className="text-xs font-mono">{JSON.stringify(d)}</span>
}

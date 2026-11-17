import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { rfqAPI, getErrorMessage } from '../api'

export default function RFQCreate() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    reference_id: '',
    name: '',
    description: '',
    bid_start_time: '',
    bid_close_time: '',
    forced_close_time: '',
    pickup_service_date: '',
  })
  const [settings, setSettings] = useState({
    extension_window_minutes: 5,
    extension_duration_minutes: 10,
    max_extensions: null,
  })
  const [triggers, setTriggers] = useState(['last_bid'])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      // datetime-local gives local time, the API stores UTC.
      const toUtc = (value) => (value ? new Date(value).toISOString() : value)
      const payload = {
        ...form,
        bid_start_time: toUtc(form.bid_start_time),
        bid_close_time: toUtc(form.bid_close_time),
        forced_close_time: toUtc(form.forced_close_time),
        pickup_service_date: toUtc(form.pickup_service_date),
      }
      const rfq = await rfqAPI.create(payload)
      await rfqAPI.settings(rfq.data.id, settings)
      await rfqAPI.triggers(rfq.data.id, triggers)
      await rfqAPI.start(rfq.data.id)
      navigate(`/auctions/${rfq.data.id}`)
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to create RFQ'))
    } finally {
      setLoading(false)
    }
  }

  const toggleTrigger = (triggerId) => {
    setTriggers((prev) =>
      prev.includes(triggerId) ? prev.filter((t) => t !== triggerId) : [...prev, triggerId]
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Create RFQ</h1>
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Reference ID</label>
            <input
              name="reference_id"
              value={form.reference_id}
              onChange={(e) => setForm({ ...form, reference_id: e.target.value })}
              className="w-full border border-gray-300 rounded-md p-2"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">RFQ Name</label>
            <input
              name="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full border border-gray-300 rounded-md p-2"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <textarea
              name="description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full border border-gray-300 rounded-md p-2"
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Bid Start Time</label>
            <input
              type="datetime-local"
              name="bid_start_time"
              value={form.bid_start_time}
              onChange={(e) => setForm({ ...form, bid_start_time: e.target.value })}
              className="w-full border border-gray-300 rounded-md p-2"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Bid Close Time</label>
            <input
              type="datetime-local"
              name="bid_close_time"
              value={form.bid_close_time}
              onChange={(e) => setForm({ ...form, bid_close_time: e.target.value })}
              className="w-full border border-gray-300 rounded-md p-2"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Forced Close Time</label>
            <input
              type="datetime-local"
              name="forced_close_time"
              value={form.forced_close_time}
              onChange={(e) => setForm({ ...form, forced_close_time: e.target.value })}
              className="w-full border border-gray-300 rounded-md p-2"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Pickup/Service Date</label>
            <input
              type="datetime-local"
              name="pickup_service_date"
              value={form.pickup_service_date}
              onChange={(e) => setForm({ ...form, pickup_service_date: e.target.value })}
              className="w-full border border-gray-300 rounded-md p-2"
              required
            />
          </div>
        </div>

        <div className="border-t pt-6">
          <h3 className="text-sm font-semibold mb-1">Auction Extension Configuration</h3>
          <p className="text-xs text-gray-500 mb-4">Auction type: British Auction (extensions enabled).</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Extension Window (X min)</label>
              <input
                type="number"
                value={settings.extension_window_minutes}
                onChange={(e) => setSettings({ ...settings, extension_window_minutes: Number(e.target.value) })}
                className="w-full border border-gray-300 rounded-md p-2"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Extension Duration (Y min)</label>
              <input
                type="number"
                value={settings.extension_duration_minutes}
                onChange={(e) => setSettings({ ...settings, extension_duration_minutes: Number(e.target.value) })}
                className="w-full border border-gray-300 rounded-md p-2"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Max Extensions</label>
              <input
                type="number"
                value={settings.max_extensions ?? ''}
                onChange={(e) => setSettings({ ...settings, max_extensions: e.target.value ? Number(e.target.value) : null })}
                className="w-full border border-gray-300 rounded-md p-2"
                placeholder="Unlimited"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Enabled Triggers</label>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={triggers.includes('last_bid')}
                    onChange={(e) => setTriggers(e.target.checked ? [...triggers, 'last_bid'] : triggers.filter((t) => t !== 'last_bid'))}
                  />
                  Last bid in window
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={triggers.includes('rank_change')}
                    onChange={(e) => setTriggers(e.target.checked ? [...triggers, 'rank_change'] : triggers.filter((t) => t !== 'rank_change'))}
                  />
                  Any rank change
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={triggers.includes('l1_change')}
                    onChange={(e) => setTriggers(e.target.checked ? [...triggers, 'l1_change'] : triggers.filter((t) => t !== 'l1_change'))}
                  />
                  L1 supplier change
                </label>
              </div>
            </div>
          </div>
        </div>

        {error && <div className="text-red-600 text-sm">{error}</div>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition font-medium"
        >
          {loading ? 'Creating...' : 'Create & Start Auction'}
        </button>
      </form>
    </div>
  )
}
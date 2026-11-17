import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { bidAPI, getErrorMessage } from '../api'

export default function SupplierBid() {
  const { rfqId } = useParams()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    rfq_id: Number(rfqId),
    carrier_name: '',
    freight_charges: '',
    origin_charges: '',
    destination_charges: '',
    transit_time: '',
    quote_validity: '',
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const total = (
    Number(form.freight_charges || 0) +
    Number(form.origin_charges || 0) +
    Number(form.destination_charges || 0)
  ).toFixed(2)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      await bidAPI.submit(form)
      setSuccess('Bid submitted successfully!')
      setLoading(false)
      setTimeout(() => navigate(`/auctions/${rfqId}`), 1500)
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to submit bid'))
      setLoading(false)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Submit Bid</h1>
      <div className="bg-white p-6 rounded-lg shadow">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Carrier Name</label>
              <input
                type="text"
                value={form.carrier_name}
                onChange={(e) => setForm({ ...form, carrier_name: e.target.value })}
                className="w-full border border-gray-300 rounded-md p-2"
                placeholder="e.g. Maersk Line"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Freight Charges ($)</label>
              <input
                type="number"
                step="0.01"
                value={form.freight_charges}
                onChange={(e) => setForm({ ...form, freight_charges: e.target.value })}
                className="w-full border border-gray-300 rounded-md p-2"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Origin Charges ($)</label>
              <input
                type="number"
                step="0.01"
                value={form.origin_charges}
                onChange={(e) => setForm({ ...form, origin_charges: e.target.value })}
                className="w-full border border-gray-300 rounded-md p-2"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Destination Charges ($)</label>
              <input
                type="number"
                step="0.01"
                value={form.destination_charges}
                onChange={(e) => setForm({ ...form, destination_charges: e.target.value })}
                className="w-full border border-gray-300 rounded-md p-2"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Transit Time</label>
              <input
                type="text"
                value={form.transit_time}
                onChange={(e) => setForm({ ...form, transit_time: e.target.value })}
                className="w-full border border-gray-300 rounded-md p-2"
                placeholder="e.g. 14 days"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Quote Validity</label>
              <input
                type="text"
                value={form.quote_validity}
                onChange={(e) => setForm({ ...form, quote_validity: e.target.value })}
                className="w-full border border-gray-300 rounded-md p-2"
                placeholder="e.g. 30 days"
                required
              />
            </div>
          </div>

          <div className="border-t pt-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Total Bid Amount</span>
              <span className="text-xl font-bold">${total}</span>
            </div>
            <p className="text-sm text-gray-500 mt-2">Total is calculated and verified on the backend.</p>
          </div>

          {error && <div className="text-red-600 text-sm mb-4">{error}</div>}
          {success && <div className="text-green-600 text-sm mb-4">{success}</div>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition font-medium"
          >
            {loading ? 'Submitting...' : 'Submit Bid'}
          </button>
        </form>
      </div>
    </div>
  )
}
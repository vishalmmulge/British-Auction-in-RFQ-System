import axios from 'axios'

const API_BASE = '/api'

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export const authAPI = {
  login: (username, password) =>
    api.post('/auth/login', `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }),
  me: () => api.get('/auth/me'),
}

export const rfqAPI = {
  create: (data) => api.post('/rfqs/', data),
  list: () => api.get('/rfqs/'),
  get: (id) => api.get(`/rfqs/${id}`),
  update: (id, data) => api.patch(`/rfqs/${id}`, data),
  settings: (id, data) => api.post(`/rfqs/${id}/settings`, data),
  triggers: (id, types) => api.post(`/rfqs/${id}/triggers`, types),
  start: (id) => api.post(`/rfqs/${id}/start`),
  close: (id) => api.post(`/rfqs/${id}/close`),
}

export const auctionAPI = {
  list: () => api.get('/auctions/'),
  detail: (rfqId) => api.get(`/auctions/${rfqId}`),
}

export const bidAPI = {
  submit: (data) => api.post('/bids/', data),
  list: () => api.get('/bids/'),
}

export const activityAPI = {
  list: (rfqId) => api.get(`/auctions/${rfqId}/activities`),
  listRecent: () => api.get('/activities/'),
}

// FastAPI error details come back as a list, so join them into one string.
export function getErrorMessage(error, fallback = 'Something went wrong') {
  const detail = error?.response?.data?.detail
  if (!detail) return error?.message || fallback
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    const parts = detail.map((item) => {
      if (typeof item === 'string') return item
      const field = Array.isArray(item?.loc)
        ? item.loc.filter((part) => part !== 'body').join('.')
        : ''
      const message = item?.msg || JSON.stringify(item)
      return field ? `${field}: ${message}` : message
    })
    return parts.join('; ') || fallback
  }
  if (typeof detail === 'object' && detail.msg) return detail.msg
  return fallback
}
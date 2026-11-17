import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      fetchMe()
    } else {
      setLoading(false)
    }
  }, [])

  async function fetchMe() {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      })
      if (res.ok) {
        setUser(await res.json())
      } else {
        localStorage.removeItem('token')
      }
    } catch {
      localStorage.removeItem('token')
    } finally {
      setLoading(false)
    }
  }

  async function login(username, password) {
    const formData = new URLSearchParams()
    formData.append('username', username)
    formData.append('password', password)

    let res
    try {
      res = await fetch('/api/auth/login', {
        method: 'POST',
        body: formData,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })
    } catch {
      throw new Error('Cannot reach the API server. Make sure the backend is running on port 8000.')
    }

    if (res.status === 401) throw new Error('Incorrect username or password')
    if (!res.ok) {
      let detail = `Login failed (HTTP ${res.status})`
      try {
        const data = await res.json()
        if (typeof data?.detail === 'string') detail = data.detail
      } catch {
        /* keep the default message */
      }
      throw new Error(detail)
    }

    const data = await res.json()
    localStorage.setItem('token', data.access_token)
    setUser(data)
    await fetchMe()
  }

  function logout() {
    localStorage.removeItem('token')
    setUser(null)
    window.location.href = '/login'
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
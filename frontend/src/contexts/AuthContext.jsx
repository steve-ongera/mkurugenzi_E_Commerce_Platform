// AuthContext.jsx

import { createContext, useContext, useState, useEffect } from 'react'
import { auth, userStore } from '../utils/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => userStore.get())
  const [loading, setLoading] = useState(false)

  const login = async (email, password) => {
    setLoading(true)
    try {
      const data = await auth.login(email, password)
      setUser(data.user)
      return data
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    await auth.logout()
    setUser(null)
  }

  const updateUser = (u) => {
    userStore.set(u)
    setUser(u)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
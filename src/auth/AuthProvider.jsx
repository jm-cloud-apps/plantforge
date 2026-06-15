import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, IS_SUPABASE, toLoginEmail } from '../lib/supabase.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [ready, setReady] = useState(!IS_SUPABASE) // local mode is ready immediately
  const [user, setUser] = useState(IS_SUPABASE ? null : { id: 'local', email: 'local' })

  useEffect(() => {
    if (!IS_SUPABASE) return
    let active = true
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setUser(data.session?.user ?? null)
      setReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const value = {
    ready,
    user,
    needsAuth: IS_SUPABASE,
    isAuthenticated: Boolean(user),
    // Accepts a username (mapped to a synthetic email) or a real email.
    async signIn(identifier, password) {
      const email = toLoginEmail(identifier)
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
    },
    async signOut() {
      if (IS_SUPABASE) await supabase.auth.signOut()
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

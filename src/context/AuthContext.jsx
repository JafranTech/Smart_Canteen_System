import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

// ─── Context ──────────────────────────────────────────────────
const AuthContext = createContext(null)

// ─── Auth Provider ────────────────────────────────────────────
export function AuthProvider({ children }) {
  const [user, setUser]       = useState(undefined) // undefined = initializing
  const [profile, setProfile] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  // ── Effect 1: Auth State Listener ──
  // CRITICAL: We ONLY read session data here. We NEVER call supabase.from()
  // inside this callback because GoTrue holds an internal async lock while
  // firing this callback. Any DB calls here cause a permanent deadlock.
  useEffect(() => {
    let mounted = true

    // Get initial session without triggering any DB calls
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) {
        setUser(session?.user ?? null)
      }
    })

    // Listen for auth state changes — ONLY update user, never fetch profile here
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (mounted) {
          setUser(session?.user ?? null)
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  // ── Effect 2: Reactive Profile Fetcher ──
  // Runs AFTER user state changes. Safe to call supabase.from() here because
  // we are completely outside the GoTrue lock context.
  useEffect(() => {
    // Still initializing — wait
    if (user === undefined) return

    // No user logged in
    if (!user) {
      setProfile(null)
      setIsLoading(false)
      return
    }

    // User is logged in — fetch their profile
    let mounted = true
    setIsLoading(true)

    const controller = new AbortController()

    supabase
      .from('profiles')
      .select('role, name, email, college_id')
      .eq('id', user.id)
      .single()
      .then(({ data, error }) => {
        if (!mounted) return
        if (error) {
          console.error('[AuthContext] Profile fetch failed:', error)
          setProfile(null)
        } else {
          setProfile(data)
        }
        setIsLoading(false)
      })

    return () => {
      mounted = false
      controller.abort()
    }
  }, [user])

  // ─── Sign Out ─────────────────────────────────────────────
  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  const value = { user: user ?? null, profile, isLoading, signOut }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// ─── Custom Hook ──────────────────────────────────────────────
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}

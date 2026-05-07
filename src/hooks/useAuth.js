import { supabase } from '../lib/supabase'

// ─── Sign In ──────────────────────────────────────────────────
export async function signIn(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) throw error

    return { user: data.user }
  } catch (err) {
    console.error('[useAuth] signIn failed:', err)
    throw new Error(err.message || 'Incorrect email or password.')
  }
}

// ─── Sign Out ─────────────────────────────────────────────────
export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) console.error('[useAuth] signOut failed:', error)
}

// ─── Fetch Profile ────────────────────────────────────────────
export async function fetchProfile(userId) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('role, name, email, college_id')
      .eq('id', userId)
      .single()
    if (error) throw error
    return data
  } catch (err) {
    console.error('[useAuth] fetchProfile failed:', err)
    throw new Error('Unable to load profile. Please refresh and try again.')
  }
}

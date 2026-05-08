import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testAuth() {
  console.log('Testing Staff Login...')
  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'staff@amrita.edu',
      password: 'password123',
    })

    if (authError) throw authError
    console.log('✓ Login successful for:', authData.user.email)

    console.log('Fetching Profile (RLS Test)...')
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single()

    if (profileError) {
      console.error('✗ RLS profile fetch failed:', profileError)
      process.exit(1)
    }

    console.log('✓ Profile fetched successfully:', profile.role)
    console.log('ALL PHASE 2 AUTHENTICATION TESTS PASSED.')
  } catch (err) {
    console.error('✗ Auth test failed:', err)
  }

  process.exit(0)
}

testAuth()

import fs from 'fs'
import path from 'path'

// Fake import
const envPath = path.resolve('.env.local')
const envContent = fs.readFileSync(envPath, 'utf-8')

const supabaseUrl = envContent.match(/VITE_SUPABASE_URL=(.*)/)?.[1].trim()
const supabaseKey = envContent.match(/VITE_SUPABASE_ANON_KEY=(.*)/)?.[1].trim()

import { createClient } from '@supabase/supabase-js'
const supabase = createClient(supabaseUrl, supabaseKey)

async function testSignIn() {
  console.log('Testing signIn directly...')
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: '230081601040@crescent.education',
      password: 'kingjafran'
    })
    console.log('Result:', data, 'Error:', error)
    if (error) throw error
    
    // Simulate useAuth.js
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, name, email, college_id')
      .eq('id', data.user.id)
      .single()

    if (profileError) throw profileError
    console.log('Profile:', profile)
  } catch (err) {
    console.error('CAUGHT ERROR:', err)
  }
}

testSignIn()

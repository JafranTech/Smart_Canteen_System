import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const envPath = path.resolve('.env.local')
const envContent = fs.readFileSync(envPath, 'utf-8')

const supabaseUrl = envContent.match(/VITE_SUPABASE_URL=(.*)/)?.[1].trim()
const supabaseKey = envContent.match(/VITE_SUPABASE_ANON_KEY=(.*)/)?.[1].trim()

const supabase = createClient(supabaseUrl, supabaseKey)

async function testRLS() {
  console.log('Logging in as student...')
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: '230081601040@crescent.education',
    password: 'kingjafran'
  })
  
  if (authError) {
    console.error('Login failed:', authError)
    return
  }
  
  console.log('Successfully logged in. User ID:', authData.user.id)
  
  console.log('Attempting to fetch profile using RLS...')
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authData.user.id)
    .single()
    
  if (profileError) {
    console.error('RLS BLOCKED FETCH PROFILE:', profileError)
  } else {
    console.log('RLS ALLOWED FETCH PROFILE:', profileData)
  }
}

testRLS()

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ejrtvzwfeomytbcwmmhx.supabase.co'
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

// I'll grab the anon key from the .env.local file
import fs from 'fs'
import path from 'path'

const envPath = path.resolve('.env.local')
const envContent = fs.readFileSync(envPath, 'utf-8')
const keyMatch = envContent.match(/VITE_SUPABASE_ANON_KEY=(.*)/)
const actualKey = keyMatch ? keyMatch[1].trim() : supabaseKey

const supabase = createClient(supabaseUrl, actualKey)

async function testSignup() {
  console.log('Testing signup with test@crescent.education...')
  const { data, error } = await supabase.auth.signUp({
    email: 'test@crescent.education',
    password: 'Test@1234',
    options: {
      data: {
        name: 'Test Student',
        role: 'student'
      }
    }
  })

  if (error) {
    console.error('SIGNUP ERROR:', error.message, error)
  } else {
    console.log('SIGNUP SUCCESS:', data)
  }
}

testSignup()

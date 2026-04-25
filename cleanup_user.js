import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ejrtvzwfeomytbcwmmhx.supabase.co'

const envPath = path.resolve('.env.local')
const envContent = fs.readFileSync(envPath, 'utf-8')

// We need the SERVICE ROLE KEY to delete users.
const serviceKeyMatch = envContent.match(/VITE_SUPABASE_SERVICE_ROLE_KEY=(.*)/)
const serviceKey = serviceKeyMatch ? serviceKeyMatch[1].trim() : process.env.VITE_SUPABASE_SERVICE_ROLE_KEY

if (!serviceKey) {
  console.error("Service role key not found!")
  process.exit(1)
}

const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function cleanup() {
  console.log('Finding user test@crescent.education...')
  
  // Note: Finding a user by email using admin API
  const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers()
  if (listError) {
    console.error("Error listing users:", listError)
    return
  }

  const user = usersData.users.find(u => u.email === 'test@crescent.education')
  if (user) {
    console.log(`Found user ${user.id}, deleting...`)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id)
    if (deleteError) {
      console.error("Error deleting user:", deleteError)
    } else {
      console.log("Successfully deleted user.")
    }
  } else {
    console.log("User not found, probably already deleted.")
  }
}

cleanup()

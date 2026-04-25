import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY 

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing SUPABASE env vars")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function setupTestUsers() {
  const users = [
    { email: 'teststudent@amrita.edu', role: 'student', name: 'Test Student' },
    { email: 'teststaff@amrita.edu', role: 'staff', name: 'Test Staff' },
    { email: 'testadmin@amrita.edu', role: 'admin', name: 'Test Admin' }
  ]

  console.log("Starting test user setup...")

  for (const u of users) {
    // Attempt sign up
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: u.email,
      password: 'Test@1234',
      options: {
        data: {
          role: u.role,
          full_name: u.name
        }
      }
    })

    if (authError) {
      if (authError.message.includes('already registered')) {
        console.log(`[OK] User ${u.email} already exists`)
      } else {
        console.error(`[FAIL] User ${u.email} creation failed:`, authError)
      }
    } else {
      console.log(`[PASS] User ${u.email} created as ${u.role}`)
    }

    // Verify profile exists
    // We fetch with service role bypass if needed or rely on trigger
    setTimeout(async () => {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', u.email)
        .single()
      
      if (profileData && profileData.role === u.role) {
         console.log(`[PASS] Verified trigger for ${u.email} with role ${u.role}`)
      } else {
         console.error(`[FAIL] Trigger verification failed for ${u.email}`)
      }
    }, 1000)
  }
}

setupTestUsers()

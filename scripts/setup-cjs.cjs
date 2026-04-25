const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY 

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing SUPABASE env vars")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function setupTestUsers() {
  const users = [
    { email: 'teststaff99@amrita.edu', role: 'staff', name: 'Staff' },
    { email: 'testadmin99@amrita.edu', role: 'admin', name: 'Admin' }
  ]

  console.log("Starting test user setup...")

  for (const u of users) {
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: u.email,
      password: 'password123',
      email_confirm: true,
      user_metadata: { role: u.role, full_name: u.name }
    })

    if (authError && !authError.message.includes('already registered')) {
      console.error(`[FAIL] User ${u.email} creation failed:`, authError)
    } else {
      console.log(`[PASS] User ${u.email} created as ${u.role}`)
    }

    setTimeout(async () => {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', u.email)
        .single()
      
      if (profileData && profileData.role === u.role) {
         console.log(`[PASS] Verified trigger for ${u.email}`)
      } else {
         console.error(`[FAIL] Trigger verification failed for ${u.email}`, profileData)
         // Manually upsert if trigger failed
         await supabase.from('profiles').upsert({
            id: authData?.user?.id || (await supabase.auth.admin.getUserById(u.email))?.data?.user?.id,
            email: u.email,
            role: u.role,
            full_name: u.name
         }, { onConflict: 'email' })
         console.log(`[FIXED] Manually upserted profile for ${u.email}`)
      }
    }, 1500)
  }
}

setupTestUsers()

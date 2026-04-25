import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function seedUsers() {
  const users = [
    { email: 'student@amrita.edu', password: 'password123', name: 'Student Demo', role: 'student' },
    { email: 'staff@amrita.edu', password: 'password123', name: 'Staff Demo', role: 'staff' },
    { email: 'admin@amrita.edu', password: 'password123', name: 'Admin Demo', role: 'admin' },
  ]

  for (const u of users) {
    const { data, error } = await supabase.auth.signUp({
      email: u.email,
      password: u.password,
      options: {
        data: {
          name: u.name,
          role: u.role,
        }
      }
    })
    
    if (error) {
      console.log(`Error seeding ${u.email}:`, error.message)
    } else {
      console.log(`Seeded ${u.email}`)
    }
  }
}

seedUsers()

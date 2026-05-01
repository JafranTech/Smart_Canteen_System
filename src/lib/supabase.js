import { createClient } from '@supabase/supabase-js'

// ─── Single Supabase client instance ────────────────────────
// All hooks must import from this file.
// Never instantiate a second client anywhere in the codebase.

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// ─── Guard ────────────────────────────────────────────────────
const missing = []
if (!supabaseUrl)  missing.push('VITE_SUPABASE_URL')
if (!supabaseKey)  missing.push('VITE_SUPABASE_ANON_KEY')

if (missing.length > 0) {
  throw new Error(
    `[supabase.js] Missing required environment variable(s): ${missing.join(', ')}. ` +
    'Copy .env.example to .env.local and fill in your Supabase credentials.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseKey)

import { createClient } from '@supabase/supabase-js'

// ─── Single Supabase client instance ────────────────────────
// All hooks must import from this file.
// Never instantiate a second client anywhere in the codebase.

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error(
    '[supabase.js] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. ' +
    'Copy .env.example to .env.local and fill in your Supabase credentials.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseKey)

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY // Actually we need service_role_key to run DDL

// If we don't have service_role_key, we can't run raw SQL.
console.log('Skipping SQL. If admin role matches, insert will work.');

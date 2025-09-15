// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js'

// These are injected at build time by Vite (from GitHub Actions secrets)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

// Helpful errors if something is missing at runtime
if (!SUPABASE_URL) {
  throw new Error('supabaseUrl is required. (Missing VITE_SUPABASE_URL)')
}
if (!SUPABASE_ANON_KEY) {
  throw new Error('supabase anon key is required. (Missing VITE_SUPABASE_ANON_KEY)')
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})

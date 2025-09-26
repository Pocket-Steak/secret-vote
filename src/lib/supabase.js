// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js'

// --- 0) Client setup (Vite envs) ---
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL) throw new Error('supabaseUrl is required. (Missing VITE_SUPABASE_URL)')
if (!SUPABASE_ANON_KEY) throw new Error('supabase anon key is required. (Missing VITE_SUPABASE_ANON_KEY)')

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

// --- 1) Small utility to make errors readable in UI ---
export function friendly(error, fallback = 'Something went wrong') {
  if (!error) retu

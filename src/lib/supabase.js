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
  if (!error) return fallback
  const msg = (error.message || error.msg || '').trim()
  if (msg) return msg
  try {
    const j = typeof error === 'string' ? JSON.parse(error) : error
    return j?.error_description || j?.hint || j?.details || fallback
  } catch {
    return fallback
  }
}

// --- 2) Resolve a room code -> poll_id (tries collect_polls first, then polls) ---
export async function getPollIdByCode(code) {
  const CODE = String(code || '').trim().toUpperCase()
  // A) collect_polls
  {
    const { data, error } = await supabase
      .from('collect_polls')
      .select('id')
      .eq('code', CODE)
      .maybeSingle()
    if (data?.id) return data.id
    // if table exists but no row, just fall through to B
    // if table missing, PostgREST may return 42P01—also fall through to B
  }
  // B) polls (fallback)
  {
    const { data, error } = await supabase
      .from('polls')
      .select('id')
      .eq('code', CODE)
      .maybeSingle()
    if (data?.id) return data.id
    throw new Error(friendly(error, `Room not found for code ${CODE}`))
  }
}

// --- 3) Add option OR reuse existing (duplicate-safe via unique (poll_id, text_norm)) ---
export async function addOptionOrGetExisting(code, label) {
  const poll_id = await getPollIdByCode(code)
  const payload = { poll_id, text: label } // DB computes text_norm server-side

  const { data, error } = await supabase
    .from('collect_options')
    .upsert(payload, { onConflict: 'poll_id,text_norm' }) // <- uses your unique index
    .select()
    .single()

  if (error) throw new Error(friendly(error))
  return data // either newly inserted or the existing canonical row
}

// --- 4) Counts RPC wrapper (normalize array vs object return) ---
export async function fetchCounts(code) {
  const CODE = String(code || '').trim().toUpperCase()
  const { data, error } = await supabase.rpc('collect_counts', { _code: CODE })
  if (error) throw new Error(friendly(error))
  return Array.isArray(data) ? data[0] ?? null : data ?? null
}

// --- 5) Vote audit helper (tries collect_votes, then votes) ---
export async function fetchVotesForRoom(code) {
  const poll_id = await getPollIdByCode(code)

  // Try collect_votes first
  {
    const { data, error } = await supabase
      .from('collect_votes')
      .select('id, created_at, option_id, voter_id')
      .eq('poll_id', poll_id)
      .order('created_at', { ascending: false })
    if (!error) return data || []
    // if table missing, we'll try the generic votes table next
  }

  // Fallback to votes (ranked array style)
  {
    const { data, error } = await supabase
      .from('votes')
      .select('id, created_at, ranks')
      .eq('poll_id', poll_id)
      .order('created_at', { ascending: false })
    if (error) throw new Error(friendly(error))
    return data || []
  }
}

// --- 6) Optional: near-duplicate review (requires RPCs created in DB) ---
export async function suggestDupes(code, threshold = 0.86) {
  const { data, error } = await supabase.rpc('collect_suggest_dupes', {
    _code: String(code || '').toUpperCase(),
    _threshold: threshold,
  })
  if (error) throw new Error(friendly(error))
  return data || []
}

export async function mergeLabels(code, canonical, aliases) {
  const { error } = await supabase.rpc('collect_merge_labels', {
    _code: String(code || '').toUpperCase(),
    _canonical: String(canonical ?? ''),
    _aliases: aliases ?? [],
  })
  if (error) throw new Error(friendly(error))
  return true
}

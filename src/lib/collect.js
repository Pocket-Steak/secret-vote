// src/lib/collect.js
import { supabase } from '../lib/supabase';

// simple per-browser client id
function getClientId() {
  let id = localStorage.getItem('sv_client');
  if (!id) {
    id = (crypto?.randomUUID?.() || Math.random().toString(36).slice(2));
    localStorage.setItem('sv_client', id);
  }
  return id;
}

/**
 * Add options for a collect room, resolving code -> poll UUID.
 * @param {string} code 6-char room code (e.g. '7RUVKS')
 * @param {string[]} texts raw option strings
 */
export async function addOptionsByCode(code, texts) {
  // 1) look up the collect_polls row to get its UUID id
  const { data: poll, error: e1 } = await supabase
    .from('collect_polls')
    .select('id, max_per_user')
    .eq('code', code)
    .single();
  if (e1) throw e1;

  // 2) call the RPC with the UUID poll id
  const clientId = getClientId();
  const clean = texts.map(t => (t || '').trim()).filter(Boolean);

  const { error: e2 } = await supabase.rpc('collect_add_options', {
    _poll_id: poll.id,   // UUID from collect_polls.id
    _client: clientId,   // per-user/visitor id
    _options: clean      // e.g. ['aa','a','aaa']
  });
  if (e2) throw e2;

  return { ok: true, max_per_user: poll.max_per_user };
}

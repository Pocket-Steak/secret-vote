// src/lib/db.js
import { supabase } from "./supabase";

// ----- Collect flow helpers -----

export async function getCollectRoomByCode(code) {
  return supabase.from("collect_polls").select("*").eq("code", code).single();
}

export async function addCollectOption(pollId, text) {
  // assumes your collect options table is public.collect_options
  return supabase.from("collect_options").insert({ poll_id: pollId, text });
}

export async function finalizeCollectToVoting(code, pin) {
  // calls your Postgres function to open voting and copy into polls
  return supabase.rpc("collect_finalize_to_voting", { _code: code, _pin: pin || null });
}

// ----- Voting flow helpers -----

export async function getPollByCode(code) {
  return supabase.from("polls").select("*").eq("code", code).single();
}

export async function castVotePlurality(pollId, choice) {
  // plurality is a single choice; still stored in ranks[]
  return supabase.from("votes").insert({ poll_id: pollId, ranks: [choice] });
}

export async function getResultsByPollId(pollId) {
  return supabase
    .from("poll_results")
    .select("*")
    .eq("poll_id", pollId)
    .order("points", { ascending: false });
}

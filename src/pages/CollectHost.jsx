// src/pages/CollectHost.jsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";

const ORANGE = "#ff8c00";

export default function CollectHost() {
  const nav = useNavigate();
  const { code } = useParams();

  const [poll, setPoll] = useState(null);
  const [pin, setPin] = useState("");
  const [checking, setChecking] = useState(false);
  const [verified, setVerified] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function readPoll() {
    const { data, error } = await supabase
      .from("collect_polls")
      .select("*")
      .eq("code", code)
      .maybeSingle();
    if (error) {
      console.error(error);
      setPoll(null);
    } else {
      setPoll(data);
    }
  }
  useEffect(() => { readPoll(); }, [code]);

  async function verifyPin() {
    setErr("");
    if (!pin || !/^\d{4,}$/.test(pin)) {
      setErr("Enter your host PIN (at least 4 digits).");
      return;
    }
    setChecking(true);
    // Adjust param names to match your SQL function (we used _code, _pin)
    const { data, error } = await supabase.rpc("collect_verify_pin", { _code: code, _pin: pin });
    setChecking(false);
    if (error) {
      console.error(error);
      setErr(error.message || "Could not verify PIN.");
      setVerified(false);
    } else if (!data) {
      setErr("Incorrect PIN.");
      setVerified(false);
    } else {
      setVerified(true);
    }
  }

  // Open voting now: moves status to 'voting', creates the real poll, returns vote_code.
  async function openVoting() {
    setErr("");
    if (!verified) {
      setErr("Verify your PIN first.");
      return;
    }
    setBusy(true);
    // RPC should return the vote_code (text). Adjust the arg object if your SQL names differ.
    const { data, error } = await supabase.rpc("collect_finalize_to_voting", { _code: code, _pin: pin });
    setBusy(false);
    if (error) {
      console.error(error);
      setErr(error.message || "Could not open voting.");
      return;
    }
    const voteCode = typeof data === "string" ? data : (data?.vote_code || "");
    if (!voteCode) {
      setErr("Voting opened but no vote code returned.");
      return;
    }
    // Send host to the usual room page for sharing Vote/Results
    nav(`/room/${voteCode}`);
  }

  if (!poll) {
    return Wrap(
      <div style={s.card}>
        <h1 style={s.title}>Host Options</h1>
        <p style={{ opacity: 0.8 }}>Loading…</p>
      </div>
    );
  }

  return Wrap(
    <div style={s.card}>
      <div style={s.headerRow}>
        <h1 style={s.title}>Host Options — {poll.title}</h1>
        <span style={s.badge}>Code: {code}</span>
      </div>

      <div style={s.infoBox}>
        <div>Status: <strong>{poll.status}</strong></div>
        <div>Max per user: <strong>{poll.max_per_user}</strong></div>
        {poll.target_participants_hint ? (
          <div>Target participants: <strong>{poll.target_participants_hint}</strong></div>
        ) : null}
      </div>

      {!verified ? (
        <div style={{ marginTop: 12 }}>
          <label style={s.label}>Enter Host PIN</label>
          <input
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="PIN"
            inputMode="numeric"
            style={s.input}
          />
          <div style={s.actionsRow}>
            <button
              style={{ ...s.primaryBtn, opacity: checking ? 0.6 : 1 }}
              disabled={checking}
              onClick={verifyPin}
            >
              {checking ? "Verifying…" : "Verify"}
            </button>
            <button style={s.linkBtn} onClick={() => nav(`/collect/${code}`)}>Back</button>
          </div>
          {err && <div style={s.err}>{err}</div>}
        </div>
      ) : (
        <div style={{ marginTop: 12 }}>
          <div style={s.banner}>
            PIN verified. You can open voting when ready.
          </div>
          <div style={s.actionsRow}>
            <button
              style={{ ...s.primaryBtn, opacity: busy ? 0.6 : 1 }}
              disabled={busy}
              onClick={openVoting}
            >
              {busy ? "Opening…" : "Open Voting Now"}
            </button>
            <button style={s.linkBtn} onClick={() => nav(`/collect/${code}`)}>Back</button>
          </div>
          {err && <div style={s.err}>{err}</div>}
        </div>
      )}
    </div>
  );
}

function Wrap(children) {
  return <div style={s.wrap}>{children}</div>;
}

const s = {
  wrap: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    background: "#0b0f17",
    color: "#e9e9f1",
    padding: "clamp(8px, 2vw, 16px)",
    overflowX: "hidden",
  },
  card: {
    width: "100%",
    maxWidth: 900,
    padding: "clamp(16px, 3vw, 24px)",
    borderRadius: 16,
    background: "rgba(255,255,255,0.04)",
    boxShadow: "0 0 20px rgba(255,140,0,.35)",
    boxSizing: "border-box",
  },
  headerRow: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" },
  title: { margin: 0, fontSize: "clamp(22px, 4.5vw, 28px)", textShadow: "0 0 12px rgba(255,140,0,.8)" },
  badge: { padding: "6px 12px", borderRadius: 999, border: "1px solid #333", background: "#121727", letterSpacing: 1, fontSize: 12 },
  infoBox: { marginTop: 12, padding: 12, borderRadius: 10, background: "rgba(255,255,255,.04)", border: "1px solid #222" },
  label: { display: "block", marginTop: 14, marginBottom: 6, fontWeight: 700 },
  input: { width: "100%", padding: "12px 14px", borderRadius: 12, border: "1px solid #333", background: "#121727", color: "#fff", outline: "none", boxSizing: "border-box" },
  actionsRow: { marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" },
  primaryBtn: { padding: "12px 18px", borderRadius: 12, border: "none", background: ORANGE, color: "#000", fontWeight: 800, cursor: "pointer", boxShadow: "0 0 14px rgba(255,140,0,.8)" },
  linkBtn: { padding: "12px 16px", borderRadius: 12, border: "1px solid #333", background: "transparent", color: "#bbb", cursor: "pointer" },
  banner: { marginTop: 12, padding: 12, borderRadius: 10, background: "rgba(255,140,0,.08)", border: `1px solid rgba(255,140,0,.4)`, color: "#ffd9b3" },
  err: { marginTop: 10, color: "#ffb3b3" },
};

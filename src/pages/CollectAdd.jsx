// src/pages/CollectAdd.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";

const ORANGE = "#ff8c00";

function getClientId() {
  const k = "sv_client_id";
  let v = localStorage.getItem(k);
  if (!v) {
    const A = "abcdefghijklmnopqrstuvwxyz0123456789";
    v = Array.from({ length: 8 }, () => A[Math.floor(Math.random() * A.length)]).join("");
    localStorage.setItem(k, v);
  }
  return v;
}

export default function CollectAdd() {
  const nav = useNavigate();
  const { code } = useParams();
  const clientId = useMemo(() => getClientId(), []);

  const [poll, setPoll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mineCount, setMineCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const maxPerUser = poll?.max_per_user || 0;
  const remaining = Math.max(0, maxPerUser - mineCount);

  const [slots, setSlots] = useState([""]);

  useEffect(() => setSlots(Array(Math.max(1, remaining)).fill("")), [remaining]);

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
  async function readMine(pollId) {
    const { count, error } = await supabase
      .from("collect_options")
      .select("*", { count: "exact", head: true })
      .eq("poll_id", pollId)
      .eq("client_id", clientId);
    if (!error) setMineCount(count || 0);
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      await readPoll();
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [code]);

  useEffect(() => {
    if (!poll?.id) return;
    readMine(poll.id);
  }, [poll?.id, code]);

  async function submit() {
    if (!poll?.id) return;
    if (poll.status === "voting") {
      alert("Voting is already open. You can no longer add options.");
      return;
    }
    const cleaned = slots.map(s => s.trim()).filter(Boolean);
    if (cleaned.length === 0) {
      alert("Please enter at least one option.");
      return;
    }
    if (cleaned.length > remaining) {
      alert(`You can add up to ${remaining} option(s) right now.`);
      return;
    }

    const rows = cleaned.map(text => ({
      poll_id: poll.id,
      client_id: clientId,
      text,
      created_at: new Date().toISOString(),
    }));

    setSubmitting(true);
    const { error } = await supabase.from("collect_options").insert(rows);
    if (error) {
      console.error(error);
      alert(`Could not add option(s).\n\n${error.message || ""}`);
      setSubmitting(false);
      return;
    }
    // back to landing
    nav(`/collect/${code}`);
  }

  if (loading) {
    return Wrap(
      <div style={s.card}>
        <h1 style={s.title}>Room {code}</h1>
        <p style={{ opacity: 0.8 }}>Loading…</p>
      </div>
    );
  }
  if (!poll) {
    return Wrap(
      <div style={s.card}>
        <h1 style={s.title}>Room {code}</h1>
        <p style={{ opacity: 0.8 }}>We couldn’t find this collection room.</p>
        <button style={s.secondaryBtn} onClick={() => nav("/")}>Home</button>
      </div>
    );
  }

  return Wrap(
    <div style={s.card}>
      <div style={s.headerRow}>
        <h1 style={s.title}>{poll.title}</h1>
        <span style={s.badge}>Code: {code}</span>
      </div>

      <div style={s.infoBox}>
        <strong>Add your ideas below.</strong>{" "}
        You can add <strong>{remaining}</strong> option{remaining === 1 ? "" : "s"}.
      </div>

      <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
        {slots.map((v, i) => (
          <input
            key={i}
            value={v}
            onChange={(e) => {
              const next = [...slots];
              next[i] = e.target.value;
              setSlots(next);
            }}
            placeholder={`Option ${i + 1}`}
            style={s.input}
            maxLength={30}
          />
        ))}
      </div>

      <div style={s.actionsRow}>
        <button
          style={{ ...s.primaryBtn, opacity: submitting ? 0.6 : 1 }}
          disabled={submitting}
          onClick={submit}
        >
          {submitting ? "Adding…" : "Add"}
        </button>
        <button style={s.linkBtn} onClick={() => nav(`/collect/${code}`)}>Back</button>
      </div>
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
  headerRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },
  title: { margin: 0, fontSize: "clamp(22px, 4.5vw, 28px)", textShadow: "0 0 12px rgba(255,140,0,.8)" },
  badge: { padding: "6px 12px", borderRadius: 999, border: "1px solid #333", background: "#121727", letterSpacing: 1, fontSize: 12 },
  infoBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    background: "rgba(255,255,255,.04)",
    border: "1px solid #222",
  },
  input: {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid #333",
    background: "#121727",
    color: "#fff",
    outline: "none",
    boxSizing: "border-box",
  },
  actionsRow: { marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" },
  primaryBtn: { padding: "12px 18px", borderRadius: 12, border: "none", background: ORANGE, color: "#000", fontWeight: 800, cursor: "pointer", boxShadow: "0 0 14px rgba(255,140,0,.8)" },
  linkBtn: { padding: "12px 16px", borderRadius: 12, border: "1px solid #333", background: "transparent", color: "#bbb", cursor: "pointer" },
  secondaryBtn: { padding: "12px 16px", borderRadius: 12, border: `1px solid ${ORANGE}`, background: "transparent", color: ORANGE, cursor: "pointer" },
};

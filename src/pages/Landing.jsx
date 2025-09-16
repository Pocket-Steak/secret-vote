// src/pages/Landing.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";

const ORANGE = "#ff8c00";

export default function Landing() {
  const { code } = useParams();
  const nav = useNavigate();

  const [poll, setPoll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("polls")
        .select("*")
        .eq("code", code)
        .limit(1)
        .maybeSingle();

      if (!mounted) return;
      if (error) {
        console.error(error);
        setPoll(null);
      } else {
        setPoll(data);
      }
      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [code]);

  // --- countdown ---
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const endsText = useMemo(() => {
    if (!poll?.closes_at) return "";
    const end = new Date(poll.closes_at).getTime();
    const diff = Math.max(0, end - now);
    const mins = Math.floor(diff / 60000);
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (diff <= 0) return "Voting closed";
    if (h > 0) return `Ends in ${h}h ${m}m`;
    return `Ends in ${m}m`;
  }, [poll, now]);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1100);
    } catch {
      // no-op
    }
  }

  if (loading) {
    return (
      <div style={s.wrap}>
        <div style={s.card}>
          <div style={{ opacity: 0.8 }}>Loading…</div>
        </div>
      </div>
    );
  }

  if (!poll) {
    return (
      <div style={s.wrap}>
        <div style={s.card}>
          <h1 style={s.title}>Not found</h1>
          <p style={{ opacity: 0.8 }}>We couldn’t find a room with code “{code}”.</p>
          <button style={s.secondaryBtn} onClick={() => nav("/")}>
            Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={s.wrap}>
      <div style={s.card}>
        <h1 style={s.title}>{poll.title}</h1>

        {/* code + copy */}
        <div style={s.headerRow}>
          <div style={s.codePill}>
            <span style={{ opacity: 0.8 }}>Code:&nbsp;</span>
            <span style={{ fontWeight: 800 }}>{code}</span>
          </div>

          <button onClick={copyCode} style={s.copyBtn} title="Copy room code">
            {copied ? "Copied!" : "Copy"}
          </button>

          <div style={s.ends}>{endsText}</div>
        </div>

        {/* actions */}
        <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
          <button style={s.primaryBtn} onClick={() => nav(`/vote/${code}`)}>
            Vote
          </button>
          <button style={s.secondaryBtn} onClick={() => nav(`/results/${code}`)}>
            View Results
          </button>
        </div>

        {/* helper text */}
        <p style={{ marginTop: 16, opacity: 0.8 }}>
          Share the room code so people can vote or see live results.
        </p>

        <button style={s.linkBtn} onClick={() => nav("/")}>
          Home
        </button>
      </div>
    </div>
  );
}

const s = {
  wrap: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    background: "#0b0f17",
    color: "#e9e9f1",
  },
  card: {
    width: "min(900px, 94vw)",
    padding: 24,
    borderRadius: 16,
    background: "rgba(255,255,255,0.04)",
    boxShadow: "0 0 20px rgba(255,140,0,.35)",
  },
  title: {
    margin: 0,
    fontSize: 28,
    textShadow: "0 0 12px rgba(255,140,0,.8)",
  },
  headerRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginTop: 12,
    flexWrap: "wrap",
  },
  codePill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    padding: "6px 12px",
    borderRadius: 999,
    border: "1px solid rgba(255,140,0,.5)",
    background: "rgba(255,140,0,.08)",
    color: "#ffd9b3",
  },
  copyBtn: {
    padding: "6px 12px",
    borderRadius: 999,
    border: `1px solid ${ORANGE}`,
    background: "transparent",
    color: ORANGE,
    cursor: "pointer",
  },
  ends: {
    marginLeft: "auto",
    color: "#ffd9b3",
    textShadow: "0 0 10px rgba(255,140,0,.7)",
    fontWeight: 700,
  },
  primaryBtn: {
    padding: "12px 18px",
    borderRadius: 12,
    border: "none",
    background: ORANGE,
    color: "#000",
    fontWeight: 800,
    cursor: "pointer",
    boxShadow: "0 0 14px rgba(255,140,0,.8)",
  },
  secondaryBtn: {
    padding: "12px 16px",
    borderRadius: 12,
    border: `1px solid ${ORANGE}`,
    background: "transparent",
    color: ORANGE,
    cursor: "pointer",
  },
  linkBtn: {
    marginTop: 12,
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid #333",
    background: "transparent",
    color: "#bbb",
    cursor: "pointer",
  },
};

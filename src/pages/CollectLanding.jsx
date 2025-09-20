import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";

const ORANGE = "#ff8c00";

export default function CollectLanding() {
  const { code: raw } = useParams();
  const code = (raw || "").toUpperCase();
  const nav = useNavigate();

  const [poll, setPoll] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load the collect poll
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("collect_polls")
        .select("*")
        .eq("code", code)
        .maybeSingle();

      if (!cancelled) {
        if (error) {
          console.error(error);
          setPoll(null);
        } else {
          setPoll(data);
        }
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [code]);

  if (loading) {
    return ScreenWrap(
      <div style={s.card}>
        <h1 style={s.title}>Room {code}</h1>
        <p style={s.text}>Loading…</p>
      </div>
    );
  }

  if (!poll) {
    return ScreenWrap(
      <div style={s.card}>
        <h1 style={s.title}>Room {code}</h1>
        <p style={s.text}>We couldn’t find this collection room.</p>
        <button style={s.secondaryBtn} onClick={() => nav("/")}>Home</button>
      </div>
    );
  }

  return ScreenWrap(
    <div style={s.card}>
      <h1 style={s.title}>{poll.title}</h1>

      <div style={s.infoRow}>
        <span style={s.badge}>Code: {code}</span>
        <span style={s.badge}>Status: {poll.status}</span>
        {poll.target_participants_hint ? (
          <span style={s.badge}>Target: {poll.target_participants_hint}</span>
        ) : null}
      </div>

      <div style={{ marginTop: 16 }}>
        <p style={{opacity: .9}}>
          Share the code <b>{code}</b> with participants so they can add their options.
        </p>
      </div>

      <div style={s.actionsRow}>
        <button
          style={s.primaryBtn}
          onClick={() => nav(`/collect/${code}/add`)}
          title="Add your options"
        >
          Add Options
        </button>

        <button
          style={s.secondaryBtn}
          onClick={() => nav(`/collect/${code}/host`)}
          title="Host options (PIN required)"
        >
          Host Options
        </button>
      </div>

      <div style={{ marginTop: 10 }}>
        <button style={s.linkBtn} onClick={() => nav("/")}>Home</button>
      </div>
    </div>
  );
}

/* ---------- helpers / styles ---------- */
function ScreenWrap(children) {
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
    maxWidth: 720,
    padding: "clamp(16px, 3vw, 24px)",
    borderRadius: 16,
    background: "rgba(255,255,255,0.04)",
    boxShadow: "0 0 20px rgba(255,140,0,.35)",
    boxSizing: "border-box",
    margin: "0 auto",
  },
  title: {
    fontSize: "clamp(22px, 4.5vw, 28px)",
    textShadow: "0 0 12px rgba(255,140,0,.8)",
    margin: 0,
  },
  infoRow: {
    marginTop: 8,
    display: "flex",
    gap: 10,
    alignItems: "center",
    flexWrap: "wrap",
  },
  badge: {
    padding: "6px 12px",
    borderRadius: 999,
    border: "1px solid #333",
    background: "#121727",
    letterSpacing: 1,
    fontSize: 12,
  },
  actionsRow: {
    marginTop: 16,
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
  },
  primaryBtn: {
    padding: "12px 16px",
    borderRadius: 12,
    border: "none",
    background: ORANGE,
    color: "#000",
    fontWeight: 800,
    cursor: "pointer",
    boxShadow: "0 0 12px rgba(255,140,0,.75)",
  },
  secondaryBtn: {
    padding: "12px 14px",
    borderRadius: 12,
    border: `1px solid ${ORANGE}`,
    background: "transparent",
    color: ORANGE,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  linkBtn: {
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid #333",
    background: "transparent",
    color: "#bbb",
    cursor: "pointer",
  },
  text: { opacity: 0.9 },
};

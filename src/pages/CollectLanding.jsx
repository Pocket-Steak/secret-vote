// src/pages/CollectLanding.jsx
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

export default function CollectLanding() {
  const nav = useNavigate();
  const { code } = useParams();
  const clientId = useMemo(() => getClientId(), []);

  const [poll, setPoll] = useState(null); // row from collect_polls
  const [loading, setLoading] = useState(true);

  const [contributors, setContributors] = useState(0); // distinct client_id
  const [optionsCount, setOptionsCount] = useState(0);
  const [mineCount, setMineCount] = useState(0); // how many I have added

  // fetch collect_polls by code
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

  // counts
  async function readCounts(pollId) {
    // total options
    const { count: totalCount, error: e1 } = await supabase
      .from("collect_options")
      .select("*", { count: "exact", head: true })
      .eq("poll_id", pollId);
    if (!e1) setOptionsCount(totalCount || 0);

    // distinct contributors
    const { data: rows, error: e2 } = await supabase
      .from("collect_options")
      .select("client_id", { count: "exact" })
      .eq("poll_id", pollId);
    if (!e2) {
      const uniq = new Set((rows || []).map(r => r.client_id));
      setContributors(uniq.size);
    }

    // my rows
    const { count: myCount, error: e3 } = await supabase
      .from("collect_options")
      .select("*", { count: "exact", head: true })
      .eq("poll_id", pollId)
      .eq("client_id", clientId);
    if (!e3) setMineCount(myCount || 0);
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

  // heartbeat refresh
  useEffect(() => {
    if (!poll?.id) return;
    const tick = async () => {
      await readPoll();
      await readCounts(poll.id);
    };
    tick();
    const t = setInterval(tick, 2000);
    return () => clearInterval(t);
  }, [poll?.id, code]);

  const maxPerUser = poll?.max_per_user || 0;
  const remainingMine = Math.max(0, maxPerUser - mineCount);
  const canVote = poll?.status === "voting" && !!poll?.vote_code;

  if (loading) {
    return ScreenWrap(
      <div style={styles.card}>
        <h1 style={styles.title}>Room {code}</h1>
        <p style={{ opacity: 0.8 }}>Loading…</p>
      </div>
    );
  }

  if (!poll) {
    return ScreenWrap(
      <div style={styles.card}>
        <h1 style={styles.title}>Room {code}</h1>
        <p style={{ opacity: 0.8 }}>We couldn’t find this collection room.</p>
        <button style={styles.secondaryBtn} onClick={() => nav("/")}>Home</button>
      </div>
    );
  }

  return ScreenWrap(
    <div style={styles.card}>
      <div style={styles.headerRow}>
        <h1 style={styles.title}>{poll.title}</h1>
        <span style={styles.badge}>Code: {code}</span>
      </div>

      <div style={styles.statsRow}>
        <Stat label="Contributors" value={`${contributors}${poll.target_participants_hint ? " / " + poll.target_participants_hint : ""}`} />
        <Stat label="Options" value={optionsCount} />
        <Stat label="Your remaining" value={remainingMine} />
        <Stat label="Status" value={poll.status || "collecting"} />
      </div>

      <div style={styles.banner}>
        {poll.status !== "voting" ? (
          <>Waiting for host to open voting.</>
        ) : (
          <>Voting is open! Use the button below.</>
        )}
      </div>

      <div style={styles.actionsRow}>
        <button
          style={{ ...styles.primaryBtn, flex: "1 1 220px" }}
          onClick={() => nav(`/collect/${code}/add`)}
          title="Add your options"
        >
          Add Options
        </button>

        <button
          style={{ ...styles.secondaryBtn, flex: "1 1 180px" }}
          onClick={() => nav(`/collect/${code}/host`)}
          title="Host controls (PIN required)"
        >
          Host Options
        </button>

        <button
          style={{
            ...styles.linkBtn,
            ...(canVote ? styles.glow : { opacity: 0.6, cursor: "not-allowed" }),
            flex: "1 1 180px",
          }}
          disabled={!canVote}
          onClick={() => {
            if (!canVote) return;
            // Send users into the regular flow using the finalized vote_code
            nav(`/room/${poll.vote_code}`);
          }}
          title={canVote ? "Go to voting" : "Voting not open yet"}
        >
          Go to Voting
        </button>
      </div>
    </div>
  );
}

/* helpers */
function ScreenWrap(children) {
  return <div style={styles.wrap}>{children}</div>;
}
function Stat({ label, value }) {
  return (
    <div style={styles.stat}>
      <div style={{ opacity: 0.8, fontSize: 12 }}>{label}</div>
      <div style={{ fontWeight: 800, marginTop: 2 }}>{value}</div>
    </div>
  );
}

/* styles */
const styles = {
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
  title: {
    margin: 0,
    fontSize: "clamp(22px, 4.5vw, 28px)",
    textShadow: "0 0 12px rgba(255,140,0,.8)",
  },
  headerRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
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
  statsRow: {
    marginTop: 14,
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: 10,
  },
  stat: {
    padding: 12,
    borderRadius: 12,
    border: "1px solid #222",
    background: "rgba(255,255,255,0.03)",
  },
  banner: {
    marginTop: 14,
    padding: 12,
    borderRadius: 10,
    background: "rgba(255,140,0,.08)",
    border: `1px solid rgba(255,140,0,.4)`,
    color: "#ffd9b3",
  },
  actionsRow: {
    marginTop: 16,
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
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
    padding: "12px 16px",
    borderRadius: 12,
    border: "1px solid #333",
    background: "transparent",
    color: "#bbb",
    cursor: "pointer",
  },
  glow: { boxShadow: "0 0 14px rgba(255,140,0,.55)", borderColor: ORANGE },
};

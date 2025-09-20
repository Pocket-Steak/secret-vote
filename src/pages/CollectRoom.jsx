import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";

const ORANGE = "#ff8c00";

export default function CollectRoom() {
  const nav = useNavigate();
  const { code: raw } = useParams();
  const code = (raw || "").toUpperCase();

  const [poll, setPoll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [options, setOptions] = useState([]);
  const [mineCount, setMineCount] = useState(0);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  // A per-browser token so we can count each participant’s submissions
  const authorToken = useMemo(() => {
    const key = `sv:author:${code}`;
    let v = localStorage.getItem(key);
    if (!v) {
      v = (crypto?.randomUUID?.() || Math.random().toString(36).slice(2));
      localStorage.setItem(key, v);
    }
    return v;
  }, [code]);

  // Load poll
  useEffect(() => {
    let on = true;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("collect_polls")
        .select("*")
        .eq("code", code)
        .maybeSingle();

      if (!on) return;
      if (error) {
        console.error(error);
        setPoll(null);
      } else {
        setPoll(data);
      }
      setLoading(false);
    })();
    return () => { on = false; };
  }, [code]);

  // Load options (and my count)
  async function refreshOptions(pollId, token) {
    if (!pollId) return;
    const { data, error } = await supabase
      .from("collect_options")
      .select("*")
      .eq("poll_id", pollId)
      .order("created_at", { ascending: false });

    if (!error && Array.isArray(data)) {
      setOptions(data);
      const mine = data.filter((r) => r.author_token === token).length;
      setMineCount(mine);
    }
  }

  useEffect(() => {
    if (!poll?.id) return;
    refreshOptions(poll.id, authorToken);
    const t = setInterval(() => refreshOptions(poll.id, authorToken), 2000);
    return () => clearInterval(t);
  }, [poll?.id, authorToken]);

  const remaining = Math.max(
    0,
    (poll?.max_options_per_user ?? 0) - mineCount
  );

  async function addOption() {
    const t = text.trim();
    if (!t) return;
    if (remaining <= 0) {
      alert("You’ve reached the limit for this room.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.from("collect_options").insert({
        poll_id: poll.id,
        option: t,
        created_at: new Date().toISOString(),
        author_token: authorToken, // track who added it
      });
      if (error) throw error;
      setText("");
      refreshOptions(poll.id, authorToken);
    } catch (e) {
      console.error(e);
      alert("Could not add option.");
    } finally {
      setBusy(false);
    }
  }

  // Host: finalize -> create voting poll and move to /room/:code
  async function finalizeAndStartVoting() {
    if (!poll) return;
    if (options.length < 2) {
      alert("Need at least 2 options before starting the vote.");
      return;
    }
    setBusy(true);
    try {
      // Build the voting poll
      const now = new Date();
      const closesAt = new Date(now.getTime() + poll.duration_minutes * 60 * 1000);
      const expiresAt = new Date(closesAt.getTime() + 24 * 60 * 60 * 1000);

      const uniqueOptions = Array.from(new Set(options.map((o) => (o.option || "").trim()).filter(Boolean)));
      const N = uniqueOptions.length;
      const pointScheme = Array.from({ length: N }, (_, i) => 2 * (N - i));

      const { error } = await supabase.from("polls").insert({
        code: poll.code,
        title: poll.title,
        options: uniqueOptions,
        point_scheme: pointScheme,
        duration_minutes: poll.duration_minutes,
        created_at: now.toISOString(),
        closes_at: closesAt.toISOString(),
        expires_at: expiresAt.toISOString(),
        revealed: false,
      });

      if (error) throw error;

      // (Optional) you can archive the collect poll here if you want.

      nav(`/room/${poll.code}`);
    } catch (e) {
      console.error(e);
      alert("Could not start voting.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return Screen(<div style={st.card}><p>Loading…</p></div>);
  }
  if (!poll) {
    return Screen(
      <div style={st.card}>
        <h1 style={st.title}>Room {code}</h1>
        <p>We couldn’t find this collection room.</p>
        <button style={st.secondaryBtn} onClick={() => nav("/")}>Home</button>
      </div>
    );
  }

  return Screen(
    <div style={st.card}>
      <div style={st.headerRow}>
        <h1 style={st.title}>{poll.title}</h1>
        <span style={st.badge}>Code: {code}</span>
      </div>

      <div style={{ marginTop: 10 }}>
        <div style={st.note}>
          Add your ideas below. You can add <b>{poll.max_options_per_user}</b> option{poll.max_options_per_user === 1 ? "" : "s"}.
          &nbsp;Your remaining: <b>{remaining}</b>
        </div>

        <div style={st.row}>
          <input
            style={st.input}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type an option"
            maxLength={30}
          />
          <button
            style={{ ...st.primaryBtn, opacity: busy || remaining <= 0 || !text.trim() ? 0.6 : 1 }}
            disabled={busy || remaining <= 0 || !text.trim()}
            onClick={addOption}
          >
            Add
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
        {options.map((o) => (
          <div key={o.id} style={st.optionRow}>
            <div style={st.dot} />
            <div style={{ flex: 1, fontWeight: 700 }}>{o.option}</div>
            <div style={{ opacity: 0.6, fontSize: 12 }}>
              {o.author_token === authorToken ? "you" : ""}
            </div>
          </div>
        ))}
        {options.length === 0 && (
          <div style={{ opacity: 0.7, marginTop: 8 }}>No options yet — be the first!</div>
        )}
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
        <button
          style={{ ...st.primaryBtn, opacity: busy || options.length < 2 ? 0.6 : 1 }}
          disabled={busy || options.length < 2}
          onClick={finalizeAndStartVoting}
          title={options.length < 2 ? "Need at least 2 options" : "Start the vote"}
        >
          Finalize & Start Voting
        </button>
        <button style={st.secondaryBtn} onClick={() => nav("/")}>Home</button>
      </div>
    </div>
  );
}

/* ---------- layout helpers ---------- */
function Screen(children) {
  return <div style={st.wrap}>{children}</div>;
}

const st = {
  wrap: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    background: "#0b0f17",
    color: "#e9e9f1",
    padding: "clamp(8px, 2vw, 16px)",
  },
  card: {
    width: "100%",
    maxWidth: 720,
    padding: "clamp(16px, 3vw, 24px)",
    borderRadius: 16,
    background: "rgba(255,255,255,0.04)",
    boxShadow: "0 0 20px rgba(255,140,0,.35)",
    boxSizing: "border-box",
  },
  headerRow: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" },
  title: { margin: 0, fontSize: "clamp(22px, 4.5vw, 28px)", textShadow: "0 0 12px rgba(255,140,0,.8)" },
  badge: { padding: "6px 12px", borderRadius: 999, border: "1px solid #333", background: "#121727", letterSpacing: 1, fontSize: 12 },

  note: {
    padding: 10,
    borderRadius: 12,
    background: "rgba(255,140,0,.08)",
    border: `1px solid rgba(255,140,0,.35)`,
    color: "#ffd9b3",
  },
  row: { display: "flex", gap: 8, marginTop: 10 },
  input: {
    flex: 1,
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid #333",
    background: "#121727",
    color: "#fff",
    outline: "none",
  },
  primaryBtn: {
    padding: "12px 16px",
    borderRadius: 12,
    border: "none",
    background: ORANGE,
    color: "#000",
    fontWeight: 800,
    cursor: "pointer",
    boxShadow: "0 0 12px rgba(255,140,0,.8)",
    whiteSpace: "nowrap",
  },
  secondaryBtn: {
    padding: "12px 16px",
    borderRadius: 12,
    border: `1px solid ${ORANGE}`,
    background: "transparent",
    color: ORANGE,
    cursor: "pointer",
  },
  optionRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRadius: 12,
    background: "rgba(255,255,255,0.03)",
    border: "1px solid #222",
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    background: ORANGE,
    boxShadow: "0 0 8px rgba(255,140,0,.8)",
  },
};

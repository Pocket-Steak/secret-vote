import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";

const ORANGE = "#ff8c00";

// minutes-only
function fmtHM(ms) {
  if (ms <= 0) return "0h 0m";
  const mTotal = Math.floor(ms / 60000);
  const h = Math.floor(mTotal / 60);
  const m = mTotal % 60;
  return `${h}h ${m}m`;
}

export default function CollectRoom() {
  const nav = useNavigate();
  const { code: raw } = useParams();
  const code = (raw || "").toUpperCase();

  const [poll, setPoll] = useState(null);   // row from collect_polls
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [options, setOptions] = useState([]); // rows from collect_options
  const [newOpt, setNewOpt] = useState("");
  const [busy, setBusy] = useState(false);

  // Load collection poll
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

  // Tick timer (for fun / parity)
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(t);
  }, []);

  // Read collected options repeatedly
  useEffect(() => {
    if (!poll?.id) return;
    let cancelled = false;

    const read = async () => {
      const { data, error } = await supabase
        .from("collect_options")
        .select("*")
        .eq("poll_id", poll.id)
        .order("created_at", { ascending: true });

      if (!cancelled) {
        if (error) {
          console.error(error);
          setOptions([]);
        } else {
          setOptions(Array.isArray(data) ? data : []);
        }
      }
    };

    read();
    const t = setInterval(read, 2000);
    return () => { cancelled = true; clearInterval(t); };
  }, [poll?.id]);

  const uniqueOptions = useMemo(() => {
    const seen = new Set();
    const arr = [];
    for (const r of options) {
      const k = String(r.option || "").trim().toLowerCase();
      if (!k) continue;
      if (seen.has(k)) continue;
      seen.add(k);
      arr.push(r.option.trim());
    }
    return arr;
  }, [options]);

  async function addOption() {
    const t = newOpt.trim();
    if (!t) return;
    if (t.length > 30) return alert("Option must be 30 characters or fewer.");
    if (uniqueOptions.some((x) => x.toLowerCase() === t.toLowerCase())) {
      return alert("That option is already in the list.");
    }
    if (!poll?.id) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("collect_options").insert({
        poll_id: poll.id,
        option: t,
        created_at: new Date().toISOString(),
      });
      if (error) {
        console.error(error);
        alert("Could not add option.");
        return;
      }
      setNewOpt("");
    } finally {
      setBusy(false);
    }
  }

  // Finalize -> create real poll in "polls" using same code, then go to /room/:code
  async function finalizeAndStartVoting() {
    const opts = uniqueOptions;
    if (opts.length < 2) return alert("Need at least 2 unique options to start voting.");
    if (!poll) return;

    const N = opts.length;
    const pointScheme = Array.from({ length: N }, (_, i) => 2 * (N - i));
    const nowDt = new Date();
    const closesAt = new Date(nowDt.getTime() + poll.vote_duration_minutes * 60000);
    const expiresAt = new Date(closesAt.getTime() + 24 * 60 * 60 * 1000);

    setBusy(true);
    try {
      const { error } = await supabase.from("polls").insert({
        code: poll.code, // reuse collection code for the voting room
        title: poll.title,
        options: opts,
        point_scheme: pointScheme,
        duration_minutes: poll.vote_duration_minutes,
        created_at: nowDt.toISOString(),
        closes_at: closesAt.toISOString(),
        expires_at: expiresAt.toISOString(),
        revealed: false,
      });

      if (error) {
        console.error(error);
        alert("Could not start the voting room.");
        return;
      }

      // (optional) mark the collection poll closed, if such a column exists
      // await supabase.from("collect_polls").update({ closed: true }).eq("id", poll.id);

      nav(`/room/${poll.code}`);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return Screen(<p style={{ opacity: 0.8 }}>Loading…</p>);
  }
  if (!poll) {
    return Screen(
      <>
        <h1 style={st.title}>Room {code}</h1>
        <p style={{ opacity: 0.9 }}>We couldn’t find this collection room.</p>
        <button style={st.secondaryBtn} onClick={() => nav("/")}>Home</button>
      </>
    );
  }

  return Screen(
    <div style={{ display: "grid", gap: 14 }}>
      <div style={st.headerRow}>
        <h1 style={st.title}>{poll.title}</h1>
        <div style={st.badge}>Code: {poll.code}</div>
      </div>

      <div style={st.box}>
        <label style={st.label}>Add option</label>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            style={st.input}
            maxLength={30}
            placeholder="Propose an option (max 30 chars)"
            value={newOpt}
            onChange={(e) => setNewOpt(e.target.value)}
          />
          <button
            style={{ ...st.primaryBtn, whiteSpace: "nowrap", opacity: busy ? 0.6 : 1 }}
            disabled={busy}
            onClick={addOption}
          >
            Add
          </button>
        </div>
      </div>

      <div style={st.box}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>
          Current suggestions ({uniqueOptions.length})
        </div>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {uniqueOptions.length === 0 && (
            <li style={{ opacity: 0.7 }}>No options yet — share the code and let people add!</li>
          )}
          {uniqueOptions.map((opt) => (
            <li key={opt}>{opt}</li>
          ))}
        </ul>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button
          style={{ ...st.primaryBtn, opacity: busy ? 0.6 : 1 }}
          disabled={busy}
          onClick={finalizeAndStartVoting}
          title="Create the voting room and go to it"
        >
          Finalize & Start Voting
        </button>
        <button style={st.linkBtn} onClick={() => nav("/")}>Home</button>
      </div>
    </div>
  );
}

function Screen(children) {
  return (
    <div style={st.wrap}>
      <div style={st.card}>{children}</div>
    </div>
  );
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
  title: {
    margin: 0,
    fontSize: "clamp(22px, 4.5vw, 28px)",
    textShadow: "0 0 12px rgba(255,140,0,.8)",
  },
  headerRow: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },
  badge: {
    marginLeft: "auto",
    padding: "6px 12px",
    borderRadius: 999,
    border: "1px solid #333",
    background: "#121727",
    letterSpacing: 1,
    fontSize: 12,
  },
  box: {
    padding: 12,
    borderRadius: 12,
    background: "rgba(255,255,255,0.03)",
    border: "1px solid #222",
  },
  label: { display: "block", fontWeight: 700, marginBottom: 6 },
  input: {
    flex: 1,
    width: "100%",
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid #333",
    background: "#121727",
    color: "#fff",
    outline: "none",
    boxSizing: "border-box",
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
    color: "#aaa",
    cursor: "pointer",
  },
};

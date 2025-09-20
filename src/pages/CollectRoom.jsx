// src/pages/CollectRoom.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";

const ORANGE = "#ff8c00";

export default function CollectRoom() {
  const nav = useNavigate();
  const { code: raw } = useParams();
  const code = (raw || "").toUpperCase();

  const [poll, setPoll] = useState(null);
  const [loading, setLoading] = useState(true);

  const [text, setText] = useState("");
  const [options, setOptions] = useState([]); // rows in collect_options
  const [myRemaining, setMyRemaining] = useState(0);

  // live tallies
  const contributors = useMemo(() => {
    const ids = new Set(options.map((r) => r.client_id).filter(Boolean));
    return ids.size;
  }, [options]);
  const optionCount = options.length;

  const adminKey = localStorage.getItem(`collect-admin-${code}`);

  // load poll meta
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("collect_polls")
        .select("*")
        .eq("code", code)
        .maybeSingle();

      if (cancelled) return;
      if (error) {
        console.error(error);
        setPoll(null);
      } else {
        setPoll(data);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [code]);

  // read all options + my remaining every 2s
  useEffect(() => {
    if (!poll?.id) return;
    let cancelled = false;

    const read = async () => {
      // all options
      const { data: all, error: e1 } = await supabase
        .from("collect_options")
        .select("*")
        .eq("poll_id", poll.id)
        .order("created_at", { ascending: true });
      if (!cancelled) setOptions(e1 ? [] : (all || []));

      // my remaining (count by my client_id)
      const clientId = getClientId();
      const { data: mine, error: e2 } = await supabase
        .from("collect_options")
        .select("id", { count: "exact", head: true })
        .eq("poll_id", poll.id)
        .eq("client_id", clientId);
      if (!cancelled) {
        const used = e2 ? 0 : (mine?.length ?? mine?.count ?? 0); // count from head
        const allowed = poll?.max_per_user ?? 1;
        setMyRemaining(Math.max(0, allowed - used));
      }
    };

    read();
    const t = setInterval(read, 2000);
    return () => { cancelled = true; clearInterval(t); };
  }, [poll?.id]);

  function getClientId() {
    const key = `sv-client-id`;
    let id = localStorage.getItem(key);
    if (!id) {
      id = crypto.getRandomValues(new Uint32Array(1))[0].toString(36);
      localStorage.setItem(key, id);
    }
    return id;
  }

  async function addOption() {
    if (!poll) return;
    const t = text.trim();
    if (!t) return;
    if (myRemaining <= 0) return alert("You’ve used your limit for this room.");

    const { error } = await supabase.from("collect_options").insert({
      poll_id: poll.id,
      text: t,
      client_id: getClientId(),
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error(error);
      alert(`Could not add option.\n\nmessage: ${error.message}\ncode: ${error.code ?? ""}`);
      return;
    }
    setText("");
  }

  // Host-only: finalize → build a normal poll and redirect to the room
  async function finalize() {
    if (!poll) return;

    // host check
    if (!adminKey || adminKey !== poll.admin_key) {
      return alert("Only the host can finalize.");
    }

    // fetch distinct option texts
    const raw = Array.from(new Set(options.map((r) => (r.text || "").trim()).filter(Boolean)));
    if (raw.length < 2) return alert("Need at least 2 options to start voting.");

    // Build steep point scheme (2N..2)
    const N = raw.length;
    const scheme = Array.from({ length: N }, (_, i) => 2 * (N - i));

    const now = new Date();
    const ms = (poll?.voting_duration_minutes ?? 120) * 60 * 1000;
    const closes = new Date(now.getTime() + ms);
    const expires = new Date(closes.getTime() + 24 * 60 * 60 * 1000);

    // Reuse the same *code* for the voting room so people can keep using that code
    const { error } = await supabase.from("polls").insert({
      code: poll.code,
      title: poll.title,
      options: raw,
      point_scheme: scheme,
      duration_minutes: poll?.voting_duration_minutes ?? 120,
      created_at: now.toISOString(),
      closes_at: closes.toISOString(),
      expires_at: expires.toISOString(),
      revealed: false,
    });

    if (error) {
      console.error(error);
      alert("Could not start voting.");
      return;
    }

    // You may optionally mark collect_polls as finalized here, but not required.
    nav(`/room/${poll.code}`);
  }

  if (loading) return ScreenWrap(<div style={s.card}><div style={{opacity:.8}}>Loading…</div></div>);
  if (!poll) return ScreenWrap(
    <div style={s.card}>
      <h1 style={s.title}>Not found</h1>
      <p style={{opacity:.8}}>We couldn’t find a collection room with code “{code}”.</p>
      <button style={s.secondaryBtn} onClick={() => nav("/")}>Home</button>
    </div>
  );

  const isHost = adminKey && adminKey === poll.admin_key;
  const target = poll?.target_participants_hint ?? null;

  return ScreenWrap(
    <div style={s.card}>
      <div style={s.headerRow}>
        <h1 style={s.title}>{poll.title}</h1>
        <span style={s.badge}>Code: {poll.code}</span>
      </div>

      {/* Live stats */}
      <div style={s.statRow}>
        <div style={s.statBox}>
          <div style={s.statLabel}>Contributors</div>
          <div style={s.statValue}>
            {contributors}{target ? <span style={{opacity:.7}}> / {target}</span> : null}
          </div>
        </div>
        <div style={s.statBox}>
          <div style={s.statLabel}>Options</div>
          <div style={s.statValue}>{optionCount}</div>
        </div>
        <div style={s.statBox}>
          <div style={s.statLabel}>Your remaining</div>
          <div style={s.statValue}>{myRemaining}</div>
        </div>
      </div>

      <div style={s.noteBox}>
        Add your ideas below. You can add {poll.max_per_user} option{poll.max_per_user > 1 ? "s" : ""}.
      </div>

      <div style={s.addRow}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type an option"
          style={s.input}
          maxLength={60}
        />
        <button style={s.primaryBtn} onClick={addOption}>Add</button>
      </div>

      <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
        {options.length === 0 ? (
          <div style={{ opacity: 0.7 }}>No options yet — be the first!</div>
        ) : (
          options.map((r, i) => (
            <div key={r.id || i} style={s.optRow}>
              <div style={s.optBullet} />
              <div style={{flex:1}}>{r.text}</div>
            </div>
          ))
        )}
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
        {isHost ? (
          <button
            style={{ ...s.primaryBtn, opacity: optionCount >= 2 ? 1 : 0.6 }}
            disabled={optionCount < 2}
            onClick={finalize}
            title={optionCount < 2 ? "Need at least 2 options" : "Start voting"}
          >
            Finalize & Start Voting
          </button>
        ) : (
          <div style={{ opacity: 0.8 }}>Waiting for the host to start voting…</div>
        )}
        <button style={s.secondaryBtn} onClick={() => nav("/")}>Home</button>
      </div>

      {/* tiny debug to help if needed */}
      <div style={{opacity:.4, marginTop:8, fontSize:12}}>
        Debug: client={getClientId()} · poll_id={poll.id}
      </div>
    </div>
  );
}

function ScreenWrap(children) { return <div style={s.wrap}>{children}</div>; }

const s = {
  wrap: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    background: "#0b0f17",
    color: "#e9e9f1",
    padding: "clamp(8px,2vw,16px)",
  },
  card: {
    width: "100%",
    maxWidth: 900,
    padding: 24,
    borderRadius: 16,
    background: "rgba(255,255,255,.04)",
    boxShadow: "0 0 20px rgba(255,140,0,.35)",
    boxSizing: "border-box",
  },
  headerRow: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" },
  title: { margin: 0, fontSize: "clamp(22px,4.5vw,28px)", textShadow: "0 0 12px rgba(255,140,0,.8)" },
  badge: { padding: "6px 12px", borderRadius: 999, border: "1px solid #333", background: "#121727", letterSpacing: 1, fontSize: 12 },
  statRow: { display: "flex", gap: 12, marginTop: 10, flexWrap: "wrap" },
  statBox: { minWidth: 140, padding: 10, borderRadius: 12, background: "rgba(255,255,255,.03)", border: "1px solid #222" },
  statLabel: { fontSize: 12, opacity: 0.8 },
  statValue: { fontWeight: 800, fontSize: 18 },
  noteBox: { marginTop: 14, padding: 12, borderRadius: 12, background: "rgba(255,140,0,.07)", border: "1px solid rgba(255,140,0,.4)", color: "#ffd9b3" },
  addRow: { display: "flex", gap: 10, marginTop: 10 },
  input: {
    flex: 1, padding: "12px 14px", borderRadius: 12, border: "1px solid #333",
    background: "#121727", color: "#fff", outline: "none"
  },
  optRow: {
    display: "flex", alignItems: "center", gap: 10, padding: 10,
    borderRadius: 10, background: "rgba(255,255,255,.03)", border: "1px solid #222"
  },
  optBullet: { width: 8, height: 8, background: ORANGE, borderRadius: 999, boxShadow: "0 0 10px rgba(255,140,0,.9)" },

  primaryBtn: {
    padding: "12px 18px", borderRadius: 12, border: "none",
    background: ORANGE, color: "#000", fontWeight: 800, cursor: "pointer",
    boxShadow: "0 0 14px rgba(255,140,0,.8)"
  },
  secondaryBtn: {
    padding: "12px 16px", borderRadius: 12, border: `1px solid ${ORANGE}`,
    background: "transparent", color: ORANGE, cursor: "pointer"
  },
};

// src/pages/CollectRoom.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";

const ORANGE = "#ff8c00";

// simple persistent client id (per browser/device)
function getClientId() {
  const key = "sv_client";
  let id = localStorage.getItem(key);
  if (!id) {
    try {
      id = (crypto.randomUUID && crypto.randomUUID()) || Math.random().toString(36).slice(2, 10);
    } catch {
      id = Math.random().toString(36).slice(2, 10);
    }
    localStorage.setItem(key, id);
  }
  return id;
}

export default function CollectRoom() {
  const nav = useNavigate();
  const { code: raw } = useParams();
  const code = (raw || "").toUpperCase();

  const clientId = useMemo(getClientId, []);
  const [poll, setPoll] = useState(null);          // row from collect_polls
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);            // rows from collect_options
  const [val, setVal] = useState("");
  const [lastError, setLastError] = useState(null);

  const inputRef = useRef(null);

  // load poll by code
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
          console.error("load collect_polls error:", error);
          setPoll(null);
          setLastError(error);
        } else {
          setPoll(data);
          setLastError(null);
        }
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [code]);

  // load options for this poll (and refresh every 2s)
  useEffect(() => {
    if (!poll?.id) return;
    let cancelled = false;

    const read = async () => {
      const { data, error } = await supabase
        .from("collect_options")
        .select("*")
        .eq("poll_id", poll.id)
        .order("id", { ascending: true });

      if (!cancelled) {
        if (error) {
          console.error("load collect_options error:", error);
          setRows([]);
          setLastError(error);
        } else {
          setRows(Array.isArray(data) ? data : []);
          setLastError(null);
        }
      }
    };

    read();
    const t = setInterval(read, 2000);
    return () => { cancelled = true; clearInterval(t); };
  }, [poll?.id]);

  // computed
  const userCount = useMemo(
    () => rows.filter(r => r.author_token === clientId).length,
    [rows, clientId]
  );
  const remaining = Math.max(0, (poll?.max_options_per_user ?? 3) - userCount);

  async function addOption() {
    const text = val.trim();
    if (!poll?.id) return;
    if (!text) {
      alert("Type an option first.");
      return;
    }
    if (remaining <= 0) {
      alert("You’ve reached your option limit for this room.");
      return;
    }

    // attempt insert and show detailed error if blocked by RLS/policy etc.
    const { data, error } = await supabase
      .from("collect_options")
      .insert([{ poll_id: poll.id, option: text, author_token: clientId }])
      .select()
      .single();

    if (error) {
      console.error("Add option error (collect_options insert):", error);
      setLastError(error);
      const msg = [
        "Could not add option.",
        error.message && `message: ${error.message}`,
        error.details && `details: ${error.details}`,
        error.hint && `hint: ${error.hint}`,
        error.code && `code: ${error.code}`,
      ]
        .filter(Boolean)
        .join("\n");
      alert(msg);
      return;
    }

    setVal("");
    setLastError(null);
    inputRef.current?.focus();
  }

  async function finalize() {
    // turn collected options into a real poll (same code you used before)
    if (!poll?.id) return;
    const opts = rows.map(r => r.option).filter(Boolean);
    const uniq = Array.from(new Set(opts.map(s => s.trim()).filter(Boolean)));
    if (uniq.length < 2) {
      alert("Need at least 2 options to start voting.");
      return;
    }

    // Weighted scheme like your Create page: 2N, 2N-2, ..., 2
    const N = uniq.length;
    const pointScheme = Array.from({ length: N }, (_, i) => 2 * (N - i));

    const now = new Date();
    const ms = (poll.duration_minutes || 120) * 60 * 1000;
    const closesAt = new Date(now.getTime() + ms);
    const expiresAt = new Date(closesAt.getTime() + 24 * 60 * 60 * 1000);

    const { error } = await supabase.from("polls").insert({
      code: poll.code,                 // re-use the same code
      title: poll.title,
      options: uniq,
      point_scheme: pointScheme,
      duration_minutes: poll.duration_minutes || 120,
      created_at: now.toISOString(),
      closes_at: closesAt.toISOString(),
      expires_at: expiresAt.toISOString(),
      revealed: false,
    });

    if (error) {
      console.error("Finalize → create polls row error:", error);
      const msg = [
        "Could not start voting.",
        error.message && `message: ${error.message}`,
        error.details && `details: ${error.details}`,
        error.hint && `hint: ${error.hint}`,
        error.code && `code: ${error.code}`,
      ]
        .filter(Boolean)
        .join("\n");
      alert(msg);
      return;
    }

    // delete the collection room on success (optional)
    // await supabase.from("collect_polls").delete().eq("id", poll.id);

    nav(`/room/${poll.code}`);
  }

  if (loading) {
    return Screen(
      <div style={styles.card}>
        <h1 style={styles.title}>Loading…</h1>
      </div>
    );
  }

  if (!poll) {
    return Screen(
      <div style={styles.card}>
        <h1 style={styles.title}>Not found</h1>
        <p style={{ opacity: 0.8 }}>We couldn’t find a collection room with code “{code}”.</p>
        <button style={styles.secondaryBtn} onClick={() => nav("/")}>Home</button>
      </div>
    );
  }

  return Screen(
    <div style={styles.card}>
      <div style={styles.headerRow}>
        <h1 style={styles.title}>{poll.title}</h1>
        <div style={styles.badge}>Code: {poll.code}</div>
      </div>

      <div style={styles.subtle}>
        Add your ideas below. You can add <b>{poll.max_options_per_user ?? 3}</b> options.
        &nbsp; Your remaining: <b>{remaining}</b>
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
        <input
          ref={inputRef}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          placeholder="Type an option"
          style={styles.input}
          maxLength={30}
        />
        <button onClick={addOption} style={styles.primaryBtn} title="Add option">
          Add
        </button>
      </div>

      <div style={{ display: "grid", gap: 8, marginTop: 14 }}>
        {rows.length === 0 && (
          <div style={{ opacity: 0.7 }}>No options yet — be the first!</div>
        )}
        {rows.map((r) => (
          <div key={r.id} style={styles.row}>
            <div style={styles.dot} />
            <div style={{ fontWeight: 700 }}>{r.option}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
        <button style={styles.primaryBtn} onClick={finalize}>
          Finalize & Start Voting
        </button>
        <button style={styles.linkBtn} onClick={() => nav("/")}>Home</button>
      </div>

      {/* Optional tiny debug line: helps confirm IDs */}
      <div style={{ marginTop: 8, fontSize: 12, opacity: 0.6 }}>
        Debug: client={clientId} · poll_id={poll.id}
        {lastError ? (
          <>
            {" "}| last error: <code>{String(lastError?.message || lastError)}</code>
          </>
        ) : null}
      </div>
    </div>
  );
}

/* ---------------- UI helpers & styles ---------------- */
function Screen(children) {
  return <div style={styles.wrap}>{children}</div>;
}

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
    maxWidth: 820,
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
  badge: {
    padding: "6px 12px",
    borderRadius: 999,
    border: "1px solid #333",
    background: "#121727",
    letterSpacing: 1,
    fontSize: 12,
  },
  subtle: {
    marginTop: 10,
    padding: 12,
    borderRadius: 12,
    background: "rgba(255,140,0,.07)",
    border: `1px solid rgba(255,140,0,.35)`,
    color: "#ffd9b3",
  },
  input: {
    flex: 1,
    minWidth: 240,
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid #333",
    background: "#121727",
    color: "#fff",
    outline: "none",
    boxSizing: "border-box",
  },
  row: {
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
    filter: "drop-shadow(0 0 6px rgba(255,140,0,.8))",
  },
  primaryBtn: {
    padding: "12px 16px",
    borderRadius: 12,
    border: "none",
    background: ORANGE,
    color: "#000",
    fontWeight: 800,
    cursor: "pointer",
    boxShadow: "0 0 14px rgba(255,140,0,.8)",
    whiteSpace: "nowrap",
  },
  secondaryBtn: {
    padding: "12px 16px",
    borderRadius: 12,
    border: `1px solid ${ORANGE}`,
    background: "transparent",
    color: ORANGE,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  linkBtn: {
    padding: "12px 16px",
    borderRadius: 12,
    border: "1px solid #333",
    background: "transparent",
    color: "#bbb",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
};

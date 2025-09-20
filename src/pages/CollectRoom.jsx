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
  const [now, setNow] = useState(Date.now());

  const [submitting, setSubmitting] = useState(false);
  const [text, setText] = useState("");
  const [list, setList] = useState([]);

  // host?
  const adminKey = localStorage.getItem(`sv_admin_${code}`) || null;

  // load poll
  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("polls")
        .select("*")
        .eq("code", code)
        .maybeSingle();
      if (!cancel) {
        if (error) {
          console.error(error);
          setPoll(null);
        } else {
          setPoll(data);
        }
        setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [code]);

  // live clock (just for future tweaks)
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(t);
  }, []);

  // live list of options
  useEffect(() => {
    if (!poll?.id) return;
    let cancel = false;

    const read = async () => {
      const { data, error } = await supabase
        .from("option_submissions")
        .select("*")
        .eq("poll_id", poll.id)
        .order("id", { ascending: true });

      if (!cancel) {
        if (error) console.error(error);
        setList(Array.isArray(data) ? data : []);
      }
    };

    read();
    const t = setInterval(read, 1500);
    return () => { cancel = true; clearInterval(t); };
  }, [poll?.id]);

  const uniquePreview = useMemo(() => {
    const map = new Map();
    for (const r of list) {
      const k = (r.option || "").trim().toLowerCase();
      if (!k) continue;
      if (!map.has(k)) map.set(k, r.option.trim().slice(0, 30));
    }
    return [...map.values()];
  }, [list]);

  async function submitOption() {
    const t = text.trim();
    if (!t) return;
    if (/[\uD800-\uDBFF][\uDC00-\uDFFF]/.test(t)) return alert("Plain text only (no emojis).");
    if (t.length > 60) return alert("60 characters max.");
    if (!poll?.id) return;

    // simple local anti-spam: limit to 5 submissions in this browser
    const key = `sv_submits_${code}`;
    const count = Number(localStorage.getItem(key) || "0");
    if (count >= 5) return alert("You’ve reached the submission limit on this device.");

    setSubmitting(true);
    try {
      const { error } = await supabase.from("option_submissions").insert({
        poll_id: poll.id,
        option: t,
      });
      if (error) throw error;
      localStorage.setItem(key, String(count + 1));
      setText("");
    } catch (e) {
      console.error(e);
      alert("Could not submit option.");
    } finally {
      setSubmitting(false);
    }
  }

  async function startVoting() {
    if (!adminKey) return alert("Only the host can start voting in this browser.");
    if (!poll) return;
    const duration = poll.duration_minutes || 120;

    try {
      const { error } = await supabase.rpc("start_voting", {
        p_code: code,
        p_admin_key: adminKey,
        p_duration_minutes: duration,
      });
      if (error) throw error;
      // send everyone to the normal room page
      nav(`/room/${code}`);
    } catch (e) {
      console.error(e);
      alert(e.message || "Could not start voting.");
    }
  }

  if (loading) {
    return Screen(
      <div style={s.card}>
        <h1 style={s.title}>Room {code}</h1>
        <p style={{ opacity: 0.85 }}>Loading…</p>
      </div>
    );
  }

  if (!poll || poll.phase !== "collect") {
    // if the host already started voting, just go to the room
    return Screen(
      <div style={s.card}>
        <h1 style={s.title}>Room {code}</h1>
        <p style={{ opacity: 0.85 }}>Collection is closed.</p>
        <div style={{ marginTop: 10 }}>
          <button style={s.primaryBtn} onClick={() => nav(`/room/${code}`)}>
            Go to Voting
          </button>
        </div>
      </div>
    );
  }

  return Screen(
    <div style={s.card}>
      <h1 style={s.title}>{poll.title}</h1>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
        <span style={s.badge}>Code: {code}</span>
        <span style={s.badge}>Phase: Collecting options</span>
      </div>

      <div style={s.box}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Submit an option:</div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            style={s.input}
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={60}
            placeholder="Your idea (max 60 chars, no emojis)…"
          />
          <button
            style={{ ...s.primaryBtn, opacity: submitting ? 0.6 : 1 }}
            disabled={submitting}
            onClick={submitOption}
          >
            Add
          </button>
        </div>
        <div style={{ marginTop: 6, opacity: 0.8, fontSize: 12 }}>
          Each device can submit up to 5 ideas. Duplicates are de-duped automatically.
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>
          Current unique options ({uniquePreview.length}):
        </div>
        <div style={{ display: "grid", gap: 8 }}>
          {uniquePreview.length === 0 ? (
            <div style={{ opacity: 0.7 }}>No options yet—be the first!</div>
          ) : uniquePreview.map((opt, i) => (
            <div key={i} style={s.row}>
              <div style={s.dot} />
              <div style={{ fontWeight: 700 }}>{opt}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
        <button style={s.linkBtn} onClick={() => nav("/")}>Home</button>

        {adminKey && (
          <button
            style={{
              ...s.primaryBtn,
              background: "#12d06b",
              boxShadow: "0 0 14px rgba(18,208,107,.6)",
            }}
            onClick={startVoting}
            title="Build final list and open the vote"
          >
            Start Voting
          </button>
        )}
      </div>
    </div>
  );
}

/* small helpers/style */
function Screen(children) {
  return <div style={s.wrap}>{children}</div>;
}

const s = {
  wrap: { minHeight: "100vh", display: "grid", placeItems: "center", background: "#0b0f17", color: "#e9e9f1", padding: 16 },
  card: { width: "min(820px, 94vw)", padding: 24, borderRadius: 16, background: "rgba(255,255,255,0.04)", boxShadow: "0 0 20px rgba(255,140,0,.35)" },
  title: { fontSize: 26, marginBottom: 10, textShadow: "0 0 12px rgba(255,140,0,.8)" },
  badge: { padding: "6px 10px", borderRadius: 999, border: "1px solid #333", background: "#121727", letterSpacing: 1, fontSize: 12 },
  box: { marginTop: 8, padding: 12, borderRadius: 12, border: "1px solid rgba(255,140,0,.35)", background: "rgba(255,255,255,0.03)" },
  input: { flex: 1, minWidth: 220, padding: "12px 14px", borderRadius: 12, border: "1px solid #333", background: "#121727", color: "#fff", outline: "none" },
  row: { display: "flex", alignItems: "center", gap: 8, padding: 10, borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid #222" },
  dot: { width: 8, height: 8, borderRadius: 999, background: ORANGE, boxShadow: "0 0 10px rgba(255,140,0,.7)" },
  primaryBtn: { padding: "12px 16px", borderRadius: 12, border: "none", background: ORANGE, color: "#000", fontWeight: 800, cursor: "pointer", boxShadow: "0 0 14px rgba(255,140,0,.8)" },
  linkBtn: { padding: "12px 16px", borderRadius: 12, border: "1px solid #333", background: "transparent", color: "#bbb", cursor: "pointer" },
};

// src/pages/CollectRoom.jsx
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";

const ORANGE = "#ff8c00";

export default function CollectRoom() {
  const nav = useNavigate();
  const { state } = useLocation();
  const { code: raw } = useParams();
  const code = (raw || "").toUpperCase();

  const [poll, setPoll] = useState(null);
  const [loading, setLoading] = useState(true);

  // simple stats (optional)
  const [contributors, setContrib] = useState(0);
  const [optionsCount, setOptionsCount] = useState(0);

  // host controls
  const [pin, setPin] = useState("");
  const [verified, setVerified] = useState(false);
  const [pinSetMessage, setPinSetMessage] = useState("");

  // fetch collect poll
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("collect_polls")
        .select("*")
        .eq("code", code)
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

  // tiny live stats (unique contributors & options)
  useEffect(() => {
    if (!poll?.id) return;
    let stop = false;

    async function refresh() {
      // unique contributors by client_id
      const { data: contribRows, error: e1 } = await supabase
        .from("collect_options")
        .select("client_id", { count: "exact", head: false })
        .eq("poll_id", poll.id);
      if (!stop) {
        if (e1) console.error(e1);
        const uniq = new Set((contribRows || []).map((r) => r.client_id)).size;
        setContrib(uniq);
        setOptionsCount((contribRows || []).length);
      }
    }

    refresh();
    const t = setInterval(refresh, 2000);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [poll?.id]);

  const remainingLabel = useMemo(() => {
    if (!poll) return "";
    // "Your remaining" is per-user, enforced on insert (max_per_user)
    return `${poll.max_per_user ?? 0}`;
  }, [poll]);

  // --- Host Actions ---
  async function setRoomPin() {
    if (!pin) return alert("Enter a PIN (at least 4 digits).");
    const { data, error } = await supabase.rpc("collect_set_pin", {
      _code: code,
      _pin: pin,
    });
    if (error) {
      alert(`Could not set PIN.\n\n${error.message}`);
      return;
    }
    setPinSetMessage("PIN saved for this room.");
  }

  async function verifyRoomPin() {
    if (!pin) return alert("Enter your host PIN.");
    const { data, error } = await supabase.rpc("collect_verify_pin", {
      _code: code,
      _pin: pin,
    });
    if (error) {
      alert(`Could not verify PIN.\n\n${error.message}`);
      return;
    }
    setVerified(!!data);
    if (!data) alert("Incorrect PIN.");
  }

  async function setStatus(next) {
    if (!verified) return alert("Verify your PIN first.");
    const { error } = await supabase.rpc("collect_set_status", {
      _code: code,
      _pin: pin,
      _status: next, // 'ready' | 'collecting' | 'closed'
    });
    if (error) {
      alert(`Could not update status.\n\n${error.message}`);
      return;
    }
    // refresh poll
    const { data: fresh } = await supabase
      .from("collect_polls")
      .select("*")
      .eq("code", code)
      .maybeSingle();
    setPoll(fresh || null);
  }

  async function finalizeToVoting() {
    if (!verified) return alert("Verify your PIN first.");
    try {
      const { data, error } = await supabase.rpc("collect_finalize_to_voting", {
        _code: code,
        _pin: pin,
      });
      if (error) throw error;
      // data: new vote room code
      nav(`/room/${data}`);
    } catch (e) {
      alert(`Could not finalize.\n\n${e.message}`);
    }
  }

  // Ask to set PIN if we just created and no PIN yet
  useEffect(() => {
    if (!poll) return;
    if (state?.askSetPin && !poll.host_pin_hash) {
      // show a subtle message once
      setPinSetMessage("Set a host PIN to unlock controls.");
      history.replaceState(null, "");
    }
  }, [poll, state]);

  // render
  if (loading) {
    return Screen(
      <div style={styles.card}>
        <h1 style={styles.title}>Room {code}</h1>
        <p style={{ opacity: 0.85 }}>Loading…</p>
      </div>
    );
  }
  if (!poll) {
    return Screen(
      <div style={styles.card}>
        <h1 style={styles.title}>Room {code}</h1>
        <p style={{ opacity: 0.85 }}>Couldn’t find this collection room.</p>
        <button style={styles.secondaryBtn} onClick={() => nav("/")}>
          Home
        </button>
      </div>
    );
  }

  return Screen(
    <div style={styles.card}>
      <div style={styles.headerRow}>
        <h1 style={styles.title}>{poll.title}</h1>
        <span style={styles.badge}>Code: {code}</span>
      </div>

      {/* Stats row */}
      <div style={styles.statsRow}>
        <Stat label="Contributors" value={`${contributors}${poll.target_participants_hint ? ` / ${poll.target_participants_hint}` : ""}`} />
        <Stat label="Options" value={optionsCount} />
        <Stat label="Your remaining" value={remainingLabel} />
        <Stat label="Status" value={poll.status} />
      </div>

      {/* Host controls */}
      <div style={styles.panel}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Host Controls</div>

        {!poll.host_pin_hash ? (
          <>
            <div style={styles.pinRow}>
              <input
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Set a PIN (min 4)"
                style={styles.input}
              />
              <button style={styles.primaryBtn} onClick={setRoomPin}>
                Set PIN
              </button>
            </div>
            {pinSetMessage && <div style={styles.note}>{pinSetMessage}</div>}
          </>
        ) : (
          <>
            <div style={styles.pinRow}>
              <input
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Enter host PIN"
                style={styles.input}
              />
              <button style={styles.secondaryBtn} onClick={verifyRoomPin}>
                {verified ? "Verified ✓" : "Verify PIN"}
              </button>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
              <button
                style={styles.secondaryBtn}
                onClick={() => setStatus(poll.status === "ready" ? "collecting" : "ready")}
                disabled={!verified}
                title="Toggle collecting/ready"
              >
                {poll.status === "ready" ? "Reopen (Collecting)" : "Mark Ready"}
              </button>

              <button
                style={styles.primaryBtn}
                onClick={finalizeToVoting}
                disabled={!verified}
                title="Create voting room and open voting"
              >
                Finalize & Start Voting
              </button>
            </div>
          </>
        )}
      </div>

      {/* If voting room already created, show quick link */}
      {poll.poll_code && (
        <div style={{ marginTop: 12 }}>
          <div style={styles.note}>
            Voting room created: <strong>{poll.poll_code}</strong>
          </div>
          <button style={styles.secondaryBtn} onClick={() => nav(`/room/${poll.poll_code}`)}>
            Go to Voting Room
          </button>
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        <button style={styles.linkBtn} onClick={() => nav("/")}>
          Home
        </button>
      </div>
    </div>
  );
}

/* UI Bits */
function Screen(children) {
  return <div style={styles.wrap}>{children}</div>;
}

function Stat({ label, value }) {
  return (
    <div style={styles.statBox}>
      <div style={{ opacity: 0.75, fontSize: 12 }}>{label}</div>
      <div style={{ fontWeight: 800, marginTop: 2 }}>{value}</div>
    </div>
  );
}

const styles = {
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
    padding: "clamp(16px,3vw,24px)",
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
  title: {
    margin: 0,
    fontSize: "clamp(22px,4.5vw,28px)",
    textShadow: "0 0 12px rgba(255,140,0,.8)",
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
    marginTop: 12,
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: 10,
  },
  statBox: {
    padding: 10,
    borderRadius: 12,
    border: "1px solid #222",
    background: "rgba(255,255,255,0.03)",
  },
  panel: {
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    border: "1px solid rgba(255,140,0,.25)",
    background: "rgba(255,255,255,0.04)",
    boxShadow: "0 0 14px rgba(255,140,0,.25) inset",
  },
  pinRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  input: {
    flex: "1 1 220px",
    minWidth: 180,
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #333",
    background: "#121727",
    color: "#fff",
    outline: "none",
    boxSizing: "border-box",
  },
  note: { marginTop: 8, opacity: 0.85 },
  primaryBtn: {
    padding: "12px 16px",
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
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid #333",
    background: "transparent",
    color: "#bbb",
    cursor: "pointer",
  },
};

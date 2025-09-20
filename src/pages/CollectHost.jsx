// src/pages/CollectHost.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";

const ORANGE = "#ff8c00";

export default function CollectHost() {
  const nav = useNavigate();
  const { code: raw } = useParams();
  const code = (raw || "").toUpperCase();

  const [poll, setPoll] = useState(null);
  const [loading, setLoading] = useState(true);

  // pin UI
  const [pin, setPin] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // action
  const [acting, setActing] = useState(false);

  // read poll
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
    return () => {
      cancelled = true;
    };
  }, [code]);

  const statusBadge = useMemo(() => {
    const s = poll?.status || "collecting";
    return s;
  }, [poll?.status]);

  async function verifyPin() {
    setErrorMsg("");
    setVerifying(true);
    try {
      // IMPORTANT: use the parameter names the SQL function expects
      //   collect_verify_pin(_code text, _pin text) -> boolean
      const { data, error } = await supabase.rpc("collect_verify_pin", {
        _code: code,
        _pin: pin,
      });
      if (error) {
        console.error(error);
        setErrorMsg("Verification failed.");
        setVerified(false);
      } else {
        if (data === true) {
          setVerified(true);
        } else {
          setVerified(false);
          setErrorMsg("Incorrect PIN.");
        }
      }
    } catch (e) {
      console.error(e);
      setErrorMsg("Could not verify PIN.");
      setVerified(false);
    } finally {
      setVerifying(false);
    }
  }

  async function openVoting() {
    if (!verified) return;
    setErrorMsg("");
    setActing(true);
    try {
      // SQL function: collect_finalize_to_voting(_code text, _pin text) -> text (hint/message)
      const { data, error } = await supabase.rpc("collect_finalize_to_voting", {
        _code: code,
        _pin: pin,
      });
      if (error) {
        console.error(error);
        setErrorMsg(error.message || "Could not open voting.");
      } else {
        // refresh poll after transition
        await refresh();
      }
    } catch (e) {
      console.error(e);
      setErrorMsg("Could not open voting.");
    } finally {
      setActing(false);
    }
  }

  async function refresh() {
    const { data, error } = await supabase
      .from("collect_polls")
      .select("*")
      .eq("code", code)
      .maybeSingle();
    if (error) {
      console.error(error);
      return;
    }
    setPoll(data);
  }

  if (loading) {
    return ScreenWrap(
      <div style={styles.container}>
        <h1 style={styles.title}>Host Options</h1>
        <p style={styles.text}>Loading…</p>
      </div>
    );
  }
  if (!poll) {
    return ScreenWrap(
      <div style={styles.container}>
        <h1 style={styles.title}>Host Options</h1>
        <p style={styles.text}>We couldn’t find a collection with code {code}.</p>
        <button style={styles.secondaryBtn} onClick={() => nav("/")}>
          Home
        </button>
      </div>
    );
  }

  return ScreenWrap(
    <div style={styles.container}>
      <div style={styles.headerRow}>
        <h1 style={styles.title}>Host Options — {poll.title || "Untitled"}</h1>
        <span style={styles.badge}>Code: {code}</span>
      </div>

      <div style={styles.infoCard}>
        <div>
          <div style={styles.label}>Status:</div>
          <div style={styles.value}>{statusBadge}</div>
        </div>
        <div>
          <div style={styles.label}>Max per user:</div>
          <div style={styles.value}>{poll.max_per_user ?? "-"}</div>
        </div>
        <div>
          <div style={styles.label}>Target participants:</div>
          <div style={styles.value}>{poll.target_participants_hint ?? "-"}</div>
        </div>
      </div>

      {!verified ? (
        <div style={styles.panel}>
          <div style={styles.label}>Enter Host PIN</div>
          <input
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="4+ digits"
            inputMode="numeric"
            style={styles.input}
          />
          <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
            <button style={styles.primaryBtn} onClick={verifyPin} disabled={verifying || !pin}>
              {verifying ? "Verifying…" : "Verify"}
            </button>
            <button style={styles.linkBtn} onClick={() => nav(`/collect/${code}`)}>
              Back
            </button>
          </div>
          {errorMsg && <div style={styles.err}>{errorMsg}</div>}
        </div>
      ) : (
        <div style={styles.panel}>
          <div style={styles.good}>PIN verified ✔</div>
          <div style={{ display: "flex", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
            <button
              style={styles.primaryBtn}
              onClick={openVoting}
              disabled={acting || poll.status !== "collecting"}
              title={poll.status !== "collecting" ? "Already finalized" : "Open voting"}
            >
              {acting ? "Working…" : "Open Voting"}
            </button>
            <button style={styles.secondaryBtn} onClick={refresh}>
              Refresh
            </button>
            <button style={styles.linkBtn} onClick={() => nav(`/collect/${code}`)}>
              Back to Landing
            </button>
          </div>
          {errorMsg && <div style={styles.err}>{errorMsg}</div>}
          {poll.status === "voting" && (
            <div style={{ marginTop: 10 }}>
              Voting is open. Share the voting code with participants:
              <div style={{ ...styles.badge, marginTop: 6 }}>Vote Code: {code}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- helpers/styles ---------- */
function ScreenWrap(children) {
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
  container: {
    width: "100%",
    maxWidth: 720,
    padding: "clamp(16px, 3vw, 24px)",
    borderRadius: 16,
    background: "rgba(255,255,255,0.04)",
    boxShadow: "0 0 20px rgba(255,140,0,.35)",
    boxSizing: "border-box",
    margin: "0 auto",
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
    fontSize: "clamp(22px, 4.5vw, 28px)",
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
  infoCard: {
    marginTop: 14,
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    background: "rgba(255,255,255,0.03)",
    border: "1px solid #222",
  },
  label: { fontSize: 12, opacity: 0.8, marginBottom: 4 },
  value: { fontWeight: 700 },
  panel: {
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    background: "rgba(255,255,255,0.03)",
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
  primaryBtn: {
    padding: "12px 16px",
    borderRadius: 12,
    border: "none",
    background: ORANGE,
    color: "#080000ff",
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
  },
  linkBtn: {
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid #333",
    background: "transparent",
    color: "#aaa",
    cursor: "pointer",
  },
  err: { marginTop: 10, color: "#ffb4b4" },
  good: {
    fontWeight: 700,
    color: "#ffd9b3",
    textShadow: "0 0 8px rgba(255,140,0,.6)",
  },
};

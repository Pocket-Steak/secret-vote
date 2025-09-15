import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import QRCode from "qrcode";

const ORANGE = "#ff8c00";

// Utility to format remaining ms as "Xh Ym"
function fmtHM(ms) {
  if (ms <= 0) return "0h 0m";
  const mTotal = Math.floor(ms / 60000);
  const h = Math.floor(mTotal / 60);
  const m = mTotal % 60;
  return `${h}h ${m}m`;
}

export default function Landing() {
  const nav = useNavigate();
  const { code: raw } = useParams();
  const code = (raw || "").toUpperCase();

  const [poll, setPoll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [qrUrl, setQrUrl] = useState("");
  const [qrBusy, setQrBusy] = useState(false);

  // Fetch poll by code from Supabase
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("polls")
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

  // Tick every 15s (minutes-only display)
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(t);
  }, []);

  // Status (open/closed/expired/missing)
  const status = useMemo(() => {
    if (!poll) return "missing";
    const closesAt = new Date(poll.closes_at).getTime();
    const expiresAt = new Date(poll.expires_at).getTime();
    if (now >= expiresAt) return "expired";
    if (now >= closesAt) return "closed";
    return "open";
  }, [poll, now]);

  // Auto-redirect to results when closed (but not expired)
  useEffect(() => {
    if (status === "closed") {
      nav(`/results/${code}`, { state: { tooSlow: true } });
    }
  }, [status, nav, code]);

  // Build share URL and generate inline QR
  const shareUrl = `${window.location.origin}/#/room/${code}`;
  useEffect(() => {
    if (!poll) return;
    let cancelled = false;
    (async () => {
      try {
        const dataUrl = await QRCode.toDataURL(shareUrl, {
          width: 320,
          margin: 1,
          color: { dark: "#000000", light: "#ffffff" },
        });
        if (!cancelled) setQrUrl(dataUrl);
      } catch (e) {
        console.error("QR gen failed", e);
        if (!cancelled) setQrUrl("");
      }
    })();
    return () => { cancelled = true; };
  }, [poll, shareUrl]);

  async function downloadQR() {
    try {
      setQrBusy(true);
      const dataUrl = await QRCode.toDataURL(shareUrl, {
        width: 720,
        margin: 2,
        color: { dark: "#000000", light: "#ffffff" },
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `secret-vote-${code}.png`;
      a.click();
    } catch (e) {
      console.error(e);
      alert("Could not generate QR. Try again.");
    } finally {
      setQrBusy(false);
    }
  }

  // Loading state
  if (loading) {
    return ScreenWrap(
      <div style={styles.card}>
        <h1 style={styles.title}>Room {code}</h1>
        <p style={styles.text}>Loading…</p>
      </div>
    );
  }

  // Missing
  if (!poll) {
    return ScreenWrap(
      <div style={styles.card}>
        <h1 style={styles.title}>Room {code}</h1>
        <p style={styles.text}>We couldn’t find this poll. Double-check the code.</p>
        <button style={styles.secondaryBtn} onClick={() => nav("/")}>Home</button>
      </div>
    );
  }

  // Expired (24h after close)
  if (status === "expired") {
    return ScreenWrap(
      <div style={styles.card}>
        <h1 style={styles.title}>{poll.title}</h1>
        <p style={{ ...styles.text, marginTop: 8 }}>
          This page has gone the way of your New Year’s resolutions.
        </p>
        <button style={styles.secondaryBtn} onClick={() => nav("/")}>Home</button>
      </div>
    );
  }

  const timeLeft = Math.max(0, new Date(poll.closes_at).getTime() - now);

  return ScreenWrap(
    <div style={styles.card}>
      <h1 style={styles.title}>{poll.title}</h1>

      <div style={styles.countdownRow}>
        <span style={styles.badge}>Code: {code}</span>
        <span style={styles.timer}>Ends in {fmtHM(timeLeft)}</span>
      </div>

      <div style={styles.actions}>
        <button style={styles.primaryBtn} onClick={() => nav(`/vote/${code}`)}>
          Vote
        </button>
        <button style={styles.ghostBtn} onClick={() => nav(`/results/${code}`)}>
          View Results
        </button>
        <button style={styles.secondaryBtn} onClick={downloadQR} disabled={qrBusy} title="Download PNG">
          {qrBusy ? "Building QR…" : "Download QR (PNG)"}
        </button>
      </div>

      {/* Inline QR preview */}
      <div style={styles.qrWrap}>
        {qrUrl ? (
          <img src={qrUrl} alt={`QR for ${code}`} style={styles.qrImg} />
        ) : (
          <div style={styles.qrSkeleton}>QR</div>
        )}
      </div>

      <p style={styles.hint}>Share the QR or code so people can vote or see live results.</p>
      <button style={{ ...styles.linkBtn, marginTop: 8 }} onClick={() => nav("/")}>Home</button>
    </div>
  );
}

// ---------- layout helper ----------
function ScreenWrap(children) {
  return (
    <div style={styles.wrap}>
      {children}
    </div>
  );
}

const styles = {
  wrap: { minHeight: "100vh", display: "grid", placeItems: "center", background: "#0b0f17", color: "#e9e9f1" },
  card: { width: "min(720px, 92vw)", padding: 24, borderRadius: 16, background: "rgba(255,255,255,0.04)", boxShadow: "0 0 20px rgba(255,140,0,.35)" },
  title: { fontSize: 28, marginBottom: 12, textShadow: "0 0 12px rgba(255,140,0,.8)" },
  countdownRow: { display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between" },
  badge: { padding: "6px 10px", borderRadius: 999, border: "1px solid #333", background: "#121727", letterSpacing: 1 },
  timer: { fontWeight: 700, color: "#ffd9b3", textShadow: "0 0 8px rgba(255,140,0,.6)" },
  actions: { display: "flex", flexWrap: "wrap", gap: 12, marginTop: 16 },
  primaryBtn: { padding: "12px 18px", borderRadius: 12, border: "none", background: ORANGE, color: "#000", fontWeight: 800, cursor: "pointer", boxShadow: "0 0 14px rgba(255,140,0,.8)" },
  ghostBtn: { padding: "12px 16px", borderRadius: 12, border: `1px solid ${ORANGE}`, background: "transparent", color: ORANGE, cursor: "pointer" },
  secondaryBtn: { padding: "12px 16px", borderRadius: 12, border: "1px solid #333", background: "transparent", color: "#e9e9f1", cursor: "pointer" },
  hint: { opacity: 0.75, marginTop: 10, fontSize: 12 },
  linkBtn: { padding: "8px 12px", borderRadius: 10, border: "1px solid #333", background: "transparent", color: "#aaa", cursor: "pointer" },

  // QR styles
  qrWrap: {
    marginTop: 16,
    display: "grid",
    placeItems: "center",
    padding: 12,
    borderRadius: 12,
    background: "rgba(255,255,255,0.03)",
    border: "1px solid #222",
  },
  qrImg: {
    width: 220,
    height: 220,
    borderRadius: 8,
    background: "#fff",
  },
  qrSkeleton: {
    width: 220,
    height: 220,
    display: "grid",
    placeItems: "center",
    borderRadius: 8,
    border: "1px dashed #444",
    color: "#666",
  },
};

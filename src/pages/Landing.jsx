// src/pages/Landing.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { wideTheme } from "../lib/theme.js";
import QRCode from "qrcode";

function ThemeStyles() { return <style>{wideTheme}</style>; }

function QRDisplay({ code }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    if (!canvasRef.current || !code) return;
    const url = window.location.href.replace(window.location.hash, "") + `#/vote/${code}`;
    QRCode.toCanvas(canvasRef.current, url, {
      width: 160,
      color: { dark: "#f5efe6", light: "#1a1f27" },
      margin: 2,
    }).catch(console.error);
  }, [code]);
  return <canvas ref={canvasRef} style={{ borderRadius: 12, display: "block", margin: "12px auto 0" }} />;
}

export default function Landing() {
  const { code: raw } = useParams();
  const code = (raw || "").toUpperCase();
  const nav = useNavigate();

  const [poll, setPoll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [rows, setRows] = useState([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.from("polls").select("*").eq("code", code).limit(1).maybeSingle();
      if (!mounted) return;
      if (error) { console.error(error); setPoll(null); } else { setPoll(data); }
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [code]);

  useEffect(() => {
    if (!poll?.id) return;
    let cancelled = false;
    const read = async () => {
      const { data, error } = await supabase.from("poll_results").select("*").eq("poll_id", poll.id);
      if (!cancelled) {
        if (error) { console.error(error); setRows([]); }
        else { setRows(Array.isArray(data) ? data : []); }
      }
    };
    read();
    const t = setInterval(read, 2000);
    return () => { cancelled = true; clearInterval(t); };
  }, [poll?.id]);

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const endsText = useMemo(() => {
    if (!poll?.closes_at) return "";
    const end = new Date(poll.closes_at).getTime();
    const diff = Math.max(0, end - now);
    if (diff <= 0) return "Voting closed";
    const mins = Math.floor(diff / 60000);
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `Ends in ${h}h ${m}m` : `Ends in ${m}m`;
  }, [poll, now]);

  const weights = useMemo(() => {
    const scheme = Array.isArray(poll?.point_scheme) ? poll.point_scheme : [];
    return scheme.map((n) => Number(n) || 0);
  }, [poll?.point_scheme]);

  const totals = useMemo(() => {
    const opts = Array.isArray(poll?.options) ? poll.options : [];
    const map = new Map(opts.map((o) => [o, 0]));
    for (const r of rows) {
      if (map.has(r.option)) map.set(r.option, (map.get(r.option) || 0) + (Number(r.points) || 0));
    }
    return Array.from(map.entries()).map(([option, points]) => ({ option, points }));
  }, [rows, poll?.options]);

  const ballots = useMemo(() => {
    const perBallot = weights.reduce((a, b) => a + b, 0);
    if (!perBallot) return 0;
    return Math.round(totals.reduce((a, r) => a + (Number(r.points) || 0), 0) / perBallot);
  }, [weights, totals]);

  async function copyCode() {
    try { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1100); }
    catch {/* ignore */}
  }

  if (loading) return (
    <>
      <div className="wrap"><div className="col">
        <div className="card section">
          <div className="skel skel-title" />
          <div className="skel skel-line" />
          <div className="skel skel-btn" />
        </div>
      </div></div>
      <ThemeStyles />
    </>
  );

  if (!poll) return (
    <div className="wrap"><div className="col">
      <section className="card section">
        <h1 className="hdr">Not found</h1>
        <p className="help">We couldn't find a room with code "{code}".</p>
        <div className="stack"><button className="btn btn-outline" onClick={() => nav("/")}>Home</button></div>
      </section>
    </div><ThemeStyles /></div>
  );

  return (
    <div className="wrap">
      <div className="col">
        <section className="card section">
          <div className="head-row">
            <h1 className="hdr">Poll launched!</h1>
            <span className="timer">{endsText || "—"}</span>
          </div>

          <div className="panel">
            <div className="label" style={{ marginBottom: 8 }}>Share this code with voters:</div>
            <div className="share-row">
              <div className="code-pill">{code}</div>
              <button className={`btn ${copied ? "btn-primary" : "btn-outline"}`} onClick={copyCode}>
                {copied ? "Copied!" : "Copy Code"}
              </button>
            </div>
            <div className="badges-row" style={{ marginTop: 10 }}>
              <span className="badge">{endsText || "—"}</span>
              <span className="badge">Ballots: {ballots}</span>
            </div>
            <QRDisplay code={code} />
            <div className="actions">
              <button className="btn btn-primary" onClick={() => nav(`/vote/${code}`)}>Vote</button>
              <button className="btn btn-outline" onClick={() => nav(`/results/${code}`)}>View Results</button>
            </div>
          </div>

          <div className="stack" style={{ marginTop: 8 }}>
            <button className="btn btn-outline" onClick={() => nav("/")}>Home</button>
          </div>
        </section>
      </div>
      <ThemeStyles />
      <style>{`
        .label { font-weight: 800; }
        .panel { margin-top: 6px; padding: 16px; border-radius: 16px; background: linear-gradient(180deg, rgba(255,255,255,.03), rgba(0,0,0,.12)); border: 1px solid rgba(255,140,0,.25); box-shadow: 0 0 14px rgba(255,140,0,.10) inset; }
        .share-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
        .code-pill { display: inline-flex; align-items: center; justify-content: center; padding: 12px 16px; border-radius: 14px; font-weight: 900; letter-spacing: .12em; background: #181f33; color: var(--ink); border: 1px solid rgba(255,140,0,.85); box-shadow: 0 8px 18px rgba(255,140,0,.25), 0 0 8px rgba(255,140,0,.35) inset; }
        .actions { display: flex; gap: 12px; margin-top: 16px; flex-wrap: wrap; }
      `}</style>
    </div>
  );
}

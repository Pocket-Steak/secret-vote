// src/pages/Randomize.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";

// --- same dedupe spirit as Vote.jsx ---
function dedupeOptions(rawOptions) {
  if (!Array.isArray(rawOptions)) return [];
  const seen = new Set();
  return rawOptions.filter((opt) => {
    const norm = String(opt ?? "").trim().toLowerCase();
    if (!norm) return false;
    if (seen.has(norm)) return false;
    seen.add(norm);
    return true;
  });
}

// --- Seedable RNG helpers (deterministic with a seed) ---
function hashString(str) {
  // FNV-1a 32-bit
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function seededShuffle(arr, seedStr) {
  const out = arr.slice();
  const seeded = !!seedStr;
  const rng = seeded ? mulberry32(hashString(seedStr)) : null;
  for (let i = out.length - 1; i > 0; i--) {
    const r = seeded ? rng() : Math.random();
    const j = Math.floor(r * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export default function Randomize() {
  const nav = useNavigate();
  const { code: raw } = useParams();
  const code = (raw || "").toUpperCase();

  const [poll, setPoll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // randomizer controls
  const [seed, setSeed] = useState("");
  const [count, setCount] = useState(1);
  const [allowDup, setAllowDup] = useState(false);

  // results
  const [results, setResults] = useState([]); // [{rank, label}]
  const [orderPreview, setOrderPreview] = useState([]); // full shuffled order (no-dup)

  // load poll (same table as Vote.jsx)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErrorMsg("");
      const { data, error } = await supabase
        .from("polls")
        .select("*")
        .eq("code", code)
        .maybeSingle();

      if (!cancelled) {
        if (error) {
          console.error(error);
          setPoll(null);
          setErrorMsg(error.message || "Could not load poll.");
        } else {
          const deduped = dedupeOptions(data?.options || []);
          setPoll({ ...data, options: deduped });
          const shuf = seededShuffle(deduped, seed.trim() || undefined);
          setOrderPreview(shuf);
        }
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  // keep full order preview in sync with seed or options
  useEffect(() => {
    if (!poll?.options) return;
    const shuf = seededShuffle(poll.options, seed.trim() || undefined);
    setOrderPreview(shuf);
  }, [seed, poll?.options]);

  const N = poll?.options?.length ?? 0;

  const status = useMemo(() => {
    if (!poll) return "missing";
    const now = Date.now();
    const closes = poll?.closes_at ? new Date(poll.closes_at).getTime() : Infinity;
    const expires = poll?.expires_at ? new Date(poll.expires_at).getTime() : Infinity;
    if (now >= expires) return "expired";
    if (now >= closes) return "closed";
    return "open";
  }, [poll]);

  function copyResults() {
    const txt = results.map((r) => `${r.rank}. ${r.label}`).join("\n");
    navigator.clipboard.writeText(txt).catch(() => {});
  }

  function runRandomizer() {
    if (!poll?.options?.length) {
      setResults([]);
      setErrorMsg("No options to randomize.");
      return;
    }
    setErrorMsg("");
    const seedStr = seed.trim() || undefined;

    // base pool (already unique due to dedupeOptions)
    const pool = poll.options.slice();

    const n = Math.max(1, Number(count) || 1);
    let out = [];

    if (allowDup) {
      const rng = seedStr ? mulberry32(hashString(seedStr)) : null;
      for (let i = 0; i < n; i++) {
        const r = seedStr ? rng() : Math.random();
        const idx = Math.floor(r * pool.length);
        out.push({ rank: i + 1, label: pool[idx] });
      }
    } else {
      const shuffled = seededShuffle(pool, seedStr);
      out = shuffled.slice(0, n).map((label, i) => ({ rank: i + 1, label }));
    }

    setResults(out);
    // keep order preview visible for transparency
    const shuf = seededShuffle(pool, seedStr);
    setOrderPreview(shuf);
  }

  // ---- render ----
  if (loading) {
    return (
      <div className="wrap">
        <div className="col">
          <section className="card section">
            <h1 className="hdr">Randomizer — {code}</h1>
            <p className="help">Loading…</p>
          </section>
        </div>
        <ThemeStyles />
      </div>
    );
  }
  if (!poll) {
    return (
      <div className="wrap">
        <div className="col">
          <section className="card section">
            <h1 className="hdr">Randomizer — {code}</h1>
            <p className="help">We couldn’t find this poll. Double-check the code.</p>
            <div className="stack">
              <button className="btn btn-outline" onClick={() => nav("/")}>
                Home
              </button>
            </div>
          </section>
        </div>
        <ThemeStyles />
      </div>
    );
  }
  if (status === "expired") {
    return (
      <div className="wrap">
        <div className="col">
          <section className="card section">
            <h1 className="hdr">{poll.title || `Room ${code}`}</h1>
            <p className="help" style={{ marginTop: 8 }}>
              This poll is expired. You can still randomize from its options for reference.
            </p>
            <div className="stack">
              <button className="btn btn-outline" onClick={() => nav("/")}>
                Home
              </button>
            </div>
          </section>
        </div>
        <ThemeStyles />
      </div>
    );
  }

  return (
    <div className="wrap">
      <div className="col">
        <section className="card section">
          {/* Header */}
          <div className="head-row">
            <h1 className="hdr">Randomizer — {poll.title || `Room ${code}`}</h1>
            <span className="badge">Code: {code}</span>
          </div>
          <p className="help" style={{ marginTop: -6 }}>
            Using the same options the voting page sees. Options available: <strong>{N}</strong>
          </p>

          {/* Controls */}
          <div className="info-grid" style={{ marginTop: 12 }}>
            <div className="info">
              <div className="info-label">Number of winners</div>
              <label className="field">
                <input
                  inputMode="numeric"
                  value={count}
                  onChange={(e) => setCount(String(e.target.value).replace(/[^\d]/g, ""))}
                  placeholder="1"
                />
              </label>
            </div>
            <div className="info">
              <div className="info-label">Allow duplicates</div>
              <label className="field" style={{ gap: 8 }}>
                <input
                  type="checkbox"
                  checked={allowDup}
                  onChange={(e) => setAllowDup(e.target.checked)}
                  style={{ width: 20, height: 20 }}
                />
                <span>Same option can win multiple times</span>
              </label>
            </div>
            <div className="info">
              <div className="info-label">Seed (optional)</div>
              <label className="field">
                <input
                  value={seed}
                  onChange={(e) => setSeed(e.target.value)}
                  placeholder="Word/number for repeatable results"
                />
              </label>
            </div>
          </div>

          <div className="stack" style={{ marginTop: 12 }}>
            <button className="btn btn-primary" onClick={runRandomizer}>
              Run Randomizer
            </button>

            {errorMsg && <p className="error">{errorMsg}</p>}

            {results.length > 0 && (
              <>
                <div className="note">
                  <strong style={{ display: "block", marginBottom: 6 }}>Winners</strong>
                  <ol style={{ margin: 0, paddingLeft: 18 }}>
                    {results.map((r) => (
                      <li key={`${r.rank}-${r.label}`}>{r.label}</li>
                    ))}
                  </ol>
                </div>
                <button className="btn btn-outline" onClick={copyResults}>
                  Copy Results
                </button>
              </>
            )}

            {orderPreview.length > 0 && (
              <div className="note" style={{ marginTop: 8 }}>
                <strong style={{ display: "block", marginBottom: 6 }}>Full Order (no-dup)</strong>
                <ol style={{ margin: 0, paddingLeft: 18 }}>
                  {orderPreview.map((lbl, i) => (
                    <li key={`${i}-${lbl}`}>{lbl}</li>
                  ))}
                </ol>
              </div>
            )}

            <div className="stack" style={{ marginTop: 8 }}>
              <button className="btn btn-outline" onClick={() => nav(`/room/${code}`)}>
                Back to Room
              </button>
            </div>
          </div>
        </section>
      </div>

      <ThemeStyles />
    </div>
  );
}

/** Inline theme (robust version) */
function ThemeStyles() {
  const CSS = String.raw`
:root{
  --bg:#0e1116;
  --panel:#1a1f27;
  --ink:#f5efe6;
  --muted:#bfc6d3;
  --accent:#ff8c00;
  --accent-2:#ffb25a;
  --container: min(720px, 94vw);
}

*{box-sizing:border-box}
html,body,#root{min-height:100%}
body{margin:0; background: var(--bg);}

.wrap{
  min-height:100vh; min-height:100svh; min-height:100dvh;
  display:flex; flex-direction:column; align-items:center; gap:12px;
  padding: max(16px, env(safe-area-inset-top)) 18px max(16px, env(safe-area-inset-bottom));
  background:
    radial-gradient(1200px 600px at 50% -10%, rgba(255,140,0,.08), transparent 60%),
    radial-gradient(800px 400px at 100% 0%, rgba(255,140,0,.05), transparent 60%),
    var(--bg);
  color:var(--ink);
}
.col{ display:flex; flex-direction:column; align-items:center; gap:16px; width:var(--container); }

.card{
  width:100%;
  background: linear-gradient(180deg, rgba(255,255,255,.03), rgba(0,0,0,.08)), var(--panel);
  border:1px solid rgba(255,255,255,.06);
  border-radius:16px; padding:24px;
  box-shadow: 0 1px 0 rgba(255,255,255,.06) inset, 0 10px 24px rgba(0,0,0,.35), 0 2px 6px rgba(0,0,0,.25);
  transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease;
}
.card:hover{
  transform: translateY(-2px);
  box-shadow: 0 1px 0 rgba(255,255,255,.08) inset, 0 14px 32px rgba(0,0,0,.45), 0 3px 10px rgba(0,0,0,.3);
  border-color: rgba(255,140,0,.25);
}

.hdr{font-size:1.35rem;font-weight:800;letter-spacing:.2px;margin:0 0 10px;text-shadow:0 1px 0 rgba(0,0,0,.5)}
.help{color:var(--muted);font-size:.95rem;margin:.25rem 0 0}
.stack{display:flex;flex-direction:column;gap:16px}
.section{margin:4px 0 6px}
.head-row{ display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; }
.badge{
  padding:6px 12px; border-radius:999px;
  background: linear-gradient(180deg, rgba(255,140,0,.10), rgba(255,140,0,.06));
  border:1px solid rgba(255,140,0,.45);
  color:#ffb25a; letter-spacing:.06em; font-weight:700; font-size:.9rem;
  box-shadow: 0 2px 10px rgba(0,0,0,.35), 0 1px 0 rgba(255,255,255,.04) inset;
}

.info-grid{
  display:grid; gap:12px; margin:12px 0;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
}
.info{
  padding:12px; border-radius:14px;
  background: linear-gradient(180deg, rgba(255,255,255,.03), rgba(0,0,0,.14));
  border:1px solid rgba(255,255,255,.08);
  box-shadow: inset 0 2px 6px rgba(0,0,0,.35);
}
.info-label{ color:var(--muted); font-size:.9rem; margin-bottom:4px; }
.info-value{ font-weight:800; color:var(--ink); }

.field{
  display:flex; align-items:center; gap:10px;
  background: linear-gradient(180deg, rgba(255,255,255,.03), rgba(0,0,0,.15));
  border:1px solid rgba(255,255,255,.08);
  border-radius:14px; padding:14px 16px;
  box-shadow: inset 0 2px 6px rgba(0,0,0,.35);
}
.field:focus-within{
  border-color: rgba(255,140,0,.45);
  box-shadow: inset 0 2px 6px rgba(0,0,0,.35), 0 0 0 3px rgba(255,140,0,.18);
}

.note{
  margin:10px 0 0; padding:10px; border-radius:12px;
  background: linear-gradient(180deg, rgba(255,255,255,.03), rgba(0,0,0,.10));
  border:1px solid rgba(255,140,0,.22);
}
.error{ color:#ff6b6b; font-size:.95rem; margin-top:8px; }

/* Buttons */
.btn{
  appearance:none; border:none; cursor:pointer; font-weight:800;
  border-radius:14px; padding:14px 18px; width:100%;
  transition: transform .08s ease, box-shadow .12s ease, filter .12s ease, opacity .12s ease;
}
.btn[disabled]{opacity:.7; cursor:not-allowed}
.btn-primary{
  color:#1a1005;
  background: linear-gradient(180deg, var(--accent-2), var(--accent));
  box-shadow: 0 10px 18px rgba(255,140,0,.28), 0 2px 0 rgba(255,140,0,.9) inset, 0 1px 0 rgba(255,255,255,.35) inset;
}
.btn-primary:hover{ filter:brightness(1.05) }
.btn-primary:active{
  transform: translateY(1px);
  box-shadow: 0 6px 12px rgba(255,140,0,.24), 0 1px 0 rgba(140,70,0,.9) inset, 0 0 0 rgba(255,255,255,0) inset;
}
.btn-outline{
  color:var(--accent-2);
  background: linear-gradient(180deg, rgba(255,140,0,.08), rgba(255,140,0,.04));
  border:1px solid rgba(255,140,0,.45);
  box-shadow: 0 6px 14px rgba(0,0,0,.35), 0 1px 0 rgba(255,255,255,.04) inset;
}
.btn-outline:hover{
  background: linear-gradient(180deg, rgba(255,140,0,.14), rgba(255,140,0,.06));
}
`;
  return <style>{CSS}</style>;
}

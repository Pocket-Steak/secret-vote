// src/pages/CollectHost.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function CollectHost() {
  const nav = useNavigate();
  const { code: raw } = useParams();
  const code = (raw || "").toUpperCase();

  const [poll, setPoll] = useState(null);
  const [loading, setLoading] = useState(true);

  // PIN state
  const [pin, setPin] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [acting, setActing] = useState(false);

  // Randomizer state
  const [randCount, setRandCount] = useState(1);
  const [randAllowDup, setRandAllowDup] = useState(false);
  const [randSeed, setRandSeed] = useState("");
  const [randWorking, setRandWorking] = useState(false);
  const [randResults, setRandResults] = useState([]); // [{rank, label}]

  // ---------- RNG helpers ----------
  function hashString(str) {
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
  function extractLabel(row) {
    const candidates = [
      row?.label,
      row?.text,
      row?.option_text,
      row?.choice,
      row?.name,
      row?.title,
      row?.value,
      row?.option,
    ];
    return (
      candidates
        .map((v) => (v ?? "").toString().trim())
        .find((v) => v.length > 0) || ""
    );
  }

  // ---------- load poll ----------
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

  const statusBadge = useMemo(
    () => (poll?.status ? String(poll.status) : "collecting"),
    [poll?.status]
  );

  async function verifyPin() {
    setErrorMsg("");
    setVerifying(true);
    try {
      const { data, error } = await supabase.rpc("collect_verify_pin", {
        _code: code,
        _pin: pin,
      });
      if (error) {
        console.error(error);
        setErrorMsg("Verification failed.");
        setVerified(false);
      } else {
        if (data === true) setVerified(true);
        else {
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
      const { error } = await supabase.rpc("collect_finalize_to_voting", {
        _code: code,
        _pin: pin,
      });
      if (error) {
        console.error(error);
        setErrorMsg(error.message || "Could not open voting.");
      } else {
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
    if (!error) setPoll(data);
    else console.error(error);
  }

  // ---------- Randomizer (collect_options) ----------
  async function runRandomizer() {
    if (!verified) return;
    setErrorMsg("");
    setRandWorking(true);
    setRandResults([]);

    try {
      let rows = [];
      let loadErr = null;

      // First try: keyed by code
      let { data, error } = await supabase
        .from("collect_options")
        .select(
          "label, text, option_text, choice, name, title, value, option, code, poll_id"
        )
        .eq("code", code);
      if (error) loadErr = error;
      else rows = Array.isArray(data) ? data : [];

      // Fallback: keyed by poll_id
      if (!loadErr && rows.length === 0 && poll?.id) {
        const { data: byPoll, error: byPollErr } = await supabase
          .from("collect_options")
          .select(
            "label, text, option_text, choice, name, title, value, option, code, poll_id"
          )
          .eq("poll_id", poll.id);
        if (byPollErr) loadErr = byPollErr;
        else rows = Array.isArray(byPoll) ? byPoll : [];
      }

      if (loadErr) {
        console.error(loadErr);
        setErrorMsg("Could not load options from collect_options.");
        return;
      }

      const labels = rows.map(extractLabel).filter(Boolean);
      if (labels.length === 0) {
        setErrorMsg("No options found in collect_options for this poll.");
        return;
      }

      const uniqueLabels = Array.from(new Set(labels));
      const seed = randSeed.trim() || undefined;
      const shuffled = seededShuffle(uniqueLabels, seed);
      const n = Math.max(1, Number(randCount) || 1);

      let results = [];
      if (randAllowDup) {
        const rng = seed ? mulberry32(hashString(seed)) : null;
        for (let i = 0; i < n; i++) {
          if (uniqueLabels.length === 0) break;
          const r = seed ? rng() : Math.random();
          const idx = Math.floor(r * uniqueLabels.length);
          results.push({ rank: i + 1, label: uniqueLabels[idx] });
        }
      } else {
        results = shuffled.slice(0, n).map((label, i) => ({
          rank: i + 1,
          label,
        }));
      }

      setRandResults(results);
    } catch (e) {
      console.error(e);
      setErrorMsg("Randomizer failed.");
    } finally {
      setRandWorking(false);
    }
  }

  function copyResults() {
    const txt = randResults.map((r) => `${r.rank}. ${r.label}`).join("\n");
    navigator.clipboard.writeText(txt).catch(() => {});
  }

  // ---------- Render ----------
  if (loading) {
    return (
      <div className="wrap">
        <div className="col">
          <section className="card section">
            <h1 className="hdr">Host Options</h1>
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
            <h1 className="hdr">Host Options</h1>
            <p className="help">We couldn’t find a collection with code {code}.</p>
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

  const pinValid = /^\d{4,}$/.test(pin.trim());

  return (
    <div className="wrap">
      <div className="col">
        <section className="card section">
          {/* Header */}
          <div className="head-row">
            <h1 className="hdr">Host Options — {poll.title || "Untitled"}</h1>
            <span className="badge">Code: {code}</span>
          </div>

          {/* Info */}
          <div className="info-grid">
            <div className="info">
              <div className="info-label">Status</div>
              <div className="info-value">{statusBadge}</div>
            </div>
            <div className="info">
              <div className="info-label">Max per user</div>
              <div className="info-value">{poll.max_per_user ?? "-"}</div>
            </div>
            <div className="info">
              <div className="info-label">Target participants</div>
              <div className="info-value">{poll.target_participants_hint ?? "-"}</div>
            </div>
          </div>

          {/* Verify / Actions */}
          {!verified ? (
            <div className="panel">
              <label className="label">Enter Host PIN</label>
              <label className={`field ${pin && !pinValid ? "invalid" : ""}`}>
                <input
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/[^\d]/g, ""))}
                  placeholder="4+ digits"
                  inputMode="numeric"
                  maxLength={12}
                />
              </label>

              <div className="stack">
                <button
                  className="btn btn-primary"
                  onClick={verifyPin}
                  disabled={verifying || !pinValid}
                >
                  {verifying ? "Verifying…" : "Verify"}
                </button>
                <button className="btn btn-outline" onClick={() => nav(`/collect/${code}`)}>
                  Back
                </button>
              </div>

              {errorMsg && <p className="error">{errorMsg}</p>}
            </div>
          ) : (
            <>
              <div className="panel">
                <p className="good">PIN verified ✔</p>

                <div className="stack">
                  <button
                    className="btn btn-primary"
                    onClick={openVoting}
                    disabled={acting || poll.status !== "collecting"}
                    title={poll.status !== "collecting" ? "Already finalized" : "Open voting"}
                  >
                    {acting ? "Working…" : "Open Voting"}
                  </button>
                  <button className="btn btn-outline" onClick={refresh}>
                    Refresh
                  </button>
                  <button className="btn btn-outline" onClick={() => nav(`/collect/${code}`)}>
                    Back to Landing
                  </button>
                </div>

                {errorMsg && <p className="error">{errorMsg}</p>}

                {poll.status === "voting" && (
                  <p className="note" style={{ marginTop: 10 }}>
                    Voting is open. Share the voting code with participants:
                    <span className="badge" style={{ marginLeft: 8 }}>Vote Code: {code}</span>
                  </p>
                )}
              </div>

              {/* Randomizer Panel */}
              <div className="panel" style={{ marginTop: 12 }}>
                <h3 className="hdr" style={{ fontSize: "1.1rem", marginBottom: 8 }}>
                  Randomizer (use collected choices)
                </h3>
                <p className="help" style={{ marginTop: 0 }}>
                  Generate N random winners from all collected options.
                </p>

                <div className="info-grid" style={{ marginTop: 10 }}>
                  <div className="info">
                    <div className="info-label">Number of winners</div>
                    <label className="field">
                      <input
                        inputMode="numeric"
                        value={randCount}
                        onChange={(e) =>
                          setRandCount(String(e.target.value).replace(/[^\d]/g, ""))
                        }
                        placeholder="1"
                      />
                    </label>
                  </div>

                  <div className="info">
                    <div className="info-label">Allow duplicates</div>
                    <label className="field" style={{ gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={randAllowDup}
                        onChange={(e) => setRandAllowDup(e.target.checked)}
                        style={{ width: 20, height: 20 }}
                      />
                      <span>Same option can win multiple times</span>
                    </label>
                  </div>

                  <div className="info">
                    <div className="info-label">Seed (optional)</div>
                    <label className="field">
                      <input
                        value={randSeed}
                        onChange={(e) => setRandSeed(e.target.value)}
                        placeholder="Word/number for repeatable results"
                      />
                    </label>
                  </div>
                </div>

                <div className="stack" style={{ marginTop: 12 }}>
                  <button className="btn btn-primary" onClick={runRandomizer} disabled={randWorking}>
                    {randWorking ? "Randomizing…" : "Run Randomizer"}
                  </button>

                  {randResults?.length > 0 && (
                    <>
                      <div className="note">
                        <strong style={{ display: "block", marginBottom: 6 }}>Results</strong>
                        <ol style={{ margin: 0, paddingLeft: 18 }}>
                          {randResults.map((r) => (
                            <li key={`${r.rank}-${r.label}`}>{r.label}</li>
                          ))}
                        </ol>
                      </div>
                      <button className="btn btn-outline" onClick={copyResults}>
                        Copy Results
                      </button>
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      <ThemeStyles />
    </div>
  );
}

/** Inline theme so this page matches even without global index.css */
function ThemeStyles() {
  return (
    <style>{`
:root{
  --bg:#0e1116;
  --panel:#1a1f27;
  --ink:#f5efe6;
  --muted:#bfc6d3;
  --accent:#ff8c00;
  --accent-2:#ffb25a;
  --container: min(520px, 92vw);
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

/* Header badges */
.head-row{ display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; }
.badge{
  padding:6px 12px; border-radius:999px;
  background: linear-gradient(180deg, rgba(255,140,0,.10), rgba(255,140,0,.06));
  border:1px solid rgba(255,140,0,.45);
  color:#ffb25a; letter-spacing:.06em; font-weight:700; font-size:.9rem;
  box-shadow: 0 2px 10px rgba(0,0,0,.35), 0 1px 0 rgba(255,255,255,.04) inset;
}

/* Info grid */
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

/* Panel for verify/actions */
.panel{
  margin-top: 8px; padding:14px; border-radius:14px;
  background: linear-gradient(180deg, rgba(255,255,255,.03), rgba(0,0,0,.12));
  border:1px solid rgba(255,140,0,.25);
  box-shadow: 0 0 14px rgba(255,140,0,.10) inset;
}

.label{ font-weight:700; margin: 4px 0; }

/* Field shell */
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
.field.invalid{ border-color:#c0392b; }
.field input{
  width:100%; background:transparent; border:none; outline:none;
  color:var(--ink); font-size:1.05rem; letter-spacing:.02em;
}

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

.note{
  margin:10px 0 0; padding:10px; border-radius:12px;
  background: linear-gradient(180deg, rgba(255,255,255,.03), rgba(0,0,0,.10));
  border:1px solid rgba(255,140,0,.22);
}
.error{ color:#ff6b6b; font-size:.95rem; margin-top:8px; }
.good{ color:#ffdda8; font-weight:800; text-shadow:0 0 8px rgba(255,140,0,.5) }

@media (max-width:600px){ .card{padding:18px} }
    `}</style>
  );
}

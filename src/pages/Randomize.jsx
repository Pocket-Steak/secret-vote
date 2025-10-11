// src/pages/Randomize.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";

/* ---------- keep your working data parts ---------- */
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
const rand = (a, b) => Math.random() * (b - a) + a;
const lerp = (a, b, t) => a + (b - a) * t;
function easeOutBack(t) {
  const c1 = 1.10158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

export default function Randomize() {
  const { code: raw } = useParams();
  const code = (raw || "").toUpperCase();
  const nav = useNavigate();

  const [poll, setPoll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // phases: waiting → counting → spinning → revealed
  const [phase, setPhase] = useState("waiting");
  const [countNum, setCountNum] = useState(null);

  const [winner, setWinner] = useState(null);
  const [losers, setLosers] = useState([]);
  const losersStagger = losers.map((_, i) => 40 * i);

  // ticker refs
  const windowRef = useRef(null);
  const railRef = useRef(null);
  const animRef = useRef(0);

  // confetti
  const confettiRef = useRef(null);
  const confettiRaf = useRef(0);
  const [replayBump, setReplayBump] = useState(0);

  const N = poll?.options?.length ?? 0;

  /* ---------- load from polls (your original) ---------- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const { data, error } = await supabase
          .from("polls")
          .select("*")
          .eq("code", code)
          .maybeSingle();

        if (error) throw error;
        const deduped = dedupeOptions(data?.options || []);
        if (!cancelled) setPoll({ ...data, options: deduped });
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setErr(e?.message || "Could not load poll.");
          setPoll(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      cancelAnimationFrame(animRef.current);
      cancelAnimationFrame(confettiRaf.current);
    };
  }, [code]);

  const status = useMemo(() => {
    if (!poll) return "missing";
    const now = Date.now();
    const closes = poll?.closes_at ? new Date(poll.closes_at).getTime() : Infinity;
    const expires = poll?.expires_at ? new Date(poll.expires_at).getTime() : Infinity;
    if (now >= expires) return "expired";
    if (now >= closes) return "closed";
    return "open";
  }, [poll]);

  /* ---------- countdown → then request spin ---------- */
  const startCountdown = async () => {
    if (!N) return;
    setWinner(null);
    setLosers([]);
    setPhase("counting");
    setCountNum(3);
    await new Promise((r) => setTimeout(r, 750));
    setCountNum(2);
    await new Promise((r) => setTimeout(r, 750));
    setCountNum(1);
    await new Promise((r) => setTimeout(r, 750));
    setCountNum(null);
    // switch to spinning; actual spin starts once DOM is mounted (see useEffect below)
    setPhase("spinning");
  };

  /* ---------- start spin AFTER spinner DOM is mounted ---------- */
  useEffect(() => {
    if (phase !== "spinning") return;

    // allow one frame so the ticker-window & rail mount
    const id = requestAnimationFrame(() => {
      safeStartSpin();
    });
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  function safeStartSpin() {
    try {
      startSpin();
    } catch (e) {
      console.error(e);
      // fail safe: go back to waiting UI instead of blank screen
      setPhase("waiting");
    }
  }

  function startSpin() {
    const winEl = windowRef.current;
    const rail = railRef.current;
    if (!winEl || !rail || !N || !poll?.options?.length) {
      // if not ready yet, try again very soon
      setTimeout(() => {
        if (phase === "spinning") safeStartSpin();
      }, 50);
      return;
    }

    // pick a winner index among deduped options
    const winIdx = Math.floor(Math.random() * N);
    const chosen = poll.options[winIdx];

    // build strip: a few randoms → chosen → a few extras for visual balance
    const previewCount = Math.max(6, Math.min(14, Math.floor(rand(8, 12))));
    const preview = Array.from({ length: previewCount }, () => {
      const i = Math.floor(Math.random() * N);
      return poll.options[i];
    });
    const strip = [...preview, chosen, ...poll.options.slice(0, Math.min(8, N))];

    rail.innerHTML = "";
    for (const txt of strip) {
      const el = document.createElement("div");
      el.className = "tk-item";
      el.textContent = txt;
      rail.appendChild(el);
    }

    // measure and compute distance to center chosen
    const winRect = winEl.getBoundingClientRect();
    const items = Array.from(rail.querySelectorAll(".tk-item"));
    const target = items[preview.length];
    if (!target) {
      // rare race; try again
      setTimeout(() => {
        if (phase === "spinning") safeStartSpin();
      }, 50);
      return;
    }

    const tRect = target.getBoundingClientRect();
    const tMid = tRect.left + tRect.width / 2;
    const winMid = winRect.left + winRect.width / 2;

    const overshoot = 0.12 * winRect.width;
    const baseDistance = tMid - winMid;
    const totalDistance = baseDistance + overshoot;

    // animate to overshoot, then ease back
    const duration = rand(2700, 3600);
    const settleMs = 450;
    const startX = 0;
    const targetX = -totalDistance;
    const t0 = performance.now();

    cancelAnimationFrame(animRef.current);
    const step = (ts) => {
      const p = Math.min(1, (ts - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const x = lerp(startX, targetX, eased);
      rail.style.transform = `translate3d(${x}px,0,0)`;

      if (p < 1) {
        animRef.current = requestAnimationFrame(step);
      } else {
        // bounce back
        const finalTarget = x + overshoot;
        const t1 = performance.now();
        const back = () => {
          const pp = Math.min(1, (performance.now() - t1) / settleMs);
          const out = easeOutBack(1 - pp);
          const nx = finalTarget + (0 - finalTarget) * out;
          rail.style.transform = `translate3d(${nx}px,0,0)`;
          if (pp < 1) requestAnimationFrame(back);
          else {
            const L = poll.options.slice();
            L.splice(winIdx, 1);
            setWinner(chosen);
            setLosers(shuffle(L));
            setPhase("revealed");
            fireConfetti();
          }
        };
        requestAnimationFrame(back);
      }
    };
    animRef.current = requestAnimationFrame(step);
  }

  function shuffle(a) {
    const arr = a.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /* ---------- confetti around winner box ---------- */
  function fireConfetti() {
    const c = confettiRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;

    const rect = c.getBoundingClientRect();
    const box = document.querySelector(".winner-box");
    if (!box) return;
    const b = box.getBoundingClientRect();
    const cx = (b.left + b.right) / 2 - rect.left;
    const cy = (b.top + b.bottom) / 2 - rect.top;

    const parts = [];
    const colors = ["#ff8c00", "#ffd28a", "#7ad3ff", "#c58cff", "#7affb6", "#ff7a7a"];
    const count = 90 + Math.floor(Math.random() * 35) + replayBump;

    for (let i = 0; i < count; i++) {
      parts.push({
        x: cx + rand(-10, 10),
        y: cy + rand(-6, 6),
        vx: rand(-3, 3),
        vy: rand(-5.5, -2),
        g: rand(0.05, 0.12),
        s: rand(2, 5),
        col: colors[i % colors.length],
        rot: rand(0, Math.PI * 2),
        vr: rand(-0.2, 0.2),
      });
    }

    const start = performance.now();
    cancelAnimationFrame(confettiRaf.current);

    const step = () => {
      const t = performance.now() - start;
      ctx.clearRect(0, 0, c.width, c.height);
      for (const p of parts) {
        p.vy += p.g;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.col;
        ctx.fillRect(-p.s, -p.s, p.s * 2, p.s * 2);
        ctx.restore();
      }
      if (t < 1600) confettiRaf.current = requestAnimationFrame(step);
    };
    confettiRaf.current = requestAnimationFrame(step);
  }

  /* ---------- size confetti canvas ---------- */
  useEffect(() => {
    const onResize = () => {
      const cvs = confettiRef.current;
      if (!cvs) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = cvs.clientWidth || 0;
      const h = cvs.clientHeight || 0;
      const ctx = cvs.getContext("2d");
      if (!ctx) return;
      cvs.width = Math.floor(w * dpr);
      cvs.height = Math.floor(h * dpr);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  /* -------------------- UI -------------------- */
  if (loading) {
    return (
      <Shell title={`Randomizer — ${code}`}>
        <p className="help">Loading…</p>
      </Shell>
    );
  }
  if (!poll) {
    return (
      <Shell title={`Randomizer — ${code}`}>
        <p className="help">We couldn’t find this poll.</p>
        {err && <p className="error">{err}</p>}
        <div className="stack" style={{ marginTop: 8 }}>
          <button className="btn btn-outline" onClick={() => nav("/")}>Home</button>
        </div>
      </Shell>
    );
  }
  if (status === "expired") {
    return (
      <Shell title={poll.title || `Room ${code}`}>
        <p className="help">This poll is expired. You can still run the randomizer.</p>
        <div className="stack" style={{ marginTop: 8 }}>
          <button className="btn btn-primary" onClick={startCountdown} disabled={!N}>
            Start Randomizer
          </button>
          <button className="btn btn-outline" onClick={() => nav("/")}>Home</button>
        </div>
      </Shell>
    );
  }

  return (
    <div className="wrap">
      <div className="col">
        <section className="card section">
          <div className="head-row">
            <h1 className="hdr">Randomizer — {poll.title || `Room ${code}`}</h1>
            <span className="badge">Code: {code}</span>
          </div>
          <p className="help" style={{ marginTop: -6 }}>
            Using the same options the voting page sees. Options available: <strong>{N}</strong>
          </p>

          {/* waiting */}
          {phase === "waiting" && (
            <div className="wait-wrap">
              <DinoHerd />
              <p className="waiting-text">Waiting to start…</p>
              <div className="stack" style={{ marginTop: 10 }}>
                <button className="btn btn-primary" onClick={startCountdown} disabled={!N}>
                  Start Randomizer
                </button>
                <button className="btn btn-outline" onClick={() => nav(`/room/${code}`)}>
                  Back to Room
                </button>
              </div>
            </div>
          )}

          {/* countdown overlay */}
          {phase === "counting" && (
            <div className="count-overlay">
              {countNum !== null && <div className="count-num">{countNum}</div>}
            </div>
          )}

          {(phase === "spinning" || phase === "revealed") && (
            <div className="ticker-area">
              <div className="confetti-layer">
                <canvas ref={confettiRef} className="confetti-canvas" />
              </div>

              <div className="ticker-window" ref={windowRef}>
                <div className="ticker-rail" ref={railRef} />
                <div className="ticker-highlight" />
              </div>

              {phase === "revealed" && winner && (
                <div className="result-wrap">
                  <div className="winner-box glow">
                    <div className="winner-title">{poll.title || "Winner"}</div>
                    <div className="winner-value">{winner}</div>
                    <div className="mini-dino">🦖</div>
                  </div>

                  <div className="actions">
                    <button
                      className="btn btn-primary"
                      onClick={() => {
                        setReplayBump((x) => x + 1);
                        fireConfetti();
                      }}
                    >
                      Replay Celebration
                    </button>
                    <button
                      className="btn btn-outline"
                      onClick={() =>
                        navigator.clipboard
                          .writeText(`${poll.title || "Winner"} → ${winner} 🎉🦖`)
                          .catch(() => {})
                      }
                    >
                      Copy Result
                    </button>
                    <button className="btn btn-outline" onClick={() => nav("/")}>
                      Go Home
                    </button>
                  </div>

                  {losers.length > 0 && (
                    <div className="losers">
                      <div className="losers-hdr">Losers</div>
                      <ul className="losers-list">
                        {losers.map((l, i) => (
                          <li key={`${i}-${l}`} style={{ animationDelay: `${losersStagger[i]}ms` }}>
                            <span className="x">✖</span>
                            <span className="text">{l}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </section>
      </div>
      <ThemeStyles />
    </div>
  );
}

/* ---------- small reusable shell ---------- */
function Shell({ title, children }) {
  return (
    <div className="wrap">
      <div className="col">
        <section className="card section">
          <h1 className="hdr">{title}</h1>
          {children}
        </section>
      </div>
      <ThemeStyles />
    </div>
  );
}

/* ---------- dino herd ---------- */
function DinoHerd() {
  const herdRef = useRef(null);
  useEffect(() => {
    const herd = herdRef.current;
    if (!herd) return;
    herd.innerHTML = "";
    const EMOJIS = ["🦖", "🦕", "🦖", "🦕", "🦖"];
    const LANES = [8, 16, 24, 32, 40];
    const COUNT = 7;
    const r = (a, b) => Math.random() * (b - a) + a;

    for (let i = 0; i < COUNT; i++) {
      const d = document.createElement("div");
      d.className = "dino";
      d.textContent = EMOJIS[i % EMOJIS.length];
      const lane = LANES[i % LANES.length] + (Math.random() < 0.5 ? 0 : 6);
      d.style.bottom = lane + "px";
      d.style.fontSize = r(28, 42) + "px";
      d.style.animationDuration = r(5.2, 8.6) + "s";
      d.style.animationDelay = -r(0, 8.6) + "s";
      herd.appendChild(d);
    }
  }, []);
  return (
    <div className="dino-herd-wrap">
      <div className="dino-herd" ref={herdRef} />
      <div className="dino-ground" />
    </div>
  );
}

/* ---------- styles ---------- */
function ThemeStyles() {
  const CSS = String.raw`
:root{
  --bg:#0e1116; --panel:#1a1f27; --ink:#f5efe6; --muted:#bfc6d3;
  --accent:#ff8c00; --accent-2:#ffb25a; --container: min(980px, 96vw);
}
*{box-sizing:border-box} html,body,#root{min-height:100%} body{margin:0;background:var(--bg);color:var(--ink)}
.wrap{
  min-height:100vh; display:flex; flex-direction:column; align-items:center; gap:12px;
  padding:max(16px,env(safe-area-inset-top)) 18px max(16px,env(safe-area-inset-bottom));
  background:
    radial-gradient(1200px 600px at 50% -10%, rgba(255,140,0,.08), transparent 60%),
    radial-gradient(800px 400px at 100% 0%, rgba(255,140,0,.05), transparent 60%),
    var(--bg);
}
.col{display:flex; flex-direction:column; align-items:center; gap:16px; width:var(--container)}
.card{
  width:100%; background:linear-gradient(180deg,rgba(255,255,255,.03),rgba(0,0,0,.08)),var(--panel);
  border:1px solid rgba(255,255,255,.06); border-radius:16px; padding:24px;
  box-shadow:0 1px 0 rgba(255,255,255,.06) inset, 0 10px 24px rgba(0,0,0,.35), 0 2px 6px rgba(0,0,0,.25);
}
.hdr{font-size:1.35rem;font-weight:800;margin:0 0 10px}
.help{color:var(--muted);font-size:.96rem;margin:.2rem 0 0}
.section{margin:4px 0 6px}
.head-row{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
.badge{padding:6px 12px;border-radius:999px;background:linear-gradient(180deg,rgba(255,140,0,.10),rgba(255,140,0,.06));border:1px solid rgba(255,140,0,.45);color:#ffb25a;font-weight:700;font-size:.9rem}
.stack{display:flex;flex-direction:column;gap:12px}
.btn{appearance:none;border:none;cursor:pointer;font-weight:800;border-radius:14px;padding:14px 18px;width:100%}
.btn[disabled]{opacity:.7;cursor:not-allowed}
.btn-primary{color:#1a1005;background:linear-gradient(180deg,var(--accent-2),var(--accent));box-shadow:0 10px 18px rgba(255,140,0,.28), 0 2px 0 rgba(255,140,0,.9) inset, 0 1px 0 rgba(255,255,255,.35) inset}
.btn-outline{color:var(--accent-2);background:linear-gradient(180deg,rgba(255,140,0,.08),rgba(255,140,0,.04));border:1px solid rgba(255,140,0,.45);box-shadow:0 6px 14px rgba(0,0,0,.35), 0 1px 0 rgba(255,255,255,.04) inset}
.error{ color:#ff6b6b; font-size:.95rem; margin-top:8px }

/* waiting dino herd */
.dino-herd-wrap{position:relative;height:80px;overflow:hidden;margin:12px 0;filter:drop-shadow(0 6px 10px rgba(0,0,0,.35))}
.dino-ground{position:absolute;left:0;right:0;bottom:4px;height:3px;background:repeating-linear-gradient(90deg,#555 0 16px,transparent 16px 28px);opacity:.6;animation:ground 1.2s linear infinite}
@keyframes ground{to{transform:translateX(-28px)}}
.dino-herd{position:absolute;inset:0}
.dino{position:absolute;bottom:10px;font-size:34px;line-height:1;transform:translateX(105vw);animation:runAcross linear infinite;will-change:transform}
@keyframes runAcross{0%{transform:translateX(105vw)}50%{transform:translateX(50vw)}100%{transform:translateX(-140px)}}
.waiting-text{text-align:center;color:var(--muted);margin:6px 0 0;font-size:1rem}

/* countdown */
.count-overlay{position:fixed;inset:0;background:rgba(4,6,10,.65);display:grid;place-items:center;z-index:50;backdrop-filter:blur(2px)}
.count-num{font-size:min(24vw,170px);font-weight:900;text-shadow:0 6px 26px rgba(0,0,0,.55), 0 0 30px rgba(255,140,0,.45);color:#ffe0b3;animation:pop .75s ease forwards}
@keyframes pop{0%{transform:scale(.6);opacity:.2}80%{transform:scale(1.05);opacity:1}100%{transform:scale(1)}}

/* ticker */
.ticker-area{position:relative;margin-top:10px}
.ticker-window{position:relative;border-radius:14px;border:1px solid rgba(255,255,255,.08);background:linear-gradient(180deg,rgba(255,255,255,.03),rgba(0,0,0,.12));overflow:hidden;height:84px}
.ticker-rail{display:flex;gap:12px;align-items:center;padding:0 18px;will-change:transform}
.tk-item{flex:0 0 auto;padding:12px 16px;border-radius:12px;font-weight:800;background:#131a2a;color:var(--ink);border:1px solid #2b3246;min-width:120px;text-align:center}
.ticker-highlight{position:absolute;top:8px;bottom:8px;left:50%;width:48%;transform:translateX(-50%);border:2px solid rgba(255,140,0,.7);border-radius:12px;pointer-events:none;box-shadow:0 0 24px rgba(255,140,0,.25) inset}

/* results */
.result-wrap{margin-top:14px;display:flex;flex-direction:column;gap:12px}
.winner-box{position:relative;padding:16px;border-radius:14px;background:linear-gradient(180deg,rgba(255,255,255,.03),rgba(0,0,0,.14));border:1px solid rgba(255,140,0,.45)}
.winner-title{color:#ffdda8;font-weight:800}
.winner-value{font-size:1.6rem;font-weight:900}
.mini-dino{font-size:44px;align-self:center;filter:drop-shadow(0 8px 10px rgba(0,0,0,.4))}
.glow{animation:glowPulse 2200ms ease-out 1}
@keyframes glowPulse{0%{box-shadow:0 0 0 0 rgba(255,140,0,.0)}40%{box-shadow:0 0 22px 6px rgba(255,140,0,.35)}100%{box-shadow:0 0 0 0 rgba(255,140,0,.0)}}
.actions{display:flex;gap:12px;flex-wrap:wrap}
.losers{margin-top:6px}
.losers-hdr{font-weight:800;color:var(--muted);margin-bottom:6px}
.losers-list{list-style:none;padding:0;margin:0;display:grid;gap:6px}
.losers-list li{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:12px;background:#111728;border:1px solid #263149;color:#aeb7c7;opacity:0;transform:translateY(6px);animation:loserIn .36s ease forwards}
@keyframes loserIn{to{opacity:1;transform:translateY(0)}}
.losers-list .text{text-decoration:line-through}

/* confetti canvas */
.confetti-layer{position:absolute;inset:0;pointer-events:none}
.confetti-canvas{position:absolute;inset:auto 0 0 0;height:160px;width:100%}

@media (max-width:680px){ .ticker-highlight{ width:64% } }
`;
  return <style>{CSS}</style>;
}

// src/pages/Home.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

// ✅ Let Vite resolve the real URL at build time
import logoUrl from "../assets/TheSecretVote.png";

export default function Home() {
  const nav = useNavigate();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  function goCreate() {
    nav("/create");
  }
  function goCreateCollect() {
    nav("/create-collect");
  }

  // 1) collect_polls -> /collect/:code
  // 2) polls -> /vote/:code
  async function goToRoom(e) {
    e.preventDefault();
    const c = code.trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(c)) {
      alert("Enter a 6-character code (letters/numbers).");
      return;
    }

    setLoading(true);
    try {
      const { data: collect, error: ce } = await supabase
        .from("collect_polls")
        .select("code")
        .eq("code", c)
        .maybeSingle();
      if (ce) console.error("collect lookup error", ce);
      if (collect) {
        nav(`/collect/${c}`);
        return;
      }

      const { data: poll, error: pe } = await supabase
        .from("polls")
        .select("code")
        .eq("code", c)
        .maybeSingle();
      if (pe) console.error("poll lookup error", pe);
      if (poll) {
        nav(`/vote/${c}`);
        return;
      }

      alert(`We couldn’t find a room with code “${c}”.`);
    } catch (err) {
      console.error(err);
      alert("Unexpected error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="wrap">
      {/* Title image */}
      <img
        src={logoUrl}
        alt="The Secret Vote"
        className="logo"
        loading="eager"
      />

      {/* STACKED: Code Entry (top) → Create Poll → Create Group Idea */}
      <div className="col">
        {/* 1) Join with code */}
        <section className="card section" aria-label="Join with a code">
          <h3 className="hdr">Have a code? Jump in:</h3>

          <form onSubmit={goToRoom} className="stack">
            <label className="field" htmlFor="room-code">
              <input
                id="room-code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="ENTER 6-CHAR CODE"
                maxLength={6}
                aria-label="Enter 6-character room code"
                inputMode="text"
                autoCapitalize="characters"
                autoCorrect="off"
              />
            </label>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Checking…" : "Go"}
            </button>
            <p className="help">Codes work for both collection and voting rooms.</p>
          </form>
        </section>

        {/* 2) Create a Poll */}
        <section className="card section">
          <h3 className="hdr">Create a Poll</h3>
          <p className="help">
            Make a quick, secret vote. Share the code, everyone joins and votes.
          </p>
          <div className="stack">
            <button className="btn btn-primary" onClick={goCreate}>
              Create a Poll
            </button>
          </div>
        </section>

        {/* 3) Create a Group Idea Poll */}
        <section className="card section">
          <h3 className="hdr">Create a Group Idea Poll</h3>
          <p className="help">
            Collect options from the group first, then open voting when ready.
          </p>
          <div className="stack">
            <button className="btn btn-outline" onClick={goCreateCollect}>
              Create a Group Idea Poll
            </button>
          </div>
        </section>
      </div>

      <p className="footer-tip">Tip: Share your code anywhere—QR, text, or link.</p>

      {/* Theme styles (local to this page for now) */}
      <style>{`
:root{
  --bg:#0e1116;
  --panel:#1a1f27;
  --ink:#f5efe6;
  --muted:#bfc6d3;
  --accent:#ff8c00;
  --accent-2:#ffb25a;
}

*{box-sizing:border-box}
html,body,#root,.wrap{height:100%}
body{margin:0}

.wrap{
  min-height:100vh;
  display:flex;
  flex-direction:column;
  align-items:center;
  gap:12px;
  padding: max(16px, env(safe-area-inset-top)) 18px max(16px, env(safe-area-inset-bottom));
  background:
    radial-gradient(1200px 600px at 50% -10%, rgba(255,140,0,.08), transparent 60%),
    radial-gradient(800px 400px at 100% 0%, rgba(255,140,0,.05), transparent 60%),
    var(--bg);
  color:var(--ink);
}

.logo{
  width: min(360px, 86vw);
  height: auto;
  display:block;
  border-radius:14px;
  box-shadow: 0 0 12px rgba(255,140,0,.3);
  margin: 0 0 12px;
  filter: drop-shadow(0 0 8px rgba(255,140,0,.28));
}

.col{
  display:flex;
  flex-direction:column;
  align-items:center;
  gap: 16px;
  width: min(520px, 92vw);
}

.card{
  width:100%;
  background: linear-gradient(180deg, rgba(255,255,255,.03), rgba(0,0,0,.08)), var(--panel);
  border:1px solid rgba(255,255,255,.06);
  border-radius:16px;
  padding:24px;
  box-shadow:
    0 1px 0 rgba(255,255,255,.06) inset,
    0 10px 24px rgba(0,0,0,.35),
    0 2px 6px rgba(0,0,0,.25);
  transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease;
}
.card:hover{
  transform: translateY(-2px);
  box-shadow:
    0 1px 0 rgba(255,255,255,.08) inset,
    0 14px 32px rgba(0,0,0,.45),
    0 3px 10px rgba(0,0,0,.3);
  border-color: rgba(255,140,0,.25);
}

.hdr{font-size:1.35rem;font-weight:800;letter-spacing:.2px;margin:0 0 10px;text-shadow:0 1px 0 rgba(0,0,0,.5)}
.help{color:var(--muted);font-size:.95rem;margin:.25rem 0 0}

.field{
  display:flex; align-items:center; gap:10px;
  background: linear-gradient(180deg, rgba(255,255,255,.03), rgba(0,0,0,.15));
  border:1px solid rgba(255,255,255,.08);
  border-radius:14px;
  padding:14px 16px;
  box-shadow: inset 0 2px 6px rgba(0,0,0,.35);
}
.field input{
  width:100%;
  font-size:1.05rem;
  background:transparent; border:none; outline:none;
  color:var(--ink);
  letter-spacing:.12em;
  text-transform: uppercase;
  text-align:center;
}
.field:focus-within{
  border-color: rgba(255,140,0,.45);
  box-shadow:
    inset 0 2px 6px rgba(0,0,0,.35),
    0 0 0 3px rgba(255,140,0,.18);
}

.stack{display:flex;flex-direction:column;gap:16px}
.section{margin:4px 0 6px}

.btn{
  appearance:none; border:none; cursor:pointer; font-weight:800;
  border-radius:14px; padding:14px 18px; width:100%;
  transition: transform .08s ease, box-shadow .12s ease, filter .12s ease, opacity .12s ease;
}
.btn[disabled]{opacity:.7; cursor:not-allowed}
.btn-primary{
  color:#1a1005;
  background: linear-gradient(180deg, var(--accent-2), var(--accent));
  box-shadow:
    0 10px 18px rgba(255,140,0,.28),
    0 2px 0 rgba(255,140,0,.9) inset,
    0 1px 0 rgba(255,255,255,.35) inset;
}
.btn-primary:hover{ filter:brightness(1.05) }
.btn-primary:active{
  transform: translateY(1px);
  box-shadow:
    0 6px 12px rgba(255,140,0,.24),
    0 1px 0 rgba(140,70,0,.9) inset,
    0 0 0 rgba(255,255,255,0) inset;
}

.btn-outline{
  color:var(--accent-2);
  background: linear-gradient(180deg, rgba(255,140,0,.08), rgba(255,140,0,.04));
  border:1px solid rgba(255,140,0,.45);
  box-shadow:
    0 6px 14px rgba(0,0,0,.35),
    0 1px 0 rgba(255,255,255,.04) inset;
}
.btn-outline:hover{
  background: linear-gradient(180deg, rgba(255,140,0,.14), rgba(255,140,0,.06));
}

.footer-tip{opacity:.75; font-size:.9rem; margin-top:10px}

@media (max-width:600px){
  .wrap{padding:22px 14px 60px}
  .card{padding:18px}
}
      `}</style>
    </div>
  );
}

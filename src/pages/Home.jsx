// src/pages/Home.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

// Import so Vite rewrites the correct URL for GitHub Pages
import logoUrl from "../assets/TheSecretVote.png";

export default function Home() {
  const nav = useNavigate();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const goCreate = () => nav("/create");
  const goCreateCollect = () => nav("/create-collect");

  // 1) collect_polls -> /collect/:code
  // 2) polls         -> /vote/:code
  async function goToRoom(e) {
    e.preventDefault();
    const c = code.replace(/[^a-z0-9]/gi, "").toUpperCase();
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
      if (collect) return nav(`/collect/${c}`);

      const { data: poll, error: pe } = await supabase
        .from("polls")
        .select("code")
        .eq("code", c)
        .maybeSingle();
      if (pe) console.error("poll lookup error", pe);
      if (poll) return nav(`/vote/${c}`);

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
      {/* Logo card */}
      <div className="card logo-card">
        <img src={logoUrl} alt="The Secret Vote" className="logo-img" loading="eager" />
        <div className="logo-shine" aria-hidden="true" />
      </div>

      <div className="col">
        {/* Join by code */}
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

        {/* Create a Poll */}
        <section className="card section">
          <h3 className="hdr">Create a Poll</h3>
          <p className="help">
            Make a quick, secret vote. Share the code, everyone joins and votes.
          </p>
          <div className="stack">
            <button className="btn btn-primary" onClick={goCreate} disabled={loading}>
              Create a Poll
            </button>
          </div>
        </section>

        {/* Create a Group Idea Poll */}
        <section className="card section">
          <h3 className="hdr">Create a Group Idea Poll</h3>
          <p className="help">
            Collect options from the group first, then open voting when ready.
          </p>
          <div className="stack">
            <button className="btn btn-outline" onClick={goCreateCollect} disabled={loading}>
              Create a Group Idea Poll
            </button>
          </div>
        </section>
      </div>

      <p className="footer-tip">Tip: Share your code anywhere—QR, text, or link.</p>

      {/* Page styles */}
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
body{margin:0;background:var(--bg);}
.wrap{
  min-height:100vh;min-height:100svh;min-height:100dvh;
  display:flex;flex-direction:column;align-items:center;gap:12px;
  padding:max(16px,env(safe-area-inset-top)) 18px max(16px,env(safe-area-inset-bottom));
  background:
    radial-gradient(1200px 600px at 50% -10%, rgba(255,140,0,.08), transparent 60%),
    radial-gradient(800px 400px at 100% 0%, rgba(255,140,0,.05), transparent 60%),
    var(--bg);
  color:var(--ink);
}
.col{display:flex;flex-direction:column;align-items:center;gap:16px;width:var(--container);}
.card{
  width:100%;
  background:linear-gradient(180deg, rgba(255,255,255,.03), rgba(0,0,0,.08)), var(--panel);
  border:1px solid rgba(255,255,255,.06);
  border-radius:16px;padding:24px;
  box-shadow:0 1px 0 rgba(255,255,255,.06) inset, 0 10px 24px rgba(0,0,0,.35), 0 2px 6px rgba(0,0,0,.25);
  transition:transform .18s ease, box-shadow .18s ease, border-color .18s ease;
}
.card:hover{
  transform:translateY(-2px);
  box-shadow:0 1px 0 rgba(255,255,255,.08) inset, 0 14px 32px rgba(0,0,0,.45), 0 3px 10px rgba(0,0,0,.3);
  border-color:rgba(255,140,0,.25);
}
.card.logo-card{
  width:var(--container);padding:16px;position:relative;overflow:hidden;
  background:linear-gradient(180deg, rgba(255,255,255,.04), rgba(0,0,0,.16)), var(--panel);
  box-shadow:0 1px 0 rgba(255,255,255,.06) inset, 0 22px 40px rgba(0,0,0,.55), 0 0 64px rgba(255,140,0,.10);
}
.card.logo-card::before{
  content:"";position:absolute;inset:0;border-radius:inherit;padding:1px;
  background:linear-gradient(135deg, rgba(255,140,0,.65), rgba(255,255,255,.12) 35%, rgba(255,140,0,0) 65%);
  -webkit-mask:linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite:xor; mask-composite:exclude; pointer-events:none;
}
.card.logo-card::after{
  content:"";position:absolute;inset:-30px -30px auto -30px;height:60%;
  border-radius:inherit;background:radial-gradient(70% 55% at 50% 0%, rgba(255,140,0,.10), transparent 70%);
  pointer-events:none;
}
.logo-img{display:block;width:100%;height:auto;border-radius:12px;background:#0c0f16;position:relative;z-index:1;}
.logo-shine{
  position:absolute;inset:0;border-radius:inherit;
  background:linear-gradient(115deg, transparent 0%, rgba(255,255,255,.08) 30%, rgba(255,255,255,.02) 45%, transparent 65%);
  transform:translateX(-120%);animation:sheen 3.8s ease-in-out infinite;pointer-events:none;
}
@keyframes sheen{0%{transform:translateX(-120%)}60%,100%{transform:translateX(120%)}}
.hdr{font-size:1.35rem;font-weight:800;letter-spacing:.2px;margin:0 0 10px;text-shadow:0 1px 0 rgba(0,0,0,.5)}
.help{color:var(--muted);font-size:.95rem;margin:.25rem 0 0}
.field{
  display:flex;align-items:center;gap:10px;
  background:linear-gradient(180deg, rgba(255,255,255,.03), rgba(0,0,0,.15));
  border:1px solid rgba(255,255,255,.08);
  border-radius:14px;padding:14px 16px;box-shadow:inset 0 2px 6px rgba(0,0,0,.35);
}
.field input{
  width:100%;font-size:1.05rem;background:transparent;border:none;outline:none;
  color:var(--ink);letter-spacing:.12em;text-transform:uppercase;text-align:center;
}
.field:focus-within{
  border-color:rgba(255,140,0,.45);
  box-shadow:inset 0 2px 6px rgba(0,0,0,.35), 0 0 0 3px rgba(255,140,0,.18);
}
.stack{display:flex;flex-direction:column;gap:16px}
.section{margin:4px 0 6px}
.btn{
  appearance:none;border:none;cursor:pointer;font-weight:800;border-radius:14px;
  padding:14px 18px;width:100%;
  transition:transform .08s ease, box-shadow .12s ease, filter .12s ease, opacity .12s ease;
}
.btn[disabled]{opacity:.7;cursor:not-allowed}
.btn-primary,.btn-outline{
  background:var(--accent);color:#1a1005;border:1px solid var(--accent);
  box-shadow:0 10px 18px rgba(255,140,0,.30);
}
.btn-primary:hover,.btn-outline:hover{filter:brightness(1.04);box-shadow:0 12px 22px rgba(255,140,0,.38)}
.btn-primary:active,.btn-outline:active{transform:translateY(1px);box-shadow:0 8px 14px rgba(255,140,0,.28)}
.footer-tip{opacity:.75;font-size:.9rem;margin-top:22px}
@media (max-width:600px){.wrap{padding:22px 14px 60px}.card{padding:18px}}
      `}</style>
    </div>
  );
}

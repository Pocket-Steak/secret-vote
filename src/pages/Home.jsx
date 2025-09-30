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
    </div>
  );
}

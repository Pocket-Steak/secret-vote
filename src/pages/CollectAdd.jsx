// src/pages/CollectAdd.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { addOptionsByCode } from "../lib/collect";

/** Stable per-browser token stored in localStorage (for debug only) */
function getClientToken() {
  const KEY = "client_token";
  let t = localStorage.getItem(KEY);
  if (!t) {
    t = Math.random().toString(36).slice(2, 9);
    localStorage.setItem(KEY, t);
  }
  return t;
}

export default function CollectAdd() {
  const nav = useNavigate();
  const { code: raw } = useParams();
  const code = (raw || "").toUpperCase();

  const [poll, setPoll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [values, setValues] = useState([]);

  // Load poll by code (for title + max_per_user)
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
          const n = Math.min(Math.max(Number(data?.max_per_user) || 3, 1), 10);
          setValues(Array(n).fill(""));
        }
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code]);

  // inputs sized to max_per_user (capped 1..10)
  const N = useMemo(
    () => Math.min(Math.max(Number(poll?.max_per_user) || 3, 1), 10),
    [poll?.max_per_user]
  );

  function setAt(i, val) {
    setValues((arr) => {
      const next = [...arr];
      next[i] = val;
      return next;
    });
  }

  async function submit() {
    if (!poll) return;

    // clean & dedupe (case-insensitive)
    const cleaned = values.map((s) => (s || "").trim()).filter(Boolean);
    const seen = new Set();
    const unique = [];
    for (const t of cleaned) {
      const k = t.toLowerCase();
      if (!seen.has(k)) {
        seen.add(k);
        unique.push(t);
      }
    }
    if (unique.length === 0) {
      alert("Please enter at least one option.");
      return;
    }

    setSubmitting(true);
    try {
      await addOptionsByCode(code, unique);
      nav(`/collect/${code}`, { state: { added: unique.length } });
    } catch (err) {
      console.error(err);
      alert(`Could not add option(s).\n\n${err?.message || "Unknown error"}`);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="wrap">
        <div className="col">
          <section className="card section">
            <h1 className="hdr">Room {code}</h1>
            <p className="help">Loading…</p>
          </section>
        </div>
      </div>
    );
  }

  if (!poll) {
    return (
      <div className="wrap">
        <div className="col">
          <section className="card section">
            <h1 className="hdr">Room {code}</h1>
            <p className="help">
              We couldn’t find this collection room. Double-check the code.
            </p>
            <div className="stack">
              <button className="btn btn-outline" onClick={() => nav("/")}>
                Home
              </button>
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="wrap">
      <div className="col">
        <section className="card section">
          <div className="head-row">
            <h1 className="hdr">{poll.title || "Add Options"}</h1>
            <span className="badge">Code: {code}</span>
          </div>

          <p className="note">
            Add your ideas below. You can add <strong>{N}</strong>{" "}
            {N === 1 ? "option" : "options"}.
          </p>

          <div className="inputs-grid">
            {Array.from({ length: N }).map((_, i) => (
              <label key={i} className="field">
                <input
                  value={values[i] || ""}
                  onChange={(e) => setAt(i, e.target.value)}
                  placeholder={`Option ${i + 1}`}
                  maxLength={120}
                />
              </label>
            ))}
          </div>

          <div className="stack">
            <button
              className="btn btn-primary"
              onClick={submit}
              disabled={submitting}
            >
              {submitting ? "Adding…" : "Add"}
            </button>
            <button
              className="btn btn-outline"
              onClick={() => nav(`/collect/${code}`)}
            >
              Back
            </button>
          </div>

          <p className="help" style={{ marginTop: 8 }}>
            Debug: client={getClientToken()}
          </p>
        </section>
      </div>

      {/* Page-specific additions that sit on top of the global theme */}
      <style>{`
.head-row{
  display:flex; align-items:center; justify-content:space-between;
  gap:12px; flex-wrap:wrap;
}

.badge{
  padding:6px 12px; border-radius:999px;
  background: linear-gradient(180deg, rgba(255,140,0,.10), rgba(255,140,0,.06));
  border:1px solid rgba(255,140,0,.45);
  color:#ffb25a; letter-spacing:.06em; font-weight:700; font-size:.9rem;
  box-shadow: 0 2px 10px rgba(0,0,0,.35), 0 1px 0 rgba(255,255,255,.04) inset;
}

.note{
  margin:12px 0 10px; padding:12px; border-radius:12px;
  background: linear-gradient(180deg, rgba(255,255,255,.03), rgba(0,0,0,.12));
  border:1px solid rgba(255,140,0,.25);
  box-shadow: 0 0 14px rgba(255,140,0,.12) inset;
  color: var(--ink);
}

.inputs-grid{
  display:grid; gap:12px;
}

@media (min-width: 720px){
  .inputs-grid{ grid-template-columns: 1fr 1fr; }
}
      `}</style>
    </div>
  );
}

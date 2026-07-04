// src/pages/CollectAdd.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { addOptionsByCode } from "../lib/collect";
import { narrowTheme } from "../lib/theme.js";

function ThemeStyles() { return <style>{narrowTheme}</style>; }

export default function CollectAdd() {
  const nav = useNavigate();
  const { code: raw } = useParams();
  const code = (raw || "").toUpperCase();

  const [poll, setPoll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [values, setValues] = useState([]);

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
        if (error) { console.error(error); setPoll(null); }
        else {
          setPoll(data);
          const n = Math.min(Math.max(Number(data?.max_per_user) || 3, 1), 10);
          setValues(Array(n).fill(""));
        }
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [code]);

  const N = useMemo(
    () => Math.min(Math.max(Number(poll?.max_per_user) || 3, 1), 10),
    [poll?.max_per_user]
  );

  function setAt(i, val) {
    setValues((arr) => { const next = [...arr]; next[i] = val; return next; });
  }

  async function submit() {
    if (!poll) return;
    const cleaned = values.map((s) => (s || "").trim()).filter(Boolean);
    const seen = new Set();
    const unique = [];
    for (const t of cleaned) {
      const k = t.toLowerCase();
      if (!seen.has(k)) { seen.add(k); unique.push(t); }
    }
    if (unique.length === 0) { alert("Please enter at least one option."); return; }
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
        <h1 className="hdr">Room {code}</h1>
        <p className="help">We couldn't find this collection room. Double-check the code.</p>
        <div className="stack">
          <button className="btn btn-outline" onClick={() => nav("/")}>Home</button>
        </div>
      </section>
    </div>
    <ThemeStyles /></div>
  );

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
            <button className="btn btn-primary" onClick={submit} disabled={submitting}>
              {submitting ? "Adding…" : "Add"}
            </button>
            <button className="btn btn-outline" onClick={() => nav(`/collect/${code}`)}>
              Back
            </button>
          </div>
        </section>
      </div>
      <ThemeStyles />
      <style>{`
        .inputs-grid { display: grid; gap: 12px; }
        @media (min-width: 720px) { .inputs-grid { grid-template-columns: 1fr 1fr; } }
      `}</style>
    </div>
  );
}

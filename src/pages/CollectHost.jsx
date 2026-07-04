// src/pages/CollectHost.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { narrowTheme } from "../lib/theme.js";

function ThemeStyles() { return <style>{narrowTheme}</style>; }

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

  // ---------- load poll (from collect_polls) ----------
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

  // Ensure a `polls` row exists, then go to /randomize/:code
  async function openRandomizer() {
    if (!verified) return;
    setErrorMsg("");
    setActing(true);
    try {
      // Check if already finalized to a `polls` row
      const { data: existing, error: exErr } = await supabase
        .from("polls")
        .select("id")
        .eq("code", code)
        .maybeSingle();
      if (exErr) throw exErr;

      // If missing, finalize now to materialize options into `polls`
      if (!existing) {
        const { error: finErr } = await supabase.rpc("collect_finalize_to_voting", {
          _code: code,
          _pin: pin,
        });
        if (finErr) throw finErr;
        await refresh();
      }

      // Navigate to the dedicated Randomizer page
      nav(`/randomize/${code}`);
    } catch (e) {
      console.error(e);
      setErrorMsg(e?.message || "Could not open randomizer.");
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

  // ---------- Render ----------
  if (loading) {
    return (
      <>
        <div className="wrap"><div className="col">
          <div className="card section">
            <div className="skel skel-title" />
            <div className="skel skel-line" />
            <div className="skel skel-line short" />
            <div className="skel skel-btn" />
          </div>
        </div></div>
        <ThemeStyles />
      </>
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
                <button
                  className="btn btn-outline"
                  onClick={() => nav(`/collect/${code}`)}
                >
                  Back
                </button>
              </div>

              {errorMsg && <p className="error">{errorMsg}</p>}
            </div>
          ) : (
            <div className="panel">
              <p className="good">PIN verified ✔</p>

              <div className="stack">
                <button
                  className="btn btn-primary"
                  onClick={openVoting}
                  disabled={acting || poll.status !== "collecting"}
                  title={
                    poll.status !== "collecting" ? "Already finalized" : "Open voting"
                  }
                >
                  {acting ? "Working…" : "Open Voting"}
                </button>

                {/* New: Open Randomizer */}
                <button
                  className="btn btn-outline"
                  onClick={openRandomizer}
                  disabled={acting}
                  title="Ensure poll exists and go to Randomizer"
                >
                  {acting ? "Working…" : "Open Randomizer"}
                </button>

                <button className="btn btn-outline" onClick={refresh}>
                  Refresh
                </button>
                <button
                  className="btn btn-outline"
                  onClick={() => nav(`/collect/${code}`)}
                >
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
          )}
        </section>
      </div>

      <ThemeStyles />
      <style>{`
        .info-grid { display: grid; gap: 12px; margin: 12px 0; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); }
        .info { padding: 12px; border-radius: 14px; background: linear-gradient(180deg, rgba(255,255,255,.03), rgba(0,0,0,.14)); border: 1px solid rgba(255,255,255,.08); box-shadow: inset 0 2px 6px rgba(0,0,0,.35); }
        .info-label { color: var(--muted); font-size: .9rem; margin-bottom: 4px; }
        .info-value { font-weight: 800; color: var(--ink); }
        .panel { margin-top: 8px; padding: 14px; border-radius: 14px; background: linear-gradient(180deg, rgba(255,255,255,.03), rgba(0,0,0,.12)); border: 1px solid rgba(255,140,0,.25); box-shadow: 0 0 14px rgba(255,140,0,.10) inset; }
      `}</style>
    </div>
  );
}

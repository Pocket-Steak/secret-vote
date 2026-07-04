// src/lib/theme.js
// Shared CSS for all pages. Import and render inside a <style> tag.
// Pass a containerWidth to override --container (default: narrow 520px).
export function themeCSS(container = "min(520px, 92vw)") {
  return `
:root {
  --bg: #0e1116;
  --panel: #1a1f27;
  --ink: #f5efe6;
  --muted: #bfc6d3;
  --accent: #ff8c00;
  --accent-2: #ffb25a;
  --container: ${container};
}

*, *::before, *::after { box-sizing: border-box; }
html, body, #root { min-height: 100%; }
body { margin: 0; background: var(--bg); font-family: system-ui, -apple-system, sans-serif; }

/* ── Page wrapper ── */
.wrap {
  min-height: 100vh; min-height: 100svh; min-height: 100dvh;
  display: flex; flex-direction: column; align-items: center; gap: 12px;
  padding: max(16px, env(safe-area-inset-top)) 18px max(max(16px, env(safe-area-inset-bottom)), 24px);
  background:
    radial-gradient(1200px 600px at 50% -10%, rgba(255,140,0,.09), transparent 60%),
    radial-gradient(800px 400px at 100% 0%,   rgba(255,140,0,.05), transparent 60%),
    var(--bg);
  color: var(--ink);
}

/* ── Column ── */
.col {
  display: flex; flex-direction: column; align-items: center; gap: 16px;
  width: var(--container);
  animation: fadeUp .32s cubic-bezier(.22,.68,0,1.2) both;
}
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ── Cards ── */
.card {
  width: 100%;
  background: linear-gradient(180deg, rgba(255,255,255,.03), rgba(0,0,0,.10)), var(--panel);
  border: 1px solid rgba(255,255,255,.065);
  border-radius: 18px; padding: 24px;
  box-shadow:
    0 1px 0 rgba(255,255,255,.07) inset,
    0 12px 28px rgba(0,0,0,.38),
    0 2px 8px rgba(0,0,0,.22);
  transition: transform .2s ease, box-shadow .2s ease, border-color .2s ease;
}
.card:hover {
  transform: translateY(-2px);
  box-shadow:
    0 1px 0 rgba(255,255,255,.09) inset,
    0 18px 36px rgba(0,0,0,.48),
    0 3px 12px rgba(0,0,0,.28);
  border-color: rgba(255,140,0,.22);
}

/* ── Typography ── */
.hdr {
  font-size: 1.35rem; font-weight: 800; letter-spacing: .2px;
  margin: 0 0 10px; text-shadow: 0 1px 0 rgba(0,0,0,.5);
}
.help { color: var(--muted); font-size: .95rem; margin: .25rem 0 0; }
.section { margin: 4px 0 6px; }

/* ── Layout helpers ── */
.stack { display: flex; flex-direction: column; gap: 16px; }
.head-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.badges-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin: 6px 0 2px; }

/* ── Badges ── */
.badge {
  padding: 6px 12px; border-radius: 999px;
  background: linear-gradient(180deg, rgba(255,140,0,.10), rgba(255,140,0,.06));
  border: 1px solid rgba(255,140,0,.45);
  color: #ffb25a; letter-spacing: .06em; font-weight: 700; font-size: .9rem;
  box-shadow: 0 2px 10px rgba(0,0,0,.35), 0 1px 0 rgba(255,255,255,.04) inset;
}
.timer {
  padding: 6px 12px; border-radius: 999px;
  background: linear-gradient(180deg, rgba(255,140,0,.12), rgba(255,140,0,.06));
  border: 1px solid rgba(255,140,0,.45);
  color: #ffdda8; letter-spacing: .04em; font-weight: 800; font-size: .95rem;
  box-shadow: 0 2px 10px rgba(0,0,0,.35), 0 1px 0 rgba(255,255,255,.05) inset;
}

/* ── Fields ── */
.field {
  display: flex; align-items: center; gap: 10px;
  background: linear-gradient(180deg, rgba(255,255,255,.03), rgba(0,0,0,.16));
  border: 1px solid rgba(255,255,255,.085);
  border-radius: 14px; padding: 14px 16px;
  box-shadow: inset 0 2px 6px rgba(0,0,0,.35);
}
.field:focus-within {
  border-color: rgba(255,140,0,.45);
  box-shadow: inset 0 2px 6px rgba(0,0,0,.35), 0 0 0 3px rgba(255,140,0,.18);
}
.field.invalid { border-color: #c0392b; }
.field input {
  width: 100%; background: transparent; border: none; outline: none;
  color: var(--ink); font-size: 1.05rem; letter-spacing: .02em;
}
.select-field { position: relative; }
.select-field select {
  appearance: none; -webkit-appearance: none;
  width: 100%; background: transparent; border: none; outline: none;
  color: var(--ink); font-size: 1.05rem; line-height: 1.2;
}
.select-field .chev {
  position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
  opacity: .8; pointer-events: none;
}

/* ── Buttons ── */
.btn {
  appearance: none; border: none; cursor: pointer; font-weight: 800;
  border-radius: 14px; padding: 14px 18px; width: 100%;
  font-size: 1rem;
  transition: transform .08s ease, box-shadow .12s ease, filter .12s ease, opacity .12s ease;
}
.btn[disabled] { opacity: .65; cursor: not-allowed; }
.btn-primary {
  color: #1a1005;
  background: linear-gradient(180deg, var(--accent-2), var(--accent));
  box-shadow: 0 10px 20px rgba(255,140,0,.3), 0 2px 0 rgba(255,140,0,.9) inset, 0 1px 0 rgba(255,255,255,.35) inset;
}
.btn-primary:not([disabled]):hover { filter: brightness(1.06); }
.btn-primary:not([disabled]):active {
  transform: translateY(1px);
  box-shadow: 0 6px 12px rgba(255,140,0,.24), 0 1px 0 rgba(140,70,0,.9) inset;
}
.btn-outline {
  color: var(--accent-2);
  background: linear-gradient(180deg, rgba(255,140,0,.08), rgba(255,140,0,.04));
  border: 1px solid rgba(255,140,0,.45);
  box-shadow: 0 6px 14px rgba(0,0,0,.35), 0 1px 0 rgba(255,255,255,.04) inset;
}
.btn-outline:not([disabled]):hover {
  background: linear-gradient(180deg, rgba(255,140,0,.14), rgba(255,140,0,.06));
}

/* ── Note / banner ── */
.note {
  margin: 12px 0 10px; padding: 12px; border-radius: 12px;
  background: linear-gradient(180deg, rgba(255,255,255,.03), rgba(0,0,0,.12));
  border: 1px solid rgba(255,140,0,.25);
  box-shadow: 0 0 14px rgba(255,140,0,.10) inset;
  color: var(--ink);
}

/* ── Error / success ── */
.error { color: #ff6b6b; font-size: .95rem; margin-top: 8px; }
.good  { color: #ffdda8; font-weight: 800; text-shadow: 0 0 8px rgba(255,140,0,.5); }

/* ── Skeleton loaders ── */
@keyframes shimmer {
  from { background-position: -600px 0; }
  to   { background-position:  600px 0; }
}
.skel {
  border-radius: 8px;
  background: linear-gradient(90deg,
    rgba(255,255,255,.04) 25%,
    rgba(255,255,255,.11) 50%,
    rgba(255,255,255,.04) 75%);
  background-size: 1200px 100%;
  animation: shimmer 1.5s infinite linear;
}
.skel-title  { height: 26px; width: 55%; margin-bottom: 18px; }
.skel-line   { height: 14px; width: 90%; margin-bottom: 12px; }
.skel-line.short { width: 50%; }
.skel-btn    { height: 48px; width: 100%; border-radius: 14px; margin-top: 8px; }

/* ── Responsive ── */
@media (max-width: 600px) {
  .card { padding: 18px; }
  .wrap { padding-bottom: max(24px, env(safe-area-inset-bottom)); }
}
`;
}

// Pre-built variants
export const narrowTheme = themeCSS("min(520px, 92vw)");
export const wideTheme   = themeCSS("min(720px, 94vw)");

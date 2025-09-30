// src/pages/CreateCollect.jsx
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

function genCode() {
  const A = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += A[Math.floor(Math.random() * A.length)];
  return s;
}

export default function CreateCollect() {
  const nav = useNavigate();

  const [title, setTitle] = useState("");
  const [durationMin, setDurationMin] = useState(120);
  const [maxPerUser, setMaxPerUser] = useState(3);
  const [targetHint, setTargetHint] = useState("");
  const [hostPin, setHostPin] = useState(""); // REQUIRED
  const [submitting, setSubmitting] = useState(false);

  const durations = useMemo(
    () => [
      { label: "30 minutes", minutes: 30 },
      { label: "1 hour", minutes: 60 },
      { label: "2 hours", minutes: 120 },
      { label: "4 hours", minutes: 240 },
      { label: "8 hours", minutes: 480 },
    ],
    []
  );

  const maxChoices = useMemo(() => [1, 2, 3, 4, 5, 6], []);

  async function handleCreate(e) {
    e?.preventDefault?.();

    const t = title.trim();
    if (!t) {
      alert("Please enter a poll title.");
      return;
    }

    // 🔒 Host PIN is REQUIRED and must be 4+ digits
    const pin = hostPin.trim();
    if (!/^\d{4,}$/.test(pin)) {
      alert("Host PIN is required and must be at least 4 digits (numbers only).");
      return;
    }

    // Target participants is optional number
    let target = null;
    if (targetHint.trim()) {
      const n = Number(targetHint);
      if (!Number.isFinite(n) || n < 1 || n > 1_000_000) {
        alert("Target participants should be a positive number.");
        return;
      }
      target = Math.floor(n);
    }

    setSubmitting(true);
    try {
      const code = genCode();
      const payload = {
        code,
        title: t,
        duration_minutes: Number(durationMin),
        max_per_user: Number(maxPerUser),
        target_participants_hint: target, // nullable
        host_pin: pin,                     // ✅ REQUIRED (no null)
        status: "collecting",
        created_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("collect_polls").insert(payload);
      if (error) {
        console.error(error);
        alert(`Could not create room.\n\n${error.message || ""}`);
        setSubmitting(false);
        return;
      }

      nav(`/collect/${code}`);
    } catch (err) {
      console.error(err);
      alert("Unexpected error creating the room.");
      setSubmitting(false);
    }
  }

  const pinValid = /^\d{4,}$/.test(hostPin.trim())

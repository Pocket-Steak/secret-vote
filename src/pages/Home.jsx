// src/pages/Home.jsx
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function Home() {
  const nav = useNavigate();
  const [code, setCode] = useState("");

  function goToRoom(e) {
    e.preventDefault();
    const c = code.trim().toUpperCase();
    if (c.length >= 4) nav(`/room/${c}`);
  }

  return (
    <div className="app">
      {/* Status bar / safe area is handled by CSS; this is the content column */}
      <main className="container">

        {/* Hero / logo */}
        <header className="hero" aria-label="The Secret Vote">
          {/* If you have an SVG/PNG logo, point to it here */}
          <img src="/logo-secret-vote.svg" alt="The Secret Vote" />
        </header>

        {/* Quick join */}
        <section className="section" aria-labelledby="quick-join-title">
          <h2 id="quick-join-title">Have a code? Jump in:</h2>

          <form onSubmit={goToRoom}>
            <input
              className="input"
              placeholder="ENTER 6-CHAR CODE"
              inputMode="latin"
              autoCapitalize="characters"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <div style={{ height: 12 }} />
            <button className="button button--primary" type="submit">
              Go
            </button>
          </form>

          <div className="rule" />
          <p>Codes work for both collection and voting rooms.</p>
        </section>

        {/* Create a poll */}
        <section className="section" aria-labelledby="create-title">
          <h2 id="create-title">Create a Poll</h2>
          <p>
            Make a quick, secret vote. Share the code, everyone joins and votes.
          </p>
          <Link to="/create" className="button button--primary" role="button">
            Create a Poll
          </Link>
        </section>

        {/* Create a group idea poll */}
        <section className="section" aria-labelledby="collect-title">
          <h2 id="collect-title">Create a Group Idea Poll</h2>
          <p>
            Collect options from the group first, then open voting when ready.
          </p>
          <Link
            to="/create-collect"
            className="button button--primary"
            role="button"
          >
            Start a Group Idea Poll
          </Link>
        </section>

        <div style={{ height: 24 }} />
      </main>
    </div>
  );
}

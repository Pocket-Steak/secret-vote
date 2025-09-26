// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter, Routes, Route } from "react-router-dom";
import "./index.css"; // keep or remove if you import CSS elsewhere

// Detect Capacitor/iOS/Android shell and tag the document for app-only styles
(function () {
  try {
    const cap = window?.Capacitor;
    const isNative =
      (typeof cap?.isNativePlatform === "function" && cap.isNativePlatform()) ||
      !!cap?.platform; // fallback for older Capacitor versions
    if (isNative) {
      document.documentElement.classList.add("mobile-app");
      document.body.classList.add("mobile-app");
    }
  } catch {
    // no-op on web
  }
})();

// Existing flow
import Home from "./pages/Home.jsx";
import Create from "./pages/Create.jsx";
import Landing from "./pages/Landing.jsx";
import Vote from "./pages/Vote.jsx";
import Results from "./pages/Results.jsx";

// Collect-first flow
import CreateCollect from "./pages/CreateCollect.jsx";
import CollectLanding from "./pages/CollectLanding.jsx";
import CollectAdd from "./pages/CollectAdd.jsx";
import CollectHost from "./pages/CollectHost.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <HashRouter>
      <Routes>
        {/* Home */}
        <Route path="/" element={<Home />} />

        {/* Existing poll flow */}
        <Route path="/create" element={<Create />} />
        <Route path="/room/:code" element={<Landing />} />
        <Route path="/vote/:code" element={<Vote />} />
        <Route path="/results/:code" element={<Results />} />

        {/* Collect-first flow */}
        <Route path="/create-collect" element={<CreateCollect />} />
        <Route path="/collect/:code" element={<CollectLanding />} />
        <Route path="/collect/:code/add" element={<CollectAdd />} />
        <Route path="/collect/:code/host" element={<CollectHost />} />
      </Routes>
    </HashRouter>
  </React.StrictMode>
);

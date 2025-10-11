// src/App.jsx
import { Routes, Route, Navigate } from "react-router-dom";

// existing pages
import Home from "./pages/Home.jsx";
import Create from "./pages/Create.jsx";
import Landing from "./pages/Landing.jsx";     // /room/:code
import Vote from "./pages/Vote.jsx";
import Results from "./pages/Results.jsx";

// NEW (already had)
import CreateCollect from "./pages/CreateCollect.jsx";
import CollectRoom from "./pages/CollectRoom.jsx";

// NEW (add these)
import CollectHost from "./pages/CollectHost.jsx";
import Randomize from "./pages/Randomize.jsx";

export default function App() {
  return (
    <div style={styles.app}>
      <Routes>
        {/* Home */}
        <Route path="/" element={<Home />} />

        {/* Existing flow */}
        <Route path="/create" element={<Create />} />
        <Route path="/room/:code" element={<Landing />} />
        <Route path="/vote/:code" element={<Vote />} />
        <Route path="/results/:code" element={<Results />} />

        {/* Collect flow */}
        <Route path="/create-collect" element={<CreateCollect />} />
        <Route path="/collect/:code" element={<CollectRoom />} />
        {/* Host options for a collect room */}
        <Route path="/collect/:code/host" element={<CollectHost />} />

        {/* Randomizer (no voting required) */}
        <Route path="/randomize/:code" element={<Randomize />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

const styles = {
  app: {
    minHeight: "100vh",
    background: "#0b0f17",
  },
};

// src/App.jsx
import { Routes, Route, Navigate } from "react-router-dom";

// existing pages
import Home from "./pages/Home.jsx";
import Create from "./pages/Create.jsx";
import Landing from "./pages/Landing.jsx";     // your /room/:code page
import Vote from "./pages/Vote.jsx";
import Results from "./pages/Results.jsx";

// NEW pages
import CreateCollect from "./pages/CreateCollect.jsx";
import CollectRoom from "./pages/CollectRoom.jsx";

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

        {/* NEW: collect options first */}
        <Route path="/create-collect" element={<CreateCollect />} />
        <Route path="/collect/:code" element={<CollectRoom />} />

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

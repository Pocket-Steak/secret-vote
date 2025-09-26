import React from "react";
import { createRoot } from "react-dom/client";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";

// Lazy-load pages so a broken page won’t crash the whole app
const Home           = React.lazy(() => import("./pages/Home.jsx"));
const Create         = React.lazy(() => import("./pages/Create.jsx"));
const Landing        = React.lazy(() => import("./pages/Landing.jsx"));
const Vote           = React.lazy(() => import("./pages/Vote.jsx"));
const Results        = React.lazy(() => import("./pages/Results.jsx"));

const CreateCollect  = React.lazy(() => import("./pages/CreateCollect.jsx"));
const CollectLanding = React.lazy(() => import("./pages/CollectLanding.jsx"));
const CollectAdd     = React.lazy(() => import("./pages/CollectAdd.jsx"));
const CollectHost    = React.lazy(() => import("./pages/CollectHost.jsx"));

// Small centered fallback so users don’t see a blank page while chunks load
function Loading() {
  return (
    <div style={{
      minHeight: "100vh",
      display: "grid",
      placeItems: "center",
      background: "#0b0f17",
      color: "#e9e9f1",
      fontFamily: "system-ui, Inter, sans-serif"
    }}>
      <div style={{opacity:.8,fontSize:18}}>Loading…</div>
    </div>
  );
}

// Simple error boundary so runtime errors don’t leave a white screen
class ErrorBoundary extends React.Component {
  constructor(props){ super(props); this.state = { hasError:false, err:null }; }
  static getDerivedStateFromError(err){ return { hasError:true, err }; }
  componentDidCatch(err, info){ console.error("App error:", err, info); }
  render(){
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight:"100vh", display:"grid", placeItems:"center",
          background:"#0b0f17", color:"#ffb4a6", padding:24, textAlign:"center"
        }}>
          <div>
            <h2 style={{margin:0}}>Something went wrong</h2>
            <p style={{opacity:.9, marginTop:8}}>Check the console for details.</p>
            <button
              onClick={() => location.reload()}
              style={{marginTop:12, padding:"10px 16px", borderRadius:10, border:"1px solid #333", background:"transparent", color:"#e9e9f1", cursor:"pointer"}}
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppRoutes() {
  return (
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

      {/* Catch-alls → Home (prevents white-screen on bad URLs) */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {/* HashRouter is ideal for GitHub Pages (no server rewrites needed) */}
    <HashRouter /* basename="/" */>
      <ErrorBoundary>
        <React.Suspense fallback={<Loading />}>
          <AppRoutes />
        </React.Suspense>
      </ErrorBoundary>
    </HashRouter>
  </React.StrictMode>
);

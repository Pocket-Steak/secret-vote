import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'

// Pages
import Home from './pages/Home.jsx'
import Create from './pages/Create.jsx'
import Landing from './pages/Landing.jsx'
import Vote from './pages/Vote.jsx'
import Results from './pages/Results.jsx'

// NEW pages
import CreateCollect from './pages/CreateCollect.jsx'
import CollectRoom from './pages/CollectRoom.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
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
    </HashRouter>
  </React.StrictMode>,
)

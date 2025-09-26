import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite config
// - Uses BASE_PATH from the environment for GitHub Pages (e.g. "/the-secret-vote/")
// - Falls back to "/" for local dev
export default defineConfig({
  plugins: [react()],
  base: process.env.BASE_PATH || '/',
})

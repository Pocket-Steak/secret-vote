// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Use the function form so Vite knows when it's building vs serving
export default defineConfig(({ command }) => ({
  plugins: [react()],

  // If your GitHub Pages site is https://<user>.github.io/secret-vote/
  // set base to "/secret-vote/" **only** for production builds.
  base: command === 'build' ? '/secret-vote/' : '/',
}))

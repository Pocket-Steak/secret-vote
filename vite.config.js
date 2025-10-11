import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const isProd = process.env.NODE_ENV === 'production';

export default defineConfig({
  plugins: [react()],
  // on GH Pages the app lives under /secret-vote/
  base: isProd ? '/secret-vote/' : '/',
})

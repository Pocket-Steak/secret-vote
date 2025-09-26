// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// If we're in GitHub Actions, GITHUB_REPOSITORY is "owner/repo".
// Use that repo name as the base path. Otherwise fall back to BASE_PATH or "/".
const repoFromCI = process.env.GITHUB_REPOSITORY
  ? process.env.GITHUB_REPOSITORY.split("/")[1]
  : null;

const isCI = !!process.env.GITHUB_ACTIONS;

export default defineConfig({
  plugins: [react()],
  base: isCI
    ? `/${repoFromCI}/`               // e.g. /secret-vote/ on GitHub Pages
    : (process.env.BASE_PATH || "/"), // local dev or custom env var
});

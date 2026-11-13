// Used only by the build-time first-screen render (see prerender.mjs).
// It is its own file on purpose: plugins that other tools add to vite.config.js
// (for example Cloudflare's) must not change where this build writes its output.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({ plugins: [react()] });

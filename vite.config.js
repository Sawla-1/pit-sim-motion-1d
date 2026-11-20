import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// The home-screen app: names and colours. Placeholders, change them here.
// The icon pictures are the files in public/icons/ (keep the file names).
const APP_NAME = 'PIT Motion 1D'
const APP_SHORT_NAME = 'Motion 1D'
const THEME_COLOR = '#b4262d'
const BACKGROUND_COLOR = '#f5f9f3'

// The way back. Change to true and publish: every device then removes the
// service worker and the saved files the next time it opens the page online.
const REMOVE_OFFLINE_CACHE = false

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Offline use and the home-screen icon. The page-start code is in src/offline/.
    VitePWA({
      injectRegister: null, // the plugin adds no start-up code, ours does it
      selfDestroying: REMOVE_OFFLINE_CACHE,
      includeManifestIcons: false, // the phone keeps its own copy of the home-screen icons
      manifest: {
        name: APP_NAME,
        short_name: APP_SHORT_NAME,
        description: 'A motion simulation: record a walk and play it back.',
        theme_color: THEME_COLOR,
        background_color: BACKGROUND_COLOR,
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Only the files the page really uses are saved on the device
        globPatterns: ['index.html', 'logo-64.png', 'karen-intro-svgs/*.svg'],
        // A picture copy the page never loads
        globIgnores: ['karen-intro-svgs/bar-background.svg'],
        // Answer only for this simulation's own page (another one may share the site later)
        navigateFallback: null,
        // A new version takes over quietly once it has downloaded. The open page is
        // not reloaded and keeps running. The next page start shows the new version.
        skipWaiting: true,
      },
    }),
  ],
})

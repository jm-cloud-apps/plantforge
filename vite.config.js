import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// `base` is '/' locally; the Pages deploy workflow sets VITE_BASE=/plantforge/
// so assets resolve under https://<user>.github.io/plantforge/.
export default defineConfig({
  base: process.env.VITE_BASE || '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'PlantForge',
        short_name: 'PlantForge',
        description: 'Your plant inventory — watering, repotting & fertilizing, with photos.',
        theme_color: '#16a34a',
        background_color: '#0b1a12',
        display: 'standalone',
        orientation: 'portrait',
        // start_url/scope are made relative so the app installs correctly under /plantforge/.
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
    }),
  ],
  server: {
    port: Number(process.env.PORT) || 5190,
  },
})

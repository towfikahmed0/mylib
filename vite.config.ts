import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA, type ManifestOptions } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(() => {
  const manifest: Partial<ManifestOptions> = {
    name: 'MyLib',
    short_name: 'MyLib',
    description: 'Your social reading sanctuary',
    theme_color: '#0f172a',
    background_color: '#f8fafc',
    display: 'standalone',
    start_url: '/',
    scope: '/',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }

  return {
    plugins: [
      react(),
      VitePWA({
        // A hand-written worker is used so the build never emits external module
        // specifiers (this repo path contains an apostrophe, which breaks the
        // generateSW template). See src/sw.js for the caching rules.
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'sw.js',
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'logo.png', 'icons/*.png'],
        manifest,
        injectManifest: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,ttf}'],
          // The FCM worker is registered separately and must never be precached.
          globIgnores: ['**/firebase-messaging-sw.js'],
        },
      }),
    ],
  }
})

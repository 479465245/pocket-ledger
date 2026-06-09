import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    uni(),
    VitePWA({
      manifestFilename: 'manifest.json',
      registerType: 'autoUpdate',
      includeAssets: [
        'static/icons/144x144.png',
        'static/icons/192x192.png',
        'static/icons/512x512.png',
      ],
      manifest: {
        name: '元起',
        short_name: '元起',
        description: '元起记账应用',
        theme_color: '#FFD54F',
        background_color: '#FFF8E1',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/static/icons/144x144.png',
            sizes: '144x144',
            type: 'image/png',
          },
          {
            src: '/static/icons/192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/static/icons/512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,woff2}'],
      },
    }),
  ],
  css: {
    preprocessorOptions: {
      scss: {
        silenceDeprecations: ['legacy-js-api'],
      },
    },
  },
})

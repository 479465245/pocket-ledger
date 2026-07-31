import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'
import { VitePWA } from 'vite-plugin-pwa'
import { readFileSync } from 'node:fs'

const appIcon = readFileSync(new URL('./1024x1024.png', import.meta.url))

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    {
      name: 'emit-root-app-icon',
      generateBundle() {
        this.emitFile({
          type: 'asset',
          fileName: '1024x1024.png',
          source: appIcon,
        })
      },
    },
    uni(),
    VitePWA({
      manifestFilename: 'manifest.json',
      registerType: 'autoUpdate',
      includeAssets: [
        '1024x1024.png',
      ],
      manifest: {
        name: '元起',
        short_name: '元起',
        description: '元起记账应用',
        id: '/',
        theme_color: '#FFD54F',
        background_color: '#FFF8E1',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/static/icons/192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/static/icons/512x512.png',
            sizes: '512x512',
            type: 'image/png',
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


import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vite'

export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? '/bppv-home-helper/' : '/',
  plugins: [react(), VitePWA({ registerType: 'prompt', manifest: { name: 'Помощник при позиционном головокружении', short_name: 'ДППГ', lang: 'ru', display: 'standalone', background_color: '#f5f6f1', theme_color: '#2d5c56' }, workbox: { globPatterns: ['**/*.{js,css,html,svg,png,ico}'] } })],
})

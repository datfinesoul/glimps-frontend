import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const apiUrl = process.env.VITE_API_URL || 'http://localhost:3000';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    hmr: {
      disconnectOnStart: true,
    },
    proxy: {
      '/api': {
        target: apiUrl,
        changeOrigin: true,
      },
      '/media': {
        target: apiUrl,
        changeOrigin: true,
      },
    },
  },
})
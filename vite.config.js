import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
  },
  // Geliştirme sırasında Pages Functions proxy
  server: {
    proxy: {
      '/api': 'http://localhost:8788',
    },
  },
})

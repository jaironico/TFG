import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  optimizeDeps: {
    include: ['pdfjs-dist']
  },

  server: {
    host: '0.0.0.0', // 🔧 necesario para Docker
    port: 5173       // opcional, pero puedes forzar si lo prefieres
  }
})

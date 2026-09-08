import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
// URL base de la API en producción. Se inyecta siempre en el bundle,
// aunque Vercel no tenga la variable configurada.
const API_BASE =
  process.env.VITE_API_BASE || 'https://sistema-documental-ia.onrender.com/api'

export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_API_BASE': JSON.stringify(API_BASE),
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://sistema-documental-ia.onrender.com',
        changeOrigin: true,
      },
    },
  },
})
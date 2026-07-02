import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Durante `npm run dev` (Vite :5173), encaminha /api/* para as Pages
  // Functions servidas por `npm run pages:dev` (wrangler em :8788).
  server: {
    proxy: {
      '/api': 'http://localhost:8788',
    },
  },
})

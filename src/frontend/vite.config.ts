import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // `npm run dev` sends API calls to the real backend on the koi container.
  server: { proxy: { '/api': 'http://10.0.0.181:8000' } },
})

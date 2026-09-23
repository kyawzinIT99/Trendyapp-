import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    host: '127.0.0.1',
    strictPort: true,   // fail immediately if 5174 is taken
  }
})

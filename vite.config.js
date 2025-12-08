import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy requests starting with /a07 to the remote host during development
      '/a07': {
        target: 'https://prepublish.f.qaotic.net',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/a07/, '/a07'),
        headers: {
          referer: 'https://prepublish.f.qaotic.net/'
        }
      }
    }
  }
})

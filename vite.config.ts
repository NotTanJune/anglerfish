import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/tinyfish-proxy': {
        target: 'https://agent.tinyfish.ai',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/tinyfish-proxy/, ''),
      },
      '/openai-proxy': {
        target: 'https://api.openai.com',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/openai-proxy/, ''),
      },
    },
  },
})

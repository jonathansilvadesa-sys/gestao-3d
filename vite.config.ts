import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'
import path from 'path'

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  // PostCSS inline — evita conflito ESM/CJS com postcss-load-config
  css: {
    postcss: {
      plugins: [tailwindcss, autoprefixer],
    },
  },

  build: {
    // Divide bundles grandes para melhor performance (code splitting)
    rollupOptions: {
      output: {
        manualChunks: {
          vendor:   ['react', 'react-dom'],
          charts:   ['recharts'],
          pdf:      ['jspdf', 'jspdf-autotable'],
        },
      },
    },
    // Avisa se algum chunk passar de 600kb
    chunkSizeWarningLimit: 600,
  },

  // Permite que variáveis VITE_* sejam acessadas via import.meta.env
  envPrefix: 'VITE_',
})

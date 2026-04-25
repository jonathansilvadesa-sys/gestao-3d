import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'
import path from 'path'

// Nota: a injeção do timestamp no sw.js é feita por scripts/patch-sw.cjs
// que roda após o vite build via "build": "vite build && node scripts/patch-sw.cjs"
// O plugin closeBundle() não funcionava pois os arquivos public/ são copiados depois dele.

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
          // React core — carregado em toda página
          vendor:   ['react', 'react-dom'],
          // Supabase — SDK grande mas necessário logo no boot
          supabase: ['@supabase/supabase-js'],
          // Gráficos — só usados no Dashboard
          charts:   ['recharts'],
          // PDF — só usado sob demanda
          pdf:      ['jspdf', 'jspdf-autotable'],
          // Excel — só usado na exportação (task #42)
          xlsx:     ['xlsx'],
          // Tour de onboarding — só na primeira visita
          tour:     ['react-joyride'],
          // QR code — só em etiquetas (task #43)
          qrcode:   ['qrcode'],
        },
      },
    },
    // Avisa se algum chunk passar de 800kb (xlsx tem ~700kb minificado)
    chunkSizeWarningLimit: 800,
  },

  // Permite que variáveis VITE_* sejam acessadas via import.meta.env
  envPrefix: 'VITE_',
})

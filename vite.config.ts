import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'
import path from 'path'
import fs from 'fs'

/**
 * Injeta a data/hora do build no sw.js para que cada deploy do Vercel
 * invalide automaticamente o cache do Service Worker.
 * Sem isso, o navegador continua servindo JS/CSS antigos (Cache-First)
 * mesmo após novos deploys — causa do "site lento no Chrome normal".
 */
function swVersionPlugin() {
  return {
    name: 'sw-version-inject',
    closeBundle() {
      const swPath = path.resolve(__dirname, 'dist/sw.js');
      if (!fs.existsSync(swPath)) return;
      const buildDate = Date.now().toString();
      const content = fs.readFileSync(swPath, 'utf-8');
      fs.writeFileSync(swPath, content.replace('__BUILD_DATE__', buildDate));
      console.log(`[sw-version-inject] CACHE_NAME → gestao3d-${buildDate}`);
    },
  };
}

export default defineConfig({
  plugins: [react(), swVersionPlugin()],

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

/**
 * patch-sw.cjs
 * Roda após `vite build` para injetar o timestamp no nome do cache do SW.
 * Chamado via: "build": "vite build && node scripts/patch-sw.cjs"
 */
const fs   = require('fs');
const path = require('path');

const swPath = path.join(__dirname, '..', 'dist', 'sw.js');

if (!fs.existsSync(swPath)) {
  console.warn('⚠️  patch-sw: dist/sw.js não encontrado — pulando injeção.');
  process.exit(0);
}

const buildDate = Date.now().toString();
const original  = fs.readFileSync(swPath, 'utf-8');

if (!original.includes('__BUILD_DATE__')) {
  console.warn('⚠️  patch-sw: placeholder __BUILD_DATE__ não encontrado em dist/sw.js.');
  process.exit(0);
}

// replaceAll para cobrir múltiplos placeholders (CACHE_NAME e HTML_CACHE)
const patched = original.split('__BUILD_DATE__').join(buildDate);
fs.writeFileSync(swPath, patched, 'utf-8');

console.log(`✅ patch-sw: cache name injetado → gestao3d-${buildDate}`);

/**
 * sw.js — Service Worker do Gestão 3D
 *
 * Estratégias:
 *  - Assets estáticos (JS, CSS, fontes, ícones): Cache-First
 *  - Navegação (HTML): Network-First com fallback para cache
 *  - API Supabase: Network-Only (dados sempre frescos)
 */

const CACHE_NAME    = 'gestao3d-v1';
const OFFLINE_URL   = '/';

// Assets a pré-cachear na instalação
const PRECACHE_URLS = [
  '/',
  '/manifest.json',
];

// ── Instalação ────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch((e) => {
        console.warn('[SW] precache partial failure:', e);
      });
    }).then(() => self.skipWaiting())
  );
});

// ── Ativação — limpa caches antigos ──────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Interceptação de requisições ──────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignora requisições não-GET e extensões de browser
  if (request.method !== 'GET') return;
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  // Supabase API → Network-Only (nunca cachear dados do banco)
  if (url.hostname.includes('supabase.co')) return;

  // Assets estáticos (JS, CSS, imagens, fontes) → Cache-First
  if (
    request.destination === 'script' ||
    request.destination === 'style'  ||
    request.destination === 'font'   ||
    request.destination === 'image'  ||
    url.pathname.startsWith('/assets/')
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Navegação HTML → Network-First com fallback offline
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstWithFallback(request));
    return;
  }
});

// ── Estratégia: Cache-First ───────────────────────────────────────────────────
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Recurso não disponível offline.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}

// ── Estratégia: Network-First com fallback ────────────────────────────────────
async function networkFirstWithFallback(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Offline: tenta o cache
    const cached = await caches.match(request);
    if (cached) return cached;

    // Fallback: raiz da app (SPA)
    const fallback = await caches.match(OFFLINE_URL);
    return fallback ?? new Response('Você está offline. Reconecte-se para continuar.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}

// ── Mensagem: forçar atualização ──────────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

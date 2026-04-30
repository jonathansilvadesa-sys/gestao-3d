/**
 * sw.js — Service Worker do Gestão 3D
 *
 * Estratégias (revisadas para evitar quebra pós-deploy):
 *  - Assets hashados (/assets/*): Stale-While-Revalidate
 *  - Outros estáticos (JS/CSS/font/img fora de /assets): Stale-While-Revalidate
 *  - Navegação (HTML): Network-First, fallback para cache só se offline
 *  - API Supabase: Network-Only (nunca cachear)
 *
 * IMPORTANTE: NÃO chamamos skipWaiting()/clients.claim() automaticamente.
 * Isso evita o cenário em que o novo SW deleta o cache antigo enquanto
 * a aba do usuário ainda referencia chunks lazy do build anterior. O
 * UpdatePrompt na UI faz a transição manual quando o usuário concordar.
 */

const CACHE_NAME    = 'gestao3d-__BUILD_DATE__';
const HTML_CACHE    = 'gestao3d-html-__BUILD_DATE__';
const OFFLINE_URL   = '/';

// Assets a pré-cachear na instalação (mínimo absoluto)
const PRECACHE_URLS = [
  '/manifest.json',
];

// ── Instalação ────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(PRECACHE_URLS).catch((e) => {
        console.warn('[SW] precache parcial:', e);
      }),
    ),
  );
  // Ativa imediatamente sem esperar fechar todas as abas.
  // Necessário para que novos deploys propaguem o JS atualizado na mesma sessão.
  self.skipWaiting();
});

// ── Ativação — limpa caches antigos e assume controle de todas as abas ───────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // Assume controle imediato de todas as abas abertas
      self.clients.claim(),
      // Remove caches de builds anteriores
      caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith('gestao3d-') && k !== CACHE_NAME && k !== HTML_CACHE)
            .map((k) => caches.delete(k)),
        ),
      ),
    ]),
  );
});

// ── Interceptação de requisições ──────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignora requisições não-GET e protocolos não-http(s)
  if (request.method !== 'GET') return;
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  // Supabase API → Network-Only (dados sempre frescos, nunca cachear)
  if (url.hostname.includes('supabase.co')) return;

  // Assets hashados do Vite → Stale-While-Revalidate
  // Os nomes são versionados pelo Vite, então URL única = entrada única no cache.
  // Não invalidar agressivamente evita ChunkLoadError em sessões longas pós-deploy.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(staleWhileRevalidate(request, CACHE_NAME));
    return;
  }

  // Outros estáticos → Stale-While-Revalidate em cache versionado
  if (
    request.destination === 'script' ||
    request.destination === 'style'  ||
    request.destination === 'font'   ||
    request.destination === 'image'
  ) {
    event.respondWith(staleWhileRevalidate(request, CACHE_NAME));
    return;
  }

  // Navegação HTML → Network-First (sempre tenta versão fresca)
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstHTML(request));
    return;
  }
});

// ── Estratégia: Stale-While-Revalidate ────────────────────────────────────────
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const networkPromise = fetch(request)
    .then((response) => {
      if (response && response.ok) {
        cache.put(request, response.clone()).catch(() => {});
      }
      return response;
    })
    .catch(() => null);

  // Se há cópia em cache, devolve já e atualiza em background.
  // Caso contrário, espera a rede.
  if (cached) {
    networkPromise.catch(() => {}); // garante que erro não vire unhandledrejection
    return cached;
  }
  const fresh = await networkPromise;
  if (fresh) return fresh;

  return new Response('Recurso indisponível.', {
    status: 503,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

// ── Estratégia: Network-First para HTML ───────────────────────────────────────
async function networkFirstHTML(request) {
  const cache = await caches.open(HTML_CACHE);
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  } catch {
    // Offline: tenta o cache exato
    const cached = await cache.match(request);
    if (cached) return cached;

    // Fallback: raiz da app (SPA shell)
    const fallback = await cache.match(OFFLINE_URL);
    if (fallback) return fallback;

    return new Response('Você está offline. Reconecte-se para continuar.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}

// ── Mensagens vindas da UI ────────────────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    // Usuário clicou em "Atualizar agora" no UpdatePrompt → assume controle.
    self.skipWaiting();
  }
  if (event.data?.type === 'CLEAR_CACHES') {
    // Botão de pânico: limpa tudo (chamado em fluxos de logout/erro fatal)
    event.waitUntil(
      caches.keys().then((keys) =>
        Promise.all(keys.filter((k) => k.startsWith('gestao3d-')).map((k) => caches.delete(k))),
      ),
    );
  }
});

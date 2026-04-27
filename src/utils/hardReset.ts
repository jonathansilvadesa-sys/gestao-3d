/**
 * hardReset.ts — limpeza profunda do estado local do app no navegador.
 *
 * Resolve casos em que o usuário "só consegue acessar em aba anônima":
 *   - localStorage / sessionStorage (sessão Supabase, tenant, prefs)
 *   - Cookies do domínio (incluindo SameSite=Lax do OAuth)
 *   - Cache Storage (assets/HTML cacheados pelo Service Worker)
 *   - IndexedDB (auth-token storage do Supabase em alguns navegadores + nossa fila offline)
 *   - Service Workers registrados
 *
 * NÃO limpa cookies HttpOnly nem cookies de outros domínios — isso é
 * impossível por JS por design da plataforma. Por isso, em último caso,
 * orientamos o usuário a fazer "Clear site data" no DevTools.
 */

const KEEP_KEYS = new Set<string>([
  // Mantém preferências inocentes (tema). Tudo o mais é apagado.
  'gestao3d_theme',
]);

function clearWebStorage(): void {
  try {
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && !KEEP_KEYS.has(k)) toRemove.push(k);
    }
    toRemove.forEach((k) => localStorage.removeItem(k));
  } catch { /* modo privado pode bloquear */ }

  try { sessionStorage.clear(); } catch { /* idem */ }
}

function clearCookies(): void {
  // Limpa todos os cookies acessíveis por JS para o domínio atual.
  // Para cobrir variações de path/domain, expira em ambos os scopes.
  try {
    const cookies = document.cookie ? document.cookie.split(';') : [];
    const host = window.location.hostname;
    const baseDomain = host.split('.').slice(-2).join('.'); // ex: vercel.app

    const expire = 'expires=Thu, 01 Jan 1970 00:00:00 GMT';

    cookies.forEach((raw) => {
      const eq = raw.indexOf('=');
      const name = (eq > -1 ? raw.substring(0, eq) : raw).trim();
      if (!name) return;

      // Tenta apagar em várias combinações de path/domain
      const variants = [
        `${name}=; ${expire}; path=/`,
        `${name}=; ${expire}; path=/; domain=${host}`,
        `${name}=; ${expire}; path=/; domain=.${host}`,
        `${name}=; ${expire}; path=/; domain=.${baseDomain}`,
      ];
      variants.forEach((v) => { document.cookie = v; });
    });
  } catch { /* ignora */ }
}

async function clearCacheStorage(): Promise<void> {
  if (!('caches' in window)) return;
  try {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
  } catch { /* ignora */ }
}

async function clearIndexedDB(): Promise<void> {
  if (!('indexedDB' in window)) return;
  try {
    // databases() é suportado em Chrome/Edge/Firefox modernos.
    // Em Safari antigo, esse método não existe — caímos para deletar
    // bancos conhecidos pelo nome.
    const anyIDB = indexedDB as IDBFactory & { databases?: () => Promise<{ name?: string }[]> };

    let names: string[] = [];
    if (typeof anyIDB.databases === 'function') {
      try {
        const list = await anyIDB.databases();
        names = list.map((d) => d.name).filter((n): n is string => !!n);
      } catch { /* ignora */ }
    }

    // Bancos conhecidos do app + Supabase fallback storage
    const known = ['gestao3d-offline-queue', 'supabase-auth-storage', 'localforage', 'keyval-store'];
    const all = Array.from(new Set([...names, ...known]));

    await Promise.all(all.map((name) => new Promise<void>((resolve) => {
      try {
        const req = indexedDB.deleteDatabase(name);
        req.onsuccess = () => resolve();
        req.onerror   = () => resolve();
        req.onblocked = () => resolve();
      } catch { resolve(); }
    })));
  } catch { /* ignora */ }
}

async function unregisterServiceWorkers(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((r) => r.unregister().catch(() => false)));
  } catch { /* ignora */ }
}

/**
 * Executa a limpeza completa e (opcionalmente) recarrega a página.
 * @param reload  Se true (default), faz window.location.replace('/') no final.
 */
export async function hardReset(reload: boolean = true): Promise<void> {
  // Ordem importa: SW primeiro para não atrapalhar o reload final.
  await unregisterServiceWorkers();
  await clearCacheStorage();
  await clearIndexedDB();
  clearWebStorage();
  clearCookies();

  if (reload) {
    // Pequeno delay para garantir que o navegador processou o unregister
    setTimeout(() => {
      // replace evita que o usuário volte para a URL com ?reset=1
      window.location.replace('/');
    }, 50);
  }
}

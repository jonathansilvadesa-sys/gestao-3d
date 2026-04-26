import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider }      from '@/contexts/AuthContext';
import { TenantProvider }    from '@/contexts/TenantContext';
import { SettingsProvider }  from '@/contexts/SettingsContext';
import { ProductProvider }   from '@/contexts/ProductContext';
import { MaterialProvider }  from '@/contexts/MaterialContext';
import { CanaisProvider }    from '@/contexts/CanaisContext';
import { AcessorioProvider } from '@/contexts/AcessorioContext';
import { ThemeProvider }     from '@/contexts/ThemeContext';
import { HardwareProvider }  from '@/contexts/HardwareContext';
import { PedidosProvider }   from '@/contexts/PedidosContext';
import { ToastProvider }     from '@/contexts/ToastContext';
import { TourProvider }         from '@/contexts/TourContext';
import { PermissionsProvider }  from '@/contexts/PermissionsContext';
import { UpdatePrompt }     from '@/components/shared/UpdatePrompt';
import './index.css';
import App from './App';
import { flushOfflineQueue } from '@/lib/db';

// ── Recovery contra ChunkLoadError pós-deploy ─────────────────────────────────
// Quando o Vercel publica um build novo, os chunks lazy mudam de hash.
// Se a aba já estava aberta com o HTML antigo, qualquer import() dinâmico
// (modais lazy, etc.) cai num arquivo que não existe mais → ChunkLoadError.
// Estratégia: detectar e recarregar UMA vez (com guarda em sessionStorage
// para não entrar em loop se o erro for outro).
const CHUNK_RELOAD_KEY = 'gestao3d_chunk_reload_at';

function isChunkError(message: unknown): boolean {
  const m = String(message ?? '');
  return /Loading chunk \S+ failed/i.test(m)
      || /Failed to fetch dynamically imported module/i.test(m)
      || /Importing a module script failed/i.test(m)
      || /ChunkLoadError/i.test(m);
}

function maybeReloadOnChunkError(message: unknown): void {
  if (!isChunkError(message)) return;
  const last = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) ?? '0');
  // Se já recarregou nos últimos 30s, não tenta de novo (evita loop)
  if (Date.now() - last < 30_000) {
    console.warn('[chunk] erro reincidente, pulando reload automático para evitar loop.');
    return;
  }
  sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()));
  console.warn('[chunk] erro detectado, recarregando para puxar novo build…');
  window.location.reload();
}

window.addEventListener('error', (e) => maybeReloadOnChunkError(e.message));
window.addEventListener('unhandledrejection', (e) => {
  const reason = e.reason as { message?: unknown; name?: unknown } | undefined;
  maybeReloadOnChunkError(reason?.message ?? reason?.name ?? reason);
});

// ── Service Worker ────────────────────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then((reg) => {
        console.info('[SW] registrado:', reg.scope);

        // Já existe um SW novo aguardando (carregou após install ter terminado)?
        if (reg.waiting && navigator.serviceWorker.controller) {
          window.dispatchEvent(new CustomEvent('sw-update-available', { detail: reg }));
        }

        // Detecta novo SW chegando enquanto a aba está aberta
        reg.addEventListener('updatefound', () => {
          const installing = reg.installing;
          if (!installing) return;
          installing.addEventListener('statechange', () => {
            // 'installed' + já existe controller = é uma atualização
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              window.dispatchEvent(new CustomEvent('sw-update-available', { detail: reg }));
            }
          });
        });

        // Checa por update a cada 60 min (caso a aba fique aberta o dia todo)
        setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000);
      })
      .catch((e) => console.warn('[SW] falha no registro:', e));
  });

  // Quando voltar a ficar online, sincroniza a fila de escritas pendentes
  window.addEventListener('online', () => {
    console.info('[SW] online — flushing queue...');
    flushOfflineQueue().catch(console.warn);
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      {/* UpdatePrompt fica fora dos providers de dados — sempre visível, mesmo
          em telas de loading/login/erro, para que o usuário sempre consiga
          aceitar uma nova versão e sair de cache zumbi. */}
      <UpdatePrompt />
      <AuthProvider>
        {/* TenantProvider usa useAuth() internamente — fica dentro de AuthProvider */}
        <TenantProvider>
          <SettingsProvider>
            <CanaisProvider>
              <ProductProvider>
                <MaterialProvider>
                  <AcessorioProvider>
                    <HardwareProvider>
                      <PedidosProvider>
                        <ToastProvider>
                          <PermissionsProvider>
                          <TourProvider>
                            <App />
                          </TourProvider>
                        </PermissionsProvider>
                        </ToastProvider>
                      </PedidosProvider>
                    </HardwareProvider>
                  </AcessorioProvider>
                </MaterialProvider>
              </ProductProvider>
            </CanaisProvider>
          </SettingsProvider>
        </TenantProvider>
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>
);

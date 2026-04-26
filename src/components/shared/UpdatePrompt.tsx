/**
 * UpdatePrompt.tsx — Banner que aparece quando há um Service Worker
 * novo aguardando ativação.
 *
 * Fluxo:
 *   1. main.tsx registra o SW e dispara o evento custom 'sw-update-available'
 *      passando o ServiceWorkerRegistration via event.detail.
 *   2. Este componente escuta o evento, guarda o registration e mostra o banner.
 *   3. Ao clicar em "Atualizar agora": postMessage SKIP_WAITING → ouvinte
 *      controllerchange recarrega a página com o SW novo no comando.
 *   4. "Depois" apenas oculta o banner; ele reaparece no próximo update.
 */

import { useEffect, useState } from 'react';

export function UpdatePrompt() {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    function onUpdateAvailable(e: Event) {
      const reg = (e as CustomEvent<ServiceWorkerRegistration>).detail;
      setRegistration(reg);
      setDismissed(false);
    }
    window.addEventListener('sw-update-available', onUpdateAvailable);
    return () => window.removeEventListener('sw-update-available', onUpdateAvailable);
  }, []);

  // Recarrega a página assim que o novo SW assumir o controle
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    let refreshed = false;
    const onControllerChange = () => {
      if (refreshed) return;
      refreshed = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
    return () => navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
  }, []);

  const handleUpdate = () => {
    const waiting = registration?.waiting;
    if (waiting) {
      waiting.postMessage({ type: 'SKIP_WAITING' });
      // controllerchange vai disparar reload em seguida
    } else {
      // Edge case: registration sem waiting (já assumiu): apenas recarrega
      window.location.reload();
    }
  };

  if (!registration || dismissed) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[10000] w-[min(92vw,420px)]">
      <div className="bg-white dark:bg-gray-800 border border-indigo-200 dark:border-indigo-700 rounded-2xl shadow-2xl px-4 py-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-lg shrink-0">
          ↻
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
            Nova versão disponível
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Recarregue para evitar erros de carregamento.
          </p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-xs font-semibold text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 px-2 py-2"
          type="button"
        >
          Depois
        </button>
        <button
          onClick={handleUpdate}
          className="text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:opacity-90 transition rounded-xl px-3 py-2"
          type="button"
        >
          Atualizar
        </button>
      </div>
    </div>
  );
}

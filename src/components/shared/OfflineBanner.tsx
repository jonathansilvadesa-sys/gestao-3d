import { useEffect, useState } from 'react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

/**
 * Banner deslizante que aparece no topo quando o dispositivo perde conexão.
 * O app continua funcionando normalmente (dados em localStorage).
 */
export function OfflineBanner() {
  const isOnline = useOnlineStatus();
  const [visible, setVisible] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);
  const [showReconnected, setShowReconnected] = useState(false);

  // Mostra o banner offline
  useEffect(() => {
    if (!isOnline) {
      setVisible(true);
      setWasOffline(true);
      setShowReconnected(false);
    }
  }, [isOnline]);

  // Mostra "reconectado" brevemente ao voltar online
  useEffect(() => {
    if (isOnline && wasOffline) {
      setVisible(false);
      setShowReconnected(true);
      const t = setTimeout(() => setShowReconnected(false), 3000);
      return () => clearTimeout(t);
    }
  }, [isOnline, wasOffline]);

  if (!visible && !showReconnected) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold transition-all duration-300 ${
        showReconnected
          ? 'bg-emerald-500 text-white'
          : 'bg-gray-900 text-white'
      }`}
      style={{ paddingTop: 'max(10px, env(safe-area-inset-top))' }}
    >
      {showReconnected ? (
        <>
          <span>✅</span>
          <span>Conexão restaurada — tudo sincronizado</span>
        </>
      ) : (
        <>
          <span>📡</span>
          <span>Sem conexão — o app continua funcionando normalmente</span>
          <button
            onClick={() => setVisible(false)}
            className="ml-auto text-white/70 hover:text-white transition text-base leading-none"
            aria-label="Fechar aviso"
          >
            ×
          </button>
        </>
      )}
    </div>
  );
}

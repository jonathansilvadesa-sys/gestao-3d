/**
 * Utilitários de Notificação Nativa (Web Notifications API).
 * Usado para alertas críticos como estoque zerado.
 */

const APP_ICON = '/icon.svg';

/** Pede permissão ao usuário (só exibe o prompt uma vez por sessão). */
export async function pedirPermissaoNotificacao(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'default') return;

  try {
    await Notification.requestPermission();
  } catch {
    // Alguns browsers não suportam a versão Promise
  }
}

/** Retorna true se as notificações estão permitidas. */
export function notificacoesAtivas(): boolean {
  return typeof window !== 'undefined'
    && 'Notification' in window
    && Notification.permission === 'granted';
}

/** Dispara uma notificação de estoque zerado para uma peça. */
export function notificarEstoqueZerado(nomePeca: string): void {
  if (!notificacoesAtivas()) return;

  try {
    const notif = new Notification('⚠️ Estoque Zerado — Gestão 3D', {
      body: `"${nomePeca}" ficou sem estoque. Hora de produzir mais!`,
      icon: APP_ICON,
      badge: APP_ICON,
      tag: `estoque-zerado-${nomePeca}`, // evita duplicatas para a mesma peça
    });

    // Fecha automaticamente após 8 segundos
    setTimeout(() => notif.close(), 8000);
  } catch {
    // Silencia erros de permissão em contextos não-HTTPS ou bloqueados
  }
}

/** Dispara notificação de filamento crítico (< 10%). */
export function notificarFilamentoCritico(nomeFilamento: string, gramas: number): void {
  if (!notificacoesAtivas()) return;

  try {
    const notif = new Notification('🧵 Filamento Crítico — Gestão 3D', {
      body: `"${nomeFilamento}" tem apenas ${gramas.toFixed(0)}g restantes.`,
      icon: APP_ICON,
      badge: APP_ICON,
      tag: `filamento-critico-${nomeFilamento}`,
    });
    setTimeout(() => notif.close(), 8000);
  } catch { /* silencia */ }
}

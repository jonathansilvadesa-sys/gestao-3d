import type { AppTab } from '@/types';

interface Props {
  tab: AppTab;
  setTab: (t: AppTab) => void;
  totalEstoque: number;
}

// SVG icons inline — sem dependência externa
const TABS: { key: AppTab; label: string; icon: JSX.Element }[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1"/>
        <rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/>
        <rect x="14" y="14" width="7" height="7" rx="1"/>
      </svg>
    ),
  },
  {
    key: 'produtos',
    label: 'Peças',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="21 8 21 21 3 21 3 8"/>
        <rect x="1" y="3" width="22" height="5"/>
        <line x1="10" y1="12" x2="14" y2="12"/>
      </svg>
    ),
  },
  {
    key: 'materiais',
    label: 'Materiais',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <circle cx="12" cy="12" r="3"/>
        <line x1="12" y1="2" x2="12" y2="9"/>
        <line x1="12" y1="15" x2="12" y2="22"/>
        <line x1="2" y1="12" x2="9" y2="12"/>
        <line x1="15" y1="12" x2="22" y2="12"/>
      </svg>
    ),
  },
  {
    key: 'estoque',
    label: 'Estoque',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
        <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
        <line x1="12" y1="22.08" x2="12" y2="12"/>
      </svg>
    ),
  },
  {
    key: 'pedidos',
    label: 'Pedidos',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
        <line x1="3" y1="6" x2="21" y2="6"/>
        <path d="M16 10a4 4 0 0 1-8 0"/>
      </svg>
    ),
  },
  {
    key: 'kanban',
    label: 'Tarefas',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="5" height="18" rx="1"/>
        <rect x="10" y="3" width="5" height="12" rx="1"/>
        <rect x="17" y="3" width="5" height="8" rx="1"/>
      </svg>
    ),
  },
];

export function BottomTabBar({ tab, setTab, totalEstoque }: Props) {
  return (
    <nav
      className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 flex"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {TABS.map(({ key, label, icon }) => {
        const active = tab === key;

        return (
          <button
            key={key}
            data-tour={`tab-${key}`}
            onClick={() => setTab(key)}
            className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-1 relative transition-colors min-h-[56px] ${
              active
                ? 'text-indigo-600 dark:text-indigo-400'
                : 'text-gray-400 dark:text-gray-500'
            }`}
          >
            {/* Linha indicadora ativa no topo */}
            {active && (
              <span className="absolute top-0 left-[20%] right-[20%] h-[2px] bg-indigo-600 dark:bg-indigo-400 rounded-full" />
            )}

            {/* Ícone com escala ao ativar */}
            <span className={`transition-transform duration-150 ${active ? 'scale-110' : ''}`}>
              {icon}
            </span>

            {/* Label */}
            <span className="text-[10px] font-semibold leading-none">{label}</span>

            {/* Badge contador no Estoque */}
            {key === 'estoque' && totalEstoque > 0 && (
              <span className="absolute top-2 left-[calc(50%+4px)] min-w-[16px] h-4 px-0.5 bg-emerald-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                {totalEstoque > 9 ? '9+' : totalEstoque}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}

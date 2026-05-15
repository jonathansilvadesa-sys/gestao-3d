import type { AppTab } from '@/types';
import {
  IconProdutos, IconMateriais,
  IconEstoque, IconPedidos, IconKanban,
} from '@/components/layout/TabIcons';

interface Props {
  tab: AppTab;
  setTab: (t: AppTab) => void;
  totalEstoque: number;
}

// Máximo 5 itens (guideline mobile: bottom nav ≤5)
// Dashboard acessível pelo logo 🖨 no topo do Header
const TABS: { key: AppTab; label: string; icon: JSX.Element }[] = [
  { key: 'produtos',  label: 'Peças',     icon: <IconProdutos  size={22} /> },
  { key: 'materiais', label: 'Materiais', icon: <IconMateriais size={22} /> },
  { key: 'estoque',   label: 'Estoque',   icon: <IconEstoque   size={22} /> },
  { key: 'pedidos',   label: 'Pedidos',   icon: <IconPedidos   size={22} /> },
  { key: 'kanban',    label: 'Tarefas',   icon: <IconKanban    size={22} /> },
];

export function BottomTabBar({ tab, setTab, totalEstoque }: Props) {
  return (
    <nav
      className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 flex"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Navegação principal"
    >
      {TABS.map(({ key, label, icon }) => {
        const active = tab === key;

        return (
          <button
            key={key}
            data-tour={`tab-${key}`}
            onClick={() => setTab(key)}
            aria-label={label}
            aria-current={active ? 'page' : undefined}
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
            <span className="text-[10px] font-semibold leading-none" aria-hidden="true">{label}</span>

            {/* Badge contador no Estoque */}
            {key === 'estoque' && totalEstoque > 0 && (
              <span className="absolute top-2 left-[calc(50%+4px)] min-w-[16px] h-4 px-0.5 bg-emerald-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none" aria-hidden="true">
                {totalEstoque > 9 ? '9+' : totalEstoque}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}

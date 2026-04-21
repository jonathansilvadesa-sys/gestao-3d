import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { Joyride, STATUS, EVENTS } from 'react-joyride';
import type { Step, EventData, Controls, BeforeHook } from 'react-joyride';
import type { AppTab } from '@/types';

// ─── Chave de controle ────────────────────────────────────────────────────────
const TOUR_KEY = 'gestao3d_tourCompleted';

// ─── Helper: conteúdo de cada step ────────────────────────────────────────────
function StepContent({ title, children, note }: {
  title: string;
  children: React.ReactNode;
  note?: string;
}) {
  return (
    <div className="space-y-2 py-1">
      <p className="font-bold text-gray-800 text-sm">{title}</p>
      <div className="text-sm text-gray-500 leading-relaxed">{children}</div>
      {note && <p className="text-xs font-medium text-indigo-600 mt-1">{note}</p>}
    </div>
  );
}

// ─── Construção dos steps ─────────────────────────────────────────────────────
//
// DECISÃO DE ARQUITETURA — todos os steps usam target:'body' + placement:'center'
// exceto steps 1 e 2 que apontam para cards do Dashboard (elementos estáveis).
//
// Motivo: steps que apontavam para botões do BottomTabBar ou elementos dentro
// de SwipeableCard (overflow:hidden) causavam TARGET_NOT_FOUND no mobile.
// A solução foi remover esses steps e incluir a informação de localização
// ("Na aba Estoque...") diretamente no texto de cada step.
//
// Tour: 7 steps (0–6)
//   0  Bem-vindo
//   1  Capital Imobilizado     → aponta dashboard-patrimonio
//   2  Break-even              → aponta dashboard-breakeven
//   3  Aba Estoque             → body/center (antes navega para estoque)
//   4  Taxa de Falha           → body/center (já em estoque)
//   5  Aba Materiais           → body/center (antes navega para materiais)
//   6  Fim
//
function buildTourSteps(navigate: ((tab: AppTab) => void) | null): Step[] {

  const delay = (ms: number): Promise<void> =>
    new Promise((r) => setTimeout(r, ms));

  // Navega para dashboard antes dos steps 1–2
  const beforeDashboard: BeforeHook = async () => {
    try { navigate?.('dashboard'); } catch { /* silent */ }
    await delay(150);
  };

  // Navega para estoque antes dos steps 3–4
  const beforeEstoque: BeforeHook = async () => {
    try { navigate?.('estoque'); } catch { /* silent */ }
    await delay(150);
  };

  // Navega para materiais antes do step 5
  const beforeMateriais: BeforeHook = async () => {
    try { navigate?.('materiais'); } catch { /* silent */ }
    await delay(150);
  };

  return [

  // ── 0 — Bem-vindo ──────────────────────────────────────────────────────────
  {
    target: 'body',
    placement: 'center',
    skipBeacon: true,
    content: (
      <div className="text-center py-2 space-y-3">
        <div className="text-4xl">🚀</div>
        <h2 className="text-lg font-bold text-gray-800">Bem-vindo, Maker!</h2>
        <p className="text-sm text-gray-500 leading-relaxed">
          Vamos transformar seus <strong>G-codes em lucro real</strong>.<br />
          Este guia mostra as partes essenciais do sistema.
        </p>
        <p className="text-xs text-indigo-500 font-medium">Leva menos de 1 minuto ⚡</p>
      </div>
    ),
  },

  // ── 1 — Dashboard: Capital Imobilizado ────────────────────────────────────
  {
    target: '[data-tour="dashboard-patrimonio"]',
    placement: 'bottom',
    skipBeacon: true,
    before: beforeDashboard,
    content: (
      <StepContent title="💰 Capital Imobilizado">
        O <strong>dinheiro real investido</strong> nas suas peças, avaliado pelo custo de produção — não pelo preço de venda. É o capital que saiu do seu bolso e ainda não voltou.
      </StepContent>
    ),
  },

  // ── 2 — Dashboard: Break-even ──────────────────────────────────────────────
  {
    target: '[data-tour="dashboard-breakeven"]',
    placement: 'top',
    skipBeacon: true,
    content: (
      <StepContent title="⚖️ Ponto de Equilíbrio (Break-even)">
        Mostra <strong>quantas vendas ainda faltam</strong> para recuperar o investimento em cada produto. Enquanto estiver abaixo do break-even, o capital ainda está "parado" no estoque.
      </StepContent>
    ),
  },

  // ── 3 — Aba Estoque: Produzir / Vender / Falha ────────────────────────────
  // Antes navega para estoque. Texto explica onde encontrar os botões.
  {
    target: 'body',
    placement: 'center',
    skipBeacon: true,
    before: beforeEstoque,
    content: (
      <StepContent title="📦 Aba Estoque — Movimentações">
        <p>
          Na <strong>aba Estoque</strong>, cada produto tem 4 ações:
        </p>
        <ul className="mt-1 space-y-0.5 text-xs">
          <li>🖨️ <strong>Produzir</strong> — adiciona ao estoque e desconta filamento automaticamente</li>
          <li>🏷️ <strong>Vender</strong> — registra a saída e calcula o lucro</li>
          <li>💀 <strong>Falha</strong> — desconta filamento sem adicionar ao estoque</li>
          <li>✏️ <strong>Ajuste</strong> — correção manual sem gatilhos</li>
        </ul>
        <p className="mt-1 text-indigo-500 text-xs">💡 No celular, deslize o card para a esquerda para ação rápida.</p>
      </StepContent>
    ),
  },

  // ── 4 — Taxa de Falha ──────────────────────────────────────────────────────
  // Ainda em estoque — texto explica onde ver a taxa.
  {
    target: 'body',
    placement: 'center',
    skipBeacon: true,
    content: (
      <StepContent
        title="💀 Taxa de Falha Real"
        note="Amarelo ≥ 5%  ·  Vermelho ≥ 15%"
      >
        <p>
          Ainda na <strong>aba Estoque</strong>, abaixo do nome de cada produto você verá a taxa de falha acumulada.
        </p>
        <p className="mt-1">
          O sistema <strong>aprende com os erros</strong>: cada falha registrada desconta o filamento e ajusta automaticamente sua margem de segurança.
        </p>
      </StepContent>
    ),
  },

  // ── 5 — Aba Materiais: Filamentos + Barra de Peso ─────────────────────────
  // Antes navega para materiais. Texto explica onde encontrar e o que ver.
  {
    target: 'body',
    placement: 'center',
    skipBeacon: true,
    before: beforeMateriais,
    content: (
      <StepContent
        title="🧵 Aba Materiais — Filamentos"
        note="Verde > 50%  ·  Amarelo > 20%  ·  Vermelho ≤ 20%"
      >
        <p>
          Na <strong>aba Materiais</strong>, cadastre seus rolos de filamento e acompanhe o peso restante de cada um pela barra colorida.
        </p>
        <p className="mt-1">
          O sistema manda alertas no <strong>🔔 sininho</strong> quando o estoque estiver acabando — antes de você ser pego de surpresa no meio de uma impressão.
        </p>
      </StepContent>
    ),
  },

  // ── 6 — Fim ────────────────────────────────────────────────────────────────
  {
    target: 'body',
    placement: 'center',
    skipBeacon: true,
    content: (
      <div className="text-center py-2 space-y-3">
        <div className="text-4xl">🎉</div>
        <h2 className="text-lg font-bold text-gray-800">Você está pronto!</h2>
        <p className="text-sm text-gray-500 leading-relaxed">
          Cadastre seu primeiro produto, adicione os filamentos e comece a registrar suas produções.<br />
          <strong>Boa sorte, Maker!</strong>
        </p>
        <p className="text-xs text-gray-400 mt-1">
          O ícone <strong className="text-indigo-600">?</strong> no canto da tela reinicia este guia a qualquer hora.
        </p>
      </div>
    ),
  },

  ];
}

// ─── Opções do Joyride v3 ─────────────────────────────────────────────────────
const JOYRIDE_OPTIONS = {
  primaryColor: '#4F46E5',
  backgroundColor: '#FFFFFF',
  overlayColor: 'rgba(0,0,0,0.55)',
  zIndex: 10000,
  showProgress: true,
  loaderDelay: 600,
  buttons: ['back', 'skip', 'primary'] as ('back' | 'close' | 'primary' | 'skip')[],
};

const JOYRIDE_STYLES = {
  tooltip: {
    borderRadius: 16,
    padding: '20px 22px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
    maxWidth: typeof window !== 'undefined' && window.innerWidth < 640 ? 290 : 360,
  } as React.CSSProperties,
  buttonPrimary: {
    backgroundColor: '#4F46E5',
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 700,
    padding: '8px 18px',
  } as React.CSSProperties,
  buttonBack: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: 600,
    marginRight: 8,
  } as React.CSSProperties,
  buttonSkip: {
    color: '#9CA3AF',
    fontSize: 12,
  } as React.CSSProperties,
};

const LOCALE = {
  back: '← Voltar',
  close: 'Fechar',
  last: '🎉 Concluir',
  next: 'Próximo →',
  skip: 'Pular guia',
};

// ─── Context ──────────────────────────────────────────────────────────────────
interface TourContextType {
  startTour: () => void;
  tourCompleted: boolean;
  registerNavigate: (fn: (tab: AppTab) => void) => void;
}

const TourContext = createContext<TourContextType | null>(null);

export function TourProvider({ children }: { children: React.ReactNode }) {
  const [run, setRun]             = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [tourSteps, setTourSteps] = useState<Step[]>([]);

  const [tourCompleted, setTourCompleted] = useState<boolean>(
    () => localStorage.getItem(TOUR_KEY) === 'true'
  );

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const navigateRef = useRef<((tab: AppTab) => void) | null>(null);

  const registerNavigate = useCallback((fn: (tab: AppTab) => void) => {
    navigateRef.current = fn;
  }, []);

  const startTour = useCallback(() => {
    setTourSteps(buildTourSteps(navigateRef.current));
    setStepIndex(0);
    setRun(true);
  }, []);

  const finishTour = useCallback(() => {
    localStorage.setItem(TOUR_KEY, 'true');
    setTourCompleted(true);
    setRun(false);
  }, []);

  // Handler SÍNCRONO — Joyride v3 espera (data, controls) => void, não async.
  // Navegação assíncrona entre abas é feita pelos before hooks de cada step.
  // TARGET_NOT_FOUND: avança automaticamente para não travar o tour.
  const handleEvent = useCallback((_data: EventData, _controls: Controls) => {
    const { status, action, type, index } = _data;

    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      finishTour();
      return;
    }

    // Elemento não encontrado → avança para não travar
    if (type === EVENTS.TARGET_NOT_FOUND) {
      setStepIndex(index + 1);
      return;
    }

    if (type === EVENTS.STEP_AFTER) {
      if (action === 'close' || action === 'skip') {
        finishTour();
        return;
      }
      const nextIndex = action === 'next' ? index + 1 : Math.max(0, index - 1);
      setStepIndex(nextIndex);
    }
  }, [finishTour]);

  return (
    <TourContext.Provider value={{ startTour, tourCompleted, registerNavigate }}>
      {mounted && tourSteps.length > 0 && (
        <Joyride
          steps={tourSteps}
          run={run}
          stepIndex={stepIndex}
          continuous
          scrollToFirstStep={false}
          options={JOYRIDE_OPTIONS}
          styles={JOYRIDE_STYLES}
          locale={LOCALE}
          onEvent={handleEvent}
        />
      )}
      {children}
    </TourContext.Provider>
  );
}

export function useTour() {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error('useTour must be inside TourProvider');
  return ctx;
}

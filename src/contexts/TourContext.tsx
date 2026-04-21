import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { Joyride, STATUS, EVENTS } from 'react-joyride';
import type { Step, EventData, Controls, BeforeHook } from 'react-joyride';
import type { AppTab } from '@/types';

// ─── Chave de controle ────────────────────────────────────────────────────────
const TOUR_KEY = 'gestao3d_tourCompleted';

// ─── Helper: detecta mobile ───────────────────────────────────────────────────
function isMobile(): boolean {
  return typeof window !== 'undefined' && window.innerWidth < 640;
}

// ─── Helper: conteúdo de cada step ────────────────────────────────────────────
function StepContent({ title, children, note }: {
  title: string;
  children: React.ReactNode;
  note?: string;
}) {
  return (
    <div className="space-y-2 py-1">
      <p className="font-bold text-gray-800 text-sm">{title}</p>
      <p className="text-sm text-gray-500 leading-relaxed">{children}</p>
      {note && <p className="text-xs font-medium text-indigo-600 mt-1">{note}</p>}
    </div>
  );
}

// ─── Construção dos steps ─────────────────────────────────────────────────────
//
// DECISÃO DE ARQUITETURA:
// Steps 4, 5 e 7 usam target:'body' + placement:'center' em TODAS as telas.
// Motivos:
//  1. btn-produzir e taxa-falha ficam dentro de SwipeableCard overflow:hidden
//     → spotlight do Joyride fica clipado mesmo no desktop
//  2. taxa-falha só renderiza quando unidadesProduzidas > 0 (conditional render)
//     → elemento pode não existir no DOM → TARGET_NOT_FOUND → tour trava
//  3. filamento-barra pode estar fora do viewport na lista de materiais
//
// A navegação entre abas é feita pelos before hooks (Promise nativa do Joyride v3).
// Sem waitForElement — apenas delay fixo para o React re-renderizar a aba.
//
function buildTourSteps(
  navigate: ((tab: AppTab) => void) | null,
  mobile: boolean,
): Step[] {

  const delay = (ms: number): Promise<void> =>
    new Promise((r) => setTimeout(r, ms));

  // Navega para dashboard (step 1 — garante tab correta mesmo que user esteja em outra aba)
  const beforeDashboard: BeforeHook = async () => {
    try { navigate?.('dashboard'); } catch { /* silent */ }
    await delay(120);
  };

  // Navega para estoque (steps 4 e 5)
  const beforeEstoque: BeforeHook = async () => {
    try { navigate?.('estoque'); } catch { /* silent */ }
    await delay(150);
  };

  // Navega para materiais (step 7)
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
          Este guia rápido mostra as partes mais importantes do sistema.
        </p>
        <p className="text-xs text-indigo-500 font-medium">Leva menos de 1 minuto ⚡</p>
      </div>
    ),
  },

  // ── 1 — Dashboard: Capital Imobilizado ────────────────────────────────────
  // before: garante que estamos no dashboard (usuário pode iniciar de outra aba)
  {
    target: '[data-tour="dashboard-patrimonio"]',
    placement: 'bottom',
    skipBeacon: true,
    before: beforeDashboard,
    content: (
      <StepContent title="💰 Capital Imobilizado">
        Aqui você vê o <strong>dinheiro real investido</strong> nas suas peças, avaliado pelo custo de produção — não pelo preço de venda. É o capital que saiu do seu bolso e ainda não voltou.
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
        Este indicador mostra <strong>quantas vendas ainda faltam</strong> para recuperar o investimento em cada produto. Enquanto estiver abaixo do break-even, o capital ainda está "parado" no estoque.
      </StepContent>
    ),
  },

  // ── 3 — Tab Estoque (sempre visível no BottomTabBar) ──────────────────────
  {
    target: '[data-tour="tab-estoque"]',
    placement: 'auto' as const,
    skipBeacon: true,
    offset: 12,
    content: (
      <StepContent title="📦 Aba de Estoque">
        Aqui ficam os controles de movimentação. Cada produto tem 4 ações: <strong>Produzir</strong>, <strong>Vender</strong>, <strong>Falha</strong> e <strong>Ajuste manual</strong>.
        {mobile && (
          <span className="block mt-1 text-indigo-500 text-xs">
            💡 No celular, deslize um card para a esquerda para ação rápida.
          </span>
        )}
      </StepContent>
    ),
  },

  // ── 4 — Registrar Produção ─────────────────────────────────────────────────
  // target:body — btn-produzir está dentro de SwipeableCard overflow:hidden
  // before: navega para estoque + delay para re-render
  {
    target: 'body',
    placement: 'center',
    skipBeacon: true,
    before: beforeEstoque,
    content: (
      <StepContent title="🖨️ Registrar Produção">
        Sempre que terminar uma impressão, toque em <strong>Produzir</strong>. O sistema vai <strong>abater automaticamente o filamento</strong> dos rolos cadastrados e adicionar a peça ao estoque.
        {mobile && (
          <span className="block mt-1 text-indigo-500 text-xs">
            💡 Deslize o card para a esquerda para acesso rápido.
          </span>
        )}
      </StepContent>
    ),
  },

  // ── 5 — Taxa de Falha ──────────────────────────────────────────────────────
  // target:body — taxa-falha só renderiza quando unidadesProduzidas > 0
  // (render condicional → elemento pode não existir no DOM → TARGET_NOT_FOUND)
  {
    target: 'body',
    placement: 'center',
    skipBeacon: true,
    before: beforeEstoque,
    content: (
      <StepContent
        title="💀 Taxa de Falha Real"
        note="Amarelo ≥ 5%  ·  Vermelho ≥ 15%"
      >
        O sistema <strong>aprende com seus erros</strong>. Cada impressão que falhar, registre com o botão Falha. O filamento é descontado mas a peça não entra no estoque. A taxa ajusta sua margem de segurança.
      </StepContent>
    ),
  },

  // ── 6 — Tab Materiais (sempre visível no BottomTabBar) ────────────────────
  {
    target: '[data-tour="tab-materiais"]',
    placement: 'auto' as const,
    skipBeacon: true,
    offset: 12,
    content: (
      <StepContent title="🧵 Controle de Materiais">
        Aqui ficam seus filamentos, acessórios e peças de hardware. O sistema monitora o estoque e manda alertas no sininho 🔔 quando algo estiver acabando.
      </StepContent>
    ),
  },

  // ── 7 — Barra de peso do filamento ─────────────────────────────────────────
  // target:body — filamento-barra pode estar fora do viewport na lista
  // before: navega para materiais + delay para re-render
  {
    target: 'body',
    placement: 'center',
    skipBeacon: true,
    before: beforeMateriais,
    content: (
      <StepContent
        title="📊 Barra de Peso do Filamento"
        note="Verde > 50%  ·  Amarelo > 20%  ·  Vermelho ≤ 20%"
      >
        Monitore a <strong>saúde dos seus rolos</strong>. Quando a barra ficar vermelha, é hora de repor antes que você fique sem material no meio de uma impressão de 8 horas.
      </StepContent>
    ),
  },

  // ── 8 — Fim ────────────────────────────────────────────────────────────────
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
  // Não mostra loader para delays curtos (< 600ms)
  loaderDelay: 600,
  buttons: ['back', 'skip', 'primary'] as ('back' | 'close' | 'primary' | 'skip')[],
};

const JOYRIDE_STYLES = {
  tooltip: {
    borderRadius: 16,
    padding: '20px 22px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
    maxWidth: typeof window !== 'undefined' && window.innerWidth < 640 ? 290 : 340,
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
    const steps = buildTourSteps(navigateRef.current, isMobile());
    setTourSteps(steps);
    setStepIndex(0);
    setRun(true);
  }, []);

  const finishTour = useCallback(() => {
    localStorage.setItem(TOUR_KEY, 'true');
    setTourCompleted(true);
    setRun(false);
  }, []);

  // Handler SÍNCRONO (Joyride v3 espera void, não Promise<void>).
  // A navegação assíncrona entre abas é feita pelos `before` hooks em cada step.
  // TARGET_NOT_FOUND: avança o step automaticamente para não travar o tour.
  const handleEvent = useCallback((_data: EventData, _controls: Controls) => {
    const { status, action, type, index } = _data;

    // Tour encerrado pelo usuário (concluiu ou pulou)
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      finishTour();
      return;
    }

    // Elemento alvo não encontrado → avança automaticamente
    if (type === EVENTS.TARGET_NOT_FOUND) {
      setStepIndex((prev) => prev + 1);
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

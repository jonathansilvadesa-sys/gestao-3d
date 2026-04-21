import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { Joyride, STATUS, EVENTS } from 'react-joyride';
import type { Step, EventData, Controls, BeforeHook } from 'react-joyride';
import type { AppTab } from '@/types';

// ─── Chave de controle ────────────────────────────────────────────────────────
const TOUR_KEY = 'gestao3d_tourCompleted';

// ─── Helper: aguarda o elemento aparecer no DOM ───────────────────────────────
function waitForElement(selector: string, timeout = 1500): Promise<void> {
  return new Promise((resolve) => {
    if (document.querySelector(selector)) { resolve(); return; }
    const observer = new MutationObserver(() => {
      if (document.querySelector(selector)) {
        observer.disconnect();
        resolve();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => { observer.disconnect(); resolve(); }, timeout);
  });
}

// ─── Detecta mobile ───────────────────────────────────────────────────────────
function isMobileViewport(): boolean {
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
// A navegação entre abas é feita via `before` hook em cada step relevante.
// Joyride v3 aguarda a Promise do `before` antes de renderizar o tooltip —
// isso garante que o elemento alvo já está no DOM quando o Joyride posiciona.
// No mobile, steps que apontam para elementos dentro de SwipeableCard usam
// target:'body' + placement:'center' para evitar erro de posicionamento.
function buildTourSteps(
  navigate: ((tab: AppTab) => void) | null,
  mobile: boolean,
): Step[] {

  // Before hook — navega para estoque e aguarda o elemento (desktop only)
  const beforeEstoque: BeforeHook = async () => {
    navigate?.('estoque');
    if (!mobile) {
      await waitForElement('[data-tour="btn-produzir"]');
    }
    await new Promise<void>((r) => setTimeout(r, mobile ? 120 : 60));
  };

  // Before hook — step 5: permanece em estoque, aguarda taxa-falha (desktop)
  const beforeTaxaFalha: BeforeHook = async () => {
    if (!mobile) {
      await waitForElement('[data-tour="taxa-falha"]');
      await new Promise<void>((r) => setTimeout(r, 60));
    }
  };

  // Before hook — navega para materiais e aguarda barra de filamento (desktop)
  const beforeMateriais: BeforeHook = async () => {
    navigate?.('materiais');
    if (!mobile) {
      await waitForElement('[data-tour="filamento-barra"]');
    }
    await new Promise<void>((r) => setTimeout(r, mobile ? 120 : 60));
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

  // ── 1 — Dashboard: Card de Patrimônio ──────────────────────────────────────
  {
    target: '[data-tour="dashboard-patrimonio"]',
    placement: 'bottom',
    skipBeacon: true,
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

  // ── 3 — Tab Estoque ────────────────────────────────────────────────────────
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

  // ── 4 — Botão Produzir ─────────────────────────────────────────────────────
  // before: navega para estoque e aguarda o elemento (desktop) / delay (mobile)
  // mobile: usa body/center pois btn-produzir está dentro de SwipeableCard
  {
    target: mobile ? 'body' : '[data-tour="btn-produzir"]',
    placement: (mobile ? 'center' : 'left') as Step['placement'],
    skipBeacon: true,
    before: beforeEstoque,
    content: (
      <StepContent title="🖨️ Registrar Produção">
        Sempre que terminar uma impressão, toque em <strong>Produzir</strong>. O sistema vai <strong>abater automaticamente o filamento</strong> dos rolos cadastrados e adicionar a peça ao estoque.
        {mobile && (
          <span className="block mt-1 text-indigo-500 text-xs">
            💡 Deslize o card para a esquerda para acessar os botões de ação.
          </span>
        )}
      </StepContent>
    ),
  },

  // ── 5 — Taxa de Falha ──────────────────────────────────────────────────────
  // mobile: body/center — taxa-falha está dentro do mesmo SwipeableCard
  {
    target: mobile ? 'body' : '[data-tour="taxa-falha"]',
    placement: (mobile ? 'center' : 'top') as Step['placement'],
    skipBeacon: true,
    before: beforeTaxaFalha,
    content: (
      <StepContent
        title="💀 Taxa de Falha Real"
        note="Amarelo ≥ 5%  ·  Vermelho ≥ 15%"
      >
        O sistema <strong>aprende com seus erros</strong>. Cada impressão que falhar, registre com o botão Falha. O filamento é descontado mas a peça não entra no estoque. A taxa ajusta sua margem de segurança.
      </StepContent>
    ),
  },

  // ── 6 — Tab Materiais ──────────────────────────────────────────────────────
  // tab-materiais está sempre no BottomTabBar — sem before hook necessário
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
  // before: navega para materiais e aguarda o elemento (desktop) / delay (mobile)
  // mobile: body/center — filamento-barra está dentro de card com overflow
  {
    target: mobile ? 'body' : '[data-tour="filamento-barra"]',
    placement: (mobile ? 'center' : 'top') as Step['placement'],
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
  // Exibe loader apenas se o before hook demorar mais de 800ms
  loaderDelay: 800,
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
  const [run, setRun] = useState(false);
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
    // Detecta o viewport e captura navigate no momento em que o tour começa
    const steps = buildTourSteps(navigateRef.current, isMobileViewport());
    setTourSteps(steps);
    setStepIndex(0);
    setRun(true);
  }, []);

  const finishTour = useCallback(() => {
    localStorage.setItem(TOUR_KEY, 'true');
    setTourCompleted(true);
    setRun(false);
  }, []);

  // Handler SÍNCRONO — Joyride v3 espera void, não Promise<void>.
  // A navegação assíncrona entre abas é feita pelo `before` hook de cada step.
  const handleEvent = useCallback((_data: EventData, _controls: Controls) => {
    const { status, action, type, index } = _data;

    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      finishTour();
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
          scrollToFirstStep
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

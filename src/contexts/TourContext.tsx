import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { Joyride, STATUS } from 'react-joyride';
import type { Step, EventData } from 'react-joyride';
import type { AppTab } from '@/types';

// ─── Chave de controle ────────────────────────────────────────────────────────
const TOUR_KEY = 'gestao3d_tourCompleted';

// ─── Helper: aguarda o elemento aparecer no DOM (MutationObserver + timeout) ─
function waitForElement(selector: string, timeout = 2500): Promise<void> {
  return new Promise((resolve) => {
    if (document.querySelector(selector)) { resolve(); return; }

    const observer = new MutationObserver(() => {
      if (document.querySelector(selector)) {
        observer.disconnect();
        resolve();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    // Se o elemento não aparecer no prazo, resolve mesmo assim (não trava)
    setTimeout(() => { observer.disconnect(); resolve(); }, timeout);
  });
}

// ─── Mapeamento: índice do step → aba que precisa estar ativa ─────────────────
const STEP_TAB: Record<number, { tab: AppTab; selector: string }> = {
  4: { tab: 'estoque',   selector: '[data-tour="btn-produzir"]' },
  5: { tab: 'estoque',   selector: '[data-tour="taxa-falha"]'   },
  7: { tab: 'materiais', selector: '[data-tour="filamento-barra"]' },
};

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

// ─── Steps do tour ────────────────────────────────────────────────────────────
const TOUR_STEPS: Step[] = [
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
    placement: 'bottom',
    skipBeacon: true,
    content: (
      <StepContent title="📦 Aba de Estoque">
        Aqui ficam os controles de movimentação. Cada produto tem 4 ações: <strong>Produzir</strong>, <strong>Vender</strong>, <strong>Falha</strong> e <strong>Ajuste manual</strong> — cada um com seus próprios efeitos nos insumos.
      </StepContent>
    ),
  },

  // ── 4 — Botão Produzir ─────────────────────────────────────────────────────
  {
    target: '[data-tour="btn-produzir"]',
    placement: 'left',
    skipBeacon: true,
    content: (
      <StepContent title="🖨️ Registrar Produção">
        Sempre que terminar uma impressão, clique aqui. O sistema vai <strong>abater automaticamente o filamento</strong> dos rolos cadastrados e adicionar a peça ao estoque. Um toast confirmará o desconto.
      </StepContent>
    ),
  },

  // ── 5 — Taxa de Falha ──────────────────────────────────────────────────────
  {
    target: '[data-tour="taxa-falha"]',
    placement: 'top',
    skipBeacon: true,
    content: (
      <StepContent
        title="💀 Taxa de Falha Real"
        note="Amarelo ≥ 5%  ·  Vermelho ≥ 15%"
      >
        O sistema <strong>aprende com seus erros</strong>. Cada impressão que falhar, registre com o botão Falha. O filamento é descontado mas a peça não entra no estoque. A taxa serve para ajustar sua margem de segurança.
      </StepContent>
    ),
  },

  // ── 6 — Tab Materiais ──────────────────────────────────────────────────────
  {
    target: '[data-tour="tab-materiais"]',
    placement: 'bottom',
    skipBeacon: true,
    content: (
      <StepContent title="🧵 Controle de Materiais">
        Aqui ficam seus filamentos, acessórios e peças de hardware. O sistema monitora o estoque e manda alertas no sininho 🔔 quando algo estiver acabando — antes de você ser pego de surpresa.
      </StepContent>
    ),
  },

  // ── 7 — Barra de peso do filamento ─────────────────────────────────────────
  {
    target: '[data-tour="filamento-barra"]',
    placement: 'top',
    skipBeacon: true,
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

// ─── Opções do Joyride v3 ─────────────────────────────────────────────────────
const JOYRIDE_OPTIONS = {
  primaryColor: '#4F46E5',
  backgroundColor: '#FFFFFF',
  overlayColor: 'rgba(0,0,0,0.55)',
  zIndex: 10000,
  showProgress: true,
  buttons: ['back', 'skip', 'primary'] as ('back' | 'close' | 'primary' | 'skip')[],
};

const JOYRIDE_STYLES = {
  tooltip: {
    borderRadius: 16,
    padding: '20px 22px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
    maxWidth: 340,
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

  // Lê o localStorage apenas via inicializador de useState (seguro no cliente)
  const [tourCompleted, setTourCompleted] = useState<boolean>(
    () => localStorage.getItem(TOUR_KEY) === 'true'
  );

  // Garante que o Joyride só é inserido no DOM após a montagem completa.
  // Isso evita que o Joyride tente localizar elementos data-tour antes da
  // página estabilizar (causa do congelamento no Vercel com localStorage vazio).
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Referência para a função de navegação de aba (injetada pelo App)
  const navigateRef = useRef<((tab: AppTab) => void) | null>(null);

  const registerNavigate = useCallback((fn: (tab: AppTab) => void) => {
    navigateRef.current = fn;
  }, []);

  const startTour = useCallback(() => {
    setStepIndex(0);
    setRun(true);
  }, []);

  const finishTour = useCallback(() => {
    localStorage.setItem(TOUR_KEY, 'true');
    setTourCompleted(true);
    setRun(false);
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  const handleEvent = useCallback(async (data: EventData) => {
    const { status, action, type, index } = data;

    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      finishTour();
      return;
    }

    if (type === 'step:after') {
      if (action === 'close' || action === 'skip') {
        finishTour();
        return;
      }

      const nextIndex =
        action === 'next' ? index + 1 : Math.max(0, index - 1);

      // ── Navegar para a aba correta antes de avançar o step ──────────────────
      const stepNav = STEP_TAB[nextIndex];
      if (stepNav && navigateRef.current) {
        navigateRef.current(stepNav.tab);
        // Aguarda o elemento alvo aparecer no DOM (renderizado pelo React)
        await waitForElement(stepNav.selector);
        // Pequena pausa extra para o layout estabilizar antes do Joyride
        // reposicionar o tooltip sobre o elemento
        await new Promise<void>((r) => setTimeout(r, 80));
      }

      setStepIndex(nextIndex);
    }
  }, [finishTour]);

  return (
    <TourContext.Provider value={{ startTour, tourCompleted, registerNavigate }}>
      {/* Joyride só monta após o primeiro render completo (evita congelamento) */}
      {mounted && (
        <Joyride
          steps={TOUR_STEPS}
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

import { useRef, useState, type ReactNode } from 'react';

interface SwipeAction {
  label: string;
  icon: string;
  color: string;       // Tailwind bg class
  textColor?: string;  // Tailwind text class (default white)
  onAction: () => void;
}

interface Props {
  children: ReactNode;
  actions: SwipeAction[];   // aparece ao deslizar para a esquerda (máx 3)
  disabled?: boolean;       // desativa o swipe (ex: no desktop)
  className?: string;
}

const ACTION_WIDTH = 72; // px por botão de ação

/**
 * SwipeableCard — envolve um card e revela botões de ação ao deslizar para a esquerda.
 * Funciona apenas em dispositivos touch; ignorado no mouse.
 */
export function SwipeableCard({ children, actions, disabled = false, className = '' }: Props) {
  const [offset, setOffset]     = useState(0);
  const [swiped, setSwiped]     = useState(false);
  const startX  = useRef(0);
  const startY  = useRef(0);
  const dragging = useRef(false);
  const isHoriz  = useRef<boolean | null>(null); // null = não decidido ainda

  const maxSwipe = actions.length * ACTION_WIDTH;

  function handleTouchStart(e: React.TouchEvent) {
    if (disabled) return;
    startX.current  = e.touches[0].clientX;
    startY.current  = e.touches[0].clientY;
    dragging.current = true;
    isHoriz.current  = null;
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (!dragging.current || disabled) return;

    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - startY.current;

    // Determina direção dominante no primeiro movimento significativo
    if (isHoriz.current === null && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
      isHoriz.current = Math.abs(dx) > Math.abs(dy);
    }

    // Se o scroll é vertical, não interfere
    if (isHoriz.current === false) return;
    if (isHoriz.current === true) e.preventDefault();

    const base  = swiped ? -maxSwipe : 0;
    const raw   = base + dx;
    // Limita entre -maxSwipe (totalmente aberto) e +20px (elástico)
    const clamped = Math.max(-maxSwipe - 10, Math.min(20, raw));
    setOffset(clamped);
  }

  function handleTouchEnd() {
    if (!dragging.current || disabled) return;
    dragging.current = false;
    isHoriz.current  = null;

    const threshold = maxSwipe * 0.4;

    if (!swiped && offset < -threshold) {
      // Abre
      setOffset(-maxSwipe);
      setSwiped(true);
    } else if (swiped && offset > -(maxSwipe - threshold)) {
      // Fecha
      setOffset(0);
      setSwiped(false);
    } else {
      // Volta para estado anterior
      setOffset(swiped ? -maxSwipe : 0);
    }
  }

  function close() {
    setOffset(0);
    setSwiped(false);
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* ── Botões de ação (revelados ao swipe) ─────────────────────────────── */}
      <div
        className="absolute inset-y-0 right-0 flex"
        style={{ width: maxSwipe }}
      >
        {actions.map((a, i) => (
          <button
            key={i}
            onClick={() => { a.onAction(); close(); }}
            className={`flex-1 flex flex-col items-center justify-center gap-1 ${a.color} ${a.textColor ?? 'text-white'} transition-opacity`}
            style={{ opacity: Math.min(1, (-offset / maxSwipe)) }}
          >
            <span className="text-xl">{a.icon}</span>
            <span className="text-[10px] font-bold">{a.label}</span>
          </button>
        ))}
      </div>

      {/* ── Conteúdo deslizável ───────────────────────────────────────────── */}
      <div
        className="relative bg-white dark:bg-gray-800 touch-pan-y"
        style={{
          transform: `translateX(${offset}px)`,
          transition: dragging.current ? 'none' : 'transform 0.25s ease',
          willChange: 'transform',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
        {/* Overlay translúcido ao abrir — clicar fecha */}
        {swiped && (
          <div
            className="absolute inset-0 z-10"
            onClick={close}
          />
        )}
      </div>
    </div>
  );
}

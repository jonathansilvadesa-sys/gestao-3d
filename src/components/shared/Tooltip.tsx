import { useState, useRef, useEffect } from 'react';

interface TooltipProps {
  text: string;
  children?: React.ReactNode;
  /** Posição preferida: 'top' | 'bottom' | 'left' | 'right' */
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

/**
 * Tooltip genérico — envolve qualquer elemento filho.
 * Uso: <Tooltip text="Explicação"><span>elemento</span></Tooltip>
 */
export function Tooltip({ text, children, position = 'top', className = '' }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Fecha ao clicar fora (mobile)
  useEffect(() => {
    if (!visible) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setVisible(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [visible]);

  const posClass: Record<string, string> = {
    top:    'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left:   'right-full top-1/2 -translate-y-1/2 mr-2',
    right:  'left-full top-1/2 -translate-y-1/2 ml-2',
  };
  const arrowClass: Record<string, string> = {
    top:    'top-full left-1/2 -translate-x-1/2 border-t-gray-800',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-gray-800',
    left:   'left-full top-1/2 -translate-y-1/2 border-l-gray-800',
    right:  'right-full top-1/2 -translate-y-1/2 border-r-gray-800',
  };

  return (
    <div
      ref={ref}
      className={`relative inline-flex items-center ${className}`}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
      onClick={() => setVisible((v) => !v)}
    >
      {children}
      {visible && (
        <div
          role="tooltip"
          className={`absolute z-50 w-56 px-3 py-2 text-xs text-white bg-gray-800 rounded-xl shadow-xl leading-relaxed pointer-events-none ${posClass[position]}`}
          style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}
        >
          {text}
          {/* seta */}
          <span
            className={`absolute w-0 h-0 border-4 border-transparent ${arrowClass[position]}`}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Ícone (i) informativo com tooltip embutido.
 * Uso: <InfoTooltip text="Explicação do campo" />
 */
export function InfoTooltip({
  text,
  position = 'top',
  size = 14,
}: {
  text: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  size?: number;
}) {
  return (
    <Tooltip text={text} position={position}>
      <button
        type="button"
        tabIndex={0}
        aria-label="Mais informações"
        className="inline-flex items-center justify-center rounded-full text-indigo-400 hover:text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-colors ml-1 cursor-help"
        style={{ width: size + 4, height: size + 4 }}
      >
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      </button>
    </Tooltip>
  );
}

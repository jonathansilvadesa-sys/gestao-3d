import { useTour } from '@/contexts/TourContext';

/**
 * Botão flutuante (?) fixo no canto inferior direito.
 * Clique reinicia o tour de onboarding a qualquer momento.
 */
export function FloatingHelpButton() {
  const { startTour } = useTour();

  return (
    <button
      onClick={startTour}
      title="Rever guia de boas-vindas"
      aria-label="Abrir guia de usabilidade"
      className="fixed bottom-[72px] sm:bottom-6 left-4 sm:left-6 z-50 w-12 h-12 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl hover:shadow-2xl transition-all duration-200 flex items-center justify-center font-bold text-lg group"
      style={{ animation: 'fadeInScale 0.4s ease-out' }}
    >
      <span className="group-hover:scale-110 transition-transform duration-150 select-none">?</span>
      {/* Tooltip on hover */}
      <span className="absolute left-14 bottom-0 whitespace-nowrap bg-gray-900 text-white text-xs font-medium px-3 py-1.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none shadow-lg">
        Ver guia de boas-vindas
      </span>
    </button>
  );
}

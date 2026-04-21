/**
 * Skeleton — componentes de placeholder com animação shimmer.
 * Uso: mostrar enquanto dados ainda não carregaram.
 */

// ── Base shimmer ─────────────────────────────────────────────────────────────
function Shimmer({ className = '' }: { className?: string }) {
  return (
    <div
      className={`bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse ${className}`}
    />
  );
}

// ── Card de produto / dashboard ───────────────────────────────────────────────
export function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Shimmer className="w-10 h-10 rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Shimmer className="h-4 w-3/4" />
          <Shimmer className="h-3 w-1/2" />
        </div>
        <Shimmer className="w-12 h-6 rounded-full" />
      </div>
      {/* Métricas */}
      <div className="grid grid-cols-3 gap-2">
        <Shimmer className="h-12 rounded-xl" />
        <Shimmer className="h-12 rounded-xl" />
        <Shimmer className="h-12 rounded-xl" />
      </div>
      {/* Rodapé */}
      <div className="flex justify-between items-center">
        <Shimmer className="h-3 w-20" />
        <Shimmer className="h-3 w-24" />
      </div>
    </div>
  );
}

// ── Linha de tabela ───────────────────────────────────────────────────────────
export function SkeletonRow({ cols = 5 }: { cols?: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Shimmer className={`h-4 ${i === 0 ? 'w-32' : 'w-16 mx-auto'}`} />
        </td>
      ))}
    </tr>
  );
}

// ── KPI card (StatCard) ───────────────────────────────────────────────────────
export function SkeletonStat() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5 space-y-2">
      <Shimmer className="h-3 w-24" />
      <Shimmer className="h-7 w-3/4" />
      <Shimmer className="h-3 w-16" />
    </div>
  );
}

// ── Card de material / filamento ──────────────────────────────────────────────
export function SkeletonMaterialCard() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 flex items-center gap-3">
      <Shimmer className="w-10 h-10 rounded-xl flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Shimmer className="h-4 w-2/3" />
        <Shimmer className="h-3 w-1/2" />
      </div>
      <Shimmer className="w-16 h-8 rounded-xl" />
    </div>
  );
}

// ── Grade de skeletons de dashboard (KPIs + cards) ────────────────────────────
export function SkeletonDashboard() {
  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0,1,2,3].map((i) => <SkeletonStat key={i} />)}
      </div>
      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[0,1,2,3].map((i) => <SkeletonCard key={i} />)}
      </div>
    </div>
  );
}

// ── Lista de estoque ──────────────────────────────────────────────────────────
export function SkeletonEstoqueList() {
  return (
    <div className="space-y-3">
      {[0,1,2,3].map((i) => (
        <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Shimmer className="w-10 h-10 rounded-xl flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Shimmer className="h-4 w-1/2" />
              <Shimmer className="h-3 w-1/3" />
            </div>
            <Shimmer className="w-16 h-6 rounded-full" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Shimmer className="h-10 rounded-xl" />
            <Shimmer className="h-10 rounded-xl" />
            <Shimmer className="h-10 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}

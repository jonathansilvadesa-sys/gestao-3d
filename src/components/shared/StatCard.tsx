import { InfoTooltip } from '@/components/shared/Tooltip';

type ColorKey = 'indigo' | 'purple' | 'pink' | 'emerald' | 'amber';

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  color?: ColorKey;
  /** Texto do tooltip informativo (opcional) */
  tooltip?: string;
}

const gradients: Record<ColorKey, string> = {
  indigo: 'from-indigo-500 to-indigo-700',
  purple: 'from-purple-500 to-purple-700',
  pink:   'from-pink-500 to-pink-700',
  emerald:'from-emerald-500 to-emerald-700',
  amber:  'from-amber-500 to-amber-700',
};

export function StatCard({ label, value, sub, color = 'indigo', tooltip }: StatCardProps) {
  return (
    <div className={`bg-gradient-to-br ${gradients[color]} rounded-2xl p-5 text-white shadow-lg`}>
      <div className="flex items-center gap-1">
        <p className="text-xs font-semibold uppercase tracking-widest opacity-80">{label}</p>
        {tooltip && (
          <span className="opacity-70 hover:opacity-100 transition-opacity">
            <InfoTooltip text={tooltip} position="bottom" size={12} />
          </span>
        )}
      </div>
      <p className="text-3xl font-bold mt-1">{value}</p>
      {sub && <p className="text-xs mt-1 opacity-70">{sub}</p>}
    </div>
  );
}

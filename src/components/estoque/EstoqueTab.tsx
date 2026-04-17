import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { StatCard } from '@/components/shared/StatCard';
import { R, COLORS } from '@/utils/formatters';
import type { Product } from '@/types';

interface Props {
  products: Product[];
  onUpdateEstoque: (id: number, qty: number) => void;
}

export function EstoqueTab({ products, onUpdateEstoque }: Props) {
  const totalItens = products.reduce((a, p) => a + (p.estoque || 0), 0);
  const valorCusto = products.reduce((a, p) => a + (p.estoque || 0) * p.custoUn, 0);
  const valorVenda = products.reduce((a, p) => a + (p.estoque || 0) * p.precoConsumidor, 0);

  const chartData = products
    .filter((p) => (p.estoque || 0) > 0)
    .map((p) => ({
      name: p.nome.length > 10 ? p.nome.slice(0, 10) + '…' : p.nome,
      Unidades: p.estoque || 0,
    }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total em estoque" value={`${totalItens} un.`} color="indigo" />
        <StatCard label="Valor de custo"   value={R(valorCusto)}        color="purple" />
        <StatCard label="Valor de venda"   value={R(valorVenda)}        color="emerald" />
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h3 className="font-bold text-gray-700">Controle de Estoque</h3>
          <p className="text-xs text-gray-400 mt-1">Ajuste a quantidade de impressões disponíveis para cada peça</p>
        </div>
        <div className="divide-y divide-gray-50">
          {products.map((p, i) => {
            const estoque = p.estoque || 0;
            const statusColor = estoque === 0 ? '#ef4444' : estoque <= 2 ? '#f59e0b' : '#10b981';
            const statusLabel = estoque === 0 ? 'Sem estoque' : estoque <= 2 ? 'Estoque baixo' : 'Em estoque';

            return (
              <div key={p.id} className="flex items-center gap-4 px-5 py-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                  style={{ background: COLORS[i % COLORS.length] }}
                >
                  {p.nome[0]}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 truncate">{p.nome}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      style={{ background: statusColor, color: '#fff', padding: '1px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700 }}
                    >
                      {statusLabel}
                    </span>
                    <span className="text-xs text-gray-400">Preço: {R(p.precoConsumidor)}</span>
                  </div>
                </div>

                <div className="text-right hidden sm:block">
                  <p className="text-xs text-purple-400 font-semibold">Capital imobilizado</p>
                  <p className="font-bold text-purple-700">{R(estoque * p.custoUn)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Venda: {R(estoque * p.precoConsumidor)}</p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => onUpdateEstoque(p.id, Math.max(0, estoque - 1))}
                    className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-red-100 hover:text-red-600 text-gray-600 font-bold text-lg flex items-center justify-center transition"
                  >−</button>
                  <input
                    type="number" min="0"
                    value={estoque}
                    onChange={(e) => onUpdateEstoque(p.id, Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-16 text-center font-bold text-lg border-2 border-gray-200 rounded-xl py-1 focus:outline-none focus:border-indigo-400"
                  />
                  <button
                    onClick={() => onUpdateEstoque(p.id, estoque + 1)}
                    className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-emerald-100 hover:text-emerald-600 text-gray-600 font-bold text-lg flex items-center justify-center transition"
                  >+</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {totalItens > 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h3 className="font-bold text-gray-700 mb-4">Distribuição do Estoque</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Unidades" radius={[6,6,0,0]}>
                {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

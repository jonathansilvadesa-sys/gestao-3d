import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { R, pct, margem, COLORS } from '@/utils/formatters';
import type { Product } from '@/types';

interface Props {
  product: Product;
  onClose: () => void;
}

export function ProductModal({ product: p, onClose }: Props) {
  const custoAcess = p.acessorios.reduce((a, x) => a + x.qtd * x.custoUn, 0);
  const margemC = margem(p.lucroLiquidoConsumidor, p.precoConsumidor);
  const margemL = margem(p.lucroLiquidoLojista, p.precoLojista);

  const breakdownData = [
    { name: 'Filamento',  value: p.custoFilamento },
    { name: 'Energia',    value: p.custoEnergia },
    { name: 'Amortização',value: p.amortizacao },
    { name: 'Custo Fixo', value: p.custoFixoMes > 0 ? +(p.custoFixoMes / p.unidadesMes).toFixed(2) : 0 },
    { name: 'Acessórios', value: custoAcess / p.unidades },
  ].filter((d) => d.value > 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.55)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl mx-4 overflow-y-auto"
        style={{ maxHeight: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-t-3xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">{p.nome}</h2>
              <p className="text-sm opacity-80 mt-1">
                {p.tempo}h · {p.peso}g · {p.unidades} unid. · Markup {p.markup}x
              </p>
            </div>
            <button onClick={onClose} className="text-white opacity-70 hover:opacity-100 text-3xl font-light leading-none">×</button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-indigo-50 rounded-2xl p-4">
              <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Consumidor Final</p>
              <p className="text-2xl font-bold text-indigo-700 mt-1">{R(p.precoConsumidor)}</p>
              <p className="text-sm text-gray-500 mt-1">Lucro líq.: <span className="font-semibold text-emerald-600">{R(p.lucroLiquidoConsumidor)}</span></p>
              <p className="text-xs text-gray-400">Margem {margemC}%</p>
            </div>
            <div className="bg-purple-50 rounded-2xl p-4">
              <p className="text-xs font-bold text-purple-400 uppercase tracking-widest">Preço Lojista</p>
              <p className="text-2xl font-bold text-purple-700 mt-1">{R(p.precoLojista)}</p>
              <p className="text-sm text-gray-500 mt-1">Lucro líq.: <span className="font-semibold text-emerald-600">{R(p.lucroLiquidoLojista)}</span></p>
              <p className="text-xs text-gray-400">Margem {margemL}%</p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Custo por Unidade</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{R(p.custoUn)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">Custo total do lote</p>
              <p className="text-lg font-semibold text-gray-700">{R(p.custoTotal)}</p>
            </div>
          </div>

          <div>
            <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-3">Composição do Custo</p>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={breakdownData} dataKey="value" nameKey="name"
                  cx="50%" cy="50%" outerRadius={70}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {breakdownData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => R(v as number)} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div>
            <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-2">Detalhamento</p>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-100">
                {([
                  ['Filamento',                    R(p.custoFilamento)],
                  ['Energia elétrica',             R(p.custoEnergia)],
                  ['Amortização da impressora',    R(p.amortizacao)],
                  ['Custo fixo rateado',           R(p.custoFixoMes > 0 ? p.custoFixoMes / p.unidadesMes : 0)],
                  ['Acessórios / embalagem',       R(custoAcess)],
                  ['Imposto',                      pct(p.imposto)],
                  ['Taxa de cartão',               pct(p.txCartao)],
                  ['Custo de anúncio',             pct(p.custoAnuncio)],
                  ['Taxa de falhas',               pct(p.falhas)],
                ] as [string, string][]).map(([k, v]) => (
                  <tr key={k}>
                    <td className="py-2 text-gray-600">{k}</td>
                    <td className="py-2 text-right font-medium text-gray-800">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Filamentos */}
          {p.filamentos && p.filamentos.length > 0 && (
            <div>
              <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-2">🧵 Filamentos Utilizados</p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-400 text-xs">
                    <th className="text-left pb-1">Filamento</th>
                    <th className="text-right pb-1">Peso (g)</th>
                    <th className="text-right pb-1">R$/kg</th>
                    <th className="text-right pb-1">Custo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {p.filamentos.map((fl, i) => (
                    <tr key={i}>
                      <td className="py-1 text-gray-700">{fl.nome}</td>
                      <td className="py-1 text-right text-gray-600">{fl.peso}g</td>
                      <td className="py-1 text-right text-gray-600">{R(fl.custoKg)}</td>
                      <td className="py-1 text-right font-medium">{R((fl.peso / 1000) * fl.custoKg)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Acessórios */}
          {p.acessorios.length > 0 && (
            <div>
              <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-2">📦 Acessórios e Embalagens</p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-400 text-xs">
                    <th className="text-left pb-1">Item</th>
                    <th className="text-right pb-1">Qtd</th>
                    <th className="text-right pb-1">Custo un.</th>
                    <th className="text-right pb-1">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {p.acessorios.map((a, i) => (
                    <tr key={i}>
                      <td className="py-1 text-gray-700">{a.nome}</td>
                      <td className="py-1 text-right text-gray-600">{a.qtd}</td>
                      <td className="py-1 text-right text-gray-600">{R(a.custoUn)}</td>
                      <td className="py-1 text-right font-medium">{R(a.qtd * a.custoUn)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

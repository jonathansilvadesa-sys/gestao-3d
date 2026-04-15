import { useState, useMemo, type ChangeEvent } from 'react';
import { useSettings } from '@/contexts/SettingsContext';
import { calcProductFromForm } from '@/utils/calc';
import { R } from '@/utils/formatters';
import type { Product, ProductForm } from '@/types';

interface Props {
  onClose: () => void;
  onAdd: (p: Product) => void;
}

export function NovaModal({ onClose, onAdd }: Props) {
  const { settings } = useSettings();

  // Formulário pré-preenchido com configurações globais
  const [f, setF] = useState<ProductForm>({
    nome: '', tempo: '', peso: '', unidades: '1',
    filamentoCustoKg: String(settings.filamentoCustoKg),
    potenciaW: String(settings.potenciaW),
    custoKwh: String(settings.custoKwh),
    custoFixoMes: String(settings.custoFixoMes),
    unidadesMes: String(settings.unidadesMes),
    markup: '5',
    falhas: String(settings.falhas),
    imposto: String(settings.imposto),
    txCartao: String(settings.txCartao),
    custoAnuncio: String(settings.custoAnuncio),
    acessNome: 'Embalagem', acessQtd: '1', acessCusto: '2.50',
  });

  const calc = useMemo(() => calcProductFromForm(f, settings), [f, settings]);
  const set = (k: keyof ProductForm) => (e: ChangeEvent<HTMLInputElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }));

  const handleAdd = () => {
    if (!f.nome || !f.peso || !f.tempo) return alert('Preencha nome, tempo e peso.');
    onAdd({
      id: Date.now(),
      nome: f.nome,
      tempo: +f.tempo,
      peso: +f.peso,
      unidades: +f.unidades,
      filamentoCustoKg: +f.filamentoCustoKg,
      custoFilamento: calc.custoFilamento,
      potenciaW: +f.potenciaW,
      custoKwh: +f.custoKwh,
      custoEnergia: calc.custoEnergia,
      amortizacao: calc.amortizacao,
      custoFixoMes: +f.custoFixoMes,
      unidadesMes: +f.unidadesMes,
      acessorios: f.acessNome
        ? [{ nome: f.acessNome, qtd: +f.acessQtd, custoUn: +f.acessCusto }]
        : [],
      markup: +f.markup,
      falhas: +f.falhas,
      imposto: +f.imposto,
      txCartao: +f.txCartao,
      custoAnuncio: +f.custoAnuncio,
      custoTotal: calc.custoTotal,
      custoUn: calc.custoUn,
      precoConsumidor: calc.precoConsumidor,
      precoLojista: calc.precoLojista,
      lucroLiquidoConsumidor: calc.lucroLiquidoConsumidor,
      lucroLiquidoLojista: calc.lucroLiquidoLojista,
      estoque: 0,
    });
    onClose();
  };

  const Field = ({ label, k, step = '0.01' }: { label: string; k: keyof ProductForm; step?: string }) => (
    <div>
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</label>
      <input
        type="number" step={step} value={f[k]} onChange={set(k)}
        className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
      />
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.55)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl mx-4 overflow-y-auto"
        style={{ maxHeight: '92vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-t-3xl p-6 text-white flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Nova Peça</h2>
            <p className="text-sm opacity-70 mt-0.5">Campos pré-preenchidos com as configurações globais</p>
          </div>
          <button onClick={onClose} className="text-3xl font-light opacity-70 hover:opacity-100">×</button>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Nome da Peça</label>
              <input
                type="text" value={f.nome}
                onChange={(e) => setF((p) => ({ ...p, nome: e.target.value }))}
                placeholder="Ex: Pikachu"
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <Field label="Tempo (horas)" k="tempo" />
            <Field label="Peso (gramas)" k="peso" />
            <Field label="Unidades no lote" k="unidades" step="1" />
            <Field label="Filamento R$/kg" k="filamentoCustoKg" />
            <Field label="Potência da imp. (W)" k="potenciaW" step="1" />
            <Field label="Custo kWh (R$)" k="custoKwh" />
            <Field label="Custo Fixo/mês (R$)" k="custoFixoMes" />
            <Field label="Unid. produzidas/mês" k="unidadesMes" step="1" />
            <Field label="Markup" k="markup" step="0.5" />
            <Field label="Taxa de Falhas (%)" k="falhas" />
            <Field label="Imposto (%)" k="imposto" />
            <Field label="Taxa Cartão (%)" k="txCartao" />
            <Field label="Custo Anúncio (%)" k="custoAnuncio" />
          </div>

          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Acessório / Embalagem</p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Nome</label>
              <input
                type="text" value={f.acessNome}
                onChange={(e) => setF((p) => ({ ...p, acessNome: e.target.value }))}
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <Field label="Quantidade" k="acessQtd" step="1" />
            <Field label="Custo un. (R$)" k="acessCusto" />
          </div>

          {/* Preview */}
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-4">
            <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-3">Preview do Cálculo</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {([
                ['Custo por unidade',      R(calc.custoUn)],
                ['Custo total do lote',    R(calc.custoTotal)],
                ['Preço consumidor',       R(calc.precoConsumidor)],
                ['Preço lojista',          R(calc.precoLojista)],
                ['Lucro líq. consumidor',  R(calc.lucroLiquidoConsumidor)],
                ['Break-even mínimo',      `${calc.breakEvenMarkup}x markup`],
              ] as [string, string][]).map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-gray-500">{k}</span>
                  <span className="font-bold text-gray-800">{v}</span>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleAdd}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold py-3 rounded-2xl hover:opacity-90 transition"
          >
            Adicionar Peça
          </button>
        </div>
      </div>
    </div>
  );
}

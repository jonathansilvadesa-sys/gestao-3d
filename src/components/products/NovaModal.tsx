import { useState, useMemo, type ChangeEvent } from 'react';
import { useSettings }  from '@/contexts/SettingsContext';
import { useMaterials } from '@/contexts/MaterialContext';
import { calcProductFromForm } from '@/utils/calc';
import { R } from '@/utils/formatters';
import { custoPorGrama } from '@/types';
import type { Product, ProductForm } from '@/types';

// ─── Tipo local para cada linha de acessório ──────────────────────────────────
interface AcessorioRow {
  id: number;
  nome: string;
  qtd: string;
  custo: string;
}

const SUGESTOES = [
  { nome: 'Embalagem',        qtd: '1', custo: '2.50' },
  { nome: 'Imã de neodímio',  qtd: '1', custo: '0.80' },
  { nome: 'LED 5mm',          qtd: '2', custo: '0.30' },
  { nome: 'Anilha + corrente',qtd: '1', custo: '3.50' },
  { nome: 'Parafuso M3',      qtd: '4', custo: '0.20' },
  { nome: 'Insert rosca M3',  qtd: '2', custo: '0.40' },
];

interface Props {
  onClose: () => void;
  onAdd: (p: Product) => void;
}

export function NovaModal({ onClose, onAdd }: Props) {
  const { settings }  = useSettings();
  const { materials } = useMaterials();

  // ── Formulário principal ────────────────────────────────────────────────────
  const [f, setF] = useState<ProductForm>({
    nome: '', tempo: '', peso: '', unidades: '1',
    materialId:       '',
    filamentoCustoKg: String(settings.filamentoCustoKg),
    potenciaW:        String(settings.potenciaW),
    custoKwh:         String(settings.custoKwh),
    custoFixoMes:     String(settings.custoFixoMes),
    unidadesMes:      String(settings.unidadesMes),
    markup:           '5',
    falhas:           String(settings.falhas),
    imposto:          String(settings.imposto),
    txCartao:         String(settings.txCartao),
    custoAnuncio:     String(settings.custoAnuncio),
  });

  // ── Lista dinâmica de acessórios ─────────────────────────────────────────────
  const [acessorios, setAcessorios] = useState<AcessorioRow[]>([
    { id: Date.now(), nome: 'Embalagem', qtd: '1', custo: '2.50' },
  ]);

  const addAcessorio = () =>
    setAcessorios((prev) => [
      ...prev,
      { id: Date.now() + Math.random(), nome: '', qtd: '1', custo: '0' },
    ]);

  const removeAcessorio = (id: number) =>
    setAcessorios((prev) => prev.filter((a) => a.id !== id));

  const updateAcessorio = (id: number, field: keyof Omit<AcessorioRow, 'id'>, value: string) =>
    setAcessorios((prev) =>
      prev.map((a) => (a.id === id ? { ...a, [field]: value } : a))
    );

  const aplicarSugestao = (s: (typeof SUGESTOES)[0]) => {
    const jaExiste = acessorios.some((a) => a.nome === s.nome);
    if (jaExiste) return;
    setAcessorios((prev) => [
      ...prev,
      { id: Date.now() + Math.random(), nome: s.nome, qtd: s.qtd, custo: s.custo },
    ]);
  };

  // ── Quando muda o material selecionado ───────────────────────────────────────
  const handleMaterialChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setF((prev) => {
      if (!id) return { ...prev, materialId: '' };
      const mat = materials.find((m) => String(m.id) === id);
      if (!mat) return { ...prev, materialId: id };
      const cpg = custoPorGrama(mat);
      return { ...prev, materialId: id, filamentoCustoKg: String(+(cpg * 1000).toFixed(2)) };
    });
  };

  // ── Acessórios no formato para o calc ────────────────────────────────────────
  const acessoriosCalc = acessorios
    .filter((a) => a.nome.trim())
    .map((a) => ({ qtd: parseFloat(a.qtd) || 0, custoUn: parseFloat(a.custo) || 0 }));

  const calc = useMemo(
    () => calcProductFromForm(f, settings, acessoriosCalc),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [f, settings, JSON.stringify(acessoriosCalc)]
  );

  const set = (k: keyof ProductForm) => (e: ChangeEvent<HTMLInputElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }));

  const selectedMaterial = f.materialId
    ? materials.find((m) => String(m.id) === f.materialId)
    : null;

  // ── Adicionar peça ────────────────────────────────────────────────────────────
  const handleAdd = () => {
    if (!f.nome || !f.peso || !f.tempo) return alert('Preencha nome, tempo e peso.');
    onAdd({
      id: Date.now(),
      nome: f.nome,
      tempo: +f.tempo,
      peso: +f.peso,
      unidades: +f.unidades,
      materialId: f.materialId ? +f.materialId : undefined,
      filamentoCustoKg: +f.filamentoCustoKg,
      custoFilamento: calc.custoFilamento,
      potenciaW: +f.potenciaW,
      custoKwh: +f.custoKwh,
      custoEnergia: calc.custoEnergia,
      amortizacao: calc.amortizacao,
      custoFixoMes: +f.custoFixoMes,
      unidadesMes: +f.unidadesMes,
      acessorios: acessorios
        .filter((a) => a.nome.trim())
        .map((a) => ({ nome: a.nome, qtd: +a.qtd, custoUn: +a.custo })),
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

  const Field = ({
    label, k, step = '0.01',
  }: { label: string; k: keyof ProductForm; step?: string }) => (
    <div>
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</label>
      <input
        type="number" step={step} value={f[k] as string} onChange={set(k)}
        className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
      />
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────────
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
        {/* Cabeçalho */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-t-3xl p-6 text-white flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Nova Peça</h2>
            <p className="text-sm opacity-70 mt-0.5">Campos pré-preenchidos com as configurações globais</p>
          </div>
          <button onClick={onClose} className="text-3xl font-light opacity-70 hover:opacity-100">×</button>
        </div>

        <div className="p-6 space-y-5">

          {/* ── Dados da peça ─────────────────────────────────────────────── */}
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

            {/* Material select */}
            <div className="col-span-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Filamento {materials.length > 0 ? '— selecione ou informe manualmente' : ''}
              </label>
              {materials.length > 0 ? (
                <select
                  value={f.materialId}
                  onChange={handleMaterialChange}
                  className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                >
                  <option value="">— Inserir preço manualmente —</option>
                  {materials.map((m) => (
                    <option key={m.id} value={String(m.id)}>
                      {m.nome} ({m.tipo} · {m.cor}) — {R(custoPorGrama(m) * 1000)}/kg
                    </option>
                  ))}
                </select>
              ) : (
                <p className="mt-1 text-xs text-indigo-500 bg-indigo-50 rounded-xl px-3 py-2">
                  💡 Cadastre filamentos na aba <strong>Materiais</strong> para selecioná-los aqui.
                </p>
              )}
            </div>

            {selectedMaterial ? (
              <div className="col-span-2 bg-indigo-50 rounded-xl px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-indigo-500 font-semibold uppercase tracking-wide">Custo pelo filamento selecionado</p>
                  <p className="text-sm font-bold text-indigo-800 mt-0.5">{selectedMaterial.nome} · {selectedMaterial.cor}</p>
                </div>
                <p className="font-bold text-indigo-600 text-lg">{R(+f.filamentoCustoKg)}/kg</p>
              </div>
            ) : (
              <div className="col-span-2">
                <Field label="Filamento R$/kg (manual)" k="filamentoCustoKg" />
              </div>
            )}

            <Field label="Potência da imp. (W)" k="potenciaW" step="1" />
            <Field label="Custo kWh (R$)"       k="custoKwh" />
            <Field label="Custo Fixo/mês (R$)"  k="custoFixoMes" />
            <Field label="Unid. produzidas/mês" k="unidadesMes" step="1" />
            <Field label="Markup"               k="markup" step="0.5" />
            <Field label="Taxa de Falhas (%)"   k="falhas" />
            <Field label="Imposto (%)"          k="imposto" />
            <Field label="Taxa Cartão (%)"      k="txCartao" />
            <Field label="Custo Anúncio (%)"    k="custoAnuncio" />
          </div>

          {/* ── Acessórios / Insumos extras ───────────────────────────────── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                Acessórios / Insumos Extras
              </p>
              <button
                type="button"
                onClick={addAcessorio}
                className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Adicionar item
              </button>
            </div>

            {/* Sugestões rápidas */}
            <div className="flex flex-wrap gap-1.5">
              {SUGESTOES.map((s) => {
                const jaAdicionado = acessorios.some((a) => a.nome === s.nome);
                return (
                  <button
                    key={s.nome}
                    type="button"
                    onClick={() => aplicarSugestao(s)}
                    disabled={jaAdicionado}
                    className={`text-xs px-2.5 py-1 rounded-full border transition font-medium ${
                      jaAdicionado
                        ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-default'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50'
                    }`}
                  >
                    {jaAdicionado ? '✓ ' : '+ '}{s.nome}
                  </button>
                );
              })}
            </div>

            {/* Linhas de acessórios */}
            <div className="space-y-2">
              {acessorios.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-3 bg-gray-50 rounded-xl">
                  Nenhum acessório adicionado — clique em "+ Adicionar item" ou use as sugestões acima
                </p>
              )}

              {acessorios.map((a, idx) => (
                <div
                  key={a.id}
                  className="grid grid-cols-[1fr_80px_90px_32px] gap-2 items-center bg-gray-50 rounded-xl px-3 py-2"
                >
                  {/* Nome */}
                  <div>
                    {idx === 0 && (
                      <p className="text-xs text-gray-400 mb-0.5">Nome</p>
                    )}
                    <input
                      type="text"
                      value={a.nome}
                      onChange={(e) => updateAcessorio(a.id, 'nome', e.target.value)}
                      placeholder="Ex: Imã, LED, Corrente…"
                      className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  </div>

                  {/* Qtd */}
                  <div>
                    {idx === 0 && (
                      <p className="text-xs text-gray-400 mb-0.5">Qtd</p>
                    )}
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={a.qtd}
                      onChange={(e) => updateAcessorio(a.id, 'qtd', e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 text-center"
                    />
                  </div>

                  {/* Custo un. */}
                  <div>
                    {idx === 0 && (
                      <p className="text-xs text-gray-400 mb-0.5">Custo un. (R$)</p>
                    )}
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={a.custo}
                      onChange={(e) => updateAcessorio(a.id, 'custo', e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 text-right"
                    />
                  </div>

                  {/* Remover */}
                  <div className={idx === 0 ? 'pt-4' : ''}>
                    <button
                      type="button"
                      onClick={() => removeAcessorio(a.id)}
                      className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 text-red-400 hover:text-red-600 flex items-center justify-center transition font-bold text-base"
                      title="Remover"
                    >×</button>
                  </div>
                </div>
              ))}
            </div>

            {/* Subtotal de acessórios */}
            {acessorios.length > 0 && (
              <div className="flex justify-between items-center px-3 py-2 bg-amber-50 rounded-xl text-sm">
                <span className="text-amber-700 font-semibold">
                  Subtotal acessórios ({acessorios.length} {acessorios.length === 1 ? 'item' : 'itens'})
                </span>
                <span className="font-bold text-amber-800">
                  {R(acessorios.reduce((s, a) => s + (parseFloat(a.qtd) || 0) * (parseFloat(a.custo) || 0), 0))} total
                  &nbsp;/&nbsp;
                  {R(acessoriosCalc.reduce((s, a) => s + a.qtd * a.custoUn, 0) / Math.max(+f.unidades || 1, 1))} por unid.
                </span>
              </div>
            )}
          </div>

          {/* ── Preview do cálculo ─────────────────────────────────────────── */}
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-4">
            <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-3">Preview do Cálculo</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {([
                ['Custo por unidade',     R(calc.custoUn)],
                ['Custo total do lote',   R(calc.custoTotal)],
                ['Preço consumidor',      R(calc.precoConsumidor)],
                ['Preço lojista',         R(calc.precoLojista)],
                ['Lucro líq. consumidor', R(calc.lucroLiquidoConsumidor)],
                ['Break-even mínimo',     `${calc.breakEvenMarkup}x markup`],
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

import { useState, useMemo, type ChangeEvent } from 'react';
import { useSettings }  from '@/contexts/SettingsContext';
import { useMaterials } from '@/contexts/MaterialContext';
import { calcProductFromForm } from '@/utils/calc';
import { R } from '@/utils/formatters';
import { custoPorGrama } from '@/types';
import type { Product, ProductForm } from '@/types';

// ─── Tipos locais ─────────────────────────────────────────────────────────────
interface FilamentoRow {
  id: number;
  materialId: string;   // '' = manual
  nome: string;         // label livre ("Base", "Detalhes"…)
  peso: string;         // gramas
  custoKg: string;      // R$/kg
}

interface AcessorioRow {
  id: number;
  nome: string;
  qtd: string;
  custo: string;
}

const ACESS_SUGESTOES = [
  { nome: 'Embalagem',         qtd: '1', custo: '2.50' },
  { nome: 'Imã de neodímio',   qtd: '1', custo: '0.80' },
  { nome: 'LED 5mm',           qtd: '2', custo: '0.30' },
  { nome: 'Anilha + corrente', qtd: '1', custo: '3.50' },
  { nome: 'Parafuso M3',       qtd: '4', custo: '0.20' },
  { nome: 'Insert rosca M3',   qtd: '2', custo: '0.40' },
];

// ─── helpers de UI ────────────────────────────────────────────────────────────
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest pt-1">{children}</p>
  );
}

interface Props { onClose: () => void; onAdd: (p: Product) => void; }

// ═══════════════════════════════════════════════════════════════════════════════
export function NovaModal({ onClose, onAdd }: Props) {
  const { settings }  = useSettings();
  const { materials } = useMaterials();

  // ── Formulário principal (sem filamento/peso — são dinâmicos) ──────────────
  const [f, setF] = useState<ProductForm>({
    nome: '', tempo: '', unidades: '1',
    potenciaW:    String(settings.potenciaW),
    custoKwh:     String(settings.custoKwh),
    custoFixoMes: String(settings.custoFixoMes),
    unidadesMes:  String(settings.unidadesMes),
    markup:       '5',
    falhas:       String(settings.falhas),
    imposto:      String(settings.imposto),
    txCartao:     String(settings.txCartao),
    custoAnuncio: String(settings.custoAnuncio),
  });

  // ── Lista dinâmica de filamentos ──────────────────────────────────────────
  const [filamentos, setFilamentos] = useState<FilamentoRow[]>([{
    id: Date.now(),
    materialId: '',
    nome: 'Principal',
    peso: '',
    custoKg: String(settings.filamentoCustoKg),
  }]);

  const addFilamento = () =>
    setFilamentos((prev) => [...prev, {
      id: Date.now() + Math.random(),
      materialId: '', nome: '', peso: '', custoKg: String(settings.filamentoCustoKg),
    }]);

  const removeFilamento = (id: number) =>
    setFilamentos((prev) => prev.length > 1 ? prev.filter((fl) => fl.id !== id) : prev);

  const updateFilamento = (id: number, field: keyof Omit<FilamentoRow, 'id'>, value: string) => {
    setFilamentos((prev) => prev.map((fl) => {
      if (fl.id !== id) return fl;
      const updated = { ...fl, [field]: value };

      // Se mudou o material, atualiza custoKg automaticamente
      if (field === 'materialId') {
        const mat = materials.find((m) => String(m.id) === value);
        if (mat) {
          updated.custoKg = String(+(custoPorGrama(mat) * 1000).toFixed(2));
          updated.nome    = updated.nome || mat.nome;
        }
      }
      return updated;
    }));
  };

  // ── Lista dinâmica de acessórios ─────────────────────────────────────────
  const [acessorios, setAcessorios] = useState<AcessorioRow[]>([
    { id: Date.now() + 1, nome: 'Embalagem', qtd: '1', custo: '2.50' },
  ]);

  const addAcessorio = () =>
    setAcessorios((prev) => [...prev, { id: Date.now() + Math.random(), nome: '', qtd: '1', custo: '0' }]);

  const removeAcessorio = (id: number) =>
    setAcessorios((prev) => prev.filter((a) => a.id !== id));

  const updateAcessorio = (id: number, field: keyof Omit<AcessorioRow, 'id'>, value: string) =>
    setAcessorios((prev) => prev.map((a) => a.id === id ? { ...a, [field]: value } : a));

  const aplicarSugestao = (s: (typeof ACESS_SUGESTOES)[0]) => {
    if (acessorios.some((a) => a.nome === s.nome)) return;
    setAcessorios((prev) => [...prev, { id: Date.now() + Math.random(), ...s }]);
  };

  // ── Arrays para o calc ─────────────────────────────────────────────────────
  const filamentosCalc = filamentos
    .filter((fl) => parseFloat(fl.peso) > 0)
    .map((fl) => ({ peso: parseFloat(fl.peso) || 0, custoKg: parseFloat(fl.custoKg) || 0 }));

  const acessoriosCalc = acessorios
    .filter((a) => a.nome.trim())
    .map((a) => ({ qtd: parseFloat(a.qtd) || 0, custoUn: parseFloat(a.custo) || 0 }));

  const calc = useMemo(
    () => calcProductFromForm(f, settings, filamentosCalc, acessoriosCalc),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [f, settings, JSON.stringify(filamentosCalc), JSON.stringify(acessoriosCalc)]
  );

  // ── Peso total = soma dos filamentos ──────────────────────────────────────
  const pesoTotal = filamentos.reduce((s, fl) => s + (parseFloat(fl.peso) || 0), 0);

  // ── Helpers de input ──────────────────────────────────────────────────────
  const set = (k: keyof ProductForm) => (e: ChangeEvent<HTMLInputElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }));

  // ── Salvar peça ────────────────────────────────────────────────────────────
  const handleAdd = () => {
    if (!f.nome.trim())     return alert('Preencha o nome da peça.');
    if (!f.tempo)           return alert('Preencha o tempo de impressão.');
    if (filamentosCalc.length === 0) return alert('Adicione pelo menos um filamento com peso maior que 0.');

    onAdd({
      id: Date.now(),
      nome: f.nome,
      tempo: +f.tempo,
      peso: pesoTotal,
      unidades: +f.unidades,
      filamentos: filamentos.filter((fl) => parseFloat(fl.peso) > 0).map((fl) => ({
        id: fl.id,
        materialId: fl.materialId ? +fl.materialId : undefined,
        nome: fl.nome || 'Filamento',
        peso: +fl.peso,
        custoKg: +fl.custoKg,
      })),
      filamentoCustoKg: filamentosCalc[0]?.custoKg ?? settings.filamentoCustoKg,
      custoFilamento:   calc.custoFilamento,
      potenciaW:  +f.potenciaW,
      custoKwh:   +f.custoKwh,
      custoEnergia:  calc.custoEnergia,
      amortizacao:   calc.amortizacao,
      custoFixoMes:  +f.custoFixoMes,
      unidadesMes:   +f.unidadesMes,
      acessorios: acessorios
        .filter((a) => a.nome.trim())
        .map((a) => ({ nome: a.nome, qtd: +a.qtd, custoUn: +a.custo })),
      markup:       +f.markup,
      falhas:       +f.falhas,
      imposto:      +f.imposto,
      txCartao:     +f.txCartao,
      custoAnuncio: +f.custoAnuncio,
      custoTotal:   calc.custoTotal,
      custoUn:      calc.custoUn,
      precoConsumidor: calc.precoConsumidor,
      precoLojista:    calc.precoLojista,
      lucroLiquidoConsumidor: calc.lucroLiquidoConsumidor,
      lucroLiquidoLojista:    calc.lucroLiquidoLojista,
      estoque: 0,
    });
    onClose();
  };

  const NumInput = ({ label, k, step = '0.01' }: { label: string; k: keyof ProductForm; step?: string }) => (
    <div>
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</label>
      <input
        type="number" step={step} value={f[k] as string} onChange={set(k)}
        className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
      />
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
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
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-t-3xl p-6 text-white flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Nova Peça</h2>
            <p className="text-sm opacity-70 mt-0.5">Campos pré-preenchidos com as configurações globais</p>
          </div>
          <button onClick={onClose} className="text-3xl font-light opacity-70 hover:opacity-100">×</button>
        </div>

        <div className="p-6 space-y-5">

          {/* ── Dados básicos ──────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Nome da Peça</label>
              <input
                type="text" value={f.nome}
                onChange={(e) => setF((p) => ({ ...p, nome: e.target.value }))}
                placeholder="Ex: Bracelete YuGiOh"
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <NumInput label="Tempo de impressão (h)" k="tempo" />
            <NumInput label="Unidades no lote" k="unidades" step="1" />
          </div>

          {/* ── FILAMENTOS ─────────────────────────────────────────────────── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <SectionTitle>🧵 Filamentos utilizados</SectionTitle>
              <button
                type="button"
                onClick={addFilamento}
                className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Adicionar filamento
              </button>
            </div>

            <div className="space-y-2">
              {filamentos.map((fl, idx) => {
                const mat = fl.materialId ? materials.find((m) => String(m.id) === fl.materialId) : null;
                return (
                  <div key={fl.id} className="bg-indigo-50 rounded-2xl p-3 space-y-2">
                    {/* Linha 1: label + select de material */}
                    <div className="grid grid-cols-[90px_1fr_32px] gap-2 items-end">
                      <div>
                        <label className="text-xs text-indigo-500 font-semibold">Label</label>
                        <input
                          type="text"
                          value={fl.nome}
                          onChange={(e) => updateFilamento(fl.id, 'nome', e.target.value)}
                          placeholder={`Filamento ${idx + 1}`}
                          className="mt-1 w-full bg-white border border-indigo-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-indigo-500 font-semibold">
                          Material{materials.length > 0 ? ' (ou manual abaixo)' : ''}
                        </label>
                        {materials.length > 0 ? (
                          <select
                            value={fl.materialId}
                            onChange={(e) => updateFilamento(fl.id, 'materialId', e.target.value)}
                            className="mt-1 w-full bg-white border border-indigo-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                          >
                            <option value="">— Inserir preço manual —</option>
                            {materials.map((m) => (
                              <option key={m.id} value={String(m.id)}>
                                {m.nome} ({m.tipo} · {m.cor}) — {R(custoPorGrama(m) * 1000)}/kg
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div className="mt-1 bg-white border border-indigo-200 rounded-lg px-2 py-1.5 text-xs text-gray-400">
                            Cadastre materiais na aba 🧵 Materiais
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFilamento(fl.id)}
                        disabled={filamentos.length === 1}
                        className="w-8 h-8 rounded-lg bg-red-100 hover:bg-red-200 text-red-400 hover:text-red-600 flex items-center justify-center transition font-bold text-base disabled:opacity-30 disabled:cursor-not-allowed mt-5"
                        title="Remover filamento"
                      >×</button>
                    </div>

                    {/* Linha 2: peso + custo/kg + subtotal */}
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-xs text-indigo-500 font-semibold">Peso (g)</label>
                        <input
                          type="number" min="0" step="0.1"
                          value={fl.peso}
                          onChange={(e) => updateFilamento(fl.id, 'peso', e.target.value)}
                          placeholder="0"
                          className="mt-1 w-full bg-white border border-indigo-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-indigo-500 font-semibold">
                          R$/kg {mat ? `(${mat.nome})` : '(manual)'}
                        </label>
                        <input
                          type="number" min="0" step="0.01"
                          value={fl.custoKg}
                          onChange={(e) => updateFilamento(fl.id, 'custoKg', e.target.value)}
                          readOnly={!!fl.materialId}
                          className={`mt-1 w-full border border-indigo-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
                            fl.materialId ? 'bg-indigo-100 text-indigo-700 font-semibold cursor-not-allowed' : 'bg-white'
                          }`}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-indigo-500 font-semibold">Subtotal</label>
                        <div className="mt-1 bg-indigo-100 border border-indigo-200 rounded-lg px-2 py-1.5 text-sm font-bold text-indigo-700 text-right">
                          {R(((parseFloat(fl.peso) || 0) / 1000) * (parseFloat(fl.custoKg) || 0))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Resumo filamentos */}
            <div className="flex items-center justify-between bg-indigo-100 rounded-xl px-4 py-2.5 text-sm">
              <span className="text-indigo-700 font-semibold">
                Total filamentos — {pesoTotal.toFixed(1)}g
              </span>
              <span className="font-bold text-indigo-800">{R(calc.custoFilamento)}</span>
            </div>
          </div>

          {/* ── Outros custos ─────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-4">
            <NumInput label="Potência da imp. (W)" k="potenciaW" step="1" />
            <NumInput label="Custo kWh (R$)"       k="custoKwh" />
            <NumInput label="Custo Fixo/mês (R$)"  k="custoFixoMes" />
            <NumInput label="Unid. produzidas/mês" k="unidadesMes" step="1" />
            <NumInput label="Markup"               k="markup" step="0.5" />
            <NumInput label="Taxa de Falhas (%)"   k="falhas" />
            <NumInput label="Imposto (%)"          k="imposto" />
            <NumInput label="Taxa Cartão (%)"      k="txCartao" />
            <NumInput label="Custo Anúncio (%)"    k="custoAnuncio" />
          </div>

          {/* ── Acessórios ─────────────────────────────────────────────────── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <SectionTitle>📦 Acessórios / Insumos Extras</SectionTitle>
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

            {/* Sugestões */}
            <div className="flex flex-wrap gap-1.5">
              {ACESS_SUGESTOES.map((s) => {
                const ok = acessorios.some((a) => a.nome === s.nome);
                return (
                  <button
                    key={s.nome}
                    type="button"
                    onClick={() => aplicarSugestao(s)}
                    disabled={ok}
                    className={`text-xs px-2.5 py-1 rounded-full border font-medium transition ${
                      ok
                        ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-default'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50'
                    }`}
                  >{ok ? '✓ ' : '+ '}{s.nome}</button>
                );
              })}
            </div>

            <div className="space-y-2">
              {acessorios.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-3 bg-gray-50 rounded-xl">
                  Nenhum acessório — use as sugestões ou "+ Adicionar item"
                </p>
              )}
              {acessorios.map((a, idx) => (
                <div key={a.id} className="grid grid-cols-[1fr_80px_90px_32px] gap-2 items-center bg-gray-50 rounded-xl px-3 py-2">
                  <div>
                    {idx === 0 && <p className="text-xs text-gray-400 mb-0.5">Nome</p>}
                    <input type="text" value={a.nome} onChange={(e) => updateAcessorio(a.id, 'nome', e.target.value)}
                      placeholder="Ex: Imã, LED…"
                      className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  </div>
                  <div>
                    {idx === 0 && <p className="text-xs text-gray-400 mb-0.5">Qtd</p>}
                    <input type="number" min="1" step="1" value={a.qtd} onChange={(e) => updateAcessorio(a.id, 'qtd', e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 text-center"
                    />
                  </div>
                  <div>
                    {idx === 0 && <p className="text-xs text-gray-400 mb-0.5">Custo un. (R$)</p>}
                    <input type="number" min="0" step="0.01" value={a.custo} onChange={(e) => updateAcessorio(a.id, 'custo', e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 text-right"
                    />
                  </div>
                  <div className={idx === 0 ? 'pt-4' : ''}>
                    <button type="button" onClick={() => removeAcessorio(a.id)}
                      className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 text-red-400 hover:text-red-600 flex items-center justify-center transition font-bold"
                    >×</button>
                  </div>
                </div>
              ))}
            </div>

            {acessorios.length > 0 && (
              <div className="flex justify-between items-center px-3 py-2 bg-amber-50 rounded-xl text-sm">
                <span className="text-amber-700 font-semibold">{acessorios.length} {acessorios.length === 1 ? 'item' : 'itens'}</span>
                <span className="font-bold text-amber-800">
                  {R(acessorios.reduce((s, a) => s + (parseFloat(a.qtd)||0) * (parseFloat(a.custo)||0), 0))} total
                  &nbsp;/&nbsp;
                  {R(acessoriosCalc.reduce((s, a) => s + a.qtd * a.custoUn, 0) / Math.max(+f.unidades || 1, 1))} por unid.
                </span>
              </div>
            )}
          </div>

          {/* ── Preview ──────────────────────────────────────────────────────── */}
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-4">
            <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-3">Preview do Cálculo</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {([
                ['Material total',         R(calc.custoFilamento)],
                ['Custo por unidade',      R(calc.custoUn)],
                ['Custo total do lote',    R(calc.custoTotal)],
                ['Preço consumidor',       R(calc.precoConsumidor)],
                ['Lucro líq. consumidor',  R(calc.lucroLiquidoConsumidor)],
                ['Break-even mínimo',      `${calc.breakEvenMarkup}x markup`],
              ] as [string,string][]).map(([k, v]) => (
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

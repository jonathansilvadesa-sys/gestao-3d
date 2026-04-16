import { useState, useMemo, useRef, useEffect, type ChangeEvent } from 'react';
import { useSettings }  from '@/contexts/SettingsContext';
import { useMaterials } from '@/contexts/MaterialContext';
import { useCanais }    from '@/contexts/CanaisContext';
import { PRINTER_PRESETS } from '@/types';
import { calcProductFromForm, calcMarkupFromMargem } from '@/utils/calc';
import { R } from '@/utils/formatters';
import { custoPorGrama } from '@/types';
import { parseGcode, formatarTempo, type GcodeMetadata } from '@/utils/gcodeParser';
import type { Product, ProductForm } from '@/types';

interface FilamentoRow {
  id: number;
  materialId: string;
  nome: string;
  peso: string;
  custoKg: string;
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

interface Props {
  product: Product;
  onClose: () => void;
  onSave: (id: number, updates: Partial<Product>) => void;
}

export function EditProductModal({ product: p, onClose, onSave }: Props) {
  const { settings }  = useSettings();
  const { materials } = useMaterials();
  const { canais }    = useCanais();
  const gcodeInputRef = useRef<HTMLInputElement>(null);

  // ── Formulário pré-preenchido com os dados da peça ──────────────────────
  const [f, setF] = useState<ProductForm & { nome: string }>({
    nome:         p.nome,
    tempo:        String(p.tempo),
    unidades:     String(p.unidades),
    potenciaW:    String(p.potenciaW),
    custoKwh:     String(p.custoKwh),
    custoFixoMes: String(p.custoFixoMes),
    unidadesMes:  String(p.unidadesMes),
    markup:       String(p.markup),
    falhas:       String(p.falhas),
    imposto:      String(p.imposto),
    txCartao:     String(p.txCartao),
    custoAnuncio: String(p.custoAnuncio),
    canalVenda:   p.canalVenda ?? 'manual',
    maoObraHoras: String(p.maoObraHoras ?? 0),
    maoObraTaxa:  String(p.maoObraTaxa ?? 0),
  });

  // ── Modo de entrada: dados referem-se ao lote total (mesa cheia) ────────
  const [isFullBatch, setIsFullBatch] = useState(p.isFullBatch ?? false);

  // ── Frete ────────────────────────────────────────────────────────────────
  const [freteMode, setFreteMode] = useState<'none' | 'fixo' | 'percentual'>(p.freteMode ?? 'none');
  const [freteValor, setFreteValor] = useState(String(p.freteValor ?? 0));

  // ── Impressora ───────────────────────────────────────────────────────────
  const [impressoraId, setImpressoraId] = useState(p.impressoraId ?? settings.impressoraAtualId ?? '');

  // ── Modo markup vs meta de margem ────────────────────────────────────────
  const [margemModo, setMargemModo] = useState<'markup' | 'margem'>(
    p.margemAlvo != null ? 'margem' : 'markup'
  );
  const [margemAlvo, setMargemAlvo] = useState(String(p.margemAlvo ?? 30));

  useEffect(() => {
    if (margemModo !== 'margem') return;
    const mk = calcMarkupFromMargem(
      parseFloat(margemAlvo) || 0,
      parseFloat(f.imposto) || 0,
      parseFloat(f.txCartao) || 0,
      parseFloat(f.custoAnuncio) || 0,
    );
    setF((prev) => ({ ...prev, markup: String(mk) }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [margemModo, margemAlvo, f.imposto, f.txCartao, f.custoAnuncio]);

  // ── Filamentos pré-preenchidos ─────────────────────────────────────────
  const [filamentos, setFilamentos] = useState<FilamentoRow[]>(() => {
    if (p.filamentos && p.filamentos.length > 0) {
      return p.filamentos.map((fl) => ({
        id:         fl.id,
        materialId: fl.materialId ? String(fl.materialId) : '',
        nome:       fl.nome,
        peso:       String(fl.peso),
        custoKg:    String(fl.custoKg),
      }));
    }
    // retrocompatibilidade: peça antiga sem filamentos[]
    return [{
      id: Date.now(),
      materialId: '',
      nome: 'Principal',
      peso: String(p.peso),
      custoKg: String(p.filamentoCustoKg),
    }];
  });

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
      if (field === 'materialId') {
        const mat = materials.find((m) => String(m.id) === value);
        if (mat) {
          updated.custoKg = String(+(custoPorGrama(mat) * 1000).toFixed(2));
          if (!updated.nome) updated.nome = mat.nome;
        }
      }
      return updated;
    }));
  };

  // ── Acessórios pré-preenchidos ─────────────────────────────────────────
  const [acessorios, setAcessorios] = useState<AcessorioRow[]>(() =>
    p.acessorios.length > 0
      ? p.acessorios.map((a, i) => ({
          id: Date.now() + i,
          nome: a.nome,
          qtd: String(a.qtd),
          custo: String(a.custoUn),
        }))
      : []
  );

  const addAcessorio = () =>
    setAcessorios((prev) => [...prev, { id: Date.now() + Math.random(), nome: '', qtd: '1', custo: '0' }]);
  const removeAcessorio = (id: number) =>
    setAcessorios((prev) => prev.filter((a) => a.id !== id));
  const updateAcessorio = (id: number, field: keyof Omit<AcessorioRow, 'id'>, value: string) =>
    setAcessorios((prev) => prev.map((a) => a.id === id ? { ...a, [field]: value } : a));
  const aplicarSugestao = (s: typeof ACESS_SUGESTOES[0]) => {
    if (acessorios.some((a) => a.nome === s.nome)) return;
    setAcessorios((prev) => [...prev, { id: Date.now() + Math.random(), ...s }]);
  };

  // ── Arrays para o calc ─────────────────────────────────────────────────
  const filamentosCalc = filamentos
    .filter((fl) => parseFloat(fl.peso) > 0)
    .map((fl) => ({ peso: parseFloat(fl.peso) || 0, custoKg: parseFloat(fl.custoKg) || 0 }));

  const acessoriosCalc = acessorios
    .filter((a) => a.nome.trim())
    .map((a) => ({ qtd: parseFloat(a.qtd) || 0, custoUn: parseFloat(a.custo) || 0 }));

  const calc = useMemo(
    () => calcProductFromForm(f, settings, filamentosCalc, acessoriosCalc, isFullBatch, freteMode, parseFloat(freteValor) || 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [f, settings, JSON.stringify(filamentosCalc), JSON.stringify(acessoriosCalc), isFullBatch, freteMode, freteValor]
  );

  const pesoTotal = filamentos.reduce((s, fl) => s + (parseFloat(fl.peso) || 0), 0);

  const set = (k: keyof typeof f) => (e: ChangeEvent<HTMLInputElement>) =>
    setF((prev) => ({ ...prev, [k]: e.target.value }));

  // ── G-code: multi-cama (import aditivo) ──────────────────────────────────
  interface GcodeImport {
    id: number;
    fileName: string;
    meta: GcodeMetadata;
    filamentoRowId: number;
  }

  const [gcodeImports, setGcodeImports] = useState<GcodeImport[]>([]);

  const handleGcodeFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const meta = parseGcode(text);
      const mesaNum  = gcodeImports.length + 1;
      const tipoLabel = meta.tipoFilamento ?? '';
      const filLabel  = tipoLabel ? `Mesa ${mesaNum} · ${tipoLabel}` : `Mesa ${mesaNum}`;

      // No EditModal sempre adiciona nova linha de filamento
      const newId = Date.now() + Math.random();
      setFilamentos((prev) => [...prev, {
        id:         newId,
        materialId: '',
        nome:       filLabel,
        peso:       meta.pesoG !== undefined ? String(meta.pesoG) : '',
        custoKg:    String(settings.filamentoCustoKg),
      }]);

      // Acumula tempo (existente + todas as camas importadas)
      const tempoBase = parseFloat(f.tempo) || p.tempo;
      const tempoImportado = [...gcodeImports.map((g) => g.meta.tempoHoras ?? 0), meta.tempoHoras ?? 0]
        .reduce((a, b) => a + b, 0);
      const tempoTotal = gcodeImports.length === 0
        ? tempoImportado  // 1ª importação sobrescreve
        : tempoBase + (meta.tempoHoras ?? 0);  // demais somam ao atual
      if (tempoTotal > 0) setF((prev) => ({ ...prev, tempo: tempoTotal.toFixed(4) }));

      setGcodeImports((prev) => [...prev, {
        id: Date.now(),
        fileName: file.name,
        meta,
        filamentoRowId: newId,
      }]);
    };
    // Lê cabeçalho (80 KB) + rodapé (48 KB) como um único Blob concatenado.
    // Slicers como Creality gravam tempo e peso no FINAL do arquivo — sem o
    // rodapé esses metadados seriam invisíveis para o parser.
    // 48 KB é necessário para capturar o bloco de sumário do Creality (~26 KB
    // antes do final), que fica ANTES do CONFIG_BLOCK de ~20-26 KB.
    const HEAD = 80_000;
    const TAIL = 48_000;
    const blob = file.size <= HEAD + TAIL
      ? file
      : new Blob([file.slice(0, HEAD), '\n', file.slice(file.size - TAIL)]);
    reader.readAsText(blob);
    e.target.value = '';
  };

  const removeGcodeImport = (importId: number) => {
    const imp = gcodeImports.find((g) => g.id === importId);
    if (!imp) return;
    const remaining = gcodeImports.filter((g) => g.id !== importId);
    setFilamentos((prev) => {
      const next = prev.filter((fl) => fl.id !== imp.filamentoRowId);
      return next.length > 0 ? next : prev;
    });
    const novoTempo = remaining.reduce((a, g) => a + (g.meta.tempoHoras ?? 0), 0);
    if (novoTempo > 0) setF((prev) => ({ ...prev, tempo: novoTempo.toFixed(4) }));
    setGcodeImports(remaining);
  };

  // ── Salvar ─────────────────────────────────────────────────────────────
  const handleSave = () => {
    if (!f.nome.trim())             return alert('Preencha o nome da peça.');
    if (!f.tempo)                   return alert('Preencha o tempo de impressão.');
    if (filamentosCalc.length === 0) return alert('Adicione pelo menos um filamento com peso maior que 0.');

    // Registra histórico de preço se markup foi alterado
    const historicoPrecos = [...(p.historicoPrecos ?? [])];
    const novoMarkup = parseFloat(f.markup);
    if (Math.abs(novoMarkup - p.markup) > 0.001) {
      historicoPrecos.unshift({
        data:           new Date().toISOString(),
        markupAnterior: p.markup,
        markupNovo:     novoMarkup,
        precoAnterior:  p.precoConsumidor,
        precoNovo:      calc.precoConsumidor,
      });
    }

    onSave(p.id, {
      nome:     f.nome,
      tempo:    +f.tempo,
      peso:     pesoTotal,
      unidades: +f.unidades,
      filamentos: filamentos.filter((fl) => parseFloat(fl.peso) > 0).map((fl) => ({
        id:         fl.id,
        materialId: fl.materialId ? +fl.materialId : undefined,
        nome:       fl.nome || 'Filamento',
        peso:       +fl.peso,
        custoKg:    +fl.custoKg,
      })),
      filamentoCustoKg: filamentosCalc[0]?.custoKg ?? p.filamentoCustoKg,
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
      markup:        +f.markup,
      falhas:        +f.falhas,
      imposto:       +f.imposto,
      txCartao:      +f.txCartao,
      custoAnuncio:  +f.custoAnuncio,
      canalVenda:    f.canalVenda,
      maoObraHoras:  +f.maoObraHoras,
      maoObraTaxa:   +f.maoObraTaxa,
      margemAlvo:    margemModo === 'margem' ? parseFloat(margemAlvo) || undefined : undefined,
      isFullBatch,
      freteMode,
      freteValor:  parseFloat(freteValor) || 0,
      custoFrete:  calc.custoFrete,
      impressoraId: impressoraId || undefined,
      historicoPrecos,
      custoTotal:   calc.custoTotal,
      custoUn:      calc.custoUn,
      precoConsumidor:        calc.precoConsumidor,
      precoLojista:           calc.precoLojista,
      lucroLiquidoConsumidor: calc.lucroLiquidoConsumidor,
      lucroLiquidoLojista:    calc.lucroLiquidoLojista,
    });
    onClose();
  };

  const NumInput = ({ label, k, step = '0.01' }: { label: string; k: keyof typeof f; step?: string }) => (
    <div>
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</label>
      <input
        type="number" step={step} value={f[k] as string} onChange={set(k)}
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
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-t-3xl p-6 text-white">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold">Editar Peça</h2>
              <p className="text-sm opacity-70 mt-0.5">
                {gcodeImports.length === 0
                  ? p.nome
                  : `${p.nome} · ${gcodeImports.length} cama${gcodeImports.length > 1 ? 's' : ''} adicionada${gcodeImports.length > 1 ? 's' : ''}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => gcodeInputRef.current?.click()}
                title="Importar .gcode — adiciona cama de impressão"
                className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-bold px-3 py-2 rounded-xl transition"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="12" y1="12" x2="12" y2="18"/>
                  <polyline points="9 15 12 18 15 15"/>
                </svg>
                {gcodeImports.length === 0 ? 'Importar G-code' : `+ Mesa ${gcodeImports.length + 1}`}
              </button>
              <input ref={gcodeInputRef} type="file" accept=".gcode,.gco,.g" className="hidden" onChange={handleGcodeFile} />
              <button onClick={onClose} className="text-3xl font-light opacity-70 hover:opacity-100 leading-none">×</button>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">

          {/* ── Camas de Impressão (G-Code multi-parte) ───────────────────── */}
          {gcodeImports.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">📂 Camas de Impressão</p>
                <span className="text-xs text-indigo-600 font-semibold bg-indigo-50 px-2 py-0.5 rounded-full">
                  ⏱ {formatarTempo(gcodeImports.reduce((a, g) => a + (g.meta.tempoHoras ?? 0), 0))} importado
                  &nbsp;·&nbsp;
                  ⚖️ {gcodeImports.reduce((a, g) => a + (g.meta.pesoG ?? 0), 0).toFixed(1)}g importado
                </span>
              </div>
              <div className="space-y-2">
                {gcodeImports.map((imp, idx) => (
                  <div key={imp.id} className="flex items-start gap-3 bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2.5">
                    <div className="w-7 h-7 rounded-lg bg-indigo-500 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-700 truncate">{imp.fileName}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500 mt-0.5">
                        {imp.meta.tempoHoras !== undefined && <span>⏱ {formatarTempo(imp.meta.tempoHoras)}</span>}
                        {imp.meta.pesoG      !== undefined && <span>⚖️ {imp.meta.pesoG}g</span>}
                        {imp.meta.tipoFilamento            && <span>🧵 {imp.meta.tipoFilamento}</span>}
                        {imp.meta.alturaLayer !== undefined && <span>📏 layer {imp.meta.alturaLayer}mm</span>}
                        {imp.meta.slicerNome               && <span className="opacity-60">🖨️ {imp.meta.slicerNome}</span>}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeGcodeImport(imp.id)}
                      title="Remover esta cama"
                      className="w-6 h-6 rounded-md bg-red-100 hover:bg-red-200 text-red-400 hover:text-red-600 flex items-center justify-center transition font-bold text-sm shrink-0 mt-0.5"
                    >×</button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 text-center pt-0.5">
                Tempo acumulado e pesos refletidos nos campos abaixo ↓
              </p>
            </div>
          )}

          {/* Nome + tempo + unidades */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Nome da Peça</label>
              <input
                type="text" value={f.nome}
                onChange={(e) => setF((prev) => ({ ...prev, nome: e.target.value }))}
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <NumInput label="Tempo de impressão (h)" k="tempo" />
            <NumInput label="Unidades no lote" k="unidades" step="1" />
          </div>

          {/* ── Modo de Entrada: Lote Total (Mesa Cheia) ───────────────────── */}
          <div className={`rounded-2xl border-2 p-3 transition-all ${isFullBatch ? 'border-teal-300 bg-teal-50' : 'border-gray-200 bg-gray-50'}`}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${isFullBatch ? 'text-teal-800' : 'text-gray-700'}`}>
                  Dados referem-se ao Lote Total
                  <span className="ml-1.5 text-xs font-normal opacity-60">Mesa Cheia</span>
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Ative para G-Code Bambu Lab multicolorido — peso e tempo do lote serão rateados entre as unidades
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsFullBatch((v) => !v)}
                className={`relative inline-flex w-11 h-6 rounded-full transition-colors shrink-0 focus:outline-none focus:ring-2 focus:ring-teal-400 ${
                  isFullBatch ? 'bg-teal-500' : 'bg-gray-300'
                }`}
                aria-pressed={isFullBatch}
              >
                <span className={`inline-block w-5 h-5 bg-white rounded-full shadow-sm transition-transform mt-0.5 ${
                  isFullBatch ? 'translate-x-5' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
            {isFullBatch && (
              <div className="mt-2 flex items-start gap-2 bg-teal-100 border border-teal-200 rounded-xl px-3 py-2 text-xs text-teal-800">
                <span className="shrink-0">ℹ️</span>
                <span>
                  Os custos de material e tempo serão rateados entre as{' '}
                  <strong>{f.unidades || '1'}</strong> unidades,
                  simulando a economia de purga e trocas de cor.
                </span>
              </div>
            )}
          </div>

          {/* FILAMENTOS */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">🧵 Filamentos utilizados</p>
              <button
                type="button" onClick={addFilamento}
                className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Adicionar filamento
              </button>
            </div>

            <div className="space-y-2">
              {filamentos.map((fl, idx) => (
                <div key={fl.id} className="bg-indigo-50 rounded-2xl p-3 space-y-2">
                  <div className="grid grid-cols-[90px_1fr_32px] gap-2 items-end">
                    <div>
                      <label className="text-xs text-indigo-500 font-semibold">Label</label>
                      <input
                        type="text" value={fl.nome}
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
                      type="button" onClick={() => removeFilamento(fl.id)}
                      disabled={filamentos.length === 1}
                      className="w-8 h-8 rounded-lg bg-red-100 hover:bg-red-200 text-red-400 hover:text-red-600 flex items-center justify-center transition font-bold disabled:opacity-30 disabled:cursor-not-allowed mt-5"
                    >×</button>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-xs text-indigo-500 font-semibold">Peso (g)</label>
                      <input
                        type="number" min="0" step="0.1" value={fl.peso}
                        onChange={(e) => updateFilamento(fl.id, 'peso', e.target.value)}
                        className="mt-1 w-full bg-white border border-indigo-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-indigo-500 font-semibold">
                        R$/kg {fl.materialId ? '(do material)' : '(manual)'}
                      </label>
                      <input
                        type="number" min="0" step="0.01" value={fl.custoKg}
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
              ))}
            </div>

            <div className="flex items-center justify-between bg-indigo-100 rounded-xl px-4 py-2.5 text-sm">
              <span className="text-indigo-700 font-semibold">Total — {pesoTotal.toFixed(1)}g</span>
              <span className="font-bold text-indigo-800">{R(calc.custoFilamento)}</span>
            </div>
          </div>

          {/* ── Canal de Venda ────────────────────────────────────────────── */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest pt-1">🛒 Canal de Venda</p>
            <div className="grid grid-cols-3 gap-2">
              {canais.map((canal) => {
                const ativo = f.canalVenda === canal.id;
                return (
                  <button
                    key={canal.id} type="button"
                    onClick={() => setF((prev) => ({
                      ...prev,
                      canalVenda: canal.id,
                      custoAnuncio: String(canal.taxaPercent),
                    }))}
                    className={`flex flex-col items-center gap-0.5 py-2.5 px-2 rounded-xl border-2 text-xs font-semibold transition ${
                      ativo
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-gray-200 bg-white text-gray-500 hover:border-indigo-300 hover:bg-indigo-50/50'
                    }`}
                  >
                    <span className="text-lg leading-none">{canal.emoji}</span>
                    <span className="text-center leading-tight">{canal.nome}</span>
                    {canal.taxaPercent > 0
                      ? <span className="text-[10px] opacity-70">{canal.taxaPercent}%</span>
                      : <span className="text-[10px] opacity-50">sem taxa</span>
                    }
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2">
              <span className="text-xs text-gray-500 flex-1">Taxa da plataforma (editável)</span>
              <div className="flex items-center gap-1">
                <input
                  type="number" min="0" max="100" step="0.5"
                  value={f.custoAnuncio}
                  onChange={set('custoAnuncio')}
                  className="w-16 border border-gray-200 rounded-lg px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
                <span className="text-xs text-gray-400">%</span>
              </div>
            </div>
          </div>

          {/* Custos operacionais */}
          <div className="grid grid-cols-2 gap-4">
            <NumInput label="Potência da imp. (W)" k="potenciaW" step="1" />
            <NumInput label="Custo kWh (R$)"       k="custoKwh" />
            <NumInput label="Custo Fixo/mês (R$)"  k="custoFixoMes" />
            <NumInput label="Unid. produzidas/mês" k="unidadesMes" step="1" />
            <NumInput label="Taxa de Falhas (%)"   k="falhas" />
            <NumInput label="Imposto (%)"          k="imposto" />
            <NumInput label="Taxa Cartão (%)"      k="txCartao" />
          </div>

          {/* ── Mão de Obra ───────────────────────────────────────────────── */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest pt-1">🧑‍🔧 Mão de Obra / Acabamento</p>
            <div className="grid grid-cols-2 gap-3 bg-amber-50 border border-amber-100 rounded-2xl p-3">
              <div>
                <label className="text-xs font-semibold text-amber-700">Horas de acabamento</label>
                <div className="mt-1 flex items-center gap-1">
                  <input
                    type="number" min="0" step="0.25"
                    value={f.maoObraHoras}
                    onChange={set('maoObraHoras')}
                    className="flex-1 border border-amber-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                  />
                  <span className="text-xs text-amber-600">h</span>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-amber-700">Valor da hora (R$)</label>
                <div className="mt-1 flex items-center gap-1">
                  <input
                    type="number" min="0" step="1"
                    value={f.maoObraTaxa}
                    onChange={set('maoObraTaxa')}
                    className="flex-1 border border-amber-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                  />
                  <span className="text-xs text-amber-600">R$/h</span>
                </div>
              </div>
            </div>
            {(parseFloat(f.maoObraHoras) > 0 && parseFloat(f.maoObraTaxa) > 0) && (
              <div className="flex justify-between items-center px-3 py-2 bg-amber-100 rounded-xl text-xs">
                <span className="text-amber-700">Custo de mão de obra</span>
                <span className="font-bold text-amber-800">
                  {R((parseFloat(f.maoObraHoras) || 0) * (parseFloat(f.maoObraTaxa) || 0))}
                </span>
              </div>
            )}
          </div>

          {/* ── Markup / Meta de margem ───────────────────────────────────── */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest pt-1">📈 Precificação</p>
              <div className="ml-auto flex rounded-xl overflow-hidden border border-gray-200 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setMargemModo('markup')}
                  className={`px-3 py-1.5 transition ${margemModo === 'markup' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
                >Markup fixo</button>
                <button
                  type="button"
                  onClick={() => setMargemModo('margem')}
                  className={`px-3 py-1.5 transition ${margemModo === 'margem' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
                >Meta de margem</button>
              </div>
            </div>
            {margemModo === 'markup' ? (
              <NumInput label="Markup (×)" k="markup" step="0.5" />
            ) : (
              <div className="grid grid-cols-2 gap-3 bg-indigo-50 border border-indigo-100 rounded-2xl p-3">
                <div>
                  <label className="text-xs font-semibold text-indigo-700">Margem desejada (%)</label>
                  <div className="mt-1 flex items-center gap-1">
                    <input
                      type="number" min="1" max="95" step="1"
                      value={margemAlvo}
                      onChange={(e) => setMargemAlvo(e.target.value)}
                      className="flex-1 border border-indigo-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                    />
                    <span className="text-xs text-indigo-600">%</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-indigo-700">Markup calculado</label>
                  <div className="mt-1 bg-indigo-200 rounded-lg px-2 py-1.5 text-sm font-bold text-indigo-800 text-center">
                    {f.markup}×
                  </div>
                </div>
                <p className="col-span-2 text-xs text-indigo-500 -mt-1">
                  Markup calculado automaticamente para atingir {margemAlvo}% de margem líquida após impostos e taxas.
                </p>
              </div>
            )}
          </div>

          {/* ACESSÓRIOS */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">📦 Acessórios / Insumos</p>
              <button
                type="button" onClick={addAcessorio}
                className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Adicionar item
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {ACESS_SUGESTOES.map((s) => {
                const ok = acessorios.some((a) => a.nome === s.nome);
                return (
                  <button
                    key={s.nome} type="button" onClick={() => aplicarSugestao(s)} disabled={ok}
                    className={`text-xs px-2.5 py-1 rounded-full border font-medium transition ${
                      ok ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-default'
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
                    <input type="text" value={a.nome}
                      onChange={(e) => updateAcessorio(a.id, 'nome', e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  </div>
                  <div>
                    {idx === 0 && <p className="text-xs text-gray-400 mb-0.5">Qtd</p>}
                    <input type="number" min="1" step="1" value={a.qtd}
                      onChange={(e) => updateAcessorio(a.id, 'qtd', e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 text-center"
                    />
                  </div>
                  <div>
                    {idx === 0 && <p className="text-xs text-gray-400 mb-0.5">Custo un. (R$)</p>}
                    <input type="number" min="0" step="0.01" value={a.custo}
                      onChange={(e) => updateAcessorio(a.id, 'custo', e.target.value)}
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
                </span>
              </div>
            )}
          </div>

          {/* ── Frete ────────────────────────────────────────────────────────── */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest pt-1">🚚 Custo de Frete</p>
            <div className="bg-sky-50 border border-sky-100 rounded-2xl p-3 space-y-2">
              <div className="flex gap-2">
                {(['none', 'fixo', 'percentual'] as const).map((m) => (
                  <button key={m} type="button" onClick={() => setFreteMode(m)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${
                      freteMode === m ? 'bg-sky-600 text-white' : 'bg-white border border-sky-200 text-sky-700 hover:bg-sky-50'
                    }`}>
                    {m === 'none' ? '🚫 Sem frete' : m === 'fixo' ? '💰 Valor fixo' : '% Percentual'}
                  </button>
                ))}
              </div>
              {freteMode !== 'none' && (
                <div className="flex items-center gap-2">
                  <input type="number" min="0" step="0.01" value={freteValor}
                    onChange={(e) => setFreteValor(e.target.value)}
                    className="flex-1 bg-white border border-sky-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
                  <span className="text-sm text-sky-600 font-medium w-10">
                    {freteMode === 'fixo' ? 'R$' : '%'}
                  </span>
                </div>
              )}
              {freteMode !== 'none' && calc.custoFrete > 0 && (
                <div className="flex justify-between items-center text-xs text-sky-700">
                  <span>Frete por unidade ({freteMode === 'fixo' ? 'incluído no custo' : 'sobre o preço final'}):</span>
                  <span className="font-bold">{calc.custoFrete.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </div>
              )}
            </div>
          </div>

          {/* Preview */}
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-4">
            <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-3">Preview do Cálculo</p>
            {isFullBatch && (
              <div className="flex items-center gap-1.5 text-xs text-teal-700 bg-teal-50 border border-teal-200 rounded-lg px-2 py-1.5 mb-3">
                <span>🗂️</span>
                <span>Modo lote: peso e tempo ÷ <strong>{f.unidades || 1}</strong> unidades no custo unitário</span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 text-sm">
              {([
                ['Material total',        R(calc.custoFilamento)],
                ...(calc.custoMaoObra > 0 ? [['Mão de obra', R(calc.custoMaoObra)] as [string,string]] : []),
                ['Custo por unidade',     R(calc.custoUn)],
                ['Custo total do lote',   R(calc.custoTotal)],
                ['Preço consumidor',      R(calc.precoConsumidor)],
                ['Margem líq.',           `${calc.margemConsumidor}%`],
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

          {/* Botões */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onClose}
              className="w-full bg-gray-100 text-gray-600 font-bold py-3 rounded-2xl hover:bg-gray-200 transition"
            >Cancelar</button>
            <button
              onClick={handleSave}
              className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold py-3 rounded-2xl hover:opacity-90 transition"
            >Salvar Alterações</button>
          </div>
        </div>
      </div>
    </div>
  );
}

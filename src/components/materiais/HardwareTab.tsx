import { useState } from 'react';
import { useHardware } from '@/contexts/HardwareContext';
import { useSettings } from '@/contexts/SettingsContext';
import { PRINTER_PRESETS, HARDWARE_CAT_INFO } from '@/types';
import { R } from '@/utils/formatters';
import type { HardwarePeca, HardwareCategoria } from '@/types';

// ─── Form state vazia ─────────────────────────────────────────────────────────
const FORM_VAZIO: Omit<HardwarePeca, 'id'> = {
  nome:           '',
  categoria:      'bico',
  impressoraId:   '',
  impressoraNome: '',
  estoqueAtual:   1,
  estoqueMinimo:  1,
  horasVidaUtil:  500,
  horasUsadas:    0,
  custoUn:        0,
  notas:          '',
};

const HORAS_SUGESTAO: Record<HardwareCategoria, number> = {
  bico:         400,
  hotend:       1500,
  correia:      3000,
  sensor:       5000,
  lubrificante: 200,
  outro:        1000,
};

// ─── Semáforo de saúde da peça ────────────────────────────────────────────────
function getSemaforo(pctHoras: number, estoqueAlerta: boolean): {
  cor: string; label: string; dot: string;
} {
  if (pctHoras >= 100 || estoqueAlerta)
    return { cor: 'bg-red-500',    label: 'Crítico',  dot: 'bg-red-500 shadow-red-300' };
  if (pctHoras >= 70)
    return { cor: 'bg-amber-400',  label: 'Atenção',  dot: 'bg-amber-400 shadow-amber-200' };
  return   { cor: 'bg-emerald-500',label: 'Saudável', dot: 'bg-emerald-500 shadow-emerald-200' };
}

// ─── Componente ───────────────────────────────────────────────────────────────
export function HardwareTab() {
  const { pecas, addPeca, updatePeca, removePeca, adicionarHoras } = useHardware();
  const { customPrinters, printerOverrides } = useSettings();

  const [showForm, setShowForm]   = useState(false);
  const [editId, setEditId]       = useState<string | null>(null);
  const [form, setForm]           = useState<Omit<HardwarePeca, 'id'>>(FORM_VAZIO);
  const [horasInput, setHorasInput] = useState<Record<string, string>>({});

  // Mescla presets + overrides + customizados
  const allPrinters = [
    ...PRINTER_PRESETS.map((p) => ({ ...p, ...(printerOverrides[p.id] ?? {}) })),
    ...customPrinters,
  ];

  function abrirNovo() {
    setForm(FORM_VAZIO);
    setEditId(null);
    setShowForm(true);
  }

  function abrirEditar(p: HardwarePeca) {
    setForm({
      nome: p.nome, categoria: p.categoria, impressoraId: p.impressoraId ?? '',
      impressoraNome: p.impressoraNome ?? '', estoqueAtual: p.estoqueAtual,
      estoqueMinimo: p.estoqueMinimo, horasVidaUtil: p.horasVidaUtil,
      horasUsadas: p.horasUsadas, custoUn: p.custoUn, notas: p.notas ?? '',
    });
    setEditId(p.id);
    setShowForm(true);
  }

  function salvar() {
    if (!form.nome.trim()) return;
    if (editId) {
      updatePeca(editId, form);
    } else {
      addPeca(form);
    }
    setShowForm(false);
    setEditId(null);
  }

  function f(field: keyof typeof form, val: string | number) {
    setForm((prev) => ({ ...prev, [field]: val }));
  }

  function onCatChange(cat: HardwareCategoria) {
    setForm((prev) => ({ ...prev, categoria: cat, horasVidaUtil: HORAS_SUGESTAO[cat] }));
  }

  const alertasEstoque = pecas.filter(p => p.estoqueMinimo > 0 && p.estoqueAtual <= p.estoqueMinimo);
  const alertasHoras   = pecas.filter(p => p.horasVidaUtil > 0 && p.horasUsadas >= p.horasVidaUtil * 0.9);

  return (
    <div className="space-y-4">
      {/* ── Cabeçalho ──────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm p-5 flex items-center justify-between">
        <div>
          <h2 className="font-bold text-gray-800 text-lg">Inventário de Hardware</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            {pecas.length} peça{pecas.length !== 1 ? 's' : ''} cadastrada{pecas.length !== 1 ? 's' : ''}
            {alertasEstoque.length > 0 && (
              <span className="ml-2 text-amber-600 font-semibold">· {alertasEstoque.length} com estoque baixo</span>
            )}
            {alertasHoras.length > 0 && (
              <span className="ml-2 text-red-600 font-semibold">· {alertasHoras.length} no limite de horas</span>
            )}
          </p>
        </div>
        <button
          onClick={abrirNovo}
          className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-bold px-4 py-2 rounded-xl hover:opacity-90 transition flex items-center gap-2"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Nova Peça
        </button>
      </div>

      {/* ── Formulário de cadastro / edição ────────────────────────────────── */}
      {showForm && (
        <div className="bg-white rounded-2xl shadow-sm p-5 border-2 border-indigo-100 space-y-4">
          <h3 className="font-bold text-gray-700">{editId ? '✏️ Editar Peça' : '🔧 Nova Peça de Hardware'}</h3>

          <div className="grid grid-cols-2 gap-3">
            {/* Nome */}
            <div className="col-span-2">
              <label className="text-xs font-semibold text-gray-500">Nome da peça *</label>
              <input
                value={form.nome}
                onChange={(e) => f('nome', e.target.value)}
                placeholder="Ex: Bico 0.4mm, Hotend Bambu A1…"
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>

            {/* Categoria */}
            <div>
              <label className="text-xs font-semibold text-gray-500">Categoria</label>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {(Object.keys(HARDWARE_CAT_INFO) as HardwareCategoria[]).map((cat) => {
                  const info = HARDWARE_CAT_INFO[cat];
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => onCatChange(cat)}
                      className={`text-xs px-2.5 py-1 rounded-full font-semibold border transition ${
                        form.categoria === cat
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'border-gray-200 text-gray-600 hover:border-indigo-300'
                      }`}
                    >
                      {info.emoji} {info.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Compatibilidade impressora */}
            <div>
              <label className="text-xs font-semibold text-gray-500">Impressora (compatibilidade)</label>
              <select
                value={form.impressoraId}
                onChange={(e) => {
                  const id = e.target.value;
                  const printer = allPrinters.find((p) => p.id === id);
                  f('impressoraId', id);
                  f('impressoraNome', printer ? `${printer.marca} ${printer.nome}` : '');
                }}
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <option value="">Universal / Não especificada</option>
                {allPrinters.map((p) => (
                  <option key={p.id} value={p.id}>{p.marca} {p.nome}</option>
                ))}
              </select>
            </div>

            {/* Estoque atual */}
            <div>
              <label className="text-xs font-semibold text-gray-500">Estoque atual</label>
              <input
                type="number" inputMode="decimal" min={0}
                value={form.estoqueAtual}
                onChange={(e) => f('estoqueAtual', +e.target.value || 0)}
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>

            {/* Estoque mínimo */}
            <div>
              <label className="text-xs font-semibold text-gray-500">Estoque mínimo (alerta)</label>
              <input
                type="number" inputMode="decimal" min={0}
                value={form.estoqueMinimo}
                onChange={(e) => f('estoqueMinimo', +e.target.value || 0)}
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>

            {/* Horas de vida útil */}
            <div>
              <label className="text-xs font-semibold text-gray-500">Vida útil estimada (horas)</label>
              <input
                type="number" inputMode="decimal" min={1}
                value={form.horasVidaUtil}
                onChange={(e) => f('horasVidaUtil', +e.target.value || 1)}
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>

            {/* Horas já usadas */}
            <div>
              <label className="text-xs font-semibold text-gray-500">Horas já usadas (atual)</label>
              <input
                type="number" inputMode="decimal" min={0}
                value={form.horasUsadas}
                onChange={(e) => f('horasUsadas', +e.target.value || 0)}
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>

            {/* Custo unitário */}
            <div>
              <label className="text-xs font-semibold text-gray-500">Custo unitário (R$)</label>
              <input
                type="number" inputMode="decimal" min={0} step="0.01"
                value={form.custoUn}
                onChange={(e) => f('custoUn', +e.target.value || 0)}
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>

            {/* Notas */}
            <div className="col-span-2">
              <label className="text-xs font-semibold text-gray-500">Notas (opcional)</label>
              <input
                value={form.notas}
                onChange={(e) => f('notas', e.target.value)}
                placeholder="Ex: Substituir a cada 3 meses, compatível com ABS/PETG…"
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={salvar}
              disabled={!form.nome.trim()}
              className="bg-indigo-600 text-white text-sm font-bold px-5 py-2 rounded-xl hover:opacity-90 transition disabled:opacity-40"
            >
              {editId ? 'Salvar alterações' : 'Cadastrar peça'}
            </button>
            <button
              onClick={() => { setShowForm(false); setEditId(null); }}
              className="bg-gray-100 text-gray-600 text-sm font-bold px-4 py-2 rounded-xl hover:bg-gray-200 transition"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ── Lista vazia ────────────────────────────────────────────────────── */}
      {pecas.length === 0 && !showForm && (
        <div className="bg-white rounded-2xl shadow-sm p-12 flex flex-col items-center gap-4 text-center">
          {/* Ilustração SVG */}
          <svg width="80" height="80" viewBox="0 0 80 80" fill="none" className="opacity-60">
            <circle cx="40" cy="40" r="38" fill="#EEF2FF" />
            <rect x="28" y="22" width="24" height="36" rx="4" fill="#C7D2FE" />
            <rect x="33" y="28" width="14" height="3" rx="1.5" fill="#818CF8" />
            <rect x="33" y="35" width="9" height="3" rx="1.5" fill="#818CF8" />
            <circle cx="52" cy="53" r="10" fill="#4F46E5" />
            <path d="M48 53h8M52 49v8" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <div>
            <p className="font-bold text-gray-700 text-base">Nenhuma peça cadastrada ainda</p>
            <p className="text-sm text-gray-400 max-w-xs mt-1">
              Cadastre bicos, hotends, correias e sensores para monitorar o desgaste e receber alertas antes que sua impressora pare.
            </p>
          </div>
          <button onClick={abrirNovo}
            className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-bold px-6 py-2.5 rounded-xl hover:opacity-90 transition shadow-sm">
            🔧 Cadastrar primeira peça
          </button>
        </div>
      )}

      {/* ── Painel de saúde geral (semáforo resumido) ──────────────────────── */}
      {pecas.length > 0 && (() => {
        const criticos  = pecas.filter(p => {
          const pct = p.horasVidaUtil > 0 ? (p.horasUsadas / p.horasVidaUtil) * 100 : 0;
          return pct >= 100 || (p.estoqueMinimo > 0 && p.estoqueAtual <= p.estoqueMinimo);
        }).length;
        const atencao = pecas.filter(p => {
          const pct = p.horasVidaUtil > 0 ? (p.horasUsadas / p.horasVidaUtil) * 100 : 0;
          const estOk = !(p.estoqueMinimo > 0 && p.estoqueAtual <= p.estoqueMinimo);
          return pct >= 70 && pct < 100 && estOk;
        }).length;
        const saudaveis = pecas.length - criticos - atencao;
        return (
          <div className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-4">
            <p className="text-xs font-semibold text-gray-500 flex-1">Saúde do Hardware</p>
            <div className="flex items-center gap-3 text-xs font-bold">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                <span className="text-emerald-700">{saudaveis} saudável{saudaveis !== 1 ? 'is' : ''}</span>
              </span>
              {atencao > 0 && (
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                  <span className="text-amber-700">{atencao} atenção</span>
                </span>
              )}
              {criticos > 0 && (
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
                  <span className="text-red-700">{criticos} crítico{criticos !== 1 ? 's' : ''}</span>
                </span>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── Grid de cards ──────────────────────────────────────────────────── */}
      {pecas.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {pecas.map((p) => {
            const catInfo    = HARDWARE_CAT_INFO[p.categoria];
            const pctHoras   = p.horasVidaUtil > 0 ? Math.min(100, (p.horasUsadas / p.horasVidaUtil) * 100) : 0;
            const pctEstoque = p.estoqueMinimo > 0 ? Math.min(100, (p.estoqueAtual / (p.estoqueMinimo * 3)) * 100) : 100;
            const horasRestantes = Math.max(0, p.horasVidaUtil - p.horasUsadas);
            const horasAlerta = pctHoras >= 100;
            const horasAviso  = pctHoras >= 70 && !horasAlerta;
            const estoqueAlerta = p.estoqueMinimo > 0 && p.estoqueAtual <= p.estoqueMinimo;
            const barHoraCor = horasAlerta ? 'bg-red-500' : pctHoras >= 90 ? 'bg-amber-400' : 'bg-indigo-500';
            const barEstoqueCor = estoqueAlerta ? 'bg-red-500' : 'bg-emerald-500';
            const semaforo = getSemaforo(pctHoras, estoqueAlerta);
            const printerNome = p.impressoraId
              ? allPrinters.find((pr) => pr.id === p.impressoraId)
                  ? `${allPrinters.find((pr) => pr.id === p.impressoraId)!.marca} ${allPrinters.find((pr) => pr.id === p.impressoraId)!.nome}`
                  : (p.impressoraNome ?? 'Universal')
              : 'Universal';

            return (
              <div key={p.id} className={`bg-white rounded-2xl shadow-sm p-5 flex flex-col gap-3 ${
                horasAlerta || estoqueAlerta ? 'border-2 border-red-200' :
                horasAviso                  ? 'border-2 border-amber-200' : ''
              }`}>
                {/* Topo */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    {/* Semáforo de saúde + ícone de categoria */}
                    <div className="relative">
                      <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-xl">
                        {catInfo.emoji}
                      </div>
                      {/* Dot de semáforo no canto superior direito */}
                      <span
                        title={`Saúde: ${semaforo.label}`}
                        className={`absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white shadow-md ${semaforo.dot}`}
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-gray-800 leading-none">{p.nome}</p>
                        {/* Badge semáforo textual */}
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white ${semaforo.cor}`}>
                          {semaforo.label}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">{printerNome}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${catInfo.cor}`}>
                      {catInfo.label}
                    </span>
                    <button onClick={() => abrirEditar(p)}
                      className="w-8 h-8 rounded-lg bg-amber-50 hover:bg-amber-100 flex items-center justify-center transition">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                    <button onClick={() => { if (confirm(`Remover "${p.nome}"?`)) removePeca(p.id); }}
                      className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center transition text-red-400 font-bold text-lg">
                      ×
                    </button>
                  </div>
                </div>

                {/* Barra de horas */}
                <div>
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>⏱️ Horas de uso</span>
                    <span className={horasAlerta ? 'text-red-600 font-bold' : horasAviso ? 'text-amber-600 font-semibold' : ''}>
                      {p.horasUsadas}h / {p.horasVidaUtil}h
                      {horasAlerta && ' — SUBSTITUIR'}
                      {horasAviso && ` — ${horasRestantes}h restantes`}
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${barHoraCor}`}
                      style={{ width: `${pctHoras}%` }} />
                  </div>
                </div>

                {/* Barra de estoque */}
                <div>
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>📦 Estoque</span>
                    <span className={estoqueAlerta ? 'text-red-600 font-bold' : ''}>
                      {p.estoqueAtual} un. {estoqueAlerta && `(mín: ${p.estoqueMinimo})`}
                      {p.custoUn > 0 && ` · ${R(p.estoqueAtual * p.custoUn)}`}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${barEstoqueCor}`}
                      style={{ width: `${Math.min(pctEstoque, 100)}%` }} />
                  </div>
                </div>

                {/* Notas */}
                {p.notas && (
                  <p className="text-xs text-gray-400 italic">{p.notas}</p>
                )}

                {/* Controles rápidos: ajustar estoque e adicionar horas */}
                <div className="flex items-center gap-2 pt-1 border-t border-gray-50">
                  {/* Estoque +/- */}
                  <div className="flex items-center gap-1">
                    <button onClick={() => updatePeca(p.id, { estoqueAtual: Math.max(0, p.estoqueAtual - 1) })}
                      className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-red-100 hover:text-red-600 text-gray-600 font-bold flex items-center justify-center text-sm transition">
                      −
                    </button>
                    <span className="text-sm font-bold text-gray-700 w-6 text-center">{p.estoqueAtual}</span>
                    <button onClick={() => updatePeca(p.id, { estoqueAtual: p.estoqueAtual + 1 })}
                      className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-emerald-100 hover:text-emerald-600 text-gray-600 font-bold flex items-center justify-center text-sm transition">
                      +
                    </button>
                    <span className="text-[10px] text-gray-400 ml-0.5">estoque</span>
                  </div>

                  <div className="w-px h-5 bg-gray-100 mx-1" />

                  {/* Horas usadas */}
                  <div className="flex items-center gap-1 flex-1">
                    <input
                      type="number" inputMode="decimal" min={0} step={0.5}
                      placeholder="+ horas"
                      value={horasInput[p.id] ?? ''}
                      onChange={(e) => setHorasInput((prev) => ({ ...prev, [p.id]: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const h = parseFloat(horasInput[p.id] ?? '0') || 0;
                          if (h > 0) { adicionarHoras(p.id, h); setHorasInput((prev) => ({ ...prev, [p.id]: '' })); }
                        }
                      }}
                      className="w-20 border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-indigo-400 focus-visible:ring-2 focus-visible:ring-indigo-400"
                    />
                    <button
                      onClick={() => {
                        const h = parseFloat(horasInput[p.id] ?? '0') || 0;
                        if (h > 0) { adicionarHoras(p.id, h); setHorasInput((prev) => ({ ...prev, [p.id]: '' })); }
                      }}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-lg transition"
                    >
                      + horas
                    </button>
                    <button
                      onClick={() => updatePeca(p.id, { horasUsadas: 0 })}
                      title="Zerar horas (substituição)"
                      className="text-xs font-bold text-emerald-600 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded-lg transition"
                    >
                      ↺ reset
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

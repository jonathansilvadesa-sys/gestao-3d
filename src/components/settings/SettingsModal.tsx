import { useState, useRef } from 'react';
import { useSettings } from '@/contexts/SettingsContext';
import { useCanais }   from '@/contexts/CanaisContext';
import { PRINTER_PRESETS } from '@/types';
import type { AppSettings, CanalVenda, PrinterProfile } from '@/types';

interface Props { onClose: () => void }

const EMOJIS = ['🛒','🧡','📸','🌿','🌐','🤝','💼','🏪','📦','💻','🎯','🎁','🔥','⭐','💎'];

// ─── Agrupamento de presets por marca ─────────────────────────────────────────
const MARCA_COR: Record<string, string> = {
  'Bambu Lab':  'bg-green-50 border-green-200 text-green-700',
  'Creality':   'bg-blue-50 border-blue-200 text-blue-700',
  'Snapmaker':  'bg-purple-50 border-purple-200 text-purple-700',
  'Flashforge': 'bg-orange-50 border-orange-200 text-orange-700',
};

export function SettingsModal({ onClose }: Props) {
  const {
    settings, updateSettings,
    customPrinters, addCustomPrinter, updateCustomPrinter, removeCustomPrinter,
    printerOverrides, updatePrinterOverride, resetPrinterOverride,
  } = useSettings();
  const { canais, addCanal, updateCanal, removeCanal, resetCanais } = useCanais();

  const [form, setForm] = useState<AppSettings>({ ...settings });

  // ── Estado para canais ──────────────────────────────────────────────────
  const [canaisEdit, setCanaisEdit] = useState<(CanalVenda & { _editing?: boolean })[]>(
    () => canais.map((c) => ({ ...c }))
  );
  const [novoCanal, setNovoCanal] = useState({ nome: '', emoji: '🛒', taxaPercent: 0 });
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const [showEmojiNovo, setShowEmojiNovo] = useState(false);

  // ── Estado para impressoras personalizadas ──────────────────────────────
  const [showAddPrinter, setShowAddPrinter] = useState(false);
  const [novaPrint, setNovaPrint] = useState({ nome: '', marca: '', potenciaW: '', valorMaquina: '', vidaUtilHoras: '' });

  // ── Estado para edição de perfil (preset ou custom) ─────────────────────
  type EditingPrinter = { id: string; nome: string; marca: string; potenciaW: string; valorMaquina: string; vidaUtilHoras: string; isPreset: boolean };
  const [editingPrinter, setEditingPrinter] = useState<EditingPrinter | null>(null);

  const startEditPrinter = (p: PrinterProfile) => {
    setEditingPrinter({
      id: p.id, nome: p.nome, marca: p.marca, isPreset: !!p.isPreset,
      potenciaW:     String(p.potenciaW),
      valorMaquina:  String(p.valorMaquina),
      vidaUtilHoras: String(p.vidaUtilHoras),
    });
    setShowAddPrinter(false);
  };

  const saveEditPrinter = () => {
    if (!editingPrinter) return;
    const updates = {
      nome:          editingPrinter.nome,
      marca:         editingPrinter.marca,
      potenciaW:     parseFloat(editingPrinter.potenciaW)     || 350,
      valorMaquina:  parseFloat(editingPrinter.valorMaquina)  || 3000,
      vidaUtilHoras: parseFloat(editingPrinter.vidaUtilHoras) || 20000,
    };
    if (editingPrinter.isPreset) {
      updatePrinterOverride(editingPrinter.id, updates);
    } else {
      updateCustomPrinter(editingPrinter.id, updates);
    }
    // Se este perfil está ativo, atualiza os campos do form também
    if (form.impressoraAtualId === editingPrinter.id) {
      setForm((prev) => ({
        ...prev,
        potenciaW:        updates.potenciaW,
        amortizacaoValor: updates.valorMaquina,
        amortizacaoHoras: updates.vidaUtilHoras,
      }));
    }
    setEditingPrinter(null);
  };

  const set = (k: keyof AppSettings) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [k]: parseFloat(e.target.value) || 0 }));

  const handleSave = () => {
    updateSettings(form);
    canaisEdit.forEach((c) => updateCanal(c.id, {
      nome: c.nome, emoji: c.emoji, taxaPercent: c.taxaPercent, cor: c.cor,
    }));
    onClose();
  };

  // Aplica preset de impressora nos campos
  const applyPrinter = (p: PrinterProfile) => {
    setForm((prev) => ({
      ...prev,
      potenciaW: p.potenciaW,
      amortizacaoValor: p.valorMaquina,
      amortizacaoHoras: p.vidaUtilHoras,
      impressoraAtualId: p.id,
    }));
  };

  // Mescla presets com overrides do usuário e adiciona customizados
  const allPrinters: PrinterProfile[] = [
    ...PRINTER_PRESETS.map((p) => ({ ...p, ...(printerOverrides[p.id] ?? {}) })),
    ...customPrinters,
  ];

  const Field = ({ label, k, unit }: { label: string; k: keyof AppSettings; unit?: string }) => (
    <div>
      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">{label}</label>
      <div className="mt-1 flex items-center gap-2">
        <input
          type="number" inputMode="decimal" step="0.01" value={form[k] as number} onChange={set(k)}
          className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        {unit && <span className="text-xs text-gray-400 font-medium w-10">{unit}</span>}
      </div>
    </div>
  );

  const updateEdit = (id: string, field: keyof CanalVenda, value: string | number) =>
    setCanaisEdit((prev) => prev.map((c) => c.id === id ? { ...c, [field]: value } : c));

  const handleRemoveEdit = (id: string) => {
    if (canaisEdit.length <= 1) return;
    removeCanal(id);
    setCanaisEdit((prev) => prev.filter((c) => c.id !== id));
  };

  const handleAddCanal = () => {
    if (!novoCanal.nome.trim()) return;
    addCanal({ ...novoCanal, cor: 'gray' });
    setCanaisEdit((prev) => [...prev, { id: `canal_${Date.now()}`, ...novoCanal, cor: 'gray' }]);
    setNovoCanal({ nome: '', emoji: '🛒', taxaPercent: 0 });
    setShowAddForm(false);
  };

  const handleAddPrinter = () => {
    if (!novaPrint.nome.trim()) return;
    addCustomPrinter({
      nome:          novaPrint.nome,
      marca:         novaPrint.marca || 'Personalizado',
      potenciaW:     parseFloat(novaPrint.potenciaW) || 350,
      valorMaquina:  parseFloat(novaPrint.valorMaquina) || 3000,
      vidaUtilHoras: parseFloat(novaPrint.vidaUtilHoras) || 20000,
    });
    setNovaPrint({ nome: '', marca: '', potenciaW: '', valorMaquina: '', vidaUtilHoras: '' });
    setShowAddPrinter(false);
  };

  // ── Backup e Restauração ───────────────────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement>(null);

  const exportSystemBackup = () => {
    const backupData: Record<string, string | null> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('gestao3d_')) {
        backupData[key] = localStorage.getItem(key);
      }
    }
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const date = new Date().toISOString().split('T')[0];
    link.href = url;
    link.download = `gestao3d_backup_${date}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importSystemBackup = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (Object.keys(data).some((key) => key.startsWith('gestao3d_'))) {
          Object.entries(data).forEach(([key, value]) => {
            if (value) localStorage.setItem(key, value as string);
          });
          alert('Backup restaurado com sucesso! O sistema irá recarregar.');
          window.location.reload();
        } else {
          alert('Arquivo de backup inválido.');
        }
      } catch {
        alert('Erro ao ler o arquivo de backup.');
      }
    };
    reader.readAsText(file);
  };

  // Agrupamento por marca
  const marcas = [...new Set(allPrinters.map((p) => p.marca))];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.55)' }} onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 w-full sm:max-w-lg sm:mx-4 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: '92vh' }} onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="bg-gradient-to-r from-slate-700 to-slate-900 rounded-t-3xl p-5 text-white flex justify-between items-start flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold">⚙️ Configurações Globais</h2>
            <p className="text-sm opacity-70 mt-0.5">Padrões usados em todas as novas peças</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-xl font-bold transition flex-shrink-0"
          >×</button>
        </div>

        <div className="p-5 sm:p-6 space-y-6 overflow-y-auto flex-1">

          {/* ── PERFIS DE IMPRESSORA ──────────────────────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest">🖨 Perfis de Impressora</p>
              <button type="button" onClick={() => setShowAddPrinter((v) => !v)}
                className="text-xs bg-indigo-50 text-indigo-600 font-bold px-2 py-1 rounded-lg hover:bg-indigo-100 transition">
                + Personalizado
              </button>
            </div>
            <p className="text-xs text-gray-400 -mt-1 mb-3">
              Selecione para preencher potência e amortização automaticamente. Ajuste depois se necessário.
            </p>

            {/* Cards de presets por marca */}
            <div className="space-y-2">
              {marcas.map((marca) => {
                const printers = allPrinters.filter((p) => p.marca === marca);
                const corClasse = MARCA_COR[marca] ?? 'bg-gray-50 border-gray-200 text-gray-700';
                return (
                  <div key={marca}>
                    <p className="text-xs font-bold text-gray-500 mb-1 px-1">{marca}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {printers.map((p) => {
                        const ativo = form.impressoraAtualId === p.id;
                        const hasOverride = !!p.isPreset && !!printerOverrides[p.id];
                        return (
                          <div key={p.id} className="relative group">
                            {/* Badge principal */}
                            <button type="button" onClick={() => applyPrinter(p)}
                              className={`pl-3 pr-8 py-2 rounded-xl border text-xs font-semibold transition ${
                                ativo ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : `${corClasse} hover:opacity-80`
                              }`}
                              title={`${p.potenciaW}W · R$ ${p.valorMaquina.toLocaleString()} · ${p.vidaUtilHoras.toLocaleString()}h`}>
                              {p.nome}
                              {ativo && <span className="ml-1">✓</span>}
                              {hasOverride && <span className="ml-1 opacity-70">✎</span>}
                            </button>

                            {/* Botão editar — aparece no hover */}
                            <button type="button"
                              onClick={(e) => { e.stopPropagation(); startEditPrinter(p); }}
                              className={`absolute right-0 top-0 bottom-0 w-7 flex items-center justify-center rounded-r-xl text-[11px] opacity-0 group-hover:opacity-100 transition-opacity ${
                                ativo ? 'bg-indigo-500 hover:bg-indigo-400 text-white' : 'bg-black/10 hover:bg-black/20 text-gray-700'
                              }`}
                              title="Editar perfil">
                              ✏️
                            </button>

                            {/* Botão remover — só para custom */}
                            {!p.isPreset && (
                              <button type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm(`Remover "${p.nome}"?`)) removeCustomPrinter(p.id);
                                }}
                                className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center font-bold hover:bg-red-600 leading-none z-10"
                                title="Remover">
                                ×
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Formulário de edição inline de perfil */}
            {editingPrinter && (
              <div className="mt-3 bg-amber-50 border border-amber-200 rounded-2xl p-3 space-y-2">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-bold text-amber-700">
                    ✏️ Editar: {editingPrinter.nome}
                    {editingPrinter.isPreset && <span className="ml-2 font-normal text-amber-500">(preset)</span>}
                  </p>
                  {editingPrinter.isPreset && printerOverrides[editingPrinter.id] && (
                    <button type="button"
                      onClick={() => { resetPrinterOverride(editingPrinter.id); setEditingPrinter(null); }}
                      className="text-[11px] text-amber-600 hover:text-amber-800 underline">
                      Restaurar padrão
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input value={editingPrinter.nome}
                    onChange={(e) => setEditingPrinter((p) => p && ({ ...p, nome: e.target.value }))}
                    placeholder="Nome"
                    className="col-span-2 border border-amber-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400" />
                  {!editingPrinter.isPreset && (
                    <input value={editingPrinter.marca}
                      onChange={(e) => setEditingPrinter((p) => p && ({ ...p, marca: e.target.value }))}
                      placeholder="Marca"
                      className="col-span-2 border border-amber-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400" />
                  )}
                  <div className="relative">
                    <input type="number" inputMode="decimal" value={editingPrinter.potenciaW}
                      onChange={(e) => setEditingPrinter((p) => p && ({ ...p, potenciaW: e.target.value }))}
                      placeholder="Potência"
                      className="w-full border border-amber-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400" />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-amber-400">W</span>
                  </div>
                  <div className="relative">
                    <input type="number" inputMode="decimal" value={editingPrinter.valorMaquina}
                      onChange={(e) => setEditingPrinter((p) => p && ({ ...p, valorMaquina: e.target.value }))}
                      placeholder="Valor"
                      className="w-full border border-amber-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400" />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-amber-400">R$</span>
                  </div>
                  <div className="relative col-span-2">
                    <input type="number" inputMode="decimal" value={editingPrinter.vidaUtilHoras}
                      onChange={(e) => setEditingPrinter((p) => p && ({ ...p, vidaUtilHoras: e.target.value }))}
                      placeholder="Vida útil"
                      className="w-full border border-amber-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400" />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-amber-400">h</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setEditingPrinter(null)}
                    className="flex-1 text-xs py-1.5 rounded-lg border border-amber-200 text-amber-600 hover:bg-amber-50">Cancelar</button>
                  <button type="button" onClick={saveEditPrinter}
                    className="flex-1 text-xs py-1.5 rounded-lg bg-amber-500 text-white font-bold hover:opacity-90">Salvar</button>
                </div>
              </div>
            )}

            {/* Preset selecionado — detalhes */}
            {form.impressoraAtualId && (() => {
              const p = allPrinters.find((x) => x.id === form.impressoraAtualId);
              if (!p) return null;
              return (
                <div className="mt-2 bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2 text-xs text-indigo-700 flex items-center gap-3">
                  <span className="font-bold">{p.marca} {p.nome}</span>
                  <span>·</span>
                  <span>{p.potenciaW}W</span>
                  <span>·</span>
                  <span>R$ {p.valorMaquina.toLocaleString()}</span>
                  <span>·</span>
                  <span>{p.vidaUtilHoras.toLocaleString()}h</span>
                  <button type="button" onClick={() => setForm((prev) => ({ ...prev, impressoraAtualId: '' }))}
                    className="ml-auto text-indigo-400 hover:text-indigo-700">✕</button>
                </div>
              );
            })()}

            {/* Formulário de impressora personalizada */}
            {showAddPrinter && (
              <div className="mt-3 bg-gray-50 border border-gray-200 rounded-2xl p-3 space-y-2">
                <p className="text-xs font-bold text-gray-600">Nova impressora personalizada</p>
                <div className="grid grid-cols-2 gap-2">
                  <input value={novaPrint.nome} onChange={(e) => setNovaPrint((p) => ({ ...p, nome: e.target.value }))}
                    placeholder="Nome (ex: Ender 5)"
                    className="col-span-2 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                  <input value={novaPrint.marca} onChange={(e) => setNovaPrint((p) => ({ ...p, marca: e.target.value }))}
                    placeholder="Marca (ex: Creality)"
                    className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                  <div className="relative">
                    <input type="number" inputMode="decimal" value={novaPrint.potenciaW} onChange={(e) => setNovaPrint((p) => ({ ...p, potenciaW: e.target.value }))}
                      placeholder="Potência (W)"
                      className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">W</span>
                  </div>
                  <div className="relative">
                    <input type="number" inputMode="decimal" value={novaPrint.valorMaquina} onChange={(e) => setNovaPrint((p) => ({ ...p, valorMaquina: e.target.value }))}
                      placeholder="Valor (R$)"
                      className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">R$</span>
                  </div>
                  <div className="relative">
                    <input type="number" inputMode="decimal" value={novaPrint.vidaUtilHoras} onChange={(e) => setNovaPrint((p) => ({ ...p, vidaUtilHoras: e.target.value }))}
                      placeholder="Vida útil (h)"
                      className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">h</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowAddPrinter(false)}
                    className="flex-1 text-xs py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">Cancelar</button>
                  <button type="button" onClick={handleAddPrinter}
                    disabled={!novaPrint.nome.trim()}
                    className="flex-1 text-xs py-1.5 rounded-lg bg-indigo-600 text-white font-bold hover:opacity-90 disabled:opacity-40">Adicionar</button>
                </div>
              </div>
            )}
          </div>

          {/* ── ENERGIA ──────────────────────────────────────────────────────── */}
          <div>
            <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-3">⚡ Energia</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Custo kWh" k="custoKwh" unit="R$" />
              <Field label="Potência padrão" k="potenciaW" unit="W" />
            </div>
          </div>

          {/* ── AMORTIZAÇÃO ──────────────────────────────────────────────────── */}
          <div>
            <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-3">📉 Amortização da Impressora</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Valor da máquina" k="amortizacaoValor" unit="R$" />
              <Field label="Vida útil" k="amortizacaoHoras" unit="h" />
            </div>
          </div>

          {/* ── FILAMENTO ────────────────────────────────────────────────────── */}
          <div>
            <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-3">🧵 Filamento</p>
            <Field label="Custo padrão do filamento" k="filamentoCustoKg" unit="R$/kg" />
          </div>

          {/* ── FRETE PADRÃO ─────────────────────────────────────────────────── */}
          <div>
            <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-3">🚚 Frete Padrão</p>
            <p className="text-xs text-gray-400 -mt-1 mb-3">
              Será pré-selecionado em novas peças. Pode ser alterado peça a peça.
            </p>
            <div className="flex gap-2 mb-3">
              {(['none', 'fixo', 'percentual'] as const).map((m) => (
                <button key={m} type="button"
                  onClick={() => setForm((p) => ({ ...p, freteMode: m }))}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${
                    form.freteMode === m ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}>
                  {m === 'none' ? '🚫 Sem frete' : m === 'fixo' ? '💰 Valor fixo' : '% Percentual'}
                </button>
              ))}
            </div>
            {form.freteMode !== 'none' && (
              <div className="flex items-center gap-2">
                <input type="number" inputMode="decimal" min="0" step="0.01"
                  value={form.freteValor}
                  onChange={(e) => setForm((p) => ({ ...p, freteValor: parseFloat(e.target.value) || 0 }))}
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                <span className="text-sm text-gray-500 font-medium w-10">
                  {form.freteMode === 'fixo' ? 'R$' : '%'}
                </span>
              </div>
            )}
          </div>

          {/* ── IMPOSTOS E TAXAS ─────────────────────────────────────────────── */}
          <div>
            <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-3">💸 Impostos e Taxas</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Field label="Imposto" k="imposto" unit="%" />
              <Field label="Taxa cartão" k="txCartao" unit="%" />
              <Field label="Anúncio padrão" k="custoAnuncio" unit="%" />
            </div>
          </div>

          {/* ── CUSTOS FIXOS ─────────────────────────────────────────────────── */}
          <div>
            <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-3">🏭 Custos Fixos</p>
            <p className="text-xs text-gray-400 -mt-1 mb-3">
              Rateio por absorção: o custo fixo é dividido pelas horas disponíveis e alocado proporcionalmente ao tempo de impressão de cada peça.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Custo fixo/mês" k="custoFixoMes" unit="R$" />
              <Field label="Horas disponíveis/mês" k="horasDisponiveisMes" unit="h" />
            </div>
            {/* Helper: custo fixo por hora */}
            {form.horasDisponiveisMes > 0 && (
              <div className="mt-2 bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2 text-xs text-indigo-700 flex items-center gap-2">
                <span>⚡</span>
                <span>
                  Custo fixo/hora:{' '}
                  <strong>
                    {(form.custoFixoMes / form.horasDisponiveisMes).toLocaleString('pt-BR', {
                      style: 'currency', currency: 'BRL', minimumFractionDigits: 2,
                    })}
                    /h
                  </strong>
                  {' '}— ex: peça de 3h absorve{' '}
                  <strong>
                    {(3 * form.custoFixoMes / form.horasDisponiveisMes).toLocaleString('pt-BR', {
                      style: 'currency', currency: 'BRL', minimumFractionDigits: 2,
                    })}
                  </strong>
                  {' '}de custo fixo
                </span>
              </div>
            )}
          </div>

          {/* ── MÃO DE OBRA ──────────────────────────────────────────────────── */}
          <div>
            <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-3">🧑‍🔧 Mão de Obra</p>
            <Field label="Valor padrão da hora" k="maoObraTaxa" unit="R$/h" />
            <p className="text-xs text-gray-400 mt-1">0 = sem mão de obra.</p>
          </div>

          {/* ── CONTINGÊNCIA ─────────────────────────────────────────────────── */}
          <div>
            <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-3">⚠️ Contingência</p>
            <Field label="Taxa de falhas" k="falhas" unit="%" />
          </div>

          {/* ── META DE FATURAMENTO ───────────────────────────────────────────── */}
          <div>
            <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-3">🎯 Meta de Faturamento Mensal</p>
            <p className="text-xs text-gray-400 -mt-1 mb-3">
              Defina uma meta de receita bruta por mês. Ao reduzir o estoque na aba Estoque, as vendas são registradas automaticamente. Use 0 para não exibir a meta.
            </p>
            <Field label="Meta de receita mensal" k="metaFaturamento" unit="R$" />
          </div>

          {/* ── CANAIS DE VENDA ───────────────────────────────────────────────── */}
          <div className="border-t border-gray-100 pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest">🛒 Canais de Venda</p>
                <p className="text-xs text-gray-400 mt-0.5">Edite as taxas — refletem em todos os cálculos automaticamente</p>
              </div>
              <button type="button"
                onClick={() => { if (confirm('Restaurar canais para os valores padrão?')) { resetCanais(); setCanaisEdit(canais.map((c) => ({...c}))); } }}
                className="text-xs text-gray-400 hover:text-gray-600 underline">Restaurar padrões</button>
            </div>

            <div className="space-y-2">
              {canaisEdit.map((canal) => (
                <div key={canal.id} className="grid grid-cols-[40px_1fr_80px_32px] gap-2 items-center bg-gray-50 rounded-xl px-3 py-2">
                  <div className="relative">
                    <button type="button"
                      onClick={() => setShowEmojiPicker(showEmojiPicker === canal.id ? null : canal.id)}
                      className="w-9 h-9 rounded-lg bg-white border border-gray-200 text-lg flex items-center justify-center hover:border-indigo-300 transition"
                      title="Trocar emoji">{canal.emoji}</button>
                    {showEmojiPicker === canal.id && (
                      <div className="absolute top-10 left-0 z-20 bg-white border border-gray-200 rounded-xl shadow-lg p-2 flex flex-wrap gap-1 w-48">
                        {EMOJIS.map((e) => (
                          <button key={e} type="button"
                            onClick={() => { updateEdit(canal.id, 'emoji', e); setShowEmojiPicker(null); }}
                            className="w-8 h-8 rounded-lg hover:bg-indigo-50 text-lg flex items-center justify-center">{e}</button>
                        ))}
                      </div>
                    )}
                  </div>
                  <input type="text" value={canal.nome}
                    onChange={(e) => updateEdit(canal.id, 'nome', e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    placeholder="Nome do canal" />
                  <div className="flex items-center gap-1">
                    <input type="number" inputMode="decimal" min="0" max="100" step="0.5" value={canal.taxaPercent}
                      onChange={(e) => updateEdit(canal.id, 'taxaPercent', parseFloat(e.target.value) || 0)}
                      className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                    <span className="text-xs text-gray-400 shrink-0">%</span>
                  </div>
                  <button type="button" onClick={() => handleRemoveEdit(canal.id)}
                    disabled={canaisEdit.length <= 1}
                    className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 text-red-400 hover:text-red-600 flex items-center justify-center transition font-bold disabled:opacity-30 disabled:cursor-not-allowed">×</button>
                </div>
              ))}
            </div>

            {showAddForm ? (
              <div className="mt-3 bg-emerald-50 border border-emerald-100 rounded-2xl p-3 space-y-2">
                <p className="text-xs font-bold text-emerald-700">Novo canal</p>
                <div className="grid grid-cols-[40px_1fr_80px] gap-2 items-center">
                  <div className="relative">
                    <button type="button" onClick={() => setShowEmojiNovo(!showEmojiNovo)}
                      className="w-9 h-9 rounded-lg bg-white border border-emerald-200 text-lg flex items-center justify-center">{novoCanal.emoji}</button>
                    {showEmojiNovo && (
                      <div className="absolute top-10 left-0 z-20 bg-white border border-gray-200 rounded-xl shadow-lg p-2 flex flex-wrap gap-1 w-48">
                        {EMOJIS.map((e) => (
                          <button key={e} type="button"
                            onClick={() => { setNovoCanal((p) => ({ ...p, emoji: e })); setShowEmojiNovo(false); }}
                            className="w-8 h-8 rounded-lg hover:bg-indigo-50 text-lg flex items-center justify-center">{e}</button>
                        ))}
                      </div>
                    )}
                  </div>
                  <input type="text" value={novoCanal.nome}
                    onChange={(e) => setNovoCanal((p) => ({ ...p, nome: e.target.value }))}
                    placeholder="Nome do canal"
                    className="w-full bg-white border border-emerald-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                  <div className="flex items-center gap-1">
                    <input type="number" inputMode="decimal" min="0" max="100" step="0.5" value={novoCanal.taxaPercent}
                      onChange={(e) => setNovoCanal((p) => ({ ...p, taxaPercent: parseFloat(e.target.value) || 0 }))}
                      className="w-full bg-white border border-emerald-200 rounded-lg px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                    <span className="text-xs text-gray-400 shrink-0">%</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowAddForm(false)}
                    className="flex-1 text-xs py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">Cancelar</button>
                  <button type="button" onClick={handleAddCanal} disabled={!novoCanal.nome.trim()}
                    className="flex-1 text-xs py-1.5 rounded-lg bg-emerald-500 text-white font-bold hover:emerald-600 disabled:opacity-50">Adicionar</button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => setShowAddForm(true)}
                className="mt-3 w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 hover:border-emerald-400 hover:bg-emerald-50/50 text-gray-400 hover:text-emerald-600 text-sm font-semibold py-2.5 rounded-xl transition">
                <span className="text-lg leading-none">+</span> Adicionar canal
              </button>
            )}
            <p className="text-xs text-gray-400 text-center mt-2">
              {canaisEdit.length} canal{canaisEdit.length !== 1 ? 'is' : ''} cadastrado{canaisEdit.length !== 1 ? 's' : ''}
            </p>
          </div>

          {/* ── BACKUP E MIGRAÇÃO ─────────────────────────────────────────────── */}
          <div className="border-t border-gray-100 pt-6">
            <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-1">💾 Backup e Migração</p>
            <p className="text-xs text-gray-400 mb-4">
              Exporte todos os seus dados (peças, materiais, estoque, configurações) como um arquivo JSON.
              Use para migrar entre dispositivos ou fazer backup antes de alterações.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={exportSystemBackup}
                className="flex-1 flex items-center justify-center gap-2 bg-indigo-50 border border-indigo-200 text-indigo-700 font-semibold text-sm py-3 rounded-xl hover:bg-indigo-100 transition">
                ⬇️ Exportar Backup (.json)
              </button>
              <label className="flex-1 flex items-center justify-center gap-2 bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-sm py-3 rounded-xl hover:bg-slate-100 transition cursor-pointer">
                ⬆️ Importar Backup
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={importSystemBackup}
                />
              </label>
            </div>
          </div>

          {/* Aviso */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-xs text-amber-700">
            <strong>Atenção:</strong> configurações salvas localmente. Alterações nos canais refletem imediatamente nos cálculos e na tabela multicanal.
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-3">
            <button onClick={onClose}
              className="flex-1 border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-300 font-semibold py-3.5 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-700 transition">
              Cancelar
            </button>
            <button onClick={handleSave}
              className="flex-1 bg-gradient-to-r from-slate-700 to-slate-900 text-white font-bold py-3.5 rounded-2xl hover:opacity-90 transition">
              Salvar configurações
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

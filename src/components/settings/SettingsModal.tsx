import { useState } from 'react';
import { useSettings } from '@/contexts/SettingsContext';
import { useCanais }   from '@/contexts/CanaisContext';
import type { AppSettings, CanalVenda } from '@/types';

interface Props { onClose: () => void }

// ─── Emoji picker rápido ──────────────────────────────────────────────────────
const EMOJIS = ['🛒','🧡','📸','🌿','🌐','🤝','💼','🏪','📦','💻','🎯','🎁','🔥','⭐','💎'];

export function SettingsModal({ onClose }: Props) {
  const { settings, updateSettings } = useSettings();
  const { canais, addCanal, updateCanal, removeCanal, resetCanais } = useCanais();

  const [form, setForm] = useState<AppSettings>({ ...settings });

  // ── Estado local para edição de canais ──────────────────────────────────
  const [canaisEdit, setCanaisEdit] = useState<(CanalVenda & { _editing?: boolean })[]>(
    () => canais.map((c) => ({ ...c }))
  );
  const [novoCanal, setNovoCanal] = useState({ nome: '', emoji: '🛒', taxaPercent: 0 });
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null); // canal id
  const [showEmojiNovo, setShowEmojiNovo] = useState(false);

  const set = (k: keyof AppSettings) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [k]: parseFloat(e.target.value) || 0 }));

  // Salva configurações gerais E canais
  const handleSave = () => {
    updateSettings(form);
    // persiste alterações nos canais existentes
    canaisEdit.forEach((c) => updateCanal(c.id, {
      nome: c.nome,
      emoji: c.emoji,
      taxaPercent: c.taxaPercent,
      cor: c.cor,
    }));
    onClose();
  };

  const Field = ({ label, k, unit }: { label: string; k: keyof AppSettings; unit?: string }) => (
    <div>
      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">{label}</label>
      <div className="mt-1 flex items-center gap-2">
        <input
          type="number" step="0.01" value={form[k]} onChange={set(k)}
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
    setCanaisEdit((prev) => [...prev, {
      id: `canal_${Date.now()}`,
      ...novoCanal,
      cor: 'gray',
    }]);
    setNovoCanal({ nome: '', emoji: '🛒', taxaPercent: 0 });
    setShowAddForm(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.55)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg mx-4 overflow-y-auto"
        style={{ maxHeight: '92vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-700 to-slate-900 rounded-t-3xl p-6 text-white flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">⚙️ Configurações Globais</h2>
            <p className="text-sm opacity-70 mt-0.5">Padrões usados em todas as novas peças</p>
          </div>
          <button onClick={onClose} className="text-3xl font-light opacity-70 hover:opacity-100">×</button>
        </div>

        <div className="p-6 space-y-6">

          {/* Energia */}
          <div>
            <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-3">⚡ Energia</p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Custo kWh" k="custoKwh" unit="R$" />
              <Field label="Potência padrão" k="potenciaW" unit="W" />
            </div>
          </div>

          {/* Filamento */}
          <div>
            <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-3">🧵 Filamento</p>
            <Field label="Custo padrão do filamento" k="filamentoCustoKg" unit="R$/kg" />
          </div>

          {/* Impostos e taxas */}
          <div>
            <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-3">💸 Impostos e Taxas</p>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Imposto" k="imposto" unit="%" />
              <Field label="Taxa cartão" k="txCartao" unit="%" />
              <Field label="Anúncio padrão" k="custoAnuncio" unit="%" />
            </div>
          </div>

          {/* Custos fixos */}
          <div>
            <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-3">🏭 Custos Fixos</p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Custo fixo/mês" k="custoFixoMes" unit="R$" />
              <Field label="Unidades/mês" k="unidadesMes" unit="un." />
            </div>
          </div>

          {/* Impressora */}
          <div>
            <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-3">🖨 Amortização da Impressora</p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Valor da máquina" k="amortizacaoValor" unit="R$" />
              <Field label="Vida útil" k="amortizacaoHoras" unit="h" />
            </div>
          </div>

          {/* Mão de Obra */}
          <div>
            <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-3">🧑‍🔧 Mão de Obra</p>
            <Field label="Valor padrão da hora" k="maoObraTaxa" unit="R$/h" />
            <p className="text-xs text-gray-400 mt-1">0 = sem mão de obra.</p>
          </div>

          {/* Contingência */}
          <div>
            <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-3">⚠️ Contingência</p>
            <Field label="Taxa de falhas" k="falhas" unit="%" />
          </div>

          {/* ── CANAIS DE VENDA ───────────────────────────────────────────────── */}
          <div className="border-t border-gray-100 pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest">🛒 Canais de Venda</p>
                <p className="text-xs text-gray-400 mt-0.5">Edite as taxas — refletem em todos os cálculos automaticamente</p>
              </div>
              <button
                type="button"
                onClick={() => { if (confirm('Restaurar canais para os valores padrão?')) { resetCanais(); setCanaisEdit(canais.map((c) => ({...c}))); } }}
                className="text-xs text-gray-400 hover:text-gray-600 underline"
              >Restaurar padrões</button>
            </div>

            {/* Lista de canais editáveis */}
            <div className="space-y-2">
              {canaisEdit.map((canal) => (
                <div key={canal.id} className="grid grid-cols-[40px_1fr_80px_32px] gap-2 items-center bg-gray-50 rounded-xl px-3 py-2">
                  {/* Emoji */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker(showEmojiPicker === canal.id ? null : canal.id)}
                      className="w-9 h-9 rounded-lg bg-white border border-gray-200 text-lg flex items-center justify-center hover:border-indigo-300 transition"
                      title="Trocar emoji"
                    >{canal.emoji}</button>
                    {showEmojiPicker === canal.id && (
                      <div className="absolute top-10 left-0 z-20 bg-white border border-gray-200 rounded-xl shadow-lg p-2 flex flex-wrap gap-1 w-48">
                        {EMOJIS.map((e) => (
                          <button key={e} type="button"
                            onClick={() => { updateEdit(canal.id, 'emoji', e); setShowEmojiPicker(null); }}
                            className="w-8 h-8 rounded-lg hover:bg-indigo-50 text-lg flex items-center justify-center"
                          >{e}</button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Nome */}
                  <input
                    type="text"
                    value={canal.nome}
                    onChange={(e) => updateEdit(canal.id, 'nome', e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    placeholder="Nome do canal"
                  />

                  {/* Taxa */}
                  <div className="flex items-center gap-1">
                    <input
                      type="number" min="0" max="100" step="0.5"
                      value={canal.taxaPercent}
                      onChange={(e) => updateEdit(canal.id, 'taxaPercent', parseFloat(e.target.value) || 0)}
                      className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                    <span className="text-xs text-gray-400 shrink-0">%</span>
                  </div>

                  {/* Remover */}
                  <button
                    type="button"
                    onClick={() => handleRemoveEdit(canal.id)}
                    disabled={canaisEdit.length <= 1}
                    title="Remover canal"
                    className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 text-red-400 hover:text-red-600 flex items-center justify-center transition font-bold disabled:opacity-30 disabled:cursor-not-allowed"
                  >×</button>
                </div>
              ))}
            </div>

            {/* Adicionar novo canal */}
            {showAddForm ? (
              <div className="mt-3 bg-emerald-50 border border-emerald-100 rounded-2xl p-3 space-y-2">
                <p className="text-xs font-bold text-emerald-700">Novo canal</p>
                <div className="grid grid-cols-[40px_1fr_80px] gap-2 items-center">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowEmojiNovo(!showEmojiNovo)}
                      className="w-9 h-9 rounded-lg bg-white border border-emerald-200 text-lg flex items-center justify-center"
                    >{novoCanal.emoji}</button>
                    {showEmojiNovo && (
                      <div className="absolute top-10 left-0 z-20 bg-white border border-gray-200 rounded-xl shadow-lg p-2 flex flex-wrap gap-1 w-48">
                        {EMOJIS.map((e) => (
                          <button key={e} type="button"
                            onClick={() => { setNovoCanal((p) => ({ ...p, emoji: e })); setShowEmojiNovo(false); }}
                            className="w-8 h-8 rounded-lg hover:bg-indigo-50 text-lg flex items-center justify-center"
                          >{e}</button>
                        ))}
                      </div>
                    )}
                  </div>
                  <input
                    type="text"
                    value={novoCanal.nome}
                    onChange={(e) => setNovoCanal((p) => ({ ...p, nome: e.target.value }))}
                    placeholder="Nome do canal"
                    className="w-full bg-white border border-emerald-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                  <div className="flex items-center gap-1">
                    <input
                      type="number" min="0" max="100" step="0.5"
                      value={novoCanal.taxaPercent}
                      onChange={(e) => setNovoCanal((p) => ({ ...p, taxaPercent: parseFloat(e.target.value) || 0 }))}
                      className="w-full bg-white border border-emerald-200 rounded-lg px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    />
                    <span className="text-xs text-gray-400 shrink-0">%</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="flex-1 text-xs py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
                  >Cancelar</button>
                  <button
                    type="button"
                    onClick={handleAddCanal}
                    disabled={!novoCanal.nome.trim()}
                    className="flex-1 text-xs py-1.5 rounded-lg bg-emerald-500 text-white font-bold hover:bg-emerald-600 disabled:opacity-50"
                  >Adicionar</button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowAddForm(true)}
                className="mt-3 w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 hover:border-emerald-400 hover:bg-emerald-50/50 text-gray-400 hover:text-emerald-600 text-sm font-semibold py-2.5 rounded-xl transition"
              >
                <span className="text-lg leading-none">+</span> Adicionar canal
              </button>
            )}

            <p className="text-xs text-gray-400 text-center mt-2">
              {canaisEdit.length} canal{canaisEdit.length !== 1 ? 'is' : ''} cadastrado{canaisEdit.length !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Aviso */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-xs text-amber-700">
            <strong>Atenção:</strong> configurações salvas localmente; alteradas nos canais refletem imediatamente em novos cálculos e na tabela multicanal dos produtos.
          </div>

          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-500 font-semibold py-3 rounded-2xl hover:bg-gray-50 transition">
              Cancelar
            </button>
            <button onClick={handleSave} className="flex-1 bg-gradient-to-r from-slate-700 to-slate-900 text-white font-bold py-3 rounded-2xl hover:opacity-90 transition">
              Salvar configurações
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

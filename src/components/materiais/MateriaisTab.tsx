import { useState } from 'react';
import { useMaterials } from '@/contexts/MaterialContext';
import { useAcessorios } from '@/contexts/AcessorioContext';
import { useHardware }   from '@/contexts/HardwareContext';
import { NovoMaterialModal } from './NovoMaterialModal';
import { AcessoriosTab } from './AcessoriosTab';
import { HardwareTab }   from './HardwareTab';
import { R } from '@/utils/formatters';
import { custoPorGrama } from '@/types';
import type { Material } from '@/types';

const TIPO_CORES: Record<string, string> = {
  PLA:   'bg-blue-100 text-blue-700',
  PETG:  'bg-emerald-100 text-emerald-700',
  ABS:   'bg-orange-100 text-orange-700',
  TPU:   'bg-purple-100 text-purple-700',
  ASA:   'bg-rose-100 text-rose-700',
  Outro: 'bg-gray-100 text-gray-600',
};

type SubTab = 'filamentos' | 'acessorios' | 'hardware';

export function MateriaisTab() {
  const { materials, removeMaterial, updateMaterial } = useMaterials();
  const { getAbaixoMinimo }       = useAcessorios();
  const { getAlertasEstoque, getAlertasHoras } = useHardware();
  const [subTab, setSubTab] = useState<SubTab>('filamentos');
  const [showNovo, setShowNovo] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const alertasAcess     = getAbaixoMinimo().length;
  const alertasHardware  = getAlertasEstoque().length + getAlertasHoras().length;

  return (
    <div className="space-y-4">
      {/* Sub-navegação */}
      <div className="bg-white rounded-2xl shadow-sm p-2 flex gap-2">
        <button
          onClick={() => setSubTab('filamentos')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 ${
            subTab === 'filamentos' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-100'
          }`}
        >
          🧵 Filamentos
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            subTab === 'filamentos' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
          }`}>{materials.length}</span>
        </button>
        <button
          onClick={() => setSubTab('acessorios')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 relative ${
            subTab === 'acessorios' ? 'bg-purple-600 text-white' : 'text-gray-500 hover:bg-gray-100'
          }`}
        >
          🔩 Acessórios
          {alertasAcess > 0 && subTab !== 'acessorios' && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
              {alertasAcess > 9 ? '9+' : alertasAcess}
            </span>
          )}
        </button>
        <button
          onClick={() => setSubTab('hardware')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 relative ${
            subTab === 'hardware' ? 'bg-orange-500 text-white' : 'text-gray-500 hover:bg-gray-100'
          }`}
        >
          🔧 Hardware
          {alertasHardware > 0 && subTab !== 'hardware' && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
              {alertasHardware > 9 ? '9+' : alertasHardware}
            </span>
          )}
        </button>
      </div>

      {/* ── FILAMENTOS ─────────────────────────────────────────────────────────── */}
      {subTab === 'filamentos' && (
        <>
          {/* Header — data-tour aqui garante que o alvo do tour existe mesmo sem materiais */}
          <div data-tour="filamento-barra" className="bg-white rounded-2xl shadow-sm p-5 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-gray-800 text-lg">Filamentos Cadastrados</h2>
              <p className="text-sm text-gray-400 mt-0.5">
                {materials.length} rolo{materials.length !== 1 ? 's' : ''} registrado{materials.length !== 1 ? 's' : ''}
              </p>
            </div>
            <button
              onClick={() => setShowNovo(true)}
              className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-bold px-4 py-2 rounded-xl hover:opacity-90 transition flex items-center gap-2"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Novo Filamento
            </button>
          </div>

          {/* Lista vazia */}
          {materials.length === 0 && (
            <div className="bg-white rounded-2xl shadow-sm p-12 flex flex-col items-center gap-4 text-center">
              <svg width="80" height="80" viewBox="0 0 80 80" fill="none" className="opacity-60">
                <circle cx="40" cy="40" r="38" fill="#EEF2FF" />
                <circle cx="40" cy="40" r="18" fill="#C7D2FE" />
                <circle cx="40" cy="40" r="8" fill="#EEF2FF" />
                <circle cx="40" cy="40" r="3" fill="#4F46E5" />
                <path d="M40 22 Q58 28 58 40 Q58 55 40 58 Q22 55 22 40 Q22 25 40 22Z"
                  fill="none" stroke="#4F46E5" strokeWidth="1.5" strokeDasharray="4 3" />
              </svg>
              <div>
                <p className="font-bold text-gray-700 text-base">Nenhum filamento cadastrado ainda</p>
                <p className="text-sm text-gray-400 max-w-xs mt-1">
                  Adicione seus rolos de PLA, PETG, ABS ou TPU para que o sistema calcule automaticamente o custo de material ao produzir.
                </p>
              </div>
              <button onClick={() => setShowNovo(true)}
                className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-bold px-6 py-2.5 rounded-xl hover:opacity-90 transition shadow-sm">
                🧵 Cadastrar primeiro filamento
              </button>
            </div>
          )}

          {/* Grid de cards */}
          {materials.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {materials.map((m, idx) => (
                <div key={m.id}>
                  <MaterialCard
                    material={m}
                    editing={editingId === m.id}
                    onEdit={() => setEditingId(m.id)}
                    onCancelEdit={() => setEditingId(null)}
                    onUpdate={(updates) => { updateMaterial(m.id, updates); setEditingId(null); }}
                    onRemove={() => { if (confirm(`Remover "${m.nome}"?`)) removeMaterial(m.id); }}
                  />
                </div>
              ))}
            </div>
          )}

          {showNovo && <NovoMaterialModal onClose={() => setShowNovo(false)} />}
        </>
      )}

      {/* ── ACESSÓRIOS ─────────────────────────────────────────────────────────── */}
      {subTab === 'acessorios' && <AcessoriosTab />}

      {/* ── HARDWARE ───────────────────────────────────────────────────────────── */}
      {subTab === 'hardware' && <HardwareTab />}
    </div>
  );
}

// ─── Card individual de filamento ─────────────────────────────────────────────
interface CardProps {
  material: Material;
  editing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onUpdate: (u: Partial<Material>) => void;
  onRemove: () => void;
}

function MaterialCard({ material: m, editing, onEdit, onCancelEdit, onUpdate, onRemove }: CardProps) {
  const [pesoInput, setPesoInput] = useState(String(m.pesoAtual));

  // Sincroniza o input quando o valor externo muda (ex: produção deduz)
  const pesoAtualExterno = m.pesoAtual;
  const [lastExterno, setLastExterno] = useState(pesoAtualExterno);
  if (pesoAtualExterno !== lastExterno && !editing) {
    setLastExterno(pesoAtualExterno);
    setPesoInput(String(pesoAtualExterno));
  }

  const pctRestante = m.pesoTotal > 0 ? (m.pesoAtual / m.pesoTotal) * 100 : 0;
  const cpg = custoPorGrama(m);

  const barColor =
    pctRestante > 50 ? 'bg-emerald-500' :
    pctRestante > 20 ? 'bg-amber-400' : 'bg-red-500';

  function salvar() {
    const novo = Math.max(0, Math.min(parseFloat(pesoInput) || 0, m.pesoTotal));
    onUpdate({ pesoAtual: novo });
  }

  function ajustar(delta: number) {
    const novo = Math.max(0, Math.min(m.pesoAtual + delta, m.pesoTotal));
    setPesoInput(String(novo));
    onUpdate({ pesoAtual: novo });
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col">
      {/* Barra de status no topo */}
      <div className="h-1.5 bg-gray-100">
        <div className={`h-full transition-all ${barColor}`}
          style={{ width: `${Math.min(pctRestante, 100)}%` }} />
      </div>

      <div className="p-5 flex flex-col gap-3">
        {/* Topo */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
              🧵
            </div>
            <div>
              <p className="font-bold text-gray-800 leading-none">{m.nome}</p>
              <p className="text-xs text-gray-400 mt-1">{m.cor}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <span className={`text-xs font-bold px-2 py-1 rounded-full ${TIPO_CORES[m.tipo] ?? TIPO_CORES.Outro}`}>
              {m.tipo}
            </span>
            <button onClick={onRemove}
              className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center transition text-red-400 font-bold text-lg">
              ×
            </button>
          </div>
        </div>

        {/* Quantidade restante — clicável para ajustar */}
        <div>
          <div className="flex justify-between items-baseline text-xs text-gray-400 mb-1.5">
            <span className="font-medium">
              <span className={`font-bold text-sm ${pctRestante <= 20 ? 'text-red-500' : pctRestante <= 50 ? 'text-amber-500' : 'text-emerald-600'}`}>
                {m.pesoAtual}g
              </span>
              {' '}restante de {m.pesoTotal}g
            </span>
            <span>{pctRestante.toFixed(0)}%</span>
          </div>
          <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${barColor}`}
              style={{ width: `${Math.min(pctRestante, 100)}%` }} />
          </div>
        </div>

        {/* Métricas de custo */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-gray-50 rounded-xl py-2">
            <p className="text-xs text-gray-400">Preço pago</p>
            <p className="font-bold text-gray-700 text-sm">{R(m.precoPago)}</p>
          </div>
          <div className="bg-indigo-50 rounded-xl py-2">
            <p className="text-xs text-indigo-400">Custo/g</p>
            <p className="font-bold text-indigo-700 text-sm">{R(cpg)}</p>
          </div>
          <div className="bg-purple-50 rounded-xl py-2">
            <p className="text-xs text-purple-400">Custo/kg</p>
            <p className="font-bold text-purple-700 text-sm">{R(cpg * 1000)}</p>
          </div>
        </div>

        {/* Botão de ajuste rápido (sempre visível) */}
        {!editing && (
          <div className="flex items-center gap-2">
            {/* Decrementos rápidos */}
            <button onClick={() => ajustar(-50)}
              title="Subtrair 50g"
              className="flex-1 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500 text-xs font-bold transition">
              −50g
            </button>
            {/* Botão principal de ajuste */}
            <button onClick={onEdit}
              className="flex-[2] py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-bold transition flex items-center justify-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
              </svg>
              Ajustar quantidade
            </button>
            {/* Incrementos rápidos */}
            <button onClick={() => ajustar(+50)}
              title="Adicionar 50g"
              className="flex-1 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500 text-xs font-bold transition">
              +50g
            </button>
          </div>
        )}

        {/* Painel de ajuste preciso */}
        {editing && (
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 space-y-3">
            {/* Título + aviso */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-bold text-amber-800">Ajustar quantidade em estoque</p>
                <p className="text-xs text-amber-600 mt-0.5">Preço e custo por grama não são alterados</p>
              </div>
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
                custo inalterado
              </span>
            </div>

            {/* Atalhos de incremento */}
            <div className="grid grid-cols-4 gap-1.5">
              {[-250, -100, +100, +250].map((d) => (
                <button key={d}
                  onClick={() => {
                    const novo = Math.max(0, Math.min(m.pesoAtual + d, m.pesoTotal));
                    setPesoInput(String(novo));
                  }}
                  className={`py-1.5 rounded-lg text-xs font-bold transition ${
                    d < 0
                      ? 'bg-red-50 hover:bg-red-100 text-red-600'
                      : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                  }`}>
                  {d > 0 ? `+${d}g` : `${d}g`}
                </button>
              ))}
            </div>

            {/* Atalhos especiais */}
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => setPesoInput(String(m.pesoTotal))}
                className="py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition">
                🎉 Rolo novo ({m.pesoTotal}g)
              </button>
              <button
                onClick={() => setPesoInput(String(Math.round(m.pesoTotal / 2)))}
                className="py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-bold transition">
                ½ rolo ({Math.round(m.pesoTotal / 2)}g)
              </button>
            </div>

            {/* Input manual */}
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label className="text-xs font-semibold text-amber-700">Valor exato (g)</label>
                <input
                  type="number" inputMode="decimal"
                  value={pesoInput} min={0} max={m.pesoTotal}
                  onChange={(e) => setPesoInput(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  className="mt-1 w-full border border-amber-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                />
              </div>
              <div className="flex gap-1.5 pt-5">
                <button onClick={salvar}
                  className="bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold px-3 py-1.5 rounded-lg transition">
                  Salvar
                </button>
                <button onClick={onCancelEdit}
                  className="bg-white border border-gray-200 text-gray-500 text-sm font-bold px-3 py-1.5 rounded-lg hover:bg-gray-50 transition">
                  ×
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

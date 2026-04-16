import { useState } from 'react';
import { useMaterials } from '@/contexts/MaterialContext';
import { useAcessorios } from '@/contexts/AcessorioContext';
import { NovoMaterialModal } from './NovoMaterialModal';
import { AcessoriosTab } from './AcessoriosTab';
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

type SubTab = 'filamentos' | 'acessorios';

export function MateriaisTab() {
  const { materials, removeMaterial, updateMaterial } = useMaterials();
  const { getAbaixoMinimo } = useAcessorios();
  const [subTab, setSubTab] = useState<SubTab>('filamentos');
  const [showNovo, setShowNovo] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const alertasAcess = getAbaixoMinimo().length;

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
      </div>

      {/* ── FILAMENTOS ─────────────────────────────────────────────────────────── */}
      {subTab === 'filamentos' && (
        <>
          {/* Header */}
          <div className="bg-white rounded-2xl shadow-sm p-5 flex items-center justify-between">
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
            <div className="bg-white rounded-2xl shadow-sm p-12 flex flex-col items-center gap-3 text-center">
              <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-3xl">🧵</div>
              <p className="font-bold text-gray-700">Nenhum filamento cadastrado</p>
              <p className="text-sm text-gray-400 max-w-xs">
                Cadastre seus rolos de filamento para calcular o custo de material automaticamente ao criar uma peça.
              </p>
              <button onClick={() => setShowNovo(true)}
                className="mt-2 bg-indigo-600 text-white text-sm font-bold px-5 py-2 rounded-xl hover:opacity-90 transition">
                Cadastrar primeiro filamento
              </button>
            </div>
          )}

          {/* Grid de cards */}
          {materials.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {materials.map((m) => (
                <MaterialCard
                  key={m.id}
                  material={m}
                  editing={editingId === m.id}
                  onEdit={() => setEditingId(m.id)}
                  onCancelEdit={() => setEditingId(null)}
                  onUpdate={(updates) => { updateMaterial(m.id, updates); setEditingId(null); }}
                  onRemove={() => { if (confirm(`Remover "${m.nome}"?`)) removeMaterial(m.id); }}
                />
              ))}
            </div>
          )}

          {showNovo && <NovoMaterialModal onClose={() => setShowNovo(false)} />}
        </>
      )}

      {/* ── ACESSÓRIOS ─────────────────────────────────────────────────────────── */}
      {subTab === 'acessorios' && <AcessoriosTab />}
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
  const [pesoAtual, setPesoAtual] = useState(String(m.pesoAtual));

  const pctRestante = m.pesoTotal > 0 ? (m.pesoAtual / m.pesoTotal) * 100 : 0;
  const cpg = custoPorGrama(m);

  const barColor =
    pctRestante > 50 ? 'bg-emerald-500' :
    pctRestante > 20 ? 'bg-amber-400' : 'bg-red-500';

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 flex flex-col gap-3">
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
          <button onClick={onEdit} title="Editar peso atual"
            className="w-8 h-8 rounded-lg bg-amber-50 hover:bg-amber-100 flex items-center justify-center transition">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button onClick={onRemove}
            className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center transition text-red-400 font-bold text-lg">
            ×
          </button>
        </div>
      </div>

      {/* Barra de uso */}
      <div>
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>Restante: {m.pesoAtual}g de {m.pesoTotal}g</span>
          <span>{pctRestante.toFixed(0)}%</span>
        </div>
        <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${barColor}`}
            style={{ width: `${Math.min(pctRestante, 100)}%` }} />
        </div>
      </div>

      {/* Métricas */}
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

      {/* Edição de peso atual */}
      {editing && (
        <div className="bg-amber-50 rounded-xl p-3 flex items-center gap-3">
          <div className="flex-1">
            <label className="text-xs font-semibold text-amber-700">Peso atual (g)</label>
            <input type="number" value={pesoAtual} min={0} max={m.pesoTotal}
              onChange={(e) => setPesoAtual(e.target.value)}
              className="mt-1 w-full border border-amber-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>
          <div className="flex gap-2 pt-4">
            <button onClick={() => onUpdate({ pesoAtual: Math.max(0, Math.min(+pesoAtual, m.pesoTotal)) })}
              className="bg-amber-500 text-white text-sm font-bold px-3 py-1.5 rounded-lg hover:opacity-90 transition">
              Salvar
            </button>
            <button onClick={onCancelEdit}
              className="bg-gray-100 text-gray-600 text-sm font-bold px-3 py-1.5 rounded-lg hover:bg-gray-200 transition">
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

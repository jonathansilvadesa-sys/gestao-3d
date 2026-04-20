import { useState } from 'react';
import { useAcessorios } from '@/contexts/AcessorioContext';
import { ACESSORIO_CAT_INFO } from '@/types';
import type {
  AcessorioEstoque, AcessorioCategoria, AcessorioVariante, AcessorioMovimento,
} from '@/types';

// ─── helpers ─────────────────────────────────────────────────────────────────
function R(n: number) { return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
function fmtData(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

// ─── Alerta de estoque baixo ──────────────────────────────────────────────────
function AlertaBaixoEstoque() {
  const { getAbaixoMinimo } = useAcessorios();
  const itens = getAbaixoMinimo();
  if (itens.length === 0) return null;
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
      <span className="text-xl shrink-0">⚠️</span>
      <div>
        <p className="font-bold text-amber-800 text-sm">
          {itens.length} item{itens.length > 1 ? 'ns' : ''} com estoque abaixo do mínimo
        </p>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {itens.map(({ acessorio, variante }) => (
            <span key={`${acessorio.id}-${variante.id}`}
              className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-medium">
              {acessorio.nome}{variante.tamanho ? ` ${variante.tamanho}` : ''}
              {' '}— {variante.estoqueAtual}/{variante.estoqueMinimo}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Linha de variante ────────────────────────────────────────────────────────
interface VarianteRowProps {
  acessorioId: string;
  variante: AcessorioVariante;
}
function VarianteRow({ acessorioId, variante: v }: VarianteRowProps) {
  const { addMovimento } = useAcessorios();
  const [showMov, setShowMov] = useState(false);
  const [movTipo, setMovTipo] = useState<'entrada' | 'saida' | 'ajuste'>('entrada');
  const [movQtd, setMovQtd] = useState('');
  const [movMotivo, setMovMotivo] = useState('');

  const pct = v.estoqueMinimo > 0
    ? Math.min((v.estoqueAtual / (v.estoqueMinimo * 2.5)) * 100, 100)
    : Math.min((v.estoqueAtual / 50) * 100, 100);

  const abaixo = v.estoqueMinimo > 0 && v.estoqueAtual <= v.estoqueMinimo;
  const barColor = abaixo ? 'bg-red-500' : pct > 60 ? 'bg-emerald-500' : 'bg-amber-400';

  const handleMovimento = () => {
    const qtd = parseFloat(movQtd);
    if (!qtd || qtd <= 0) return;
    addMovimento(acessorioId, {
      tipo: movTipo,
      varianteId: v.id,
      quantidade: qtd,
      motivo: movMotivo || (movTipo === 'entrada' ? 'Entrada de estoque' : movTipo === 'saida' ? 'Uso em projeto' : 'Ajuste manual'),
    });
    setMovQtd('');
    setMovMotivo('');
    setShowMov(false);
  };

  return (
    <div className={`rounded-xl px-3 py-2.5 ${abaixo ? 'bg-red-50 border border-red-200' : 'bg-gray-50'}`}>
      <div className="flex items-center gap-3">
        {/* Nome da variante */}
        <div className="w-20 shrink-0">
          <span className="text-xs font-semibold text-gray-700">
            {v.tamanho || 'Padrão'}
          </span>
        </div>
        {/* Barra de estoque */}
        <div className="flex-1">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span className={abaixo ? 'text-red-600 font-bold' : ''}>{v.estoqueAtual} un</span>
            <span className="text-gray-400">mín: {v.estoqueMinimo}</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
          </div>
        </div>
        {/* Custo */}
        <div className="w-16 text-right shrink-0">
          <span className="text-xs font-medium text-gray-600">{R(v.custoUn)}</span>
        </div>
        {/* Botão movimentar */}
        <button
          onClick={() => setShowMov((s) => !s)}
          className={`shrink-0 text-xs font-bold px-2 py-1 rounded-lg transition ${
            showMov ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
          }`}
        >
          {showMov ? '▲' : '+ Mov.'}
        </button>
      </div>

      {/* Formulário inline de movimentação */}
      {showMov && (
        <div className="mt-2 pt-2 border-t border-gray-200 space-y-2">
          {/* Tipo */}
          <div className="flex gap-1.5">
            {(['entrada', 'saida', 'ajuste'] as const).map((t) => (
              <button key={t}
                onClick={() => setMovTipo(t)}
                className={`flex-1 text-xs py-1 rounded-lg font-semibold transition ${
                  movTipo === t
                    ? t === 'entrada' ? 'bg-emerald-500 text-white'
                    : t === 'saida'   ? 'bg-red-500 text-white'
                    :                   'bg-amber-500 text-white'
                    : 'bg-white border border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                {t === 'entrada' ? '↑ Entrada' : t === 'saida' ? '↓ Saída' : '⟳ Ajuste'}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-400 font-medium">
                {movTipo === 'ajuste' ? 'Novo estoque' : 'Quantidade'}
              </label>
              <input
                type="number" min="0" value={movQtd}
                onChange={(e) => setMovQtd(e.target.value)}
                placeholder="0"
                className="mt-0.5 w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 font-medium">Motivo</label>
              <input
                type="text" value={movMotivo}
                onChange={(e) => setMovMotivo(e.target.value)}
                placeholder={movTipo === 'entrada' ? 'Compra...' : 'Uso em...'}
                className="mt-0.5 w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setShowMov(false); setMovQtd(''); }}
              className="flex-1 text-xs py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">
              Cancelar
            </button>
            <button onClick={handleMovimento}
              disabled={!movQtd || parseFloat(movQtd) <= 0}
              className="flex-1 text-xs py-1.5 rounded-lg bg-indigo-600 text-white font-bold hover:opacity-90 disabled:opacity-40">
              Registrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Histórico de movimentações ───────────────────────────────────────────────
function HistoricoMovs({ movs, variantes }: { movs: AcessorioMovimento[]; variantes: AcessorioVariante[] }) {
  if (movs.length === 0) return (
    <p className="text-xs text-gray-400 text-center py-3">Nenhuma movimentação registrada</p>
  );
  const varMap = Object.fromEntries(variantes.map((v) => [v.id, v.tamanho || 'Padrão']));
  return (
    <div className="space-y-1.5 max-h-48 overflow-y-auto">
      {movs.slice(0, 30).map((m) => (
        <div key={m.id} className="flex items-center gap-2 text-xs">
          <span className={`shrink-0 w-14 text-center font-bold px-1.5 py-0.5 rounded-full ${
            m.tipo === 'entrada' ? 'bg-emerald-100 text-emerald-700'
            : m.tipo === 'saida' ? 'bg-red-100 text-red-700'
            : 'bg-amber-100 text-amber-700'
          }`}>
            {m.tipo === 'entrada' ? '↑ Entrada' : m.tipo === 'saida' ? '↓ Saída' : '⟳ Ajuste'}
          </span>
          <span className="font-semibold text-gray-700 w-12 shrink-0">{m.quantidade} un</span>
          <span className="text-gray-400 shrink-0">{varMap[m.varianteId] ?? '—'}</span>
          <span className="text-gray-500 flex-1 truncate">{m.motivo}</span>
          <span className="text-gray-300 shrink-0">{fmtData(m.data)}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Card de acessório ────────────────────────────────────────────────────────
interface AcessorioCardProps {
  acessorio: AcessorioEstoque;
  onEdit: () => void;
  onRemove: () => void;
}
function AcessorioCard({ acessorio: a, onEdit, onRemove }: AcessorioCardProps) {
  const [showHist, setShowHist] = useState(false);
  const cat = ACESSORIO_CAT_INFO[a.categoria];
  const abaixoCount = a.variantes.filter((v) => v.estoqueMinimo > 0 && v.estoqueAtual <= v.estoqueMinimo).length;

  return (
    <div className={`bg-white rounded-2xl shadow-sm p-4 flex flex-col gap-3 ${abaixoCount > 0 ? 'ring-2 ring-red-200' : ''}`}>
      {/* Header do card */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-2xl">
            {cat.emoji}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-bold text-gray-800">{a.nome}</p>
              {abaixoCount > 0 && (
                <span className="text-xs bg-red-100 text-red-600 font-bold px-1.5 py-0.5 rounded-full">
                  {abaixoCount} ⚠
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cat.cor}`}>
                {cat.label}
              </span>
              <span className="text-xs text-gray-400">· {a.unidade}</span>
              <span className="text-xs text-gray-400">· {a.variantes.length} variante{a.variantes.length > 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={onEdit}
            className="w-8 h-8 rounded-lg bg-amber-50 hover:bg-amber-100 flex items-center justify-center transition"
            title="Editar">
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

      {/* Variantes */}
      <div className="space-y-2">
        {a.variantes.map((v) => (
          <VarianteRow key={v.id} acessorioId={a.id} variante={v} />
        ))}
      </div>

      {/* Histórico */}
      <button onClick={() => setShowHist((s) => !s)}
        className="flex items-center justify-between w-full text-xs text-gray-400 hover:text-gray-600 transition py-1 border-t border-gray-100">
        <span>📋 Histórico de movimentações ({a.movimentacoes.length})</span>
        <span className={`transition-transform ${showHist ? 'rotate-180' : ''}`}>▾</span>
      </button>
      {showHist && <HistoricoMovs movs={a.movimentacoes} variantes={a.variantes} />}
    </div>
  );
}

// ─── Modal de Novo/Editar Acessório ───────────────────────────────────────────
interface EditAcessorioModalProps {
  inicial?: AcessorioEstoque;
  onClose: () => void;
  onSave: (a: Omit<AcessorioEstoque, 'id' | 'movimentacoes'>) => void;
}

function EditAcessorioModal({ inicial, onClose, onSave }: EditAcessorioModalProps) {
  const [nome, setNome] = useState(inicial?.nome ?? '');
  const [categoria, setCategoria] = useState<AcessorioCategoria>(inicial?.categoria ?? 'outro');
  const [unidade, setUnidade] = useState(inicial?.unidade ?? 'un');

  const [variantes, setVariantes] = useState<Omit<AcessorioVariante, 'id'>[]>(
    inicial?.variantes.map((v) => ({
      tamanho: v.tamanho,
      estoqueAtual: v.estoqueAtual,
      estoqueMinimo: v.estoqueMinimo,
      custoUn: v.custoUn,
    })) ?? [{ tamanho: '', estoqueAtual: 0, estoqueMinimo: 0, custoUn: 0 }]
  );

  const addVariante = () => setVariantes((p) => [...p, { tamanho: '', estoqueAtual: 0, estoqueMinimo: 0, custoUn: 0 }]);
  const removeVariante = (i: number) => setVariantes((p) => p.filter((_, idx) => idx !== i));
  const updateVariante = (i: number, field: keyof Omit<AcessorioVariante, 'id'>, value: string | number) =>
    setVariantes((p) => p.map((v, idx) => idx === i ? { ...v, [field]: value } : v));

  const handleSave = () => {
    if (!nome.trim()) return;
    const variantesComId: AcessorioVariante[] = variantes
      .filter((v) => v.custoUn >= 0)
      .map((v, i) => ({
        ...v,
        id: inicial?.variantes[i]?.id ?? `v_${Date.now()}_${i}`,
        estoqueAtual: Number(v.estoqueAtual),
        estoqueMinimo: Number(v.estoqueMinimo),
        custoUn: Number(v.custoUn),
      }));
    if (variantesComId.length === 0) return;
    onSave({ nome, categoria, unidade, variantes: variantesComId });
  };

  const CATEGORIAS = Object.entries(ACESSORIO_CAT_INFO) as [AcessorioCategoria, { label: string; emoji: string; cor: string }][];
  const UNIDADES = ['un', 'pç', 'g', 'kg', 'cm', 'm', 'par', 'kit'];

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.55)' }} onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg mx-4 overflow-y-auto"
        style={{ maxHeight: '92vh' }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-t-3xl p-5 text-white flex justify-between items-center">
          <h2 className="text-lg font-bold">{inicial ? 'Editar Acessório' : 'Novo Acessório'}</h2>
          <button onClick={onClose} className="text-3xl font-light opacity-70 hover:opacity-100">×</button>
        </div>

        <div className="p-5 space-y-4">
          {/* Nome */}
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Nome</label>
            <input value={nome} onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Imã de Neodímio"
              className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>

          {/* Categoria + Unidade */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Categoria</label>
              <div className="mt-1 grid grid-cols-3 gap-1">
                {CATEGORIAS.map(([key, info]) => (
                  <button key={key} type="button" onClick={() => setCategoria(key)}
                    className={`flex flex-col items-center py-2 rounded-xl text-xs font-semibold transition ${
                      categoria === key ? 'bg-indigo-600 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}>
                    <span className="text-base">{info.emoji}</span>
                    <span className="mt-0.5 leading-none">{info.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Unidade</label>
              <div className="mt-1 grid grid-cols-4 gap-1">
                {UNIDADES.map((u) => (
                  <button key={u} type="button" onClick={() => setUnidade(u)}
                    className={`py-1.5 rounded-lg text-xs font-semibold transition ${
                      unidade === u ? 'bg-indigo-600 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}>
                    {u}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Variantes */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                Variantes / Tamanhos
              </label>
              <button onClick={addVariante}
                className="text-xs bg-indigo-50 text-indigo-600 font-bold px-2 py-1 rounded-lg hover:bg-indigo-100 transition">
                + Adicionar
              </button>
            </div>
            {/* Header das colunas */}
            <div className="grid grid-cols-[1fr_60px_60px_70px_28px] gap-1.5 text-xs text-gray-400 font-medium px-1 mb-1">
              <span>Tamanho / Desc.</span>
              <span className="text-center">Estoque</span>
              <span className="text-center">Mínimo</span>
              <span className="text-center">R$/un</span>
              <span></span>
            </div>
            <div className="space-y-2">
              {variantes.map((v, i) => (
                <div key={i} className="grid grid-cols-[1fr_60px_60px_70px_28px] gap-1.5 items-center bg-gray-50 rounded-xl p-2">
                  <input value={v.tamanho} onChange={(e) => updateVariante(i, 'tamanho', e.target.value)}
                    placeholder={variantes.length === 1 ? 'Único' : '3mm, M3×8…'}
                    className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                  <input type="number" min="0" value={v.estoqueAtual}
                    onChange={(e) => updateVariante(i, 'estoqueAtual', e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                  <input type="number" min="0" value={v.estoqueMinimo}
                    onChange={(e) => updateVariante(i, 'estoqueMinimo', e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                  <input type="number" min="0" step="0.01" value={v.custoUn}
                    onChange={(e) => updateVariante(i, 'custoUn', e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                  <button onClick={() => removeVariante(i)}
                    disabled={variantes.length <= 1}
                    className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 text-red-400 flex items-center justify-center font-bold disabled:opacity-30">
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Botões */}
          <div className="flex gap-3 pt-2">
            <button onClick={onClose}
              className="flex-1 border border-gray-200 text-gray-500 font-semibold py-3 rounded-2xl hover:bg-gray-50 transition">
              Cancelar
            </button>
            <button onClick={handleSave}
              disabled={!nome.trim()}
              className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold py-3 rounded-2xl hover:opacity-90 transition disabled:opacity-40">
              {inicial ? 'Salvar alterações' : 'Adicionar acessório'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Tab principal ────────────────────────────────────────────────────────────
export function AcessoriosTab() {
  const { acessorios, addAcessorio, updateAcessorio, removeAcessorio } = useAcessorios();
  const [showNovo, setShowNovo] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<AcessorioCategoria | 'todos'>('todos');

  const filtrados = filtro === 'todos'
    ? acessorios
    : acessorios.filter((a) => a.categoria === filtro);

  const handleSaveNovo = (a: Omit<AcessorioEstoque, 'id' | 'movimentacoes'>) => {
    addAcessorio(a);
    setShowNovo(false);
  };

  const handleSaveEdit = (a: Omit<AcessorioEstoque, 'id' | 'movimentacoes'>) => {
    if (!editingId) return;
    updateAcessorio(editingId, { nome: a.nome, categoria: a.categoria, unidade: a.unidade, variantes: a.variantes });
    setEditingId(null);
  };

  const editingAcessorio = editingId ? acessorios.find((a) => a.id === editingId) : undefined;

  return (
    <div className="space-y-4">
      {/* Alertas */}
      <AlertaBaixoEstoque />

      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm p-5 flex items-center justify-between">
        <div>
          <h2 className="font-bold text-gray-800 text-lg">Acessórios em Estoque</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            {acessorios.length} item{acessorios.length !== 1 ? 'ns' : ''} ·{' '}
            {acessorios.reduce((s, a) => s + a.variantes.length, 0)} variante{acessorios.reduce((s, a) => s + a.variantes.length, 0) !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={() => setShowNovo(true)}
          className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-sm font-bold px-4 py-2 rounded-xl hover:opacity-90 transition flex items-center gap-2">
          <span className="text-lg leading-none">+</span> Novo Acessório
        </button>
      </div>

      {/* Filtro por categoria */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFiltro('todos')}
          className={`text-xs font-semibold px-3 py-1.5 rounded-full transition ${filtro === 'todos' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 border border-gray-200 hover:border-gray-300'}`}>
          Todos ({acessorios.length})
        </button>
        {(Object.entries(ACESSORIO_CAT_INFO) as [AcessorioCategoria, { label: string; emoji: string }][]).map(([key, info]) => {
          const count = acessorios.filter((a) => a.categoria === key).length;
          if (count === 0) return null;
          return (
            <button key={key} onClick={() => setFiltro(key)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full transition ${
                filtro === key ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 border border-gray-200 hover:border-gray-300'
              }`}>
              {info.emoji} {info.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Lista vazia */}
      {acessorios.length === 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-12 flex flex-col items-center gap-4 text-center">
          <svg width="80" height="80" viewBox="0 0 80 80" fill="none" className="opacity-60">
            <circle cx="40" cy="40" r="38" fill="#F5F3FF" />
            <rect x="24" y="26" width="32" height="28" rx="5" fill="#DDD6FE" />
            <circle cx="34" cy="40" r="5" fill="#7C3AED" />
            <circle cx="46" cy="40" r="5" fill="#7C3AED" />
            <line x1="34" y1="40" x2="46" y2="40" stroke="#7C3AED" strokeWidth="2" />
          </svg>
          <div>
            <p className="font-bold text-gray-700 text-base">Nenhum acessório cadastrado ainda</p>
            <p className="text-sm text-gray-400 max-w-xs mt-1">
              Imãs, parafusos, inserts, embalagens — cadastre aqui para controlar o custo real de cada peça e nunca ficar sem estoque.
            </p>
          </div>
          <button onClick={() => setShowNovo(true)}
            className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-sm font-bold px-6 py-2.5 rounded-xl hover:opacity-90 transition shadow-sm">
            🔩 Cadastrar primeiro acessório
          </button>
        </div>
      )}

      {/* Grid de cards */}
      {filtrados.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtrados.map((a) => (
            <AcessorioCard key={a.id} acessorio={a}
              onEdit={() => setEditingId(a.id)}
              onRemove={() => {
                if (confirm(`Remover "${a.nome}" e todo o histórico?`)) removeAcessorio(a.id);
              }}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {showNovo && (
        <EditAcessorioModal
          onClose={() => setShowNovo(false)}
          onSave={handleSaveNovo}
        />
      )}
      {editingAcessorio && (
        <EditAcessorioModal
          inicial={editingAcessorio}
          onClose={() => setEditingId(null)}
          onSave={handleSaveEdit}
        />
      )}
    </div>
  );
}

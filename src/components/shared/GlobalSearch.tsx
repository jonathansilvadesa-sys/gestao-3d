import { useState, useMemo, useEffect, useRef } from 'react';
import { R } from '@/utils/formatters';
import type { Product, AppTab } from '@/types';
import type { Material } from '@/types';

interface ResultItem {
  type: 'peca' | 'material' | 'movimento';
  icon: string;
  title: string;
  subtitle: string;
  badge?: string;
  badgeColor?: string;
  tab: AppTab;
  action?: () => void;
}

interface Props {
  products: Product[];
  materials: Material[];
  onNavigate: (tab: AppTab) => void;
  onSelectProduct: (p: Product) => void;
  onClose: () => void;
}

export function GlobalSearch({ products, materials, onNavigate, onSelectProduct, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef  = useRef<HTMLDivElement>(null);

  // Foco automático ao abrir
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, []);

  // Fechar no Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const q = query.trim().toLowerCase();

  const results = useMemo((): ResultItem[] => {
    if (q.length < 1) return [];
    const out: ResultItem[] = [];

    // ── Peças ──────────────────────────────────────────────────────────────
    for (const p of products) {
      if (!p.nome.toLowerCase().includes(q)) continue;
      out.push({
        type: 'peca',
        icon: '🖨️',
        title: p.nome,
        subtitle: `${p.tempo}h · ${p.peso}g · ${R(p.precoConsumidor)} · Estoque: ${p.estoque ?? 0}`,
        badge: `${p.markup}×`,
        badgeColor: 'bg-indigo-100 text-indigo-700',
        tab: 'produtos',
        action: () => { onSelectProduct(p); onClose(); },
      });
    }

    // ── Materiais ──────────────────────────────────────────────────────────
    for (const m of materials) {
      if (!m.nome.toLowerCase().includes(q) && !m.cor.toLowerCase().includes(q) && !m.tipo.toLowerCase().includes(q)) continue;
      const pct = m.pesoTotal > 0 ? Math.round((m.pesoAtual / m.pesoTotal) * 100) : 0;
      out.push({
        type: 'material',
        icon: '🧵',
        title: m.nome,
        subtitle: `${m.tipo} · ${m.cor} · ${m.pesoAtual}g restantes (${pct}%)`,
        badge: m.tipo,
        badgeColor: 'bg-amber-100 text-amber-700',
        tab: 'materiais',
        action: () => { onNavigate('materiais'); onClose(); },
      });
    }

    // ── Movimentações ──────────────────────────────────────────────────────
    const TIPO_LABEL: Record<string, string> = {
      venda: '🏷️ Venda', producao: '🖨️ Produção', falha: '⚠️ Falha', ajuste: '✏️ Ajuste',
    };
    for (const p of products) {
      for (const m of p.movimentosEstoque ?? []) {
        const motivo = (m.motivo ?? '').toLowerCase();
        const nomePeca = p.nome.toLowerCase();
        if (!motivo.includes(q) && !nomePeca.includes(q)) continue;
        const dataFmt = new Date(m.data).toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', year:'2-digit' });
        out.push({
          type: 'movimento',
          icon: m.tipo === 'venda' ? '🏷️' : m.tipo === 'producao' ? '📦' : m.tipo === 'falha' ? '⚠️' : '✏️',
          title: `${TIPO_LABEL[m.tipo] ?? m.tipo} — ${p.nome}`,
          subtitle: `${m.motivo ?? ''} · ${m.quantidade} un. · ${dataFmt}`,
          badge: m.tipo,
          badgeColor: m.tipo === 'venda' ? 'bg-emerald-100 text-emerald-700' : m.tipo === 'falha' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600',
          tab: 'estoque',
          action: () => { onNavigate('estoque'); onClose(); },
        });
        if (out.length >= 25) break; // limitar resultados
      }
      if (out.length >= 25) break;
    }

    return out.slice(0, 20);
  }, [q, products, materials, onNavigate, onSelectProduct, onClose]);

  // Reset índice quando resultado muda
  useEffect(() => { setActiveIndex(0); }, [results.length]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      results[activeIndex]?.action?.();
    }
  }

  // Scroll o item ativo para a visão
  useEffect(() => {
    const el = listRef.current?.children[activeIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  // Agrupamento por tipo
  const grupos = useMemo(() => {
    const map = new Map<string, { label: string; items: (ResultItem & { origIndex: number })[] }>();
    results.forEach((r, i) => {
      const key = r.type;
      const label = key === 'peca' ? 'Peças' : key === 'material' ? 'Materiais' : 'Movimentações';
      if (!map.has(key)) map.set(key, { label, items: [] });
      map.get(key)!.items.push({ ...r, origIndex: i });
    });
    return [...map.values()];
  }, [results]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center pt-16 sm:pt-24 px-4 search-backdrop"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 w-full max-w-xl rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: '70vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Input ──────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100 dark:border-gray-700">
          <span className="text-gray-400 text-lg flex-shrink-0">🔍</span>
          <input
            ref={inputRef}
            type="text"
            placeholder="Buscar peças, materiais, movimentações…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 text-sm bg-transparent text-gray-800 dark:text-gray-100 placeholder-gray-400 outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-gray-400 hover:text-gray-600 text-sm px-1"
            >
              ✕
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-1 text-[10px] text-gray-400 border border-gray-200 dark:border-gray-600 rounded px-1.5 py-0.5">
            ESC
          </kbd>
        </div>

        {/* ── Resultados ─────────────────────────────────────────────────── */}
        <div ref={listRef} className="overflow-y-auto flex-1 py-2">
          {q.length === 0 && (
            <div className="px-4 py-8 text-center">
              <p className="text-2xl mb-2">🔎</p>
              <p className="text-sm text-gray-400">Digite para buscar em toda a aplicação</p>
              <div className="mt-4 flex items-center justify-center gap-4 text-xs text-gray-300">
                <span>🖨️ Peças</span>
                <span>🧵 Materiais</span>
                <span>📦 Movimentações</span>
              </div>
            </div>
          )}

          {q.length > 0 && results.length === 0 && (
            <div className="px-4 py-8 text-center">
              <p className="text-2xl mb-2">😕</p>
              <p className="text-sm text-gray-400">Nenhum resultado para "<strong>{query}</strong>"</p>
            </div>
          )}

          {grupos.map((grupo) => (
            <div key={grupo.label}>
              {/* Label do grupo */}
              <p className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                {grupo.label}
              </p>
              {grupo.items.map((item) => {
                const isActive = item.origIndex === activeIndex;
                return (
                  <button
                    key={item.origIndex}
                    onClick={item.action}
                    onMouseEnter={() => setActiveIndex(item.origIndex)}
                    className={`w-full flex items-start gap-3 px-4 py-2.5 text-left transition ${
                      isActive ? 'bg-indigo-50 dark:bg-indigo-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700/40'
                    }`}
                  >
                    <span className="text-base mt-0.5 flex-shrink-0">{item.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`text-sm font-semibold truncate max-w-[240px] ${isActive ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-800 dark:text-gray-100'}`}>
                          {item.title}
                        </p>
                        {item.badge && (
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${item.badgeColor}`}>
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">{item.subtitle}</p>
                    </div>
                    {isActive && (
                      <kbd className="hidden sm:inline-flex flex-shrink-0 text-[10px] text-gray-400 border border-gray-200 dark:border-gray-600 rounded px-1.5 py-0.5 self-center">
                        ↵
                      </kbd>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* ── Rodapé de atalhos ───────────────────────────────────────────── */}
        {results.length > 0 && (
          <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-700 flex items-center gap-3 text-[10px] text-gray-400">
            <span><kbd className="border border-gray-200 dark:border-gray-600 rounded px-1">↑↓</kbd> navegar</span>
            <span><kbd className="border border-gray-200 dark:border-gray-600 rounded px-1">↵</kbd> abrir</span>
            <span><kbd className="border border-gray-200 dark:border-gray-600 rounded px-1">Esc</kbd> fechar</span>
            <span className="ml-auto">{results.length} resultado{results.length !== 1 ? 's' : ''}</span>
          </div>
        )}
      </div>
    </div>
  );
}

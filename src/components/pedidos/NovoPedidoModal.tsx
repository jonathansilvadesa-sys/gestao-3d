import { useState } from 'react';
import { usePedidos }  from '@/contexts/PedidosContext';
import { useProducts } from '@/contexts/ProductContext';
import { useCanais }   from '@/contexts/CanaisContext';
import { R }           from '@/utils/formatters';
import type { PedidoItem } from '@/types';

interface Props { onClose: () => void; }

export function NovoPedidoModal({ onClose }: Props) {
  const { addPedido }  = usePedidos();
  const { products }   = useProducts();
  const { canais }     = useCanais();

  const [clienteNome,    setClienteNome]    = useState('');
  const [clienteContato, setClienteContato] = useState('');
  const [canal,          setCanal]          = useState('manual');
  const [itens,          setItens]          = useState<PedidoItem[]>([]);
  const [desconto,       setDesconto]       = useState(0);
  const [dataEntrega,    setDataEntrega]    = useState('');
  const [notas,          setNotas]          = useState('');
  const [status]         = useState<'orcamento' | 'confirmado'>('confirmado');
  const [produtoSel,     setProdutoSel]     = useState('');
  const [qtdSel,         setQtdSel]         = useState(1);

  // ── Adicionar produto ao pedido ─────────────────────────────────────────
  const addItem = () => {
    const prod = products.find((p) => p.id === Number(produtoSel));
    if (!prod) return;
    const exists = itens.find((i) => i.productId === prod.id);
    if (exists) {
      setItens((prev) => prev.map((i) =>
        i.productId === prod.id
          ? { ...i, quantidade: i.quantidade + qtdSel, subtotal: (i.quantidade + qtdSel) * i.precoUn }
          : i
      ));
    } else {
      setItens((prev) => [...prev, {
        productId: prod.id,
        nome: prod.nome,
        quantidade: qtdSel,
        precoUn: prod.precoConsumidor,
        subtotal: qtdSel * prod.precoConsumidor,
      }]);
    }
    setProdutoSel('');
    setQtdSel(1);
  };

  const removeItem = (id: number) => setItens((prev) => prev.filter((i) => i.productId !== id));

  const updateQtd = (id: number, qtd: number) => {
    if (qtd <= 0) { removeItem(id); return; }
    const prod = products.find((p) => p.id === id);
    setItens((prev) => prev.map((i) =>
      i.productId === id ? { ...i, quantidade: qtd, subtotal: qtd * (prod?.precoConsumidor ?? i.precoUn) } : i
    ));
  };

  const subtotal  = itens.reduce((s, i) => s + i.subtotal, 0);
  const valorTotal = Math.max(0, subtotal - desconto);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteNome.trim() || itens.length === 0) return;
    addPedido({
      clienteNome: clienteNome.trim(),
      clienteContato: clienteContato.trim() || undefined,
      canal,
      itens,
      status,
      valorTotal,
      desconto,
      dataPedido: new Date().toISOString(),
      dataEntregaPrevista: dataEntrega || undefined,
      notas: notas.trim() || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Novo Pedido</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center text-gray-400 text-xl font-bold transition">×</button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* Cliente */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Cliente *</label>
              <input
                value={clienteNome}
                onChange={(e) => setClienteNome(e.target.value)}
                placeholder="Nome do cliente"
                required
                className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Contato</label>
              <input
                value={clienteContato}
                onChange={(e) => setClienteContato(e.target.value)}
                placeholder="Tel / e-mail"
                className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
          </div>

          {/* Canal + Data entrega */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Canal</label>
              <select
                value={canal}
                onChange={(e) => setCanal(e.target.value)}
                className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                {canais.map((c) => (
                  <option key={c.id} value={c.id}>{c.emoji} {c.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Entrega prevista</label>
              <input
                type="date"
                value={dataEntrega}
                onChange={(e) => setDataEntrega(e.target.value)}
                className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
          </div>

          {/* Adicionar produto */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Adicionar produto</label>
            <div className="flex gap-2">
              <select
                value={produtoSel}
                onChange={(e) => setProdutoSel(e.target.value)}
                className="flex-1 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                <option value="">Selecione um produto…</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.nome} — {R(p.precoConsumidor)}</option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                value={qtdSel}
                onChange={(e) => setQtdSel(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-16 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl px-3 py-2.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
              <button
                type="button"
                onClick={addItem}
                disabled={!produtoSel}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold px-4 py-2.5 rounded-xl disabled:opacity-40 transition"
              >
                +
              </button>
            </div>
          </div>

          {/* Lista de itens */}
          {itens.length > 0 && (
            <div className="rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="text-left px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Produto</th>
                    <th className="text-center px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Qtd</th>
                    <th className="text-right px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Total</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                  {itens.map((item) => (
                    <tr key={item.productId}>
                      <td className="px-3 py-2 text-gray-700 dark:text-gray-200 text-xs">{item.nome}</td>
                      <td className="px-3 py-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => updateQtd(item.productId, item.quantidade - 1)}
                            className="w-6 h-6 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 text-xs font-bold transition"
                          >-</button>
                          <span className="w-6 text-center text-xs font-semibold text-gray-700 dark:text-gray-200">{item.quantidade}</span>
                          <button
                            type="button"
                            onClick={() => updateQtd(item.productId, item.quantidade + 1)}
                            className="w-6 h-6 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 text-xs font-bold transition"
                          >+</button>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-indigo-600 text-xs">{R(item.subtotal)}</td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => removeItem(item.productId)}
                          className="w-6 h-6 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 flex items-center justify-center text-sm transition"
                        >×</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Desconto + Total */}
          {itens.length > 0 && (
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-semibold text-gray-700 dark:text-gray-200">{R(subtotal)}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500 flex-1">Desconto (R$)</span>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={desconto || ''}
                  onChange={(e) => setDesconto(Math.max(0, parseFloat(e.target.value) || 0))}
                  placeholder="0,00"
                  className="w-24 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>
              <div className="flex items-center justify-between text-base font-bold border-t border-gray-200 dark:border-gray-600 pt-2 mt-1">
                <span className="text-gray-700 dark:text-gray-200">Total</span>
                <span className="text-emerald-600">{R(valorTotal)}</span>
              </div>
            </div>
          )}

          {/* Observações */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Observações</label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Cor, personalização, prazo especial…"
              rows={2}
              className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl transition"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form=""
            onClick={(e) => {
              e.preventDefault();
              if (!clienteNome.trim() || itens.length === 0) return;
              addPedido({
                clienteNome: clienteNome.trim(),
                clienteContato: clienteContato.trim() || undefined,
                canal, itens, status, valorTotal, desconto,
                dataPedido: new Date().toISOString(),
                dataEntregaPrevista: dataEntrega || undefined,
                notas: notas.trim() || undefined,
              });
              onClose();
            }}
            disabled={!clienteNome.trim() || itens.length === 0}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold px-6 py-2 rounded-xl disabled:opacity-40 transition"
          >
            Criar Pedido
          </button>
        </div>
      </div>
    </div>
  );
}

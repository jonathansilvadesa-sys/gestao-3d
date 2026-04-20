import { useState, type ChangeEvent } from 'react';
import { useMaterials } from '@/contexts/MaterialContext';
import { R } from '@/utils/formatters';
import { custoPorGrama } from '@/types';
import type { Material, FilamentoTipo } from '@/types';

const TIPOS: FilamentoTipo[] = ['PLA', 'PETG', 'ABS', 'TPU', 'ASA', 'Outro'];

interface Props { onClose: () => void; }

interface Form {
  nome: string;
  tipo: FilamentoTipo;
  cor: string;
  precoPago: string;
  pesoTotal: string;
  pesoAtual: string;
}

export function NovoMaterialModal({ onClose }: Props) {
  const { addMaterial } = useMaterials();
  const [f, setF] = useState<Form>({
    nome: '', tipo: 'PLA', cor: '', precoPago: '', pesoTotal: '1000', pesoAtual: '1000',
  });

  const s = (k: keyof Form) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }));

  const preview: Material = {
    id: 0,
    nome: f.nome || 'Preview',
    tipo: f.tipo,
    cor: f.cor,
    precoPago: +f.precoPago || 0,
    pesoTotal: +f.pesoTotal || 1000,
    pesoAtual: +f.pesoAtual || 1000,
  };
  const cpg = custoPorGrama(preview);

  const handleAdd = () => {
    if (!f.nome.trim()) return alert('Informe o nome/marca do filamento.');
    if (!f.precoPago || +f.precoPago <= 0) return alert('Informe o preço pago.');
    addMaterial({ ...preview, id: Date.now(), nome: f.nome.trim(), cor: f.cor.trim() });
    onClose();
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
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-t-3xl p-6 text-white flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Novo Filamento</h2>
            <p className="text-sm opacity-70 mt-0.5">Cadastre um rolo de filamento</p>
          </div>
          <button onClick={onClose} className="text-3xl font-light opacity-70 hover:opacity-100">×</button>
        </div>

        <div className="p-6 space-y-4">
          {/* Nome */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Nome / Marca</label>
            <input
              type="text"
              value={f.nome}
              onChange={s('nome')}
              placeholder="Ex: Polymaker PLA Matte"
              className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Tipo */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tipo</label>
              <select
                value={f.tipo}
                onChange={s('tipo')}
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
              >
                {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {/* Cor */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Cor</label>
              <input
                type="text"
                value={f.cor}
                onChange={s('cor')}
                placeholder="Ex: Preto Fosco"
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {/* Preço pago */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Preço Pago (R$)</label>
              <input
                type="number" inputMode="decimal" step="0.01" value={f.precoPago} onChange={s('precoPago')}
                placeholder="99.90"
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>

            {/* Peso total */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Peso Total (g)</label>
              <input
                type="number" inputMode="decimal" step="1" value={f.pesoTotal} onChange={s('pesoTotal')}
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>

            {/* Peso atual */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Peso Atual (g)</label>
              <input
                type="number" inputMode="decimal" step="1" value={f.pesoAtual} onChange={s('pesoAtual')}
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          </div>

          {/* Preview */}
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-4">
            <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-3">Preview</p>
            <div className="grid grid-cols-3 gap-3 text-sm">
              {([
                ['Preço pago', R(+f.precoPago || 0)],
                ['Custo por grama', R(cpg)],
                ['Equivalente / kg', R(cpg * 1000)],
              ] as [string, string][]).map(([k, v]) => (
                <div key={k} className="text-center">
                  <p className="text-xs text-gray-400">{k}</p>
                  <p className="font-bold text-gray-800">{v}</p>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleAdd}
            className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold py-3 rounded-2xl hover:opacity-90 transition"
          >
            Cadastrar Filamento
          </button>
        </div>
      </div>
    </div>
  );
}

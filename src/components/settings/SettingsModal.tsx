import { useState } from 'react';
import { useSettings } from '@/contexts/SettingsContext';
import type { AppSettings } from '@/types';

interface Props { onClose: () => void }

export function SettingsModal({ onClose }: Props) {
  const { settings, updateSettings } = useSettings();
  const [form, setForm] = useState<AppSettings>({ ...settings });

  const set = (k: keyof AppSettings) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [k]: parseFloat(e.target.value) || 0 }));

  const handleSave = () => {
    updateSettings(form);
    onClose();
  };

  const Field = ({ label, k, unit }: { label: string; k: keyof AppSettings; unit?: string }) => (
    <div>
      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">{label}</label>
      <div className="mt-1 flex items-center gap-2">
        <input
          type="number"
          step="0.01"
          value={form[k]}
          onChange={set(k)}
          className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        {unit && <span className="text-xs text-gray-400 font-medium w-10">{unit}</span>}
      </div>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.55)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg mx-4 overflow-y-auto"
        style={{ maxHeight: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
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
              <Field label="Anúncio" k="custoAnuncio" unit="%" />
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

          {/* Contingência */}
          <div>
            <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-3">⚠️ Contingência</p>
            <Field label="Taxa de falhas" k="falhas" unit="%" />
          </div>

          {/* Aviso */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-xs text-amber-700">
            <strong>Atenção:</strong> estas configurações são salvas localmente e aplicadas como padrão em novas peças.
            Peças já cadastradas não são alteradas automaticamente.
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

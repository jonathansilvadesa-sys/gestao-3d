/**
 * ImportModal.tsx — Modal de importação de produtos via planilha Excel/CSV.
 *
 * Fluxo:
 *   1. Usuário baixa o template (opcional)
 *   2. Faz upload do arquivo preenchido
 *   3. Vê prévia dos produtos
 *   4. Confirma → addProduct() para cada linha válida
 */

import { useState, useRef, useCallback } from 'react';
import { useSettings }  from '@/contexts/SettingsContext';
import { useProducts }  from '@/contexts/ProductContext';
import { useToast }     from '@/contexts/ToastContext';
import {
  parseImportFile,
  importRowToProduct,
  baixarTemplate,
  type ImportRow,
  type ImportPreview,
} from '@/utils/importExcel';
import { R } from '@/utils/formatters';

interface Props {
  onClose: () => void;
}

export function ImportModal({ onClose }: Props) {
  const { settings }    = useSettings();
  const { addProduct }  = useProducts();
  const { addToast }    = useToast();

  const [step, setStep]         = useState<'upload' | 'preview' | 'done'>('upload');
  const [preview, setPreview]   = useState<ImportPreview | null>(null);
  const [fileName, setFileName] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [importing, setImporting]   = useState(false);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

  const inputRef = useRef<HTMLInputElement>(null);

  // ── Processa o arquivo ──────────────────────────────────────────────────────
  const processFile = useCallback(async (file: File) => {
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      addToast('Arquivo inválido. Use .xlsx, .xls ou .csv', 'error');
      return;
    }
    setFileName(file.name);
    try {
      const result = await parseImportFile(file, settings);
      if (result.rows.length === 0) {
        addToast('Nenhum produto encontrado na planilha.', 'warning');
        return;
      }
      setPreview(result);
      // Pré-seleciona todas as linhas válidas
      setSelectedRows(new Set(
        result.rows.filter((r) => r.errors.length === 0).map((_, i) => i)
      ));
      setStep('preview');
    } catch (e) {
      addToast('Erro ao ler o arquivo. Verifique o formato.', 'error');
      console.error(e);
    }
  }, [settings, addToast]);

  // ── Drag & Drop ─────────────────────────────────────────────────────────────
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  // ── Confirmar importação ────────────────────────────────────────────────────
  const handleImport = async () => {
    if (!preview) return;
    setImporting(true);

    const toImport = preview.rows.filter((_, i) => selectedRows.has(i) && preview.rows[i].errors.length === 0);
    let count = 0;
    for (const row of toImport) {
      const product = importRowToProduct(row, settings);
      // Pequeno delay para IDs únicos
      await new Promise((r) => setTimeout(r, 5));
      addProduct({ ...product, id: Date.now() + Math.floor(Math.random() * 100000) });
      count++;
    }

    setImporting(false);
    setStep('done');
    addToast(`✅ ${count} produto${count !== 1 ? 's' : ''} importado${count !== 1 ? 's' : ''} com sucesso!`, 'success');
  };

  const toggleRow = (i: number) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  };

  const toggleAll = () => {
    if (!preview) return;
    const validIdx = preview.rows.map((_, i) => i).filter((i) => preview.rows[i].errors.length === 0);
    if (selectedRows.size === validIdx.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(validIdx));
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Importar Produtos</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {step === 'upload' && 'Faça upload de uma planilha Excel ou CSV'}
              {step === 'preview' && `${preview?.rows.length} linha${preview?.rows.length !== 1 ? 's' : ''} encontrada${preview?.rows.length !== 1 ? 's' : ''} em "${fileName}"`}
              {step === 'done' && 'Importação concluída'}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center text-gray-400 text-lg font-bold transition">×</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">

          {/* ── Step 1: Upload ── */}
          {step === 'upload' && (
            <div className="p-6 space-y-5">
              {/* Botão baixar template */}
              <div className="bg-indigo-50 dark:bg-indigo-900/30 rounded-xl p-4 flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-100 dark:bg-indigo-800 flex items-center justify-center flex-shrink-0">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-indigo-800 dark:text-indigo-200">Baixar planilha modelo</p>
                  <p className="text-xs text-indigo-600 dark:text-indigo-300 mt-0.5">
                    Preencha o template e importe. Inclui instruções e exemplos.
                  </p>
                </div>
                <button
                  onClick={baixarTemplate}
                  className="flex-shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition"
                >
                  Baixar
                </button>
              </div>

              {/* Drop zone */}
              <div
                onDrop={onDrop}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onClick={() => inputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center gap-3 cursor-pointer transition
                  ${isDragging
                    ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/30'
                    : 'border-gray-200 dark:border-gray-600 hover:border-indigo-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
              >
                <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="12" y1="18" x2="12" y2="12"/>
                    <polyline points="9 15 12 12 15 15"/>
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">Arraste o arquivo aqui</p>
                  <p className="text-xs text-gray-400 mt-0.5">ou clique para selecionar</p>
                  <p className="text-xs text-gray-300 dark:text-gray-500 mt-1">.xlsx, .xls ou .csv</p>
                </div>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f); }}
                />
              </div>

              {/* Colunas esperadas */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Colunas do template</p>
                <div className="grid grid-cols-2 gap-1 text-xs text-gray-500 dark:text-gray-400">
                  <span>A: <strong className="text-gray-700 dark:text-gray-200">Nome*</strong></span>
                  <span>B: <strong className="text-gray-700 dark:text-gray-200">Tempo (h)*</strong></span>
                  <span>C: <strong className="text-gray-700 dark:text-gray-200">Peso (g)*</strong></span>
                  <span>D: Custo filamento (R$/kg)</span>
                  <span>E: Unidades por lote</span>
                  <span>F: Markup</span>
                  <span>G: Canal de venda</span>
                  <span>H: Falhas (%)</span>
                  <span>I: Imposto (%)</span>
                  <span>J: Taxa cartão (%)</span>
                  <span>K: Preço consumidor (override)</span>
                  <span>L: Observações</span>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2: Preview ── */}
          {step === 'preview' && preview && (
            <div className="p-6 space-y-4">
              {/* Sumário */}
              <div className="flex flex-wrap gap-3">
                <div className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-xl px-4 py-2 text-sm font-semibold">
                  ✓ {preview.validCount} válido{preview.validCount !== 1 ? 's' : ''}
                </div>
                {preview.errorCount > 0 && (
                  <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 rounded-xl px-4 py-2 text-sm font-semibold">
                    ✗ {preview.errorCount} com erro{preview.errorCount !== 1 ? 's' : ''}
                  </div>
                )}
                <div className="ml-auto text-xs text-gray-400 self-center">
                  {selectedRows.size} selecionado{selectedRows.size !== 1 ? 's' : ''}
                </div>
              </div>

              {/* Tabela preview */}
              <div className="rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-3 py-2 text-left">
                        <input
                          type="checkbox"
                          checked={selectedRows.size === preview.validCount && preview.validCount > 0}
                          onChange={toggleAll}
                          className="rounded"
                        />
                      </th>
                      <th className="px-3 py-2 text-left text-gray-500 font-bold uppercase tracking-wider">Nome</th>
                      <th className="px-3 py-2 text-right text-gray-500 font-bold uppercase tracking-wider hidden sm:table-cell">Tempo</th>
                      <th className="px-3 py-2 text-right text-gray-500 font-bold uppercase tracking-wider hidden sm:table-cell">Peso</th>
                      <th className="px-3 py-2 text-right text-gray-500 font-bold uppercase tracking-wider">Custo Un</th>
                      <th className="px-3 py-2 text-right text-gray-500 font-bold uppercase tracking-wider">Preço</th>
                      <th className="px-3 py-2 text-center text-gray-500 font-bold uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                    {preview.rows.map((row, i) => {
                      const hasError = row.errors.length > 0;
                      let calc = null;
                      if (!hasError) {
                        try { calc = importRowToProduct(row, settings); } catch { /* ignora */ }
                      }
                      return (
                        <tr
                          key={i}
                          className={`transition ${hasError ? 'opacity-60 bg-red-50/50 dark:bg-red-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
                        >
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              disabled={hasError}
                              checked={selectedRows.has(i)}
                              onChange={() => toggleRow(i)}
                              className="rounded"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <div className="font-semibold text-gray-800 dark:text-gray-200 truncate max-w-[140px]">{row.nome}</div>
                            {hasError && (
                              <div className="text-red-500 text-[10px] mt-0.5">{row.errors.join('; ')}</div>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right text-gray-500 hidden sm:table-cell">{row.tempoH}h</td>
                          <td className="px-3 py-2 text-right text-gray-500 hidden sm:table-cell">{row.pesoG}g</td>
                          <td className="px-3 py-2 text-right font-medium text-gray-700 dark:text-gray-300">
                            {calc ? R(calc.custoUn) : '—'}
                          </td>
                          <td className="px-3 py-2 text-right font-bold text-indigo-600">
                            {calc ? R(calc.precoConsumidor) : '—'}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {hasError ? (
                              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-100 text-red-500 text-xs">✗</span>
                            ) : (
                              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 text-xs">✓</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Botão trocar arquivo */}
              <button
                onClick={() => { setStep('upload'); setPreview(null); setFileName(''); }}
                className="text-xs text-indigo-500 hover:text-indigo-700 underline"
              >
                ← Trocar arquivo
              </button>
            </div>
          )}

          {/* ── Step 3: Done ── */}
          {step === 'done' && (
            <div className="p-10 flex flex-col items-center gap-4 text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center text-3xl">✅</div>
              <div>
                <p className="text-lg font-bold text-gray-800 dark:text-gray-100">Importação concluída!</p>
                <p className="text-sm text-gray-400 mt-1">
                  Os produtos já aparecem na aba Produtos. Você pode editar cada um para ajustar detalhes.
                </p>
              </div>
              <button
                onClick={onClose}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-2.5 rounded-xl transition"
              >
                Fechar
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 'preview' && (
          <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex-shrink-0">
            <p className="text-xs text-gray-400">
              {selectedRows.size} produto{selectedRows.size !== 1 ? 's' : ''} será{selectedRows.size !== 1 ? 'ão' : ''} importado{selectedRows.size !== 1 ? 's' : ''}
            </p>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleImport}
                disabled={selectedRows.size === 0 || importing}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2 rounded-xl transition"
              >
                {importing && (
                  <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                  </svg>
                )}
                Importar {selectedRows.size > 0 ? `${selectedRows.size} produto${selectedRows.size !== 1 ? 's' : ''}` : ''}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import type { Product } from '@/types';
import { R } from '@/utils/formatters';

interface Props {
  product: Product;
  onClose: () => void;
}

// ── Gera o payload do QR Code ─────────────────────────────────────────────────
// Custo só é incluído no template "detalhada" (uso interno).
// Nos demais o QR expõe apenas id, nome e preço — seguro para anúncios públicos.
function buildQrPayload(p: Product, preco: number, incluirCusto: boolean): string {
  const payload: Record<string, unknown> = { id: p.id, nome: p.nome, preco };
  if (incluirCusto) payload.custo = p.custoUn;
  return JSON.stringify(payload);
}

// ── Renderiza QR Code num <canvas> ────────────────────────────────────────────
async function renderQr(canvas: HTMLCanvasElement, data: string, size: number) {
  await QRCode.toCanvas(canvas, data, {
    width: size,
    margin: 1,
    color: { dark: '#111827', light: '#ffffff' },
    errorCorrectionLevel: 'M',
  });
}

// ── Templates disponíveis ─────────────────────────────────────────────────────
type Template = 'simples' | 'detalhada' | 'qr_apenas';

const TEMPLATES: { id: Template; label: string; desc: string }[] = [
  { id: 'simples',   label: '📌 Simples',   desc: 'Nome + Preço + QR' },
  { id: 'detalhada', label: '📋 Detalhada', desc: 'Nome + Custo + Preço + Lucro + QR' },
  { id: 'qr_apenas', label: '🔲 Só QR',     desc: 'QR Code apenas' },
];

export function EtiquetasModal({ product, onClose }: Props) {
  const canvasRef      = useRef<HTMLCanvasElement>(null);
  const printCanvasRef = useRef<HTMLCanvasElement>(null);

  const [template, setTemplate]     = useState<Template>('simples');
  const [qrSize, setQrSize]         = useState(120);
  const [copies, setCopies]         = useState(1);
  const [qrReady, setQrReady]       = useState(false);

  // Preço editável — apenas visual, não altera o produto
  const [priceInput, setPriceInput] = useState(
    product.precoConsumidor.toFixed(2).replace('.', ',')
  );
  const precoEtiqueta = parseFloat(priceInput.replace(',', '.')) || product.precoConsumidor;

  // Renderiza QR na preview sempre que preço ou tamanho muda
  useEffect(() => {
    if (!canvasRef.current) return;
    setQrReady(false);
    renderQr(canvasRef.current, buildQrPayload(product, precoEtiqueta, template === 'detalhada'), qrSize)
      .then(() => setQrReady(true))
      .catch(console.error);
  }, [product, precoEtiqueta, qrSize]);

  // ── Impressão ─────────────────────────────────────────────────────────────
  const handlePrint = async () => {
    const printCanvas = printCanvasRef.current;
    if (!printCanvas) return;

    await renderQr(printCanvas, buildQrPayload(product, precoEtiqueta, template === 'detalhada'), 200);
    const qrDataUrl = printCanvas.toDataURL('image/png');

    const buildCard = (i: number) => `
      <div class="card">
        ${template !== 'qr_apenas' ? `
          <div class="nome">${product.nome}</div>
          ${template === 'detalhada' ? `
            <div class="linha"><span class="label">Custo:</span> <span class="val">${R(product.custoUn)}</span></div>
            <div class="linha lucro"><span class="label">Lucro:</span> <span class="val">${R(product.lucroLiquidoConsumidor)}</span></div>
          ` : ''}
          <div class="preco">${R(precoEtiqueta)}</div>
        ` : ''}
        <img class="qr" src="${qrDataUrl}" />
        <div class="rodape">${product.nome.slice(0, 20)}${product.nome.length > 20 ? '…' : ''} · #${i + 1}</div>
      </div>
    `;

    const win = window.open('', '_blank', 'width=800,height=600');
    if (!win) return;
    win.document.write(`
      <html><head><title>Etiquetas — ${product.nome}</title>
      <style>
        @page { size: 70mm 40mm; margin: 2mm; }
        * { box-sizing: border-box; font-family: Arial, sans-serif; }
        body { margin: 0; padding: 0; background: #fff; }
        .grid { display: flex; flex-wrap: wrap; gap: 4px; padding: 4px; }
        .card { width: 70mm; height: 40mm; border: 1px solid #ccc; border-radius: 4px;
                padding: 4px 6px; display: flex; flex-direction: column;
                align-items: center; justify-content: center; text-align: center;
                page-break-inside: avoid; background: #fff; }
        .nome  { font-size: 11px; font-weight: bold; color: #111; margin-bottom: 3px;
                 max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .preco { font-size: 16px; font-weight: 900; color: #4f46e5; margin-bottom: 3px; }
        .linha { font-size: 9px; color: #555; display: flex; gap: 4px; }
        .label { color: #888; }
        .val   { font-weight: 600; }
        .lucro .val { color: #059669; }
        .qr    { width: ${template === 'qr_apenas' ? '36mm' : '22mm'}; height: auto; }
        .rodape{ font-size: 7px; color: #aaa; margin-top: 2px; }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      </style></head>
      <body>
        <div class="grid">
          ${Array.from({ length: copies }, (_, i) => buildCard(i)).join('')}
        </div>
        <script>window.onload=()=>window.print();</script>
      </body></html>
    `);
    win.document.close();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden">

        {/* ── Header ───────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <div>
            <h2 className="font-bold text-gray-800 dark:text-gray-100 text-base">🏷️ Etiqueta + QR Code</h2>
            <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[220px]">{product.nome}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition text-gray-400"
          >✕</button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

          {/* ── Template ─────────────────────────────────────────────────── */}
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">Template</p>
            <div className="grid grid-cols-3 gap-2">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTemplate(t.id)}
                  className={`flex flex-col items-center gap-0.5 px-2 py-2.5 rounded-xl border text-center transition text-xs font-medium ${
                    template === t.id
                      ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                      : 'border-gray-200 dark:border-gray-600 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  <span className="text-lg">{t.label.split(' ')[0]}</span>
                  <span>{t.label.split(' ').slice(1).join(' ')}</span>
                  <span className="text-[10px] text-gray-400 font-normal leading-tight mt-0.5">{t.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Preço na etiqueta (só quando mostra preço) ────────────────── */}
          {template !== 'qr_apenas' && (
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                Preço na etiqueta
              </p>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-gray-400">R$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={priceInput}
                  onChange={(e) => setPriceInput(e.target.value)}
                  onBlur={() => {
                    // Normaliza ao sair do campo
                    const v = parseFloat(priceInput.replace(',', '.'));
                    if (!isNaN(v)) setPriceInput(v.toFixed(2).replace('.', ','));
                    else setPriceInput(product.precoConsumidor.toFixed(2).replace('.', ','));
                  }}
                  className="w-32 text-center font-bold text-base border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl py-1.5 focus:outline-none focus:border-indigo-400 bg-white"
                />
                <button
                  onClick={() => setPriceInput(product.precoConsumidor.toFixed(2).replace('.', ','))}
                  className="text-xs text-gray-400 hover:text-indigo-500 transition px-2 py-1 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                  title="Restaurar preço original"
                >
                  ↺ original
                </button>
              </div>
              {precoEtiqueta !== product.precoConsumidor && (
                <p className="text-[10px] text-amber-500 mt-1">
                  ⚠️ Diferente do preço cadastrado ({R(product.precoConsumidor)}) — só afeta esta etiqueta
                </p>
              )}
            </div>
          )}

          {/* ── Tamanho QR e Cópias — empilhados no mobile ───────────────── */}
          <div className="flex flex-col gap-3">
            {/* Tamanho QR */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Tamanho QR
                </label>
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-0.5 rounded-lg">
                  {qrSize}px
                </span>
              </div>
              <input
                type="range" min={80} max={200} step={20}
                value={qrSize}
                onChange={(e) => setQrSize(Number(e.target.value))}
                className="w-full accent-indigo-600"
              />
              <div className="flex justify-between text-[10px] text-gray-300 mt-0.5 px-0.5">
                <span>80</span><span>120</span><span>160</span><span>200</span>
              </div>
            </div>

            {/* Cópias */}
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Cópias
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setCopies((c) => Math.max(1, c - 1))}
                  className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-700 font-bold text-gray-600 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition text-lg leading-none"
                >−</button>
                <span className="text-base font-bold text-gray-700 dark:text-gray-200 w-8 text-center tabular-nums">
                  {copies}
                </span>
                <button
                  onClick={() => setCopies((c) => Math.min(20, c + 1))}
                  className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-700 font-bold text-gray-600 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition text-lg leading-none"
                >+</button>
              </div>
            </div>
          </div>

          {/* ── Preview ──────────────────────────────────────────────────── */}
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">Preview</p>
            <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4 flex justify-center">
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-3 flex flex-col items-center gap-1.5 min-w-[130px]">
                {template !== 'qr_apenas' && (
                  <>
                    <p className="text-xs font-bold text-gray-800 text-center max-w-[160px] truncate">
                      {product.nome}
                    </p>
                    {template === 'detalhada' && (
                      <div className="text-[10px] text-gray-500 space-y-0.5 text-center">
                        <div>Custo: <span className="font-semibold">{R(product.custoUn)}</span></div>
                        <div>Lucro: <span className="font-semibold text-emerald-600">{R(product.lucroLiquidoConsumidor)}</span></div>
                      </div>
                    )}
                    <p className="text-base font-black text-indigo-600">{R(precoEtiqueta)}</p>
                  </>
                )}
                <canvas
                  ref={canvasRef}
                  className={qrReady ? '' : 'opacity-30'}
                  style={{ width: Math.min(qrSize, 100), height: Math.min(qrSize, 100) }}
                />
                <p className="text-[9px] text-gray-300 text-center">
                  {product.nome.slice(0, 16)}{product.nome.length > 16 ? '…' : ''}
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* ── Footer ───────────────────────────────────────────────────────── */}
        <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-700 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-sm font-semibold hover:bg-gray-50 transition"
          >
            Cancelar
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition"
          >
            🖨️ Imprimir{copies > 1 ? ` (${copies}×)` : ''}
          </button>
        </div>
      </div>

      {/* Canvas oculto para impressão em alta resolução */}
      <canvas ref={printCanvasRef} className="hidden" />
    </div>
  );
}

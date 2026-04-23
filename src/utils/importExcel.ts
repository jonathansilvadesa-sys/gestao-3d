/**
 * importExcel.ts — Importação de produtos via planilha Excel/CSV.
 *
 * Colunas do template padrão (na ordem):
 *   A: Nome*
 *   B: Tempo_h*          (horas de impressão)
 *   C: Peso_g*           (gramas de filamento)
 *   D: Custo_filamento_kgR$ (R$/kg do filamento — padrão: 99)
 *   E: Unidades          (peças por lote — padrão: 1)
 *   F: Markup            (ex: 2.5 — padrão: 2.5)
 *   G: Canal             (manual | mercadolivre | shopee | instagram | etsy | site)
 *   H: Falhas_%          (padrão: usa settings)
 *   I: Imposto_%         (padrão: usa settings)
 *   J: Taxa_cartao_%     (padrão: usa settings)
 *   K: Preco_consumidor  (override opcional — se vazio, calculado)
 *   L: Observacoes       (campo livre, ignorado pelo sistema)
 */

import * as XLSX from 'xlsx';
import { calcProductFromForm } from './calc';
import type { AppSettings, Product, FilamentoUsado, ProductForm } from '@/types';

export interface ImportRow {
  rowIndex: number;
  nome: string;
  tempoH: number;
  pesoG: number;
  custoKg: number;
  unidades: number;
  markup: number;
  canal: string;
  falhas: number;
  imposto: number;
  txCartao: number;
  precoOverride: number | null;
  observacoes: string;
  // erros de validação
  errors: string[];
}

export interface ImportPreview {
  rows: ImportRow[];
  validCount: number;
  errorCount: number;
}

const CANAIS_VALIDOS = ['manual', 'mercadolivre', 'shopee', 'instagram', 'etsy', 'site'];

function toNum(v: unknown, fallback = 0): number {
  if (v === null || v === undefined || v === '') return fallback;
  const n = typeof v === 'string' ? parseFloat(v.replace(',', '.')) : Number(v);
  return isNaN(n) ? fallback : n;
}

function toStr(v: unknown): string {
  if (v === null || v === undefined) return '';
  return String(v).trim();
}

/** Lê um File .xlsx/.csv e retorna a prévia de importação */
export async function parseImportFile(
  file: File,
  settings: AppSettings,
): Promise<ImportPreview> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' });

  // Pula linhas de cabeçalho (procura pela primeira linha onde col A seja "Nome")
  let dataStart = 1;
  for (let i = 0; i < Math.min(5, raw.length); i++) {
    const row = raw[i] as unknown[];
    const first = toStr(row[0]).toLowerCase();
    if (first === 'nome' || first === 'nome*') { dataStart = i + 1; break; }
  }

  const rows: ImportRow[] = [];

  for (let i = dataStart; i < raw.length; i++) {
    const row = raw[i] as unknown[];
    const nome = toStr(row[0]);
    if (!nome) continue; // linha em branco

    const errors: string[] = [];

    const tempoH = toNum(row[1], 0);
    const pesoG  = toNum(row[2], 0);
    const custoKg = toNum(row[3], settings.filamentoCustoKg || 99);
    const unidades = Math.max(1, toNum(row[4], 1));
    const markup = toNum(row[5], 2.5) || 2.5;
    const canalRaw = toStr(row[6]).toLowerCase().replace(/[^a-z]/g, '');
    const canal = CANAIS_VALIDOS.includes(canalRaw) ? canalRaw : 'manual';
    const falhas = toNum(row[7], settings.falhas);
    const imposto = toNum(row[8], settings.imposto);
    const txCartao = toNum(row[9], settings.txCartao);
    const precoRaw = toNum(row[10], 0);
    const precoOverride = precoRaw > 0 ? precoRaw : null;
    const observacoes = toStr(row[11]);

    if (!nome) errors.push('Nome obrigatório');
    if (tempoH <= 0) errors.push('Tempo deve ser > 0');
    if (pesoG <= 0) errors.push('Peso deve ser > 0');
    if (markup < 1) errors.push('Markup deve ser ≥ 1');

    rows.push({
      rowIndex: i + 1,
      nome, tempoH, pesoG, custoKg, unidades, markup, canal,
      falhas, imposto, txCartao, precoOverride, observacoes,
      errors,
    });
  }

  return {
    rows,
    validCount: rows.filter((r) => r.errors.length === 0).length,
    errorCount: rows.filter((r) => r.errors.length > 0).length,
  };
}

/** Converte uma ImportRow num Product pronto para addProduct() */
export function importRowToProduct(row: ImportRow, settings: AppSettings): Product {
  const filamento: FilamentoUsado = {
    id: 1,
    nome: 'Filamento',
    peso: row.pesoG,
    custoKg: row.custoKg,
  };

  const form: ProductForm = {
    nome: row.nome,
    tempo: String(row.tempoH),
    unidades: String(row.unidades),
    potenciaW: String(settings.potenciaW),
    custoKwh: String(settings.custoKwh),
    custoFixoMes: String(settings.custoFixoMes),
    horasDisponiveisMes: String(settings.horasDisponiveisMes || 600),
    amortizacaoValor: String(settings.amortizacaoValor),
    amortizacaoHoras: String(settings.amortizacaoHoras),
    markup: String(row.markup),
    falhas: String(row.falhas),
    imposto: String(row.imposto),
    txCartao: String(row.txCartao),
    custoAnuncio: '0',
    maoObraHoras: '0',
    maoObraTaxa: String((settings as { maoObraTaxa?: number }).maoObraTaxa || 0),
    unidadesMes: String(settings.unidadesMes || 10),
    canalVenda: '',
  };

  const calc = calcProductFromForm(form, settings, [filamento], []);

  // Se o usuário informou um preço override, recalcula markup implícito
  let precoConsumidor = calc.precoConsumidor;
  let markupFinal = row.markup;
  if (row.precoOverride && row.precoOverride > 0) {
    precoConsumidor = row.precoOverride;
    markupFinal = calc.custoUn > 0 ? +(row.precoOverride / calc.custoUn).toFixed(2) : row.markup;
  }

  const precoLojista = +(precoConsumidor / 2).toFixed(2);
  const descontos = (row.imposto + row.txCartao) / 100;
  const lucroLiquidoConsumidor = +((precoConsumidor - calc.custoUn) - precoConsumidor * descontos).toFixed(2);
  const lucroLiquidoLojista    = +((precoLojista - calc.custoUn) - precoLojista * descontos).toFixed(2);

  return {
    id: Date.now() + Math.floor(Math.random() * 10000),
    nome: row.nome,
    tempo: row.tempoH,
    peso: row.pesoG,
    unidades: row.unidades,
    filamentos: [filamento],
    filamentoCustoKg: row.custoKg,
    custoFilamento: calc.custoFilamento,
    potenciaW: settings.potenciaW,
    custoKwh: settings.custoKwh,
    custoEnergia: calc.custoEnergia,
    amortizacao: calc.amortizacao,
    custoFixoMes: settings.custoFixoMes,
    unidadesMes: settings.unidadesMes,
    acessorios: [],
    markup: markupFinal,
    falhas: row.falhas,
    imposto: row.imposto,
    txCartao: row.txCartao,
    custoAnuncio: 0,
    canalVenda: row.canal,
    maoObraHoras: 0,
    maoObraTaxa: 0,
    freteMode: 'none',
    freteValor: 0,
    custoFrete: 0,
    custoTotal: calc.custoTotal,
    custoUn: calc.custoUn,
    precoConsumidor,
    precoLojista,
    lucroLiquidoConsumidor,
    lucroLiquidoLojista,
    estoque: 0,
    totalVendido: 0,
    unidadesProduzidas: 0,
    unidadesPerdidas: 0,
    movimentosEstoque: [],
    historicoPrecos: [],
    custoFixoRateado: calc.custoFixoRateado,
  } as Product;
}

/** Gera e faz download do arquivo template .xlsx */
export function baixarTemplate(): void {
  const headers = [
    'Nome*',
    'Tempo_h*',
    'Peso_g*',
    'Custo_filamento_R$_por_kg',
    'Unidades_por_lote',
    'Markup',
    'Canal',
    'Falhas_%',
    'Imposto_%',
    'Taxa_cartao_%',
    'Preco_consumidor_override',
    'Observacoes',
  ];

  const exemplo1 = [
    'Suporte para celular',
    1.5,
    45,
    89,
    1,
    2.5,
    'manual',
    5,
    0,
    0,
    '',
    'PLA Branco',
  ];

  const exemplo2 = [
    'Porta caneta',
    2.0,
    80,
    99,
    2,
    3.0,
    'mercadolivre',
    10,
    8,
    5,
    35.90,
    'PETG Preto - 2 unidades por lote',
  ];

  const instrucoes = [
    ['--- INSTRUÇÕES ---'],
    ['* = campo obrigatório'],
    ['Canal: manual | mercadolivre | shopee | instagram | etsy | site'],
    ['Preco_consumidor_override: deixe em branco para calcular automaticamente'],
    ['Markup: multiplicador do custo (ex: 2.5 = preço final é 2.5x o custo)'],
  ];

  const wb = XLSX.utils.book_new();

  // Aba Produtos
  const wsProdutos = XLSX.utils.aoa_to_sheet([headers, exemplo1, exemplo2]);

  // Largura das colunas
  wsProdutos['!cols'] = [
    { wch: 28 }, { wch: 10 }, { wch: 10 }, { wch: 22 },
    { wch: 18 }, { wch: 8 }, { wch: 14 }, { wch: 10 },
    { wch: 10 }, { wch: 14 }, { wch: 24 }, { wch: 30 },
  ];

  XLSX.utils.book_append_sheet(wb, wsProdutos, 'Produtos');

  // Aba Instruções
  const wsInfo = XLSX.utils.aoa_to_sheet(instrucoes);
  wsInfo['!cols'] = [{ wch: 60 }];
  XLSX.utils.book_append_sheet(wb, wsInfo, 'Instrucoes');

  XLSX.writeFile(wb, 'gestao3d_template_importacao.xlsx');
}

import * as XLSX from 'xlsx';
import type { Product } from '@/types';

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtMoeda(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtMes(ym: string) {
  const [y, m] = ym.split('-');
  const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  return `${meses[parseInt(m) - 1]}/${y.slice(2)}`;
}

function autoWidth(ws: XLSX.WorkSheet) {
  const range = XLSX.utils.decode_range(ws['!ref'] ?? 'A1');
  const cols: { wch: number }[] = [];
  for (let C = range.s.c; C <= range.e.c; C++) {
    let max = 10;
    for (let R = range.s.r; R <= range.e.r; R++) {
      const cell = ws[XLSX.utils.encode_cell({ r: R, c: C })];
      if (cell?.v != null) {
        const len = String(cell.v).length;
        if (len > max) max = len;
      }
    }
    cols.push({ wch: Math.min(max + 2, 50) });
  }
  ws['!cols'] = cols;
}

// ── Aba 1: Catálogo de Produtos ───────────────────────────────────────────────
function sheetProdutos(products: Product[]): XLSX.WorkSheet {
  const header = [
    'Nome', 'Tempo (h)', 'Peso (g)', 'Unid./Lote',
    'Custo Un (R$)', 'Preço C. (R$)', 'Lucro Líq. C. (R$)',
    'Markup (x)', 'Margem (%)', 'Estoque Atual',
  ];

  const rows = products.map((p) => {
    const margem = p.precoConsumidor > 0
      ? +((p.lucroLiquidoConsumidor / p.precoConsumidor) * 100).toFixed(1)
      : 0;
    return [
      p.nome,
      p.tempo,
      p.peso,
      p.unidades,
      +p.custoUn.toFixed(2),
      +p.precoConsumidor.toFixed(2),
      +p.lucroLiquidoConsumidor.toFixed(2),
      +p.markup.toFixed(2),
      margem,
      p.estoque ?? 0,
    ];
  });

  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
  autoWidth(ws);
  return ws;
}

// ── Aba 2: Movimentações de Estoque ──────────────────────────────────────────
function sheetMovimentacoes(products: Product[]): XLSX.WorkSheet {
  const header = ['Produto', 'Data', 'Tipo', 'Qtd', 'Motivo'];

  const tipoLabel: Record<string, string> = {
    producao: 'Produção',
    venda:    'Venda',
    falha:    'Falha',
    ajuste:   'Ajuste',
  };

  const rows: (string | number)[][] = [];
  for (const p of products) {
    const movs = [...(p.movimentosEstoque ?? [])].sort(
      (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()
    );
    for (const m of movs) {
      rows.push([
        p.nome,
        new Date(m.data).toLocaleString('pt-BR'),
        tipoLabel[m.tipo] ?? m.tipo,
        m.quantidade,
        m.motivo ?? '',
      ]);
    }
  }

  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
  autoWidth(ws);
  return ws;
}

// ── Aba 3: Faturamento Mensal ─────────────────────────────────────────────────
function sheetFaturamento(products: Product[]): XLSX.WorkSheet {
  const header = ['Mês', 'Unid. Vendidas', 'Faturamento Bruto (R$)', 'Custo Produção (R$)', 'Lucro Bruto (R$)'];

  const map: Record<string, { unidades: number; faturamento: number; custo: number }> = {};

  for (const p of products) {
    for (const m of p.movimentosEstoque ?? []) {
      if (m.tipo !== 'venda' && m.tipo !== 'producao') continue;
      const mes = m.data.slice(0, 7);
      if (!map[mes]) map[mes] = { unidades: 0, faturamento: 0, custo: 0 };
      if (m.tipo === 'venda') {
        map[mes].unidades    += m.quantidade;
        map[mes].faturamento += m.quantidade * p.precoConsumidor;
      } else {
        map[mes].custo += m.quantidade * p.custoUn;
      }
    }
  }

  const rows = Object.keys(map).sort().map((ym) => {
    const d = map[ym];
    const lucro = d.faturamento - d.custo;
    return [
      fmtMes(ym),
      d.unidades,
      +d.faturamento.toFixed(2),
      +d.custo.toFixed(2),
      +lucro.toFixed(2),
    ];
  });

  // Totais
  if (rows.length > 0) {
    const totFat  = rows.reduce((s, r) => s + (r[2] as number), 0);
    const totCust = rows.reduce((s, r) => s + (r[3] as number), 0);
    const totLuc  = rows.reduce((s, r) => s + (r[4] as number), 0);
    rows.push(['TOTAL', rows.reduce((s, r) => s + (r[1] as number), 0), +totFat.toFixed(2), +totCust.toFixed(2), +totLuc.toFixed(2)]);
  }

  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
  autoWidth(ws);
  return ws;
}

// ── Exportação principal ──────────────────────────────────────────────────────
export function exportarExcel(products: Product[]): void {
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(wb, sheetProdutos(products),       'Catálogo');
  XLSX.utils.book_append_sheet(wb, sheetMovimentacoes(products),  'Movimentações');
  XLSX.utils.book_append_sheet(wb, sheetFaturamento(products),    'Faturamento');

  const hoje = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `gestao3d_${hoje}.xlsx`);
}

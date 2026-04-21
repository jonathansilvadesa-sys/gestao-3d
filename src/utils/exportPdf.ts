/**
 * Exportação de relatório PDF com jsPDF + jspdf-autotable.
 */
import type { Product } from '@/types';

export async function exportarRelatorioPDF(products: Product[]): Promise<void> {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  const fmtBRL = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const now = new Date().toLocaleString('pt-BR');
  const totalLucro = products.reduce((a, p) => a + p.lucroLiquidoConsumidor, 0);
  const totalCusto = products.reduce((a, p) => a + p.custoTotal, 0);
  const capitalImob = products.reduce((a, p) => a + (p.estoque ?? 0) * p.custoUn, 0);
  const potVenda    = products.reduce((a, p) => a + (p.estoque ?? 0) * p.precoConsumidor, 0);

  // ── Cabeçalho ────────────────────────────────────────────────────────────
  doc.setFillColor(79, 70, 229);
  doc.rect(0, 0, 297, 22, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('GESTÃO 3D — Relatório de Produtos', 14, 14);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Gerado em: ${now}`, 297 - 14, 14, { align: 'right' });

  // ── KPIs ─────────────────────────────────────────────────────────────────
  doc.setTextColor(55, 65, 81);
  const kpis = [
    ['Total de peças', String(products.length)],
    ['Custo total do catálogo', fmtBRL(totalCusto)],
    ['Lucro total estimado', fmtBRL(totalLucro)],
    ['Markup médio', products.length
      ? `${(products.reduce((a, p) => a + p.markup, 0) / products.length).toFixed(1)}x`
      : '—'],
  ];
  const kpiX = [14, 90, 175, 240];
  kpis.forEach(([label, value], i) => {
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(107, 114, 128);
    doc.text(label.toUpperCase(), kpiX[i], 31);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(17, 24, 39);
    doc.text(value, kpiX[i], 38);
  });

  // ── Tabela principal ──────────────────────────────────────────────────────
  const head = [['Peça', 'Tempo', 'Peso', 'Markup', 'Custo Un.', 'Preço Final', 'Preço Lojista', 'Lucro Líq.', 'Margem', 'Estoque']];

  const body = products.map((p) => {
    const mg = p.precoConsumidor > 0
      ? ((p.lucroLiquidoConsumidor / p.precoConsumidor) * 100).toFixed(1) + '%'
      : '—';
    return [
      p.nome,
      `${p.tempo}h`,
      `${p.peso}g`,
      `${p.markup}x`,
      fmtBRL(p.custoUn),
      fmtBRL(p.precoConsumidor),
      fmtBRL(p.precoLojista),
      fmtBRL(p.lucroLiquidoConsumidor),
      mg,
      String(p.estoque ?? 0),
    ];
  });

  autoTable(doc, {
    head,
    body,
    startY: 44,
    styles: { fontSize: 8, cellPadding: 3, font: 'helvetica' },
    headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold', halign: 'center' },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 40 },
      4: { halign: 'right' },
      5: { halign: 'right', textColor: [79, 70, 229] },
      6: { halign: 'right', textColor: [109, 40, 217] },
      7: { halign: 'right', textColor: [16, 185, 129] },
      8: { halign: 'center' },
      9: { halign: 'center' },
    },
    didDrawPage: (data) => {
      const pageCount = (doc as unknown as { internal: { getNumberOfPages: () => number } })
        .internal.getNumberOfPages();
      doc.setFontSize(7);
      doc.setTextColor(156, 163, 175);
      doc.text(
        `Página ${data.pageNumber} de ${pageCount}  •  Gestão 3D`,
        297 / 2, 205, { align: 'center' }
      );
    },
  });

  // ── Resumo financeiro ─────────────────────────────────────────────────────
  const finalY1 = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
  if (finalY1 < 185) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(55, 65, 81);
    doc.text('RESUMO FINANCEIRO', 14, finalY1);

    autoTable(doc, {
      body: [
        ['Custo total do catálogo', fmtBRL(totalCusto)],
        ['Lucro total estimado (consumidor)', fmtBRL(totalLucro)],
        ['Margem geral', totalCusto + totalLucro > 0
          ? ((totalLucro / (totalCusto + totalLucro)) * 100).toFixed(1) + '%'
          : '—'],
      ],
      startY: finalY1 + 3,
      theme: 'plain',
      styles: { fontSize: 9, cellPadding: 2 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 90 }, 1: { halign: 'right' } },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PÁGINA 2 — Análise de Rentabilidade
  // ═══════════════════════════════════════════════════════════════════════════
  doc.addPage();

  // Cabeçalho página 2
  doc.setFillColor(109, 40, 217); // purple-700
  doc.rect(0, 0, 297, 22, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('GESTÃO 3D — Análise de Rentabilidade', 14, 14);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Gerado em: ${now}`, 297 - 14, 14, { align: 'right' });

  // KPIs da página 2
  const kpis2 = [
    ['Capital Imobilizado', fmtBRL(capitalImob)],
    ['Potencial de Venda', fmtBRL(potVenda)],
    ['Retorno sobre Estoque', capitalImob > 0
      ? ((potVenda / capitalImob - 1) * 100).toFixed(0) + '%'
      : '—'],
    ['Total em Estoque',
      String(products.reduce((a, p) => a + (p.estoque ?? 0), 0)) + ' un.'],
  ];
  kpis2.forEach(([label, value], i) => {
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(107, 114, 128);
    doc.text(label.toUpperCase(), kpiX[i], 31);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(17, 24, 39);
    doc.text(value, kpiX[i], 38);
  });

  // Tabela de rentabilidade por produto
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(55, 65, 81);
  doc.text('DETALHAMENTO POR PRODUTO', 14, 48);

  const headRent = [[
    'Peça',
    'Custo Un.',
    'Custo Fixo\nRateado',
    'Estoque',
    'Capital\nImobilizado',
    'Potencial\nde Venda',
    'Break-even\n(un.)',
    'Faltam\n(un.)',
    'Status',
  ]];

  const bodyRent = products.map((p) => {
    const estoque  = p.estoque ?? 0;
    const capital  = +(p.custoUn * Math.max(estoque, p.unidades)).toFixed(2);
    const lucroUn  = p.lucroLiquidoConsumidor;
    const bkEven   = lucroUn > 0 ? Math.ceil(capital / lucroUn) : null;
    const faltam   = bkEven !== null ? Math.max(0, bkEven - estoque) : null;
    const custoFxRat = p.custoFixoRateado ?? (p.custoFixoMes > 0
      ? +(p.custoFixoMes / Math.max(p.unidadesMes ?? 1, 1)).toFixed(2)
      : 0);

    let status = '—';
    if (bkEven !== null) {
      status = estoque >= bkEven ? '✓ Atingido' : `${faltam} vendas`;
    }
    if (lucroUn <= 0) status = '⚠ Prejuízo';

    return [
      p.nome,
      fmtBRL(p.custoUn),
      fmtBRL(custoFxRat),
      String(estoque),
      fmtBRL(estoque * p.custoUn),
      fmtBRL(estoque * p.precoConsumidor),
      bkEven !== null ? String(bkEven) : '—',
      faltam !== null ? (faltam === 0 ? '—' : String(faltam)) : '—',
      status,
    ];
  });

  autoTable(doc, {
    head: headRent,
    body: bodyRent,
    startY: 52,
    styles: { fontSize: 7.5, cellPadding: 3, font: 'helvetica', valign: 'middle' },
    headStyles: {
      fillColor: [109, 40, 217],
      textColor: 255,
      fontStyle: 'bold',
      halign: 'center',
      minCellHeight: 12,
    },
    alternateRowStyles: { fillColor: [250, 245, 255] },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 42 },
      1: { halign: 'right' },
      2: { halign: 'right', textColor: [107, 114, 128] },
      3: { halign: 'center' },
      4: { halign: 'right', textColor: [109, 40, 217] },
      5: { halign: 'right', textColor: [16, 185, 129] },
      6: { halign: 'center', textColor: [217, 119, 6] },
      7: { halign: 'center' },
      8: { halign: 'center', fontStyle: 'bold' },
    },
    didDrawCell: (data) => {
      // Colorir coluna Status
      if (data.section === 'body' && data.column.index === 8) {
        const val = String(data.cell.text[0] ?? '');
        if (val.startsWith('✓')) {
          data.cell.styles.textColor = [16, 185, 129];
        } else if (val.startsWith('⚠')) {
          data.cell.styles.textColor = [239, 68, 68];
        } else if (val !== '—') {
          data.cell.styles.textColor = [217, 119, 6];
        }
      }
    },
    didDrawPage: (data) => {
      const pageCount = (doc as unknown as { internal: { getNumberOfPages: () => number } })
        .internal.getNumberOfPages();
      doc.setFontSize(7);
      doc.setTextColor(156, 163, 175);
      doc.text(
        `Página ${data.pageNumber} de ${pageCount}  •  Gestão 3D`,
        297 / 2, 205, { align: 'center' }
      );
    },
  });

  // Resumo de estoque p2
  const finalY2 = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
  if (finalY2 < 185) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(55, 65, 81);
    doc.text('RESUMO DE ESTOQUE', 14, finalY2);

    const comBkEven = products.filter((p) => {
      const estoque = p.estoque ?? 0;
      const capital = p.custoUn * Math.max(estoque, p.unidades);
      const lu = p.lucroLiquidoConsumidor;
      if (lu <= 0) return false;
      const bk = Math.ceil(capital / lu);
      return estoque < bk;
    });

    autoTable(doc, {
      body: [
        ['Capital total imobilizado em estoque', fmtBRL(capitalImob)],
        ['Potencial de venda total do estoque', fmtBRL(potVenda)],
        ['Margem bruta implícita do estoque', capitalImob > 0
          ? ((potVenda / capitalImob - 1) * 100).toFixed(1) + '%'
          : '—'],
        ['Produtos com break-even não atingido',
          `${comBkEven.length} de ${products.length}`],
      ],
      startY: finalY2 + 3,
      theme: 'plain',
      styles: { fontSize: 9, cellPadding: 2 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 100 }, 1: { halign: 'right' } },
    });
  }

  doc.save(`gestao3d-relatorio-${Date.now()}.pdf`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// RELATÓRIO DE VENDAS MENSAIS
// ═══════════════════════════════════════════════════════════════════════════════
export async function exportarRelatorioVendasMensais(products: Product[]): Promise<void> {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const fmtBRL = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const fmtMes = (ym: string) => {
    const [y, m] = ym.split('-');
    const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                   'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    return `${meses[parseInt(m) - 1]} ${y}`;
  };

  const now = new Date().toLocaleString('pt-BR');

  // ── Agrupa movimentos por mês ─────────────────────────────────────────────
  type MovMes = {
    faturamento: number;
    unidades: number;
    porPeca: Record<number, { nome: string; unidades: number; faturamento: number }>;
  };
  const porMes: Record<string, MovMes> = {};

  for (const p of products) {
    for (const m of p.movimentosEstoque ?? []) {
      if (m.tipo !== 'venda') continue;
      const mes = m.data.slice(0, 7);
      if (!porMes[mes]) porMes[mes] = { faturamento: 0, unidades: 0, porPeca: {} };
      porMes[mes].faturamento += m.quantidade * p.precoConsumidor;
      porMes[mes].unidades    += m.quantidade;
      if (!porMes[mes].porPeca[p.id])
        porMes[mes].porPeca[p.id] = { nome: p.nome, unidades: 0, faturamento: 0 };
      porMes[mes].porPeca[p.id].unidades    += m.quantidade;
      porMes[mes].porPeca[p.id].faturamento += m.quantidade * p.precoConsumidor;
    }
  }

  const mesesOrdenados = Object.keys(porMes).sort();

  if (mesesOrdenados.length === 0) {
    // Sem dados — gera PDF simples de aviso
    doc.setFontSize(14);
    doc.text('Nenhuma venda registrada ainda.', 14, 30);
    doc.setFontSize(10);
    doc.text('Registre vendas na aba Estoque para visualizar o relatório mensal.', 14, 40);
    doc.save(`gestao3d-vendas-${Date.now()}.pdf`);
    return;
  }

  const totalGeral     = mesesOrdenados.reduce((s, m) => s + porMes[m].faturamento, 0);
  const totalUnidades  = mesesOrdenados.reduce((s, m) => s + porMes[m].unidades, 0);
  const mediaMensal    = totalGeral / mesesOrdenados.length;

  // ── Cabeçalho ─────────────────────────────────────────────────────────────
  doc.setFillColor(16, 185, 129);  // emerald-500
  doc.rect(0, 0, 210, 22, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('GESTÃO 3D — Relatório de Vendas Mensais', 14, 14);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Gerado em: ${now}`, 196, 14, { align: 'right' });

  // ── KPIs gerais ───────────────────────────────────────────────────────────
  const kpiX = [14, 72, 130, 163];
  const kpis = [
    ['Meses registrados', String(mesesOrdenados.length)],
    ['Faturamento total', fmtBRL(totalGeral)],
    ['Média mensal', fmtBRL(mediaMensal)],
    ['Total de unidades', String(totalUnidades)],
  ];
  kpis.forEach(([label, value], i) => {
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(107, 114, 128);
    doc.text(label.toUpperCase(), kpiX[i], 31);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(17, 24, 39);
    doc.text(value, kpiX[i], 38);
  });

  // ── Tabela resumo por mês ─────────────────────────────────────────────────
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(55, 65, 81);
  doc.text('RESUMO POR MÊS', 14, 48);

  const bodyMes = mesesOrdenados.map((m, idx) => {
    const d = porMes[m];
    const anterior = idx > 0 ? porMes[mesesOrdenados[idx - 1]].faturamento : null;
    const variacao = anterior !== null && anterior > 0
      ? ((d.faturamento / anterior - 1) * 100).toFixed(1) + '%'
      : '—';
    return [
      fmtMes(m),
      String(d.unidades),
      fmtBRL(d.faturamento),
      fmtBRL(d.faturamento / Math.max(d.unidades, 1)),
      variacao,
    ];
  });

  autoTable(doc, {
    head: [['Mês', 'Unidades', 'Faturamento', 'Ticket Médio', 'Variação']],
    body: bodyMes,
    startY: 52,
    styles: { fontSize: 9, cellPadding: 3, font: 'helvetica' },
    headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold', halign: 'center' },
    alternateRowStyles: { fillColor: [236, 253, 245] },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 40 },
      1: { halign: 'center' },
      2: { halign: 'right', textColor: [16, 185, 129] },
      3: { halign: 'right' },
      4: { halign: 'center' },
    },
    didDrawCell: (data) => {
      if (data.section === 'body' && data.column.index === 4) {
        const val = String(data.cell.text[0] ?? '');
        if (val.startsWith('+') || (!val.startsWith('-') && val !== '—' && parseFloat(val) > 0)) {
          data.cell.styles.textColor = [16, 185, 129];
        } else if (val.startsWith('-')) {
          data.cell.styles.textColor = [239, 68, 68];
        }
      }
    },
    didDrawPage: (data) => {
      const pageCount = (doc as unknown as { internal: { getNumberOfPages: () => number } })
        .internal.getNumberOfPages();
      doc.setFontSize(7);
      doc.setTextColor(156, 163, 175);
      doc.text(`Página ${data.pageNumber} de ${pageCount}  •  Gestão 3D`, 105, 290, { align: 'center' });
    },
  });

  // ── Totalizador ────────────────────────────────────────────────────────────
  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;
  autoTable(doc, {
    body: [
      ['TOTAL GERAL', String(totalUnidades), fmtBRL(totalGeral), fmtBRL(totalGeral / Math.max(totalUnidades, 1)), ''],
    ],
    startY: finalY,
    theme: 'plain',
    styles: { fontSize: 9, fontStyle: 'bold', cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 40, textColor: [17, 24, 39] },
      1: { halign: 'center' },
      2: { halign: 'right', textColor: [16, 185, 129] },
      3: { halign: 'right' },
      4: { cellWidth: 20 },
    },
  });

  // ── PÁGINA 2: Detalhamento por peça por mês ───────────────────────────────
  doc.addPage();

  doc.setFillColor(99, 102, 241);  // indigo-500
  doc.rect(0, 0, 210, 22, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('GESTÃO 3D — Vendas por Peça / Mês', 14, 14);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Gerado em: ${now}`, 196, 14, { align: 'right' });

  // Tabela cruzada: linhas = peças, colunas = meses (até 6 últimos)
  const ultimos6 = mesesOrdenados.slice(-6);

  // Todas as peças que tiveram vendas
  const pecasComVenda = new Map<number, string>();
  for (const mes of ultimos6) {
    for (const [id, info] of Object.entries(porMes[mes].porPeca)) {
      pecasComVenda.set(Number(id), info.nome);
    }
  }

  const headCruzada = ['Peça', ...ultimos6.map(fmtMes), 'Total'];
  const bodyCruzada = [...pecasComVenda.entries()].map(([id, nome]) => {
    const row: (string | number)[] = [nome];
    let total = 0;
    for (const mes of ultimos6) {
      const v = porMes[mes]?.porPeca[id]?.faturamento ?? 0;
      total += v;
      row.push(v > 0 ? fmtBRL(v) : '—');
    }
    row.push(fmtBRL(total));
    return row;
  }).sort((a, b) => {
    const ta = parseFloat(String(a[a.length - 1]).replace(/[^0-9,]/g, '').replace(',', '.')) || 0;
    const tb = parseFloat(String(b[b.length - 1]).replace(/[^0-9,]/g, '').replace(',', '.')) || 0;
    return tb - ta;
  });

  // Linha de totais por mês
  const totalPorMes = ultimos6.map((m) => fmtBRL(porMes[m]?.faturamento ?? 0));
  const totalGeralStr = fmtBRL(ultimos6.reduce((s, m) => s + (porMes[m]?.faturamento ?? 0), 0));
  bodyCruzada.push(['TOTAL', ...totalPorMes, totalGeralStr]);

  autoTable(doc, {
    head: [headCruzada],
    body: bodyCruzada as string[][],
    startY: 28,
    styles: { fontSize: 7.5, cellPadding: 2.5, font: 'helvetica', valign: 'middle' },
    headStyles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: 'bold', halign: 'center', fontSize: 7 },
    alternateRowStyles: { fillColor: [238, 242, 255] },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 38 },
      [headCruzada.length - 1]: { fontStyle: 'bold', halign: 'right', textColor: [99, 102, 241] },
    },
    didDrawPage: (data) => {
      const pageCount = (doc as unknown as { internal: { getNumberOfPages: () => number } })
        .internal.getNumberOfPages();
      doc.setFontSize(7);
      doc.setTextColor(156, 163, 175);
      doc.text(`Página ${data.pageNumber} de ${pageCount}  •  Gestão 3D`, 105, 290, { align: 'center' });
    },
  });

  doc.save(`gestao3d-vendas-mensais-${Date.now()}.pdf`);
}

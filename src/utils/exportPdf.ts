/**
 * Exportação de relatório PDF com jsPDF + jspdf-autotable.
 *
 * Instalar: npm install jspdf jspdf-autotable
 */
import type { Product } from '@/types';

export async function exportarRelatorioPDF(products: Product[]): Promise<void> {
  // Import dinâmico para não aumentar o bundle principal
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  const fmtBRL = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const now = new Date().toLocaleString('pt-BR');
  const totalLucro = products.reduce((a, p) => a + p.lucroLiquidoConsumidor, 0);
  const totalCusto = products.reduce((a, p) => a + p.custoTotal, 0);

  // ── Cabeçalho ────────────────────────────────────────────────────────────
  doc.setFillColor(79, 70, 229); // indigo-600
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
    const margem = p.precoConsumidor > 0
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
      margem,
      String(p.estoque ?? 0),
    ];
  });

  autoTable(doc, {
    head,
    body,
    startY: 44,
    styles: { fontSize: 8, cellPadding: 3, font: 'helvetica' },
    headStyles: {
      fillColor: [79, 70, 229],
      textColor: 255,
      fontStyle: 'bold',
      halign: 'center',
    },
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
      // Rodapé em cada página
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
  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
  if (finalY < 185) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(55, 65, 81);
    doc.text('RESUMO FINANCEIRO', 14, finalY);

    autoTable(doc, {
      body: [
        ['Custo total do catálogo', fmtBRL(totalCusto)],
        ['Lucro total estimado (consumidor)', fmtBRL(totalLucro)],
        ['Margem geral', totalCusto + totalLucro > 0
          ? ((totalLucro / (totalCusto + totalLucro)) * 100).toFixed(1) + '%'
          : '—'],
      ],
      startY: finalY + 3,
      theme: 'plain',
      styles: { fontSize: 9, cellPadding: 2 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 90 },
        1: { halign: 'right' },
      },
    });
  }

  doc.save(`gestao3d-relatorio-${Date.now()}.pdf`);
}

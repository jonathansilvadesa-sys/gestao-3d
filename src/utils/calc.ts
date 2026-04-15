import type { AppSettings, CalcResult, ProductForm } from '@/types';

// ─── Cálculo do Break-even ───────────────────────────────────────────────────
/**
 * Markup mínimo para cobrir todos os descontos sem prejuízo.
 * Derivado de: lucro = (preço - custo) - preço × descontos = 0
 * → markup = 1 / (1 - totalDescontos)
 */
export function calcBreakEvenMarkup(
  imposto: number,
  txCartao: number,
  custoAnuncio: number
): number {
  const totalDescontos = (imposto + txCartao + custoAnuncio) / 100;
  if (totalDescontos >= 1) return 999;
  return +(1 / (1 - totalDescontos)).toFixed(2);
}

// ─── Cálculo de custos de produção ──────────────────────────────────────────
/**
 * Custo real de energia elétrica:
 * Custo = (Potência(W) × Horas) / 1000 × Preço(kWh)
 */
export function calcCustoEnergia(
  potenciaW: number,
  horas: number,
  custoKwh: number
): number {
  return +((potenciaW * horas) / 1000 * custoKwh).toFixed(2);
}

/**
 * Amortização da impressora por impressão:
 * Amortização = (Horas / Vida útil em horas) × Valor da máquina
 */
export function calcAmortizacao(
  horas: number,
  vidaUtilHoras: number,
  valorMaquina: number
): number {
  return +((horas / vidaUtilHoras) * valorMaquina).toFixed(2);
}

/**
 * Custo unitário com margem de contingência (taxa de falhas):
 * custoUn = custoBase × (1 + falhas / 100)
 */
export function calcCustoUn(
  custoBase: number,
  falhas: number
): number {
  return +(custoBase * (1 + falhas / 100)).toFixed(2);
}

// ─── Recalcula preços ao alterar markup ──────────────────────────────────────
export function recalcFromMarkup(
  custoUn: number,
  markup: number,
  imposto: number,
  txCartao: number,
  custoAnuncio: number
): Pick<CalcResult, 'precoConsumidor' | 'precoLojista' | 'lucroLiquidoConsumidor' | 'lucroLiquidoLojista' | 'breakEvenMarkup' | 'margemConsumidor' | 'margemLojista'> {
  const precoConsumidor = +(custoUn * markup).toFixed(2);
  const precoLojista = +(precoConsumidor / 2).toFixed(2);

  const descontosC = (imposto + txCartao + custoAnuncio) / 100;
  const lucroLiquidoConsumidor = +((precoConsumidor - custoUn) - precoConsumidor * descontosC).toFixed(2);

  const descontosL = (imposto + txCartao) / 100;
  const lucroLiquidoLojista = +((precoLojista - custoUn) - precoLojista * descontosL).toFixed(2);

  const breakEvenMarkup = calcBreakEvenMarkup(imposto, txCartao, custoAnuncio);

  const margemConsumidor = precoConsumidor > 0
    ? +((lucroLiquidoConsumidor / precoConsumidor) * 100).toFixed(1)
    : 0;
  const margemLojista = precoLojista > 0
    ? +((lucroLiquidoLojista / precoLojista) * 100).toFixed(1)
    : 0;

  return {
    precoConsumidor,
    precoLojista,
    lucroLiquidoConsumidor,
    lucroLiquidoLojista,
    breakEvenMarkup,
    margemConsumidor,
    margemLojista,
  };
}

// ─── Cálculo completo de uma peça a partir do formulário ────────────────────
export function calcProductFromForm(
  f: ProductForm,
  settings: AppSettings
): CalcResult {
  const peso = parseFloat(f.peso) || 0;
  const tempo = parseFloat(f.tempo) || 0;
  const potW = parseFloat(f.potenciaW) || settings.potenciaW;
  const kwh = parseFloat(f.custoKwh) || settings.custoKwh;
  const kgPreco = parseFloat(f.filamentoCustoKg) || settings.filamentoCustoKg;
  const fixoMes = parseFloat(f.custoFixoMes) || settings.custoFixoMes;
  const unidadesMes = parseFloat(f.unidadesMes) || settings.unidadesMes;
  const unidades = parseFloat(f.unidades) || 1;
  const markup = parseFloat(f.markup) || 1;
  const falhas = parseFloat(f.falhas) || settings.falhas;
  const imposto = parseFloat(f.imposto) || settings.imposto;
  const txCartao = parseFloat(f.txCartao) || settings.txCartao;
  const custoAnuncio = parseFloat(f.custoAnuncio) || settings.custoAnuncio;
  const acessQtd = parseFloat(f.acessQtd) || 0;
  const acessCusto = parseFloat(f.acessCusto) || 0;

  const custoFilamento = +((peso / 1000) * kgPreco).toFixed(2);
  const custoEnergia = calcCustoEnergia(potW, tempo, kwh);
  const amortizacao = calcAmortizacao(tempo, settings.amortizacaoHoras, settings.amortizacaoValor);
  const custoFixoRateado = fixoMes / Math.max(unidadesMes, 1);
  const custoAcess = (acessQtd * acessCusto) / Math.max(unidades, 1);

  const custoBase = custoFilamento + custoEnergia + amortizacao + custoFixoRateado + custoAcess;
  const custoUn = calcCustoUn(custoBase, falhas);
  const custoTotal = +(custoUn * unidades).toFixed(2);

  const prices = recalcFromMarkup(custoUn, markup, imposto, txCartao, custoAnuncio);

  return {
    custoFilamento,
    custoEnergia,
    amortizacao,
    custoUn,
    custoTotal,
    ...prices,
  };
}

import type { AppSettings, CalcResult, ProductForm, Accessory } from '@/types';

// ─── Cálculo do Break-even ───────────────────────────────────────────────────
export function calcBreakEvenMarkup(
  imposto: number,
  txCartao: number,
  custoAnuncio: number
): number {
  const totalDescontos = (imposto + txCartao + custoAnuncio) / 100;
  if (totalDescontos >= 1) return 999;
  return +(1 / (1 - totalDescontos)).toFixed(2);
}

// ─── Custo de energia elétrica ───────────────────────────────────────────────
export function calcCustoEnergia(
  potenciaW: number,
  horas: number,
  custoKwh: number
): number {
  return +((potenciaW * horas) / 1000 * custoKwh).toFixed(2);
}

// ─── Amortização da impressora ───────────────────────────────────────────────
export function calcAmortizacao(
  horas: number,
  vidaUtilHoras: number,
  valorMaquina: number
): number {
  return +((horas / vidaUtilHoras) * valorMaquina).toFixed(2);
}

// ─── Custo unitário com taxa de falhas ───────────────────────────────────────
export function calcCustoUn(custoBase: number, falhas: number): number {
  return +(custoBase * (1 + falhas / 100)).toFixed(2);
}

// ─── Custo total dos acessórios por unidade produzida ────────────────────────
export function calcCustoAcessorios(
  acessorios: Pick<Accessory, 'qtd' | 'custoUn'>[],
  unidades: number
): number {
  const total = acessorios.reduce((sum, a) => sum + a.qtd * a.custoUn, 0);
  return +(total / Math.max(unidades, 1)).toFixed(2);
}

// ─── Recalcula preços ao alterar markup ──────────────────────────────────────
export function recalcFromMarkup(
  custoUn: number,
  markup: number,
  imposto: number,
  txCartao: number,
  custoAnuncio: number
): Pick<CalcResult,
  | 'precoConsumidor' | 'precoLojista'
  | 'lucroLiquidoConsumidor' | 'lucroLiquidoLojista'
  | 'breakEvenMarkup' | 'margemConsumidor' | 'margemLojista'
> {
  const precoConsumidor = +(custoUn * markup).toFixed(2);
  const precoLojista    = +(precoConsumidor / 2).toFixed(2);

  const descontosC = (imposto + txCartao + custoAnuncio) / 100;
  const lucroLiquidoConsumidor = +((precoConsumidor - custoUn) - precoConsumidor * descontosC).toFixed(2);

  const descontosL = (imposto + txCartao) / 100;
  const lucroLiquidoLojista = +((precoLojista - custoUn) - precoLojista * descontosL).toFixed(2);

  const breakEvenMarkup  = calcBreakEvenMarkup(imposto, txCartao, custoAnuncio);
  const margemConsumidor = precoConsumidor > 0
    ? +((lucroLiquidoConsumidor / precoConsumidor) * 100).toFixed(1) : 0;
  const margemLojista = precoLojista > 0
    ? +((lucroLiquidoLojista / precoLojista) * 100).toFixed(1) : 0;

  return {
    precoConsumidor, precoLojista,
    lucroLiquidoConsumidor, lucroLiquidoLojista,
    breakEvenMarkup, margemConsumidor, margemLojista,
  };
}

// ─── Cálculo completo de uma peça ───────────────────────────────────────────
/**
 * @param acessorios  Lista dinâmica de acessórios do modal (qtd e custoUn já parseados)
 */
export function calcProductFromForm(
  f: ProductForm,
  settings: AppSettings,
  acessorios: Pick<Accessory, 'qtd' | 'custoUn'>[] = []
): CalcResult {
  const peso         = parseFloat(f.peso)           || 0;
  const tempo        = parseFloat(f.tempo)          || 0;
  const potW         = parseFloat(f.potenciaW)      || settings.potenciaW;
  const kwh          = parseFloat(f.custoKwh)       || settings.custoKwh;
  const kgPreco      = parseFloat(f.filamentoCustoKg) || settings.filamentoCustoKg;
  const fixoMes      = parseFloat(f.custoFixoMes)   || settings.custoFixoMes;
  const unidadesMes  = parseFloat(f.unidadesMes)    || settings.unidadesMes;
  const unidades     = parseFloat(f.unidades)       || 1;
  const markup       = parseFloat(f.markup)         || 1;
  const falhas       = parseFloat(f.falhas)         || settings.falhas;
  const imposto      = parseFloat(f.imposto)        || settings.imposto;
  const txCartao     = parseFloat(f.txCartao)       || settings.txCartao;
  const custoAnuncio = parseFloat(f.custoAnuncio)   || settings.custoAnuncio;

  const custoFilamento  = +((peso / 1000) * kgPreco).toFixed(2);
  const custoEnergia    = calcCustoEnergia(potW, tempo, kwh);
  const amortizacao     = calcAmortizacao(tempo, settings.amortizacaoHoras, settings.amortizacaoValor);
  const custoFixoRateado = fixoMes / Math.max(unidadesMes, 1);
  const custoAcess      = calcCustoAcessorios(acessorios, unidades);

  const custoBase = custoFilamento + custoEnergia + amortizacao + custoFixoRateado + custoAcess;
  const custoUn   = calcCustoUn(custoBase, falhas);
  const custoTotal = +(custoUn * unidades).toFixed(2);

  const prices = recalcFromMarkup(custoUn, markup, imposto, txCartao, custoAnuncio);

  return { custoFilamento, custoEnergia, amortizacao, custoUn, custoTotal, ...prices };
}

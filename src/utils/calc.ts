import type { AppSettings, CalcResult, ProductForm, Accessory, FilamentoUsado } from '@/types';

// ─── Break-even markup ───────────────────────────────────────────────────────
export function calcBreakEvenMarkup(
  imposto: number, txCartao: number, custoAnuncio: number
): number {
  const totalDescontos = (imposto + txCartao + custoAnuncio) / 100;
  if (totalDescontos >= 1) return 999;
  return +(1 / (1 - totalDescontos)).toFixed(2);
}

// ─── Markup a partir de margem alvo ─────────────────────────────────────────
// Dada uma meta de margem (%), calcula o markup necessário.
// Derivação:
//   preço = custo × markup
//   lucroLiq = preço × (1 - descontos) - custo
//   margem  = lucroLiq / preço = (1 - descontos) - 1/markup
//   → markup = 1 / ((1 - descontos) - margemAlvo/100)
export function calcMarkupFromMargem(
  margemAlvo: number,   // % ex: 40
  imposto: number,
  txCartao: number,
  custoAnuncio: number
): number {
  const descontos = (imposto + txCartao + custoAnuncio) / 100;
  const denom = (1 - descontos) - margemAlvo / 100;
  if (denom <= 0) return 999;
  return +Math.max(1, 1 / denom).toFixed(2);
}

// ─── Custo de mão de obra ────────────────────────────────────────────────────
export function calcCustoMaoObra(taxa: number, horas: number): number {
  return +(taxa * horas).toFixed(2);
}

// ─── Energia elétrica ────────────────────────────────────────────────────────
export function calcCustoEnergia(potenciaW: number, horas: number, custoKwh: number): number {
  return +((potenciaW * horas) / 1000 * custoKwh).toFixed(2);
}

// ─── Amortização da impressora ───────────────────────────────────────────────
export function calcAmortizacao(horas: number, vidaUtilHoras: number, valorMaquina: number): number {
  return +((horas / vidaUtilHoras) * valorMaquina).toFixed(2);
}

// ─── Custo unitário com falhas ───────────────────────────────────────────────
export function calcCustoUn(custoBase: number, falhas: number): number {
  return +(custoBase * (1 + falhas / 100)).toFixed(2);
}

// ─── Custo total dos acessórios por unidade ──────────────────────────────────
export function calcCustoAcessorios(
  acessorios: Pick<Accessory, 'qtd' | 'custoUn'>[],
  unidades: number
): number {
  const total = acessorios.reduce((sum, a) => sum + a.qtd * a.custoUn, 0);
  return +(total / Math.max(unidades, 1)).toFixed(2);
}

// ─── Custo de filamentos (soma de todos) ─────────────────────────────────────
export function calcCustoFilamentos(
  filamentos: Pick<FilamentoUsado, 'peso' | 'custoKg'>[]
): number {
  return +filamentos.reduce((sum, fl) => sum + (fl.peso / 1000) * fl.custoKg, 0).toFixed(2);
}

// ─── Recalcula preços ao alterar markup ──────────────────────────────────────
export function recalcFromMarkup(
  custoUn: number, markup: number,
  imposto: number, txCartao: number, custoAnuncio: number
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

// ─── Cálculo completo da peça ────────────────────────────────────────────────
// isFullBatch = true → peso e tempo inseridos são do lote inteiro (mesa cheia Bambu Lab).
// Neste modo, dividimos peso e tempo pelo nº de unidades antes de calcular o custo unitário.
// Acessórios já possuem lógica de diluição (÷ unidades) — permanecem inalterados.
export function calcProductFromForm(
  f: ProductForm,
  settings: AppSettings,
  filamentos: Pick<FilamentoUsado, 'peso' | 'custoKg'>[] = [],
  acessorios: Pick<Accessory, 'qtd' | 'custoUn'>[]       = [],
  isFullBatch = false
): CalcResult {
  const unidades     = parseFloat(f.unidades)     || 1;

  // Modo lote total: divide peso e tempo pelo lote para obter custo unitário de material e energia
  const batchDiv      = isFullBatch && unidades > 1 ? unidades : 1;
  const rawTempo      = parseFloat(f.tempo)        || 0;
  const tempo         = rawTempo / batchDiv;
  const adjFilamentos = batchDiv > 1
    ? filamentos.map((fl) => ({ ...fl, peso: fl.peso / batchDiv }))
    : filamentos;

  const potW         = parseFloat(f.potenciaW)    || settings.potenciaW;
  const kwh          = parseFloat(f.custoKwh)     || settings.custoKwh;
  const fixoMes      = parseFloat(f.custoFixoMes) || settings.custoFixoMes;
  const unidadesMes  = parseFloat(f.unidadesMes)  || settings.unidadesMes;
  const markup       = parseFloat(f.markup)       || 1;
  const falhas       = parseFloat(f.falhas)       || settings.falhas;
  const imposto      = parseFloat(f.imposto)      || settings.imposto;
  const txCartao     = parseFloat(f.txCartao)     || settings.txCartao;
  const custoAnuncio = parseFloat(f.custoAnuncio) || 0;
  const maoObraHoras = parseFloat(f.maoObraHoras) || 0;
  const maoObraTaxa  = parseFloat(f.maoObraTaxa)  || (settings as { maoObraTaxa?: number }).maoObraTaxa || 0;

  const custoFilamento   = calcCustoFilamentos(adjFilamentos);
  const custoEnergia     = calcCustoEnergia(potW, tempo, kwh);
  const amortizacao      = calcAmortizacao(tempo, settings.amortizacaoHoras, settings.amortizacaoValor);
  const custoFixoRateado = fixoMes / Math.max(unidadesMes, 1);
  const custoAcess       = calcCustoAcessorios(acessorios, unidades);
  const custoMaoObra     = calcCustoMaoObra(maoObraTaxa, maoObraHoras);

  const custoBase  = custoFilamento + custoEnergia + amortizacao + custoFixoRateado + custoAcess + custoMaoObra;
  const custoUn    = calcCustoUn(custoBase, falhas);
  const custoTotal = +(custoUn * unidades).toFixed(2);

  const prices = recalcFromMarkup(custoUn, markup, imposto, txCartao, custoAnuncio);

  return { custoFilamento, custoEnergia, amortizacao, custoMaoObra, custoUn, custoTotal, ...prices };
}

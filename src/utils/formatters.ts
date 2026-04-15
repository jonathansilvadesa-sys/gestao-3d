/** Formata valor como moeda brasileira (R$ 1.234,56) */
export const R = (v?: number): string =>
  (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/** Formata percentual com 1 casa decimal */
export const pct = (v?: number): string => `${(v ?? 0).toFixed(1)}%`;

/** Calcula margem líquida em % */
export const margem = (lucro: number, preco: number): string =>
  preco > 0 ? ((lucro / preco) * 100).toFixed(1) : '0.0';

/** Trunca string e adiciona reticências */
export const truncate = (str: string, max: number): string =>
  str.length > max ? str.slice(0, max) + '…' : str;

/** Paleta de cores para os cards de produtos */
export const COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899',
  '#f59e0b', '#10b981', '#3b82f6',
];

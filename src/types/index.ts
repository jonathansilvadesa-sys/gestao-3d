// ─── Acessório / Embalagem ───────────────────────────────────────────────────
export interface Accessory {
  nome: string;
  qtd: number;
  custoUn: number;
}

// ─── Material (rolo de filamento) ─────────────────────────────────────────────
export type FilamentoTipo = 'PLA' | 'PETG' | 'ABS' | 'TPU' | 'ASA' | 'Outro';

export interface Material {
  id: number;
  nome: string;          // Ex: "Polymaker PLA Matte"
  tipo: FilamentoTipo;
  cor: string;           // Ex: "Preto"
  precoPago: number;     // R$ total pago no rolo
  pesoTotal: number;     // gramas totais do rolo (ex: 1000)
  pesoAtual: number;     // gramas restantes
}

/** Custo por grama de um material */
export const custoPorGrama = (m: Material): number =>
  m.pesoTotal > 0 ? m.precoPago / m.pesoTotal : 0;

// ─── Filamento utilizado em uma peça ─────────────────────────────────────────
export interface FilamentoUsado {
  id: number;
  materialId?: number;  // referência a Material cadastrado (opcional)
  nome: string;         // label livre: "Base - PLA Preto", "Detalhes - PETG Azul"…
  peso: number;         // gramas consumidas neste filamento
  custoKg: number;      // R$/kg (preenchido auto pelo material ou manual)
}

/** Custo total de um conjunto de filamentos */
export const calcCustoFilamentos = (filamentos: FilamentoUsado[]): number =>
  +filamentos.reduce((sum, fl) => sum + (fl.peso / 1000) * fl.custoKg, 0).toFixed(2);

// ─── Canal de venda ───────────────────────────────────────────────────────────
export interface CanalVenda {
  id: string;
  nome: string;
  taxaPercent: number;   // % de comissão da plataforma
  cor: string;           // cor para o badge (classes Tailwind sem prefixo)
  emoji: string;
}

export const CANAIS_VENDA: CanalVenda[] = [
  { id: 'manual',       nome: 'Manual / Direto',   taxaPercent: 0,    cor: 'gray',   emoji: '🤝' },
  { id: 'mercadolivre', nome: 'Mercado Livre',      taxaPercent: 14,   cor: 'yellow', emoji: '🛒' },
  { id: 'shopee',       nome: 'Shopee',             taxaPercent: 14,   cor: 'orange', emoji: '🧡' },
  { id: 'instagram',    nome: 'Instagram / WhatsApp',taxaPercent: 0,   cor: 'pink',   emoji: '📸' },
  { id: 'etsy',         nome: 'Etsy',               taxaPercent: 6.5,  cor: 'amber',  emoji: '🌿' },
  { id: 'site',         nome: 'Site próprio',        taxaPercent: 0,    cor: 'blue',   emoji: '🌐' },
];

// ─── Peça (produto 3D) ────────────────────────────────────────────────────────
export interface Product {
  id: number;
  nome: string;
  tempo: number;           // horas
  peso: number;            // soma dos pesos dos filamentos (calculado)
  unidades: number;
  filamentos: FilamentoUsado[];  // lista de filamentos usados
  filamentoCustoKg: number;      // mantido para retrocompatibilidade (filamento principal)
  custoFilamento: number;
  potenciaW: number;
  custoKwh: number;
  custoEnergia: number;
  amortizacao: number;
  custoFixoMes: number;
  unidadesMes: number;
  acessorios: Accessory[];
  markup: number;
  falhas: number;          // %
  imposto: number;         // %
  txCartao: number;        // %
  custoAnuncio: number;    // % (taxa da plataforma)
  canalVenda: string;      // id do CanalVenda
  maoObraHoras: number;    // horas de pós-processamento / acabamento
  maoObraTaxa: number;     // R$/h de mão de obra
  margemAlvo?: number;     // % meta de margem (modo "lucro desejado")
  // calculados
  custoTotal: number;
  custoUn: number;
  precoConsumidor: number;
  precoLojista: number;
  lucroLiquidoConsumidor: number;
  lucroLiquidoLojista: number;
  estoque: number;
}

// ─── Resultado de cálculo de preços ──────────────────────────────────────────
export interface CalcResult {
  custoFilamento: number;
  custoEnergia: number;
  amortizacao: number;
  custoMaoObra: number;
  custoUn: number;
  custoTotal: number;
  precoConsumidor: number;
  precoLojista: number;
  lucroLiquidoConsumidor: number;
  lucroLiquidoLojista: number;
  breakEvenMarkup: number;
  margemConsumidor: number;
  margemLojista: number;
}

// ─── Formulário de nova peça ──────────────────────────────────────────────────
// filamentos são gerenciados como estado local no NovaModal (FilamentoRow[])
export interface ProductForm {
  nome: string;
  tempo: string;
  unidades: string;
  potenciaW: string;
  custoKwh: string;
  custoFixoMes: string;
  unidadesMes: string;
  markup: string;
  falhas: string;
  imposto: string;
  txCartao: string;
  custoAnuncio: string;
  canalVenda: string;
  maoObraHoras: string;
  maoObraTaxa: string;
}

// ─── Configurações globais (SettingsContext) ──────────────────────────────────
export interface AppSettings {
  custoKwh: number;
  imposto: number;
  txCartao: number;
  custoAnuncio: number;
  falhas: number;
  custoFixoMes: number;
  unidadesMes: number;
  potenciaW: number;
  filamentoCustoKg: number;
  amortizacaoHoras: number;
  amortizacaoValor: number;
  maoObraTaxa: number;       // R$/h padrão para mão de obra
}

export interface SettingsContextType {
  settings: AppSettings;
  updateSettings: (partial: Partial<AppSettings>) => void;
}

// ─── ProductContext ───────────────────────────────────────────────────────────
export interface ProductContextType {
  products: Product[];
  addProduct: (p: Product) => void;
  updateProduct: (id: number, updates: Partial<Product>) => void;
  removeProduct: (id: number) => void;
}

// ─── MaterialContext ──────────────────────────────────────────────────────────
export interface MaterialContextType {
  materials: Material[];
  addMaterial: (m: Material) => void;
  updateMaterial: (id: number, updates: Partial<Material>) => void;
  removeMaterial: (id: number) => void;
}

// ─── Usuário e autenticação ───────────────────────────────────────────────────
export type UserRole = 'admin' | 'operator';

export interface User {
  id: number;
  nome: string;
  email: string;
  role: UserRole;
  avatar: string;
}

export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => boolean;
  logout: () => void;
  isAuthenticated: boolean;
}

// ─── Tabs da aplicação ────────────────────────────────────────────────────────
export type AppTab = 'dashboard' | 'produtos' | 'estoque' | 'materiais';

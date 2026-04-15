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

// ─── Peça (produto 3D) ────────────────────────────────────────────────────────
export interface Product {
  id: number;
  nome: string;
  tempo: number;           // horas
  peso: number;            // gramas
  unidades: number;
  materialId?: number;     // referência ao Material (se selecionado)
  filamentoCustoKg: number;
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
  custoAnuncio: number;    // %
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
export interface ProductForm {
  nome: string;
  tempo: string;
  peso: string;
  unidades: string;
  materialId: string;      // '' = manual
  filamentoCustoKg: string;
  potenciaW: string;
  custoKwh: string;
  custoFixoMes: string;
  unidadesMes: string;
  markup: string;
  falhas: string;
  imposto: string;
  txCartao: string;
  custoAnuncio: string;
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

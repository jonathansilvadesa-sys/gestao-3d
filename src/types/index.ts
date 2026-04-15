// ─── Acessório / Embalagem ───────────────────────────────────────────────────
export interface Accessory {
  nome: string;
  qtd: number;
  custoUn: number;
}

// ─── Peça (produto 3D) ────────────────────────────────────────────────────────
export interface Product {
  id: number;
  nome: string;
  tempo: number;         // horas
  peso: number;          // gramas
  unidades: number;      // unidades no lote
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
  falhas: number;        // %
  imposto: number;       // %
  txCartao: number;      // %
  custoAnuncio: number;  // %
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
  breakEvenMarkup: number;   // markup mínimo para não ter prejuízo
  margemConsumidor: number;  // % de margem líquida
  margemLojista: number;
}

// ─── Formulário de nova peça ──────────────────────────────────────────────────
export interface ProductForm {
  nome: string;
  tempo: string;
  peso: string;
  unidades: string;
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
  acessNome: string;
  acessQtd: string;
  acessCusto: string;
}

// ─── Configurações globais (SettingsContext) ──────────────────────────────────
export interface AppSettings {
  custoKwh: number;        // R$/kWh
  imposto: number;         // %
  txCartao: number;        // %
  custoAnuncio: number;    // %
  falhas: number;          // %
  custoFixoMes: number;    // R$/mês
  unidadesMes: number;     // unidades/mês (para rateio)
  potenciaW: number;       // W (potência padrão da impressora)
  filamentoCustoKg: number; // R$/kg (filamento padrão)
  amortizacaoHoras: number; // horas de vida útil da impressora
  amortizacaoValor: number; // valor da impressora (R$)
}

export interface SettingsContextType {
  settings: AppSettings;
  updateSettings: (partial: Partial<AppSettings>) => void;
}

// ─── Usuário e autenticação ───────────────────────────────────────────────────
export type UserRole = 'admin' | 'operator';

export interface User {
  id: number;
  nome: string;
  email: string;
  role: UserRole;
  avatar: string; // inicial para o avatar
}

export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => boolean;
  logout: () => void;
  isAuthenticated: boolean;
}

// ─── Tabs da aplicação ────────────────────────────────────────────────────────
export type AppTab = 'dashboard' | 'produtos' | 'estoque';

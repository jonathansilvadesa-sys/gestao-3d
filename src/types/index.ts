// ─── Acessório / Embalagem (inline na peça) ──────────────────────────────────
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
  { id: 'manual',       nome: 'Manual / Direto',    taxaPercent: 0,    cor: 'gray',   emoji: '🤝' },
  { id: 'mercadolivre', nome: 'Mercado Livre',       taxaPercent: 14,   cor: 'yellow', emoji: '🛒' },
  { id: 'shopee',       nome: 'Shopee',              taxaPercent: 14,   cor: 'orange', emoji: '🧡' },
  { id: 'instagram',    nome: 'Instagram / WhatsApp', taxaPercent: 0,   cor: 'pink',   emoji: '📸' },
  { id: 'etsy',         nome: 'Etsy',                taxaPercent: 6.5,  cor: 'amber',  emoji: '🌿' },
  { id: 'site',         nome: 'Site próprio',         taxaPercent: 0,    cor: 'blue',   emoji: '🌐' },
];

// ─── Histórico de Preços ──────────────────────────────────────────────────────
export interface PrecoHistorico {
  data: string;           // ISO timestamp
  markupAnterior: number;
  markupNovo: number;
  precoAnterior: number;  // precoConsumidor antes
  precoNovo: number;      // precoConsumidor depois
}

// ─── Perfil de Impressora ─────────────────────────────────────────────────────
export interface PrinterProfile {
  id: string;
  nome: string;
  marca: string;
  potenciaW: number;
  valorMaquina: number;     // R$
  vidaUtilHoras: number;
  isPreset?: boolean;       // true = pré-definido, não deletável
}

export const PRINTER_PRESETS: PrinterProfile[] = [
  { id: 'bambu_x1c',         nome: 'X1 Carbon',      marca: 'Bambu Lab',  potenciaW: 350, valorMaquina: 7500, vidaUtilHoras: 20000, isPreset: true },
  { id: 'bambu_p1s',         nome: 'P1S',             marca: 'Bambu Lab',  potenciaW: 220, valorMaquina: 4500, vidaUtilHoras: 20000, isPreset: true },
  { id: 'bambu_a1',          nome: 'A1',              marca: 'Bambu Lab',  potenciaW: 185, valorMaquina: 2800, vidaUtilHoras: 20000, isPreset: true },
  { id: 'bambu_a1mini',      nome: 'A1 Mini',         marca: 'Bambu Lab',  potenciaW: 125, valorMaquina: 1800, vidaUtilHoras: 20000, isPreset: true },
  { id: 'creality_k1max',    nome: 'K1 Max',          marca: 'Creality',   potenciaW: 350, valorMaquina: 3500, vidaUtilHoras: 20000, isPreset: true },
  { id: 'creality_ender3v3', nome: 'Ender 3 V3',      marca: 'Creality',   potenciaW: 200, valorMaquina: 1200, vidaUtilHoras: 25000, isPreset: true },
  { id: 'snapmaker_j1s',     nome: 'J1s',             marca: 'Snapmaker',  potenciaW: 240, valorMaquina: 5500, vidaUtilHoras: 15000, isPreset: true },
  { id: 'flashforge_adv5m',  nome: 'Adventurer 5M',   marca: 'Flashforge', potenciaW: 350, valorMaquina: 2800, vidaUtilHoras: 20000, isPreset: true },
];

// ─── Acessório em Estoque (catálogo com variantes) ────────────────────────────
export type AcessorioCategoria = 'fixacao' | 'magnetico' | 'embalagem' | 'eletronico' | 'chaveiro' | 'outro';

export const ACESSORIO_CAT_INFO: Record<AcessorioCategoria, { label: string; emoji: string; cor: string }> = {
  fixacao:    { label: 'Fixação',    emoji: '🔩', cor: 'bg-gray-100 text-gray-700' },
  magnetico:  { label: 'Magnético',  emoji: '🧲', cor: 'bg-red-100 text-red-700' },
  embalagem:  { label: 'Embalagem',  emoji: '📦', cor: 'bg-amber-100 text-amber-700' },
  eletronico: { label: 'Eletrônico', emoji: '💡', cor: 'bg-yellow-100 text-yellow-700' },
  chaveiro:   { label: 'Chaveiro',   emoji: '🔑', cor: 'bg-purple-100 text-purple-700' },
  outro:      { label: 'Outro',      emoji: '📎', cor: 'bg-blue-100 text-blue-600' },
};

export interface AcessorioVariante {
  id: string;
  tamanho: string;       // '3mm', 'M3x8', '' (sem variante = item único)
  estoqueAtual: number;
  estoqueMinimo: number;
  custoUn: number;       // R$ por unidade
}

export interface AcessorioMovimento {
  id: string;
  data: string;          // ISO timestamp
  tipo: 'entrada' | 'saida' | 'ajuste';
  varianteId: string;
  quantidade: number;
  motivo: string;
}

export interface AcessorioEstoque {
  id: string;
  nome: string;
  categoria: AcessorioCategoria;
  unidade: string;         // 'un', 'pç', 'g', 'cm', 'm'
  variantes: AcessorioVariante[];
  movimentacoes: AcessorioMovimento[];
}

export interface AcessorioContextType {
  acessorios: AcessorioEstoque[];
  addAcessorio:    (a: Omit<AcessorioEstoque, 'id' | 'movimentacoes'>) => void;
  updateAcessorio: (id: string, updates: Partial<Omit<AcessorioEstoque, 'id'>>) => void;
  removeAcessorio: (id: string) => void;
  addMovimento:    (acessorioId: string, mov: Omit<AcessorioMovimento, 'id' | 'data'>) => void;
  getAbaixoMinimo: () => { acessorio: AcessorioEstoque; variante: AcessorioVariante }[];
}

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
  isFullBatch?: boolean;   // true = peso/tempo inseridos são do lote total (mesa cheia Bambu)
  // Frete
  freteMode?: 'none' | 'fixo' | 'percentual';
  freteValor?: number;
  custoFrete?: number;     // calculado
  // Impressora
  impressoraId?: string;   // id do PrinterProfile usado
  // Histórico de preços
  historicoPrecos?: PrecoHistorico[];
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
  custoFrete: number;      // R$ de frete por unidade
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
  // Frete padrão
  freteMode: 'none' | 'fixo' | 'percentual';
  freteValor: number;
  // Impressora ativa
  impressoraAtualId: string; // '' = sem preset selecionado
}

export interface SettingsContextType {
  settings: AppSettings;
  updateSettings: (partial: Partial<AppSettings>) => void;
  // Gerenciamento de perfis de impressora personalizados
  customPrinters: PrinterProfile[];
  addCustomPrinter:    (p: Omit<PrinterProfile, 'id' | 'isPreset'>) => void;
  updateCustomPrinter: (id: string, updates: Partial<Omit<PrinterProfile, 'id' | 'isPreset'>>) => void;
  removeCustomPrinter: (id: string) => void;
}

// ─── ProductContext ───────────────────────────────────────────────────────────
export interface ProductContextType {
  products: Product[];
  addProduct:    (p: Product) => void;
  updateProduct: (id: number, updates: Partial<Product>) => void;
  removeProduct: (id: number) => void;
}

// ─── MaterialContext ──────────────────────────────────────────────────────────
export interface MaterialContextType {
  materials: Material[];
  addMaterial:    (m: Material) => void;
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

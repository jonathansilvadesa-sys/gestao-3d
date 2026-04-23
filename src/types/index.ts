// ─── Acessório / Embalagem (inline na peça) ──────────────────────────────────
export interface Accessory {
  nome: string;
  qtd: number;
  custoUn: number;
  catalogId?: string;   // id do AcessorioEstoque (vínculo com catálogo)
  varianteId?: string;  // id da AcessorioVariante
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

// ─── Movimentação de estoque de peça ─────────────────────────────────────────
export type EstoqueTipoMovimento = 'producao' | 'venda' | 'ajuste' | 'falha';

export interface EstoqueMovimento {
  id: string;
  tipo: EstoqueTipoMovimento;
  quantidade: number;   // sempre positivo
  data: string;         // ISO timestamp
  motivo?: string;
}

// ─── Hardware / Peças de Reposição ────────────────────────────────────────────
export type HardwareCategoria = 'bico' | 'hotend' | 'correia' | 'sensor' | 'lubrificante' | 'outro';

export const HARDWARE_CAT_INFO: Record<HardwareCategoria, { label: string; emoji: string; cor: string }> = {
  bico:         { label: 'Bico',         emoji: '🔧', cor: 'bg-blue-100 text-blue-700' },
  hotend:       { label: 'Hotend',       emoji: '🔥', cor: 'bg-red-100 text-red-700' },
  correia:      { label: 'Correia',      emoji: '⚙️', cor: 'bg-amber-100 text-amber-700' },
  sensor:       { label: 'Sensor',       emoji: '📡', cor: 'bg-purple-100 text-purple-700' },
  lubrificante: { label: 'Lubrificante', emoji: '🛢️', cor: 'bg-emerald-100 text-emerald-700' },
  outro:        { label: 'Outro',        emoji: '📦', cor: 'bg-gray-100 text-gray-600' },
};

export interface HardwarePeca {
  id: string;
  nome: string;              // "Bico 0.4mm", "Hotend Bambu A1"
  categoria: HardwareCategoria;
  impressoraId?: string;     // id do PrinterProfile (opcional)
  impressoraNome?: string;   // nome livre / compatibilidade
  estoqueAtual: number;
  estoqueMinimo: number;
  horasVidaUtil: number;     // horas estimadas de durabilidade
  horasUsadas: number;       // horas já acumuladas em uso
  custoUn: number;           // R$ por unidade
  notas?: string;
}

export interface HardwareContextType {
  pecas: HardwarePeca[];
  addPeca:        (p: Omit<HardwarePeca, 'id'>) => void;
  updatePeca:     (id: string, updates: Partial<HardwarePeca>) => void;
  removePeca:     (id: string) => void;
  adicionarHoras: (id: string, horas: number) => void;
  getAlertasEstoque: () => HardwarePeca[];   // estoqueAtual <= estoqueMinimo
  getAlertasHoras:   () => HardwarePeca[];   // horasUsadas >= horasVidaUtil * 0.9
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
  // Estoque e vendas
  totalVendido?: number;
  unidadesProduzidas?: number;  // total acumulado de produções
  unidadesPerdidas?: number;    // total acumulado de falhas
  movimentosEstoque?: EstoqueMovimento[];
  // impressora usada nesta peça (override dos globais)
  amortizacaoValor?: number;  // R$ da impressora usada (armazenado para recalcular)
  amortizacaoHoras?: number;  // vida útil em horas da impressora usada
  // calculados
  custoFixoRateado?: number;  // tempo × custoFixoHora — alocação por absorção
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
  custoFixoRateado: number;  // tempo × (custoFixoMes / horasDisponiveisMes)
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
  amortizacaoValor: string;     // R$ — valor da impressora (override por peça)
  amortizacaoHoras: string;     // h  — vida útil da impressora (override por peça)
  custoFixoMes: string;
  unidadesMes: string;          // mantido para retrocompatibilidade
  horasDisponiveisMes: string;  // substitui unidadesMes no novo modelo
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
  unidadesMes: number;               // mantido para retrocompatibilidade
  horasDisponiveisMes: number;       // horas/mês disponíveis p/ rateio por absorção
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
  // Meta de faturamento mensal
  metaFaturamento: number;
  faturamentoMesAtual: number;   // acumulado do mês atual (gerenciado automaticamente)
  faturamentoMesRef: string;     // 'YYYY-MM' de referência para reset automático
}

export interface SettingsContextType {
  settings: AppSettings;
  updateSettings: (partial: Partial<AppSettings>) => void;
  // Gerenciamento de perfis de impressora personalizados
  customPrinters: PrinterProfile[];
  addCustomPrinter:      (p: Omit<PrinterProfile, 'id' | 'isPreset'>) => void;
  updateCustomPrinter:   (id: string, updates: Partial<Omit<PrinterProfile, 'id' | 'isPreset'>>) => void;
  removeCustomPrinter:   (id: string) => void;
  // Overrides para presets embutidos (edições sem apagar o preset original)
  printerOverrides: Record<string, Partial<PrinterProfile>>;
  updatePrinterOverride: (id: string, updates: Partial<Omit<PrinterProfile, 'id' | 'isPreset'>>) => void;
  resetPrinterOverride:  (id: string) => void;
  // Faturamento mensal
  registrarVenda:        (valor: number) => void;
  resetFaturamentoMes:   () => void;
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
export type UserRole = 'admin' | 'operator' | 'developer';

export interface User {
  id: string;          // UUID do Supabase
  nome: string;
  email: string;
  role: UserRole;
  avatar: string;
}

export interface AuthContextType {
  user: User | null;
  login:           (email: string, password: string) => Promise<string | null>;
  loginWithGoogle: () => Promise<string | null>;
  signup:          (email: string, password: string, nome: string, nomeEmpresa: string) => Promise<string | null>;
  logout:          () => Promise<void>;
  resetPassword:   (email: string) => Promise<string | null>;
  isAuthenticated: boolean;
  authLoading: boolean;
}

// ─── Convites ─────────────────────────────────────────────────────────────────
export interface Invite {
  id: string;
  code: string;
  usado: boolean;
  criadoPor?: string;
  usadoPor?: string;
  usadoEm?: string;
  expiraEm?: string;
  criadoEm: string;
}

// ─── Multi-tenant ─────────────────────────────────────────────────────────────
export type TenantRole = 'developer' | 'owner' | 'admin' | 'operador';

export interface Tenant {
  id: string;
  nome: string;
  slug: string;
  plano: string;
  ativo: boolean;
  criadoEm: string;
}

export interface TenantMember {
  id: string;
  tenantId: string;
  userId: string;
  email?: string;
  nome?: string;
  role: TenantRole;
  ativo: boolean;
  criadoEm: string;
}

export interface TenantContextType {
  tenant: Tenant | null;            // tenant ativo
  myRole: TenantRole | null;        // role do usuário logado no tenant ativo
  members: TenantMember[];          // membros do tenant ativo
  allTenants: Tenant[];             // apenas para developer
  tenantLoading: boolean;
  needsTenantSetup: boolean;        // true quando user não tem tenant configurado
  createTenant: (nome: string) => Promise<string | null>;
  inviteMember: (email: string, role: TenantRole) => Promise<string | null>;
  removeMember: (memberId: string) => Promise<void>;
  updateMemberRole: (memberId: string, role: TenantRole) => Promise<void>;
  switchTenant: (tenantId: string) => Promise<void>;
  migrateExistingData: () => Promise<void>;
}

// ─── Tabs da aplicação ────────────────────────────────────────────────────────
export type AppTab = 'dashboard' | 'produtos' | 'estoque' | 'materiais' | 'pedidos';

// ─── Pedidos ──────────────────────────────────────────────────────────────────
export type PedidoStatus =
  | 'orcamento'
  | 'confirmado'
  | 'em_producao'
  | 'pronto'
  | 'entregue'
  | 'cancelado';

export const PEDIDO_STATUS_INFO: Record<PedidoStatus, { label: string; cor: string; emoji: string }> = {
  orcamento:    { label: 'Orçamento',    cor: 'bg-gray-100 text-gray-600',     emoji: '📋' },
  confirmado:   { label: 'Confirmado',   cor: 'bg-blue-100 text-blue-700',     emoji: '✅' },
  em_producao:  { label: 'Em produção',  cor: 'bg-amber-100 text-amber-700',   emoji: '🖨️' },
  pronto:       { label: 'Pronto',       cor: 'bg-emerald-100 text-emerald-700',emoji: '📦' },
  entregue:     { label: 'Entregue',     cor: 'bg-purple-100 text-purple-700', emoji: '🎉' },
  cancelado:    { label: 'Cancelado',    cor: 'bg-red-100 text-red-600',       emoji: '❌' },
};

export interface PedidoItem {
  productId: number;
  nome: string;
  quantidade: number;
  precoUn: number;
  subtotal: number;
}

export interface Pedido {
  id: string;
  numero: number;
  clienteNome: string;
  clienteContato?: string;   // email ou telefone
  canal: string;             // id do CanalVenda
  itens: PedidoItem[];
  status: PedidoStatus;
  valorTotal: number;
  desconto: number;          // R$ de desconto
  dataPedido: string;        // ISO
  dataEntregaPrevista?: string;
  dataEntregue?: string;
  notas?: string;
  criadoEm: string;
  atualizadoEm: string;
}

export interface PedidosContextType {
  pedidos: Pedido[];
  addPedido:    (p: Omit<Pedido, 'id' | 'numero' | 'criadoEm' | 'atualizadoEm'>) => void;
  updatePedido: (id: string, updates: Partial<Pedido>) => void;
  removePedido: (id: string) => void;
  updateStatus: (id: string, status: PedidoStatus) => void;
}

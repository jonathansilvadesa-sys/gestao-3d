// ─────────────────────────────────────────────────────────────────────────────
// gcodeParser.ts  — v3  "Universal Parser"
//
// Extrai metadados de arquivos .gcode gerados pelos principais slicers:
//   BambuStudio, OrcaSlicer, PrusaSlicer, SuperSlicer, Creality Print (K1/K1C),
//   Cura, IdeaMaker e firmwares genéricos.
//
// ESTRATÉGIA:
//   • O parser recebe um texto contendo cabeçalho (head) + rodapé (tail) do
//     arquivo. Isso é essencial para slicers como Creality que gravam o resumo
//     de tempo/peso NO FINAL do arquivo, e não no cabeçalho.
//   • Cada campo usa uma lista de RegExp testada em ordem de prioridade.
//     A primeira correspondência vence (sem sobrescrever se já definido).
//   • A conversão mm→gramas usa densidade e diâmetro reais do filamento
//     quando extraídos do G-Code, em vez de constantes fixas.
//   • TIME_ELAPSED incremental (Creality inline) é rastreado; o último valor
//     serve de fallback caso nenhum padrão de tempo direto seja encontrado.
// ─────────────────────────────────────────────────────────────────────────────

export interface GcodeMetadata {
  /** Peso total do filamento em gramas */
  pesoG?: number;
  /** Comprimento do filamento em mm */
  comprimentoMm?: number;
  /** Tempo de impressão em horas (decimal) */
  tempoHoras?: number;
  /** Tipo de filamento: "PLA", "PETG", etc. */
  tipoFilamento?: string;
  /** Diâmetro do bico em mm */
  diametroNozzle?: number;
  /** Altura de camada em mm */
  alturaLayer?: number;
  /** Nome do slicer que gerou o arquivo */
  slicerNome?: string;
  /** Densidade do filamento em g/cm³ (extraído do G-Code) */
  filamentDensity?: number;
  /** Diâmetro do filamento em mm (extraído do G-Code) */
  filamentDiameter?: number;
}

// ─── Parse da string de tempo ─────────────────────────────────────────────────
// Suporta: "5h 20m 10s" | "2h 19m 2s" | "30m 10s" | "7036" (segundos puros)
function parseTimeString(str: string): number {
  const hm = str.match(/(\d+)\s*h/i);
  const mm = str.match(/(\d+)\s*m(?!s)/i);   // "m" mas não "ms"
  const sm = str.match(/(\d+)\s*s(?!\S)/i);  // "s" final ou antes de espaço

  let hours = 0;
  if (hm) hours += parseInt(hm[1]);
  if (mm) hours += parseInt(mm[1]) / 60;
  if (sm) hours += parseInt(sm[1]) / 3600;

  // Fallback: número puro = segundos (ex: Cura ;TIME:7036)
  if (!hm && !mm && !sm) {
    const n = parseFloat(str.trim());
    if (!isNaN(n)) hours = n / 3600;
  }

  return +hours.toFixed(4);
}

// ─── mm → gramas com parâmetros reais do filamento ───────────────────────────
// Usa densidade e diâmetro extraídos do G-Code quando disponíveis.
// Default: filamento PLA 1.75 mm (densidade 1.24 g/cm³).
function mmParaGramas(mm: number, diameter = 1.75, density = 1.24): number {
  const raio      = (diameter / 2) / 10;           // mm → cm
  const volumeCm3 = Math.PI * raio ** 2 * (mm / 10); // mm → cm
  return +(volumeCm3 * density).toFixed(2);
}

// ─────────────────────────────────────────────────────────────────────────────
// TABELAS DE REGEX  —  cada lista é testada em ordem de prioridade.
// Para cada campo, a primeira correspondência com valor > 0 / não-vazio vence.
// Slicers cobertos por padrão:
//   • Bambu     → prefixos "total estimated time:", "total filament weight [g] :"
//   • PrusaSlicer / OrcaSlicer / Creality → "estimated printing time (normal mode) ="
//   • Cura      → ";TIME:X" (segundos), ";Filament used: X.XXm"
//   • IdeaMaker → "Printing Time:", "Material#N Used: Xg"
//   • Genérico  → "print_time = X"
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Padrões para TEMPO de impressão.
 * Cada RegExp deve capturar o valor bruto em grupo 1.
 * O valor será passado para parseTimeString() — que suporta "3h 41m 18s" e segundos puros.
 */
const TEMPO_PATTERNS: RegExp[] = [
  // Bambu: "model printing time: Xh Xm Xs; total estimated time: Xh Xm Xs"
  // — pode aparecer após outro campo na mesma linha; regex sem âncora ^
  /total estimated time:\s*([^;]+)/i,

  // PrusaSlicer / SuperSlicer / Creality (rodapé) / OrcaSlicer
  /^estimated printing time \(normal mode\)\s*=\s*(.+)/i,

  // OrcaSlicer (formato simplificado, sem "normal mode")
  /^estimated printing time\s*=\s*(.+)/i,

  // Bambu fallback: modelo sem purga
  /^model printing time:\s*([^;]+)/i,

  // IdeaMaker
  /^Printing Time:\s*(.+)/i,

  // Cura: ;TIME:7036  (segundos inteiros)
  /^TIME:(\d+)$/,

  // Genérico: ; print_time = 12345  (segundos)
  /^print[_\s]?time\s*[=:]\s*([\d.]+)\s*$/i,
];

/**
 * Padrões para PESO do filamento (gramas).
 * Cada RegExp captura o número em grupo 1.
 */
const PESO_PATTERNS: RegExp[] = [
  // Bambu: "total filament weight [g] : 81.57"  (usa " : " com espaço)
  /^total filament weight\s*\[g\]\s*[=:]\s*([\d.]+)/i,

  // PrusaSlicer / Creality (rodapé): "filament used [g] = 75.01"
  /^filament used \[g\]\s*=\s*([\d.]+)/i,

  // PrusaSlicer multi-extrusor: "total filament used [g] = 12.34"
  /^total filament used \[g\]\s*=\s*([\d.]+)/i,

  // IdeaMaker: "Material#1 Used: 4.74g"
  /^Material#\d+ Used:\s*([\d.]+)g/i,
];

/**
 * Padrões para COMPRIMENTO do filamento.
 * Tupla: [regex, fator de escala para mm].
 * Scale = 1  → valor já em mm.
 * Scale = 1000 → valor em metros (Cura "Filament used: X.XXm").
 */
const COMPRIMENTO_PATTERNS: Array<[RegExp, number]> = [
  // Bambu: "total filament length [mm] : 26914.10"
  [/^total filament length\s*\[mm\]\s*[=:]\s*([\d.]+)/i, 1],

  // PrusaSlicer / Creality (rodapé): "filament used [mm] = 25150.58"
  [/^filament used \[mm\]\s*=\s*([\d.]+)/i, 1],

  // Cura: "Filament used: 1.20047m"  →  metros × 1000 = mm
  [/^Filament used:\s*([\d.]+)m$/i, 1000],
];

/**
 * Padrões para TIPO do filamento.
 * Retorna a string bruta; o parser normaliza para maiúsculas e pega antes de ";".
 */
const TIPO_PATTERNS: RegExp[] = [
  // PrusaSlicer / OrcaSlicer / Creality (rodapé): "filament_type = PLA" ou "PLA;PLA"
  /^filament_type\s*[=:]\s*(.+)/i,

  // Creality cabeçalho e rodapé: "default_filament_type = PLA"
  /^default_filament_type\s*[=:]\s*(.+)/i,

  // Genérico — fallback amplo
  /filament[_\s]type\s*[=:]\s*(\w+)/i,
];

// ─────────────────────────────────────────────────────────────────────────────
// PARSER PRINCIPAL
//
// Recebe 'text' contendo cabeçalho + rodapé do arquivo (produzido no call site
// via Blob.slice head+tail). Não limita linhas — o volume é controlado pelo
// tamanho do Blob lido (HEAD_SIZE + TAIL_SIZE no componente que importa o arquivo).
// ─────────────────────────────────────────────────────────────────────────────
export function parseGcode(text: string): GcodeMetadata {
  const meta: GcodeMetadata = {};
  const lines = text.split('\n');

  // Último valor de ;TIME_ELAPSED:X encontrado — Creality grava marcadores
  // incrementais ao longo do arquivo; o último é o tempo total em segundos.
  let lastTimeElapsedSec = 0;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line.startsWith(';')) continue;

    const c = line.slice(1).trim();  // conteúdo após o ";" inicial
    let m: RegExpMatchArray | null;

    // ── Rastreia TIME_ELAPSED antes de qualquer outra coisa ──────────────────
    // ;TIME_ELAPSED:13273.963867  (Creality K1/K1C — valor acumulado em segundos)
    m = c.match(/^TIME_ELAPSED:([\d.]+)$/);
    if (m) { lastTimeElapsedSec = parseFloat(m[1]); continue; }

    // ── Tempo de impressão ────────────────────────────────────────────────────
    if (meta.tempoHoras === undefined) {
      for (const re of TEMPO_PATTERNS) {
        m = c.match(re);
        if (m?.[1]) {
          const val = parseTimeString(m[1].trim());
          if (val > 0) { meta.tempoHoras = val; break; }
        }
      }
    }

    // ── Peso em gramas ────────────────────────────────────────────────────────
    if (meta.pesoG === undefined) {
      for (const re of PESO_PATTERNS) {
        m = c.match(re);
        if (m?.[1]) { meta.pesoG = parseFloat(m[1]); break; }
      }
    }

    // ── Comprimento em mm ─────────────────────────────────────────────────────
    if (meta.comprimentoMm === undefined) {
      for (const [re, scale] of COMPRIMENTO_PATTERNS) {
        m = c.match(re);
        if (m?.[1]) { meta.comprimentoMm = parseFloat(m[1]) * scale; break; }
      }
    }

    // ── Tipo de filamento ─────────────────────────────────────────────────────
    if (!meta.tipoFilamento) {
      for (const re of TIPO_PATTERNS) {
        m = c.match(re);
        if (m?.[1]) {
          // Multi-extrusor PrusaSlicer: "PLA;PLA;…" → pega o primeiro token
          const tipo = m[1].trim().split(';')[0].trim().toUpperCase();
          if (/^(PLA|PETG|ABS|ASA|TPU|NYLON|PA|PC|HIPS|PVA|FLEX|WOOD|SILK|CF)/i.test(tipo)) {
            meta.tipoFilamento = tipo;
            break;
          }
        }
      }
    }

    // ── Densidade do filamento (g/cm³) ───────────────────────────────────────
    // Bambu  : ; filament_density: 1.26    Creality: ; filament_density: 1.24
    // Prusa  : ; filament_density = 1.24
    if (meta.filamentDensity === undefined) {
      m = c.match(/^filament[_\s]density\s*[=:]\s*([\d.]+)/i);
      if (m) { meta.filamentDensity = parseFloat(m[1]); }
    }

    // ── Diâmetro do filamento (mm) ────────────────────────────────────────────
    // Bambu  : ; filament_diameter: 1.75   Creality: ; filament_diameter: 1.75
    // Prusa  : ; filament_diameter = 1.75
    if (meta.filamentDiameter === undefined) {
      m = c.match(/^filament[_\s]diameter\s*[=:]\s*([\d.]+)/i);
      if (m) { meta.filamentDiameter = parseFloat(m[1]); }
    }

    // ── Diâmetro do bico ──────────────────────────────────────────────────────
    if (!meta.diametroNozzle) {
      m = c.match(/^nozzle[_\s]diameter\s*[=:]\s*([\d.]+)/i);
      if (m) { meta.diametroNozzle = parseFloat(m[1]); }
    }

    // ── Altura de camada ──────────────────────────────────────────────────────
    if (!meta.alturaLayer) {
      m = c.match(/^(?:layer[_\s]height|Layer height)\s*[=:]\s*([\d.]+)/i);
      if (m) { meta.alturaLayer = parseFloat(m[1]); }
    }

    // ── Nome do slicer ────────────────────────────────────────────────────────
    if (!meta.slicerNome) {
      // Bambu / Orca: "; BambuStudio 02.05.03.61"  (sem "generated by")
      m = c.match(/^(BambuStudio|OrcaSlicer|Bambu Studio)\s+([\d.]+)/i);
      if (m) { meta.slicerNome = `${m[1]} ${m[2]}`; continue; }

      // PrusaSlicer / SuperSlicer / Creality: "; generated by Creality_Print V6.3 on …"
      m = c.match(/^generated by\s+(.+?)(?:\s+on\s+|\s*$)/i);
      if (m) { meta.slicerNome = m[1].trim(); continue; }

      // Cura: ";FLAVOR:Marlin"
      if (/^FLAVOR:/i.test(c)) { meta.slicerNome = 'Cura'; continue; }

      // Creality UUID como identificador secundário (caso "generated by" não apareça)
      if (/^creality_uuid\s*[=:]/i.test(c)) { meta.slicerNome = 'Creality Print'; }
    }
  }

  // ── Pós-processamento ──────────────────────────────────────────────────────

  // Fallback de tempo: usa o último TIME_ELAPSED (Creality) se nenhum padrão direto bateu
  if (meta.tempoHoras === undefined && lastTimeElapsedSec > 0) {
    meta.tempoHoras = +(lastTimeElapsedSec / 3600).toFixed(4);
  }

  // Fallback de peso: mm → gramas usando diâmetro e densidade reais do filamento
  if (meta.pesoG === undefined && meta.comprimentoMm !== undefined) {
    meta.pesoG = mmParaGramas(
      meta.comprimentoMm,
      meta.filamentDiameter ?? 1.75,
      meta.filamentDensity ?? 1.24,
    );
  }

  return meta;
}

// ─── Formata horas decimais para exibição ("2h 19min") ──────────────────────
export function formatarTempo(horas: number): string {
  if (!horas || horas <= 0) return '0min';
  const h = Math.floor(horas);
  const m = Math.round((horas - h) * 60);
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

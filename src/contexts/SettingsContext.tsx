import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import { dbGet, dbSet } from '@/lib/db';
import type { AppSettings, SettingsContextType, PrinterProfile } from '@/types';

// ─── Padrões globais ──────────────────────────────────────────────────────────
export const DEFAULT_SETTINGS: AppSettings = {
  custoKwh:             0.84,
  imposto:              8,
  txCartao:             5,
  custoAnuncio:         20,
  falhas:               15,
  custoFixoMes:         300,
  unidadesMes:          10,
  horasDisponiveisMes:  600,
  potenciaW:            350,
  filamentoCustoKg:     99,
  amortizacaoHoras:     20000,
  amortizacaoValor:     6000,
  maoObraTaxa:          0,
  freteMode:            'none',
  freteValor:           0,
  impressoraAtualId:    '',
  metaFaturamento:      0,
  faturamentoMesAtual:  0,
  faturamentoMesRef:    '',
};

const LS_SETTINGS  = 'gestao3d_settings';
const LS_PRINTERS  = 'gestao3d_printers_custom';
const LS_OVERRIDES = 'gestao3d_printers_overrides';

const SettingsContext = createContext<SettingsContextType | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const s = localStorage.getItem(LS_SETTINGS);
      return s ? { ...DEFAULT_SETTINGS, ...JSON.parse(s) } : DEFAULT_SETTINGS;
    } catch { return DEFAULT_SETTINGS; }
  });

  const [customPrinters, setCustomPrinters] = useState<PrinterProfile[]>(() => {
    try {
      const s = localStorage.getItem(LS_PRINTERS);
      return s ? JSON.parse(s) : [];
    } catch { return []; }
  });

  const [printerOverrides, setPrinterOverrides] = useState<Record<string, Partial<PrinterProfile>>>(() => {
    try {
      const s = localStorage.getItem(LS_OVERRIDES);
      return s ? JSON.parse(s) : {};
    } catch { return {}; }
  });

  // Refs para leitura síncrona nos callbacks sem causar re-render
  const sRef  = useRef(settings);
  const cpRef = useRef(customPrinters);
  const poRef = useRef(printerOverrides);
  useEffect(() => { sRef.current  = settings;        }, [settings]);
  useEffect(() => { cpRef.current = customPrinters;  }, [customPrinters]);
  useEffect(() => { poRef.current = printerOverrides; }, [printerOverrides]);

  // ── Sincroniza com Supabase na montagem ─────────────────────────────────────
  useEffect(() => {
    // Carrega cada chave independentemente
    dbGet<AppSettings>('settings').then((remoto) => {
      if (remoto) {
        const merged = { ...DEFAULT_SETTINGS, ...remoto };
        setSettings(merged);
        localStorage.setItem(LS_SETTINGS, JSON.stringify(merged));
      } else {
        dbSet('settings', sRef.current).catch(console.error);
      }
    });

    dbGet<PrinterProfile[]>('custom_printers').then((remoto) => {
      if (remoto && Array.isArray(remoto)) {
        setCustomPrinters(remoto);
        localStorage.setItem(LS_PRINTERS, JSON.stringify(remoto));
      } else {
        if (cpRef.current.length > 0)
          dbSet('custom_printers', cpRef.current).catch(console.error);
      }
    });

    dbGet<Record<string, Partial<PrinterProfile>>>('printer_overrides').then((remoto) => {
      if (remoto && typeof remoto === 'object') {
        setPrinterOverrides(remoto);
        localStorage.setItem(LS_OVERRIDES, JSON.stringify(remoto));
      } else {
        if (Object.keys(poRef.current).length > 0)
          dbSet('printer_overrides', poRef.current).catch(console.error);
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Helpers de persistência ──────────────────────────────────────────────────
  const persistSettings = (next: AppSettings) => {
    localStorage.setItem(LS_SETTINGS, JSON.stringify(next));
    dbSet('settings', next).catch(console.error);
  };
  const persistPrinters = (next: PrinterProfile[]) => {
    localStorage.setItem(LS_PRINTERS, JSON.stringify(next));
    dbSet('custom_printers', next).catch(console.error);
  };
  const persistOverrides = (next: Record<string, Partial<PrinterProfile>>) => {
    localStorage.setItem(LS_OVERRIDES, JSON.stringify(next));
    dbSet('printer_overrides', next).catch(console.error);
  };

  // ── CRUD de settings ─────────────────────────────────────────────────────────
  const updateSettings = useCallback((partial: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      persistSettings(next);
      return next;
    });
  }, []);

  // ── CRUD de impressoras customizadas ─────────────────────────────────────────
  const addCustomPrinter = useCallback(
    (p: Omit<PrinterProfile, 'id' | 'isPreset'>) => {
      const novo: PrinterProfile = { ...p, id: `custom_${Date.now()}`, isPreset: false };
      setCustomPrinters((prev) => {
        const next = [...prev, novo];
        persistPrinters(next);
        return next;
      });
    }, []
  );

  const updateCustomPrinter = useCallback(
    (id: string, updates: Partial<Omit<PrinterProfile, 'id' | 'isPreset'>>) => {
      setCustomPrinters((prev) => {
        const next = prev.map((p) => (p.id === id ? { ...p, ...updates } : p));
        persistPrinters(next);
        return next;
      });
    }, []
  );

  const removeCustomPrinter = useCallback((id: string) => {
    setCustomPrinters((prev) => {
      const next = prev.filter((p) => p.id !== id);
      persistPrinters(next);
      return next;
    });
    setSettings((prev) => {
      if (prev.impressoraAtualId !== id) return prev;
      const next = { ...prev, impressoraAtualId: '' };
      persistSettings(next);
      return next;
    });
  }, []);

  // ── Overrides de presets embutidos ───────────────────────────────────────────
  const updatePrinterOverride = useCallback(
    (id: string, updates: Partial<Omit<PrinterProfile, 'id' | 'isPreset'>>) => {
      setPrinterOverrides((prev) => {
        const next = { ...prev, [id]: { ...(prev[id] ?? {}), ...updates } };
        persistOverrides(next);
        return next;
      });
    }, []
  );

  const resetPrinterOverride = useCallback((id: string) => {
    setPrinterOverrides((prev) => {
      const next = { ...prev };
      delete next[id];
      persistOverrides(next);
      return next;
    });
  }, []);

  // ─── Faturamento mensal ───────────────────────────────────────────────────────
  const registrarVenda = useCallback((valor: number) => {
    setSettings((prev) => {
      const mesAtual = new Date().toISOString().slice(0, 7);
      const mesRef   = prev.faturamentoMesRef || mesAtual;
      const acum     = mesRef === mesAtual ? prev.faturamentoMesAtual : 0;
      const next = {
        ...prev,
        faturamentoMesAtual: +(acum + valor).toFixed(2),
        faturamentoMesRef:   mesAtual,
      };
      persistSettings(next);
      return next;
    });
  }, []);

  const resetFaturamentoMes = useCallback(() => {
    setSettings((prev) => {
      const next = {
        ...prev,
        faturamentoMesAtual: 0,
        faturamentoMesRef:   new Date().toISOString().slice(0, 7),
      };
      persistSettings(next);
      return next;
    });
  }, []);

  return (
    <SettingsContext.Provider value={{
      settings, updateSettings,
      customPrinters, addCustomPrinter, updateCustomPrinter, removeCustomPrinter,
      printerOverrides, updatePrinterOverride, resetPrinterOverride,
      registrarVenda, resetFaturamentoMes,
    }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextType {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside <SettingsProvider>');
  return ctx;
}

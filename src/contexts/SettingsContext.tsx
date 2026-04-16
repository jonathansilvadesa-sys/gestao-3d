import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { AppSettings, SettingsContextType, PrinterProfile } from '@/types';

// ─── Padrões globais ──────────────────────────────────────────────────────────
export const DEFAULT_SETTINGS: AppSettings = {
  custoKwh:          0.84,
  imposto:           8,
  txCartao:          5,
  custoAnuncio:      20,
  falhas:            15,
  custoFixoMes:      300,
  unidadesMes:       10,
  potenciaW:         350,
  filamentoCustoKg:  99,
  amortizacaoHoras:  20000,
  amortizacaoValor:  6000,
  maoObraTaxa:       0,
  freteMode:         'none',
  freteValor:        0,
  impressoraAtualId: '',
};

const SETTINGS_KEY       = 'gestao3d_settings';
const PRINTERS_CUSTOM_KEY = 'gestao3d_printers_custom';

// ─── Context ──────────────────────────────────────────────────────────────────
const SettingsContext = createContext<SettingsContextType | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const [customPrinters, setCustomPrinters] = useState<PrinterProfile[]>(() => {
    try {
      const stored = localStorage.getItem(PRINTERS_CUSTOM_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const updateSettings = useCallback((partial: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const persistPrinters = useCallback((list: PrinterProfile[]) => {
    localStorage.setItem(PRINTERS_CUSTOM_KEY, JSON.stringify(list));
    return list;
  }, []);

  const addCustomPrinter = useCallback(
    (p: Omit<PrinterProfile, 'id' | 'isPreset'>) => {
      const novo: PrinterProfile = {
        ...p,
        id: `custom_${Date.now()}`,
        isPreset: false,
      };
      setCustomPrinters((prev) => persistPrinters([...prev, novo]));
    },
    [persistPrinters]
  );

  const updateCustomPrinter = useCallback(
    (id: string, updates: Partial<Omit<PrinterProfile, 'id' | 'isPreset'>>) => {
      setCustomPrinters((prev) =>
        persistPrinters(prev.map((p) => (p.id === id ? { ...p, ...updates } : p)))
      );
    },
    [persistPrinters]
  );

  const removeCustomPrinter = useCallback(
    (id: string) => {
      setCustomPrinters((prev) => persistPrinters(prev.filter((p) => p.id !== id)));
      // Se a impressora removida estava ativa, limpa a seleção
      setSettings((prev) => {
        if (prev.impressoraAtualId !== id) return prev;
        const next = { ...prev, impressoraAtualId: '' };
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
        return next;
      });
    },
    [persistPrinters]
  );

  return (
    <SettingsContext.Provider
      value={{
        settings,
        updateSettings,
        customPrinters,
        addCustomPrinter,
        updateCustomPrinter,
        removeCustomPrinter,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextType {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside <SettingsProvider>');
  return ctx;
}

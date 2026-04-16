import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { AppSettings, SettingsContextType } from '@/types';

// ─── Padrões globais ──────────────────────────────────────────────────────────
export const DEFAULT_SETTINGS: AppSettings = {
  custoKwh: 0.84,
  imposto: 8,
  txCartao: 5,
  custoAnuncio: 20,
  falhas: 15,
  custoFixoMes: 300,
  unidadesMes: 10,
  potenciaW: 350,
  filamentoCustoKg: 99,
  amortizacaoHoras: 20000,
  amortizacaoValor: 6000,
  maoObraTaxa: 0,         // R$/h de mão de obra (0 = não usa por padrão)
};

const SETTINGS_KEY = 'gestao3d_settings';

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

  const updateSettings = useCallback((partial: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextType {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside <SettingsProvider>');
  return ctx;
}

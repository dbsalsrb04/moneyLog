import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type CategorySelectionMode = 'tree' | 'buttons';
const STORAGE_KEY = 'moneylog.categorySelectionMode';
const SettingsContext = createContext<{
  categorySelectionMode: CategorySelectionMode;
  setCategorySelectionMode: (mode: CategorySelectionMode) => void;
} | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [categorySelectionMode, setCategorySelectionMode] = useState<CategorySelectionMode>(() => {
    try { return localStorage.getItem(STORAGE_KEY) === 'buttons' ? 'buttons' : 'tree'; }
    catch { return 'tree'; }
  });

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, categorySelectionMode); }
    catch { /* Keep the setting for this session when browser storage is unavailable. */ }
  }, [categorySelectionMode]);

  return <SettingsContext.Provider value={{ categorySelectionMode, setCategorySelectionMode }}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const settings = useContext(SettingsContext);
  if (!settings) throw new Error('SettingsProvider가 필요합니다.');
  return settings;
}

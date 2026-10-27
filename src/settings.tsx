import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { CategoryGrouping } from './analysis';

export type CategorySelectionMode = 'tree' | 'buttons';
export type AnalysisChartType = 'pie' | 'bar';
const SettingsContext = createContext<{
  categorySelectionMode: CategorySelectionMode;
  setCategorySelectionMode: (mode: CategorySelectionMode) => void;
  analysisChartType: AnalysisChartType;
  setAnalysisChartType: (type: AnalysisChartType) => void;
  analysisCategoryGrouping: CategoryGrouping;
  setAnalysisCategoryGrouping: (grouping: CategoryGrouping) => void;
} | null>(null);

function useStoredSetting<T extends string>(key: string, values: readonly T[], fallback: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      return values.includes(stored as T) ? stored as T : fallback;
    } catch { return fallback; }
  });
  useEffect(() => {
    try { localStorage.setItem(key, value); }
    catch { /* Keep the setting for this session when browser storage is unavailable. */ }
  }, [key, value]);
  return [value, setValue] as const;
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [categorySelectionMode, setCategorySelectionMode] = useStoredSetting<CategorySelectionMode>('moneylog.categorySelectionMode', ['tree', 'buttons'], 'tree');
  const [analysisChartType, setAnalysisChartType] = useStoredSetting<AnalysisChartType>('moneylog.analysisChartType', ['pie', 'bar'], 'pie');
  const [analysisCategoryGrouping, setAnalysisCategoryGrouping] = useStoredSetting<CategoryGrouping>('moneylog.analysisCategoryGrouping', ['parent', 'full'], 'parent');
  return <SettingsContext.Provider value={{ categorySelectionMode, setCategorySelectionMode, analysisChartType, setAnalysisChartType, analysisCategoryGrouping, setAnalysisCategoryGrouping }}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const settings = useContext(SettingsContext);
  if (!settings) throw new Error('SettingsProvider가 필요합니다.');
  return settings;
}

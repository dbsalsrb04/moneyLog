import type { Transaction } from './data';

export type CategoryGrouping = 'parent' | 'full';
export type CategoryShare = { category: string; amount: number; percentage: number | null };
export type CategoryBreakdown = CategoryShare & { isOther: boolean };

export function aggregateCategoryShares(transactions: Transaction[], grouping: CategoryGrouping): CategoryShare[] {
  const amounts = new Map<string, number>();
  for (const transaction of transactions) {
    const category = (grouping === 'parent' ? transaction.category.split('/')[0] : transaction.category) || '미분류';
    amounts.set(category, (amounts.get(category) ?? 0) + transaction.amount);
  }
  const total = transactions.reduce((sum, transaction) => sum + transaction.amount, 0);
  return [...amounts].map(([category, amount]) => ({ category, amount, percentage: total > 0 ? amount / total * 100 : null }))
    .sort((a, b) => b.amount - a.amount || a.category.localeCompare(b.category, 'ko'));
}

export const formatPercentage = (value: number | null) => value === null ? '—' : `${value.toLocaleString('ko-KR', { maximumFractionDigits: 1 })}%`;

export function groupCategoryLegend(rows: CategoryShare[]): CategoryBreakdown[] {
  const sorted = [...rows].sort((a, b) => b.amount - a.amount || a.category.localeCompare(b.category, 'ko'));
  const visible = sorted.filter(row => row.percentage !== null && row.percentage >= 5).slice(0, 10);
  const visibleNames = new Set(visible.map(row => row.category));
  const otherRows = sorted.filter(row => !visibleNames.has(row.category));
  const total = rows.reduce((sum, row) => sum + row.amount, 0);
  const result = visible.map(row => ({ ...row, isOther: false }));
  if (otherRows.length) {
    const amount = otherRows.reduce((sum, row) => sum + row.amount, 0);
    result.push({ category: '그 외', amount, percentage: total > 0 ? amount / total * 100 : null, isOther: true });
  }
  return result;
}

export function toggleAnalysisMonth(selected: string[], month: string): string[] {
  if (selected.includes(month)) return selected.length > 1 ? selected.filter(value => value !== month) : selected;
  return selected.length < 12 ? [...selected, month].sort() : selected;
}

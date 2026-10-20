export const TRANSACTION_PARTS = [
  { value: 'R', label: '수입' },
  { value: 'E', label: '지출' },
  { value: 'D', label: '저축' },
  { value: 'O', label: '기록' },
] as const;
export type TransactionPart = typeof TRANSACTION_PARTS[number]['value'];
export type Transaction = { id: number | string; part: TransactionPart; category: string; amount: number; memo: string; tags: string[]; dateKey: string; [key: string]: unknown };
export type Backup = { raw: Record<string, unknown>; transactions: Transaction[]; latestMonth: string; firstMonth: string };
export type Point = { key: string; label: string; amount: number };
export type ComparisonPoint = Pick<Point, 'key' | 'label'> & Record<TransactionPart, number>;
export type MonthlyComparison = { points: ComparisonPoint[]; parts: TransactionPart[] };
export const TRANSACTION_COLORS: Record<TransactionPart, string> = { R: '#2563ce', E: '#c83f48', D: '#23864a', O: '#7e8490' };
export type DayDetails = { dateKey: string; transactions: Transaction[] };
export type CalendarDay = { dateKey: string; totals: Record<TransactionPart, number> };
const object = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
export function validDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y,m,d] = value.split('-').map(Number);
  return y >= 1 && m >= 1 && m <= 12 && d >= 1 && d <= daysInMonth(value.slice(0,7));
}
export function daysInMonth(month: string): number {
  const [y,m] = month.split('-').map(Number);
  return [31,(y%4===0 && (y%100!==0 || y%400===0)) ? 29:28,31,30,31,30,31,31,30,31,30,31][m-1];
}
export function parseBackup(text: string): Backup {
  let raw: unknown;
  try { raw = JSON.parse(text.replace(/^\uFEFF/, '')); } catch { throw new Error('올바른 JSON 파일이 아닙니다. 백업 파일을 다시 확인해 주세요.'); }
  if (!object(raw) || !Array.isArray(raw.moneyTrackTable) || raw.moneyTrackTable.length === 0) throw new Error('moneyTrackTable에 거래 데이터가 있는 백업 파일을 선택해 주세요.');
  const transactions = raw.moneyTrackTable.map((item, index): Transaction => {
    if (!object(item) || !['E','R','D','O'].includes(String(item.part)) || !validDate(item.dateKey) || typeof item.amount !== 'number' || !Number.isFinite(item.amount) || typeof item.category !== 'string' || !Array.isArray(item.tags) || !item.tags.every(t => typeof t === 'string') || (typeof item.id !== 'number' && typeof item.id !== 'string')) {
      throw new Error(`${index + 1}번째 거래의 유형·날짜·금액·카테고리·태그·ID 형식이 올바르지 않습니다.`);
    }
    return { ...item, memo: typeof item.memo === 'string' ? item.memo : '' } as Transaction;
  });
  const dates = transactions.map(t => t.dateKey).sort();
  return { raw, transactions, latestMonth: dates.at(-1)!.slice(0,7), firstMonth: dates[0].slice(0,7) };
}
// Choices come from the complete history of the active type, independently of
// the visible period and current selections. Unused metadata remains in raw.
export function getFilterOptions(transactions: Transaction[], part: TransactionPart): { categories: string[]; tags: string[] } {
  const matching = transactions.filter(t => t.part === part);
  const categories = new Set<string>();
  matching.map(t => t.category).filter(Boolean).forEach(category => {
    const parts = category.split('/');
    parts.forEach((_, i) => categories.add(parts.slice(0,i+1).join('/')));
  });
  const tags = new Set(matching.flatMap(t => t.tags).filter(Boolean));
  const sort = (values: Set<string>) => [...values].sort((a,b) => a.localeCompare(b,'ko'));
  return { categories: sort(categories), tags: sort(tags) };
}
export function filterTransactions(transactions: Transaction[], part: TransactionPart | null, categories: string[] = [], tags: string[] = []): Transaction[] {
  return transactions.filter(t => (part === null || t.part === part) && (!categories.length || categories.some(c => t.category === c || t.category.startsWith(`${c}/`))) && (!tags.length || tags.some(tag => t.tags.includes(tag))));
}
export function shiftMonth(month: string, delta: number): string {
  const [year,m] = month.split('-').map(Number);
  const n = year*12 + m-1+delta;
  return `${String(Math.floor(n/12)).padStart(4,'0')}-${String(((n%12)+12)%12+1).padStart(2,'0')}`;
}
export function monthRange(first: string, last: string): string[] {
  const result: string[] = [];
  for (let m = first; m <= last; m = shiftMonth(m,1)) result.push(m);
  return result;
}
export function aggregateMonthly(transactions: Transaction[], latest: string, count: number): Point[] {
  const totals = new Map<string,number>();
  transactions.forEach(t => { const m=t.dateKey.slice(0,7); totals.set(m,(totals.get(m)??0)+t.amount); });
  return Array.from({length:count},(_,i)=> { const key=shiftMonth(latest,i-count+1); return { key, label:key.replace('-', '.'), amount:totals.get(key)??0 }; });
}
export function aggregateMonthlyByPart(transactions: Transaction[], latest: string, count: number): ComparisonPoint[] {
  const points = aggregateMonthly([], latest, count).map(({ key, label }) => ({ key, label, R: 0, E: 0, D: 0, O: 0 }));
  const months = new Map(points.map(point => [point.key, point]));
  transactions.forEach(transaction => {
    const point = months.get(transaction.dateKey.slice(0, 7));
    if (point) point[transaction.part] += transaction.amount;
  });
  return points;
}
export function aggregateDaily(transactions: Transaction[], month: string): Point[] {
  const totals = new Map<string,number>();
  transactions.forEach(t => totals.set(t.dateKey,(totals.get(t.dateKey)??0)+t.amount));
  return Array.from({length:daysInMonth(month)},(_,i)=> {const key=`${month}-${String(i+1).padStart(2,'0')}`; return {key,label:`${i+1}`,amount:totals.get(key)??0};});
}
export function getDailyDetails(transactions: Transaction[], month: string): DayDetails[] {
  const byDay = new Map<string, Transaction[]>();
  transactions.forEach(transaction => {
    if (transaction.dateKey.slice(0, 7) !== month) return;
    const entries = byDay.get(transaction.dateKey) ?? [];
    entries.push(transaction);
    byDay.set(transaction.dateKey, entries);
  });
  return Array.from({ length: daysInMonth(month) }, (_, index) => {
    const dateKey = `${month}-${String(index + 1).padStart(2, '0')}`;
    return { dateKey, transactions: byDay.get(dateKey) ?? [] };
  });
}
export function getMonthlyCalendar(transactions: Transaction[], month: string): CalendarDay[] {
  const days: CalendarDay[] = Array.from({ length: daysInMonth(month) }, (_, index) => ({
    dateKey: `${month}-${String(index + 1).padStart(2, '0')}`,
    totals: { R: 0, E: 0, D: 0, O: 0 },
  }));
  transactions.forEach(transaction => {
    if (transaction.dateKey.slice(0, 7) !== month) return;
    const day = days[Number(transaction.dateKey.slice(8)) - 1];
    day.totals[transaction.part] += transaction.amount;
  });
  return days;
}
export function getMonthStartWeekday(month: string): number {
  const [year, number] = month.split('-').map(Number);
  const date = new Date(0);
  // UTC and setUTCFullYear also handle years 0001–0099 without local offsets.
  date.setUTCFullYear(year, number - 1, 1);
  return date.getUTCDay();
}
export function toggleSelection(selected: string[], value: string): string[] { return selected.includes(value) ? selected.filter(s=>s!==value) : [...selected,value]; }
export const won = (n:number) => `${n.toLocaleString('ko-KR')}원`;

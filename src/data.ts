export type Transaction = { id: number | string; part: 'E' | 'R' | 'D' | 'O'; category: string; amount: number; memo: string; tags: string[]; dateKey: string; [key: string]: unknown };
export type Backup = { raw: Record<string, unknown>; transactions: Transaction[]; categories: string[]; tags: string[]; latestMonth: string; firstMonth: string };
export type Point = { key: string; label: string; amount: number };
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
// Real backups use categoryName / tagName. Preserve labels verbatim, including ■.
// Only semantic name fields are labels; IDs, ordering and timestamps are metadata.
function metadataNames(table: unknown, kind: 'category' | 'tag'): string[] {
  if (!Array.isArray(table)) return [];
  return table.flatMap(item => {
    if (typeof item === 'string') return [item];
    if (!object(item)) return [];
    const value = item[kind] ?? item[`${kind}Name`] ?? item.name;
    return typeof value === 'string' && value.trim() ? [value] : [];
  });
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
  const categories = new Set<string>();
  [...transactions.map(t => t.category), ...metadataNames(raw.categoryInfoTable, 'category')].filter(Boolean).forEach(c => {
    const parts = c.split('/');
    parts.forEach((_, i) => categories.add(parts.slice(0,i+1).join('/')));
  });
  const tags = new Set([...transactions.flatMap(t => t.tags), ...metadataNames(raw.tagInfoTable, 'tag')].filter(Boolean));
  const dates = transactions.map(t => t.dateKey).sort();
  return { raw, transactions, categories: [...categories].sort((a,b)=>a.localeCompare(b,'ko')), tags: [...tags].sort((a,b)=>a.localeCompare(b,'ko')), latestMonth: dates.at(-1)!.slice(0,7), firstMonth: dates[0].slice(0,7) };
}
export function filterExpenses(transactions: Transaction[], categories: string[], tags: string[]): Transaction[] {
  return transactions.filter(t => t.part === 'E' && (!categories.length || categories.some(c => t.category === c || t.category.startsWith(`${c}/`))) && (!tags.length || tags.some(tag => t.tags.includes(tag))));
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
export function aggregateDaily(transactions: Transaction[], month: string): Point[] {
  const totals = new Map<string,number>();
  transactions.forEach(t => totals.set(t.dateKey,(totals.get(t.dateKey)??0)+t.amount));
  return Array.from({length:daysInMonth(month)},(_,i)=> {const key=`${month}-${String(i+1).padStart(2,'0')}`; return {key,label:`${i+1}`,amount:totals.get(key)??0};});
}
export function toggleSelection(selected: string[], value: string): string[] { return selected.includes(value) ? selected.filter(s=>s!==value) : [...selected,value]; }
export const won = (n:number) => `${n.toLocaleString('ko-KR')}원`;

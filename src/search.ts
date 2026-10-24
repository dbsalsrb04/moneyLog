import { filterTransactions, getMonthStartWeekday, type Transaction, type TransactionPart } from './data';

const normalize = (text: string) => text.normalize('NFC').toLocaleLowerCase('ko-KR');
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export function searchTransactions(transactions: Transaction[], query: string, categories: string[] = [], tags: string[] = []): Transaction[] {
  const keyword = normalize(query.trim());
  return filterTransactions(transactions, null, categories, tags)
    .filter(transaction => normalize(transaction.memo).includes(keyword))
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey));
}

export function getSearchTotals(transactions: Transaction[]): Record<TransactionPart, number> {
  return transactions.reduce((totals, transaction) => {
    totals[transaction.part] += transaction.amount;
    return totals;
  }, { R: 0, E: 0, D: 0, O: 0 });
}

export function formatSearchDate(dateKey: string): string {
  const weekday = (getMonthStartWeekday(dateKey.slice(0, 7)) + Number(dateKey.slice(8)) - 1) % 7;
  return `${dateKey}(${WEEKDAYS[weekday]})`;
}

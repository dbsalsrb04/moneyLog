import { aggregateDaily, shiftMonth, type Transaction } from './data';

function cumulativeTotals(transactions: Transaction[], month: string) {
  let total = 0;
  return aggregateDaily(transactions, month).map(({ amount }) => {
    total += amount;
    return total;
  });
}

export function buildSpendingPace(transactions: Transaction[], month: string, today: string) {
  const previousMonth = shiftMonth(month, -1);
  const expenses = transactions.filter(transaction => {
    const transactionMonth = transaction.dateKey.slice(0, 7);
    return transaction.part === 'E' && (transactionMonth === month || transactionMonth === previousMonth);
  });
  const current = cumulativeTotals(expenses, month);
  const previous = cumulativeTotals(expenses, previousMonth);
  const todayMonth = today.slice(0, 7);
  const throughDay = month < todayMonth ? current.length : month === todayMonth ? Number(today.slice(8)) : 0;
  const points = current.map((amount, index) => ({
    day: index + 1,
    current: index < throughDay ? amount : null,
    previous: previous[index] ?? null,
  }));
  const difference = throughDay
    ? current[throughDay - 1] - previous[Math.min(throughDay, previous.length) - 1]
    : null;
  return { previousMonth, points, throughDay, difference };
}

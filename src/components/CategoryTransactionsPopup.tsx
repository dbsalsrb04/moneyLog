import { useMemo, type ComponentProps } from 'react';
import { analysisCategory, type CategoryGrouping } from '../analysis';
import { getDailyDetails, type Transaction } from '../data';
import TransactionDetailsPopup from './TransactionDetailsPopup';

export { positionAnalysisPopup, type AnalysisPopupPoint } from './TransactionDetailsPopup';

type Props = Omit<ComponentProps<typeof TransactionDetailsPopup>, 'title' | 'days' | 'closeLabel'> & {
  category: string;
  grouping: CategoryGrouping;
  transactions: Transaction[];
  month: string;
};

export default function CategoryTransactionsPopup({ category, grouping, transactions, month, ...popup }: Props) {
  const days = useMemo(() => {
    const matching = transactions.filter(transaction => analysisCategory(transaction.category, grouping) === category);
    return getDailyDetails(matching, month).filter(day => day.transactions.length);
  }, [transactions, month, grouping, category]);
  return <TransactionDetailsPopup {...popup} title={category} days={days} closeLabel="카테고리 내역 닫기" />;
}

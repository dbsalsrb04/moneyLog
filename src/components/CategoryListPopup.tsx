import { useLayoutEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { formatPercentage, type CategoryGrouping, type CategoryShare } from '../analysis';
import { won, type Transaction } from '../data';
import CategoryTransactionsPopup, { positionAnalysisPopup, type AnalysisPopupPoint } from './CategoryTransactionsPopup';

type Props = {
  title: string;
  label: string;
  rows: CategoryShare[];
  point: AnalysisPopupPoint;
  partLabel: string;
  transactions: Transaction[];
  grouping: CategoryGrouping;
  month: string;
  onClose: () => void;
  restoreFocus: () => void;
};

export default function CategoryListPopup({ title, label, rows, point, partLabel, transactions, grouping, month, onClose, restoreFocus }: Props) {
  const popup = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<{ category: string; trigger: HTMLButtonElement } | null>(null);
  useLayoutEffect(() => {
    const element = popup.current!;
    element.showPopover();
    const position = () => positionAnalysisPopup(element, point);
    position();
    window.addEventListener('resize', position);
    return () => { window.removeEventListener('resize', position); element.hidePopover(); };
  }, [point]);

  return <div ref={popup} className="other-categories-popup" popover="auto" role="dialog" aria-label={label} onToggle={event => { if (event.target === event.currentTarget && event.newState === 'closed') onClose(); }}>
    <div className="other-popup-header"><strong>{title}</strong><button aria-label={`${title} 닫기`} onClick={() => { onClose(); restoreFocus(); }}><X size={16} /></button></div>
    <div className="other-popup-scroll">
      <table className="other-categories-table">
        <thead><tr><th>카테고리</th><th>백분율</th><th>{partLabel} 금액</th></tr></thead>
        <tbody>{rows.map((row, index) => <tr key={row.category} className="other-category-row" style={{ animationDelay: `${index * 20}ms` }} onClick={event => {
          const trigger = event.currentTarget.querySelector('button')!;
          setSelected(previous => previous?.category === row.category ? null : { category: row.category, trigger });
        }}>
          <th scope="row"><button type="button" aria-haspopup="dialog" aria-expanded={selected?.category === row.category}>{row.category}</button></th>
          <td>{formatPercentage(row.percentage)}</td>
          <td>{won(row.amount)}</td>
        </tr>)}</tbody>
      </table>
    </div>
    {selected && popup.current && <CategoryTransactionsPopup
      key={selected.category}
      category={selected.category}
      transactions={transactions}
      grouping={grouping}
      month={month}
      point={point}
      beside={popup.current}
      onClose={() => setSelected(previous => previous === selected ? null : previous)}
      restoreFocus={() => selected.trigger.focus({ preventScroll: true })}
    />}
  </div>;
}

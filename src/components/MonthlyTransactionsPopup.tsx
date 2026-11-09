import { useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { getDailyDetails, won, type Transaction } from '../data';
import TransactionDetailsPopup, { positionAnalysisPopup, type AnalysisPopupPoint } from './TransactionDetailsPopup';

type Props = {
  month: string;
  partLabel: string;
  transactions: Transaction[];
  point: AnalysisPopupPoint;
  onClose: () => void;
  restoreFocus: () => void;
};

export default function MonthlyTransactionsPopup({ month, partLabel, transactions, point, onClose, restoreFocus }: Props) {
  const popup = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const [selected, setSelected] = useState<{ dateKey: string; trigger: HTMLButtonElement } | null>(null);
  const days = useMemo(() => getDailyDetails(transactions, month).filter(day => day.transactions.length), [transactions, month]);
  const selectedDay = selected && days.find(day => day.dateKey === selected.dateKey);

  useLayoutEffect(() => {
    const element = popup.current!;
    element.showPopover();
    const position = () => positionAnalysisPopup(element, point);
    position();
    closeButton.current?.focus({ preventScroll: true });
    window.addEventListener('resize', position);
    return () => {
      window.removeEventListener('resize', position);
      element.hidePopover();
    };
  }, [point]);

  return <div
    ref={popup}
    className="other-categories-popup monthly-transactions-popup"
    popover="auto"
    role="dialog"
    aria-labelledby={titleId}
    onToggle={event => { if (event.target === event.currentTarget && event.newState === 'closed') onClose(); }}
  >
    <div className="other-popup-header">
      <strong id={titleId}>{month}</strong>
      <button ref={closeButton} type="button" aria-label="월별 내역 닫기" onClick={() => { onClose(); restoreFocus(); }}><X size={16} /></button>
    </div>
    <div className="other-popup-scroll">
      {days.length > 0 ? <table className="other-categories-table monthly-transactions-table">
        <thead><tr><th>날짜</th><th>{partLabel} 금액</th></tr></thead>
        <tbody>{days.map((day, index) => <tr key={day.dateKey} className="other-category-row" style={{ animationDelay: `${index * 20}ms` }} onClick={event => {
          const trigger = event.currentTarget.querySelector('button')!;
          setSelected(previous => previous?.dateKey === day.dateKey ? null : { dateKey: day.dateKey, trigger });
        }}>
          <th scope="row">
            <button type="button" aria-haspopup="dialog" aria-expanded={selected?.dateKey === day.dateKey}>
              <time dateTime={day.dateKey}>{day.dateKey}</time>
            </button>
          </th>
          <td>{won(day.transactions.reduce((sum, transaction) => sum + transaction.amount, 0))}</td>
        </tr>)}</tbody>
      </table> : <p>해당 월에 조건과 일치하는 내역이 없습니다.</p>}
    </div>
    {selected && selectedDay && popup.current && <TransactionDetailsPopup
      key={selectedDay.dateKey}
      title={selectedDay.dateKey}
      days={[selectedDay]}
      point={point}
      beside={popup.current}
      onClose={() => setSelected(previous => previous === selected ? null : previous)}
      restoreFocus={() => selected.trigger.focus({ preventScroll: true })}
    />}
  </div>;
}

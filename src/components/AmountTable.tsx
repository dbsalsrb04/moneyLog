import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { won, type Point } from '../data';

type Props = {
  points: Point[];
  partLabel: string;
  daily?: boolean;
  selectedMonth?: string;
  onSelect?: (month: string) => void;
};

export default function AmountTable({ points, partLabel, daily, selectedMonth, onSelect }: Props) {
  const measureRef = useRef<HTMLSpanElement>(null);
  const [amountWidth, setAmountWidth] = useState(100);

  useLayoutEffect(() => {
    const element = measureRef.current;
    if (!element) return;
    const measure = () => {
      const width = element.getBoundingClientRect().width;
      if (width > 0) setAmountWidth(Math.ceil(width * 1.3));
    };
    measure();
    // Recalculate when a closed amount table opens, or its font changes.
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [points]);

  return <div className="table-scroll amount-table-container" style={{ '--amount-column-width': `${amountWidth}px` } as CSSProperties}>
    <span ref={measureRef} className="amount-measure" aria-hidden="true">{points.map(point => won(point.amount)).join('\n')}</span>
    <table className="amount-table">
      <colgroup><col className="date-column" /><col className="amount-column" /></colgroup>
      <thead><tr><th scope="col">{daily ? '날짜' : '연월'}</th><th scope="col" className="amount-cell">{partLabel} 금액</th></tr></thead>
      <tbody>{points.map(point => <tr key={point.key}>
        <th scope="row">{onSelect ? <button onClick={() => onSelect(point.key)} aria-pressed={point.key === selectedMonth}>{point.key}</button> : point.key}</th>
        <td className="amount-cell"><span className="amount-text">{won(point.amount)}</span></td>
      </tr>)}</tbody>
    </table>
  </div>;
}

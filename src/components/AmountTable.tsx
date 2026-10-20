import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { TRANSACTION_PARTS, won, type MonthlyComparison, type Point } from '../data';

type Props = {
  points: Point[];
  partLabel: string;
  daily?: boolean;
  selectedMonth?: string;
  onSelect?: (month: string) => void;
  comparison?: MonthlyComparison;
};

export default function AmountTable({ points, partLabel, daily, selectedMonth, onSelect, comparison }: Props) {
  const measureRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const [amountWidths, setAmountWidths] = useState<number[]>([]);
  const columns = useMemo(() => comparison ? comparison.parts.map(value => ({
    key: value,
    label: TRANSACTION_PARTS.find(item => item.value === value)!.label,
    amounts: comparison.points.map(point => point[value]),
  })) : [{ key: 'amount', label: partLabel, amounts: points.map(point => point.amount) }], [comparison, points, partLabel]);
  const rows = comparison?.points ?? points;
  const widths = columns.map((_, index) => amountWidths[index] ?? 100);

  useLayoutEffect(() => {
    const elements = columns.map((_, index) => measureRefs.current[index]);
    const measure = () => {
      const next = elements.map(element => Math.ceil((element?.getBoundingClientRect().width ?? 0) * 1.3));
      if (next.every(width => width > 0)) {
        setAmountWidths(previous => previous.length === next.length && previous.every((width, index) => width === next[index]) ? previous : next);
      }
    };
    measure();
    // Recalculate when a closed table opens, or its font changes.
    const observer = new ResizeObserver(measure);
    elements.forEach(element => { if (element) observer.observe(element); });
    return () => observer.disconnect();
  }, [columns]);

  return <div className="table-scroll amount-table-container" style={{ '--amount-columns-width': `${widths.reduce((sum, width) => sum + width, 0)}px` } as CSSProperties}>
    {columns.map((column, index) => <span key={column.key} ref={element => { measureRefs.current[index] = element; }} className="amount-measure" aria-hidden="true">{column.amounts.map(won).join('\n')}</span>)}
    <table className="amount-table">
      <colgroup><col className="date-column" />{columns.map((column, index) => <col key={column.key} className="amount-column" style={{ width: `${widths[index]}px` }} />)}</colgroup>
      <thead><tr><th scope="col">{daily ? '날짜' : '연월'}</th>{columns.map(column => <th scope="col" className="amount-cell" key={column.key}>{column.label} 금액</th>)}</tr></thead>
      <tbody>{rows.map((point, index) => <tr key={point.key}>
        <th scope="row">{onSelect ? <button onClick={() => onSelect(point.key)} aria-pressed={point.key === selectedMonth}>{point.key}</button> : point.key}</th>
        {columns.map(column => <td className="amount-cell" key={column.key}><span className="amount-text">{won(column.amounts[index])}</span></td>)}
      </tr>)}</tbody>
    </table>
  </div>;
}

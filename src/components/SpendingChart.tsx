import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TRANSACTION_COLORS, TRANSACTION_PARTS, won, type ComparisonPoint, type MonthlyComparison, type Point, type Transaction, type TransactionPart } from '../data';
import MonthlyTransactionsPopup from './MonthlyTransactionsPopup';
import TransactionDetailsPopup, { type AnalysisPopupPoint } from './TransactionDetailsPopup';

type Props = {
  points: Point[];
  partLabel: string;
  transactions: Transaction[];
  daily?: boolean;
  selectedMonth?: string;
  onSelect?: (month: string) => void;
  comparison?: MonthlyComparison;
  active?: boolean;
};

type OpenPoint = {
  key: string;
  point: AnalysisPopupPoint;
  series?: TransactionPart;
  trigger: HTMLElement | SVGElement | null;
};

export default function SpendingChart({ points, partLabel, transactions, daily, selectedMonth, onSelect, comparison, active = true }: Props) {
  const chartData: (Point | ComparisonPoint)[] = comparison?.points ?? points;
  const chart = useRef<HTMLDivElement>(null);
  const [opened, setOpened] = useState<OpenPoint | null>(null);
  useEffect(() => { setOpened(null); }, [active, chartData, transactions]);

  function openBar(key: unknown, event: MouseEvent, series?: TransactionPart) {
    if (typeof key !== 'string') return;
    const focused = document.activeElement;
    const trigger = (focused instanceof HTMLElement || focused instanceof SVGElement) && chart.current?.contains(focused)
      ? focused
      : chart.current?.querySelector<SVGElement>('.recharts-surface') ?? null;
    setOpened({ key, point: { x: event.clientX, y: event.clientY }, series, trigger });
    onSelect?.(key);
  }

  function closePopup() {
    setOpened(previous => previous === opened ? null : previous);
  }

  function restoreFocus() {
    opened?.trigger?.focus({ preventScroll: true });
  }

  const monthTransactions = opened && !daily ? transactions.filter(transaction =>
    transaction.dateKey.startsWith(`${opened.key}-`) && (opened.series === undefined || transaction.part === opened.series)
  ) : [];
  const dateTransactions = opened && daily ? transactions.filter(transaction => transaction.dateKey === opened.key) : [];
  const popupPartLabel = TRANSACTION_PARTS.find(item => item.value === opened?.series)?.label ?? partLabel;

  return <>
    <div className="axis-caption">금액 (원)</div>
    <div className="chart" ref={chart} role="img" aria-label={`${daily ? '일별' : '월별'} ${comparison ? '유형 비교' : partLabel} 막대그래프`}>
      {active && <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 12, right: 12, left: 0, bottom: 8 }} barGap={0} accessibilityLayer>
          <CartesianGrid strokeDasharray="3 5" vertical={false} stroke="#e9edf3" />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#8490a3' }} tickMargin={12} interval={daily ? 0 : 'preserveStartEnd'} minTickGap={8} />
          <YAxis width={65} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#8490a3' }} tickFormatter={n => Math.abs(n) >= 10000 ? `${Number((n / 10000).toFixed(1))}만` : Number(n).toLocaleString('ko-KR')} />
          <Tooltip cursor={{ fill: '#f0f4ff', radius: 5 }} content={({ active, payload }) => {
            const point = payload?.[0]?.payload as Point | ComparisonPoint | undefined;
            return active && point ? <div className="chart-tooltip">
              <span>{point.key}{daily ? '' : '월'}</span>
              {comparison ? comparison.parts.map(value => <div className="tooltip-series" key={value}>
                <span>{TRANSACTION_PARTS.find(item => item.value === value)!.label}</span>
                <strong style={{ color: TRANSACTION_COLORS[value] }}>{won((point as ComparisonPoint)[value])}</strong>
              </div>) : <strong>{won((point as Point).amount)}</strong>}
            </div> : null;
          }} />
          {comparison ? comparison.parts.map(value => <Bar
            key={value}
            dataKey={value}
            name={TRANSACTION_PARTS.find(item => item.value === value)!.label}
            fill={TRANSACTION_COLORS[value]}
            radius={[3, 3, 0, 0]}
            maxBarSize={42 / comparison.parts.length}
            isAnimationActive={false}
            onClick={(data, _, event) => openBar(data.key, event, value)}
            style={{ cursor: 'pointer' }}
          />) : <Bar
            dataKey="amount"
            name={partLabel}
            radius={[5, 5, 0, 0]}
            maxBarSize={daily ? 18 : 42}
            isAnimationActive={false}
            onClick={(data, _, event) => openBar(data.key, event)}
            style={{ cursor: 'pointer' }}
          >{points.map(point => <Cell key={point.key} fill={daily ? '#8297f3' : point.key === selectedMonth ? '#4768e8' : '#a9b8f5'} />)}</Bar>}
        </BarChart>
      </ResponsiveContainer>}
    </div>
    {active && opened && (daily ? <TransactionDetailsPopup
      key={opened.key}
      title={opened.key}
      days={dateTransactions.length ? [{ dateKey: opened.key, transactions: dateTransactions }] : []}
      point={opened.point}
      onClose={closePopup}
      restoreFocus={restoreFocus}
    /> : <MonthlyTransactionsPopup
      key={`${opened.key}:${opened.series ?? ''}`}
      month={opened.key}
      partLabel={popupPartLabel}
      transactions={monthTransactions}
      point={opened.point}
      onClose={closePopup}
      restoreFocus={restoreFocus}
    />)}
  </>;
}

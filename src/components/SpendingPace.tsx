import { useEffect, useId, useMemo, useState } from 'react';
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { won, type Transaction } from '../data';
import { buildSpendingPace } from '../spendingPace';
import './SpendingPace.css';

const CURRENT_COLOR = '#4d6ce7';
const PREVIOUS_COLOR = '#9ba5b5';
const monthLabel = (month: string) => month.replace('-', '.');

function localDateKey(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export default function SpendingPace({ transactions, month }: { transactions: Transaction[]; month: string }) {
  const [today, setToday] = useState(localDateKey);
  const chartId = useId();
  const gradientId = `${chartId}-fill`;
  const pulseId = `${chartId}-pulse`;

  useEffect(() => {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const timer = window.setTimeout(() => setToday(localDateKey()), midnight.getTime() - now.getTime());
    return () => window.clearTimeout(timer);
  }, [today]);

  const { points, previousMonth, throughDay, difference } = useMemo(
    () => buildSpendingPace(transactions, month, today),
    [transactions, month, today],
  );
  const currentLabel = monthLabel(month);
  const previousLabel = monthLabel(previousMonth);
  const summary = difference === null ? '선택한 달이 아직 시작되지 않았습니다.'
    : difference === 0 ? '지난달 같은 시점과 지출이 같아요.'
      : `지난달 같은 시점보다 ${won(Math.abs(difference))} ${difference > 0 ? '더' : '덜'} 썼어요.`;

  return <section className="card spending-pace" aria-label="지난달 대비 누적 지출">
    <div className="spending-pace-header">
      <div className="axis-caption">금액 (원)</div>
      <div className="spending-pace-legend" aria-label="차트 범례">
        <span><i style={{ backgroundColor: PREVIOUS_COLOR }} />{previousLabel}</span>
        <span><i style={{ backgroundColor: CURRENT_COLOR }} />{currentLabel}</span>
      </div>
    </div>
    <div className="spending-pace-scroll">
      <div className="spending-pace-canvas">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={points} margin={{ top: 22, right: 22, bottom: 2, left: 0 }} accessibilityLayer>
            <defs>
              <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={CURRENT_COLOR} stopOpacity={0.24} />
                <stop offset="100%" stopColor={CURRENT_COLOR} stopOpacity={0} />
              </linearGradient>
              <radialGradient id={pulseId}>
                <stop offset="0%" stopColor={CURRENT_COLOR} stopOpacity={0.6} />
                <stop offset="55%" stopColor={CURRENT_COLOR} stopOpacity={0.3} />
                <stop offset="100%" stopColor={CURRENT_COLOR} stopOpacity={0} />
              </radialGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 5" vertical={false} stroke="#e9edf3" />
            <XAxis dataKey="day" interval={0} tick={{ fill: '#71819a', fontSize: 10 }} tickMargin={7} axisLine={false} tickLine={false} />
            <YAxis width={57} tick={{ fill: '#71819a', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={amount =>
              Math.abs(amount) >= 10000 ? `${Number((amount / 10000).toFixed(1))}만` : Number(amount).toLocaleString('ko-KR')
            } />
            <Tooltip cursor={{ stroke: '#c8d2ec', strokeDasharray: '3 3' }} content={({ active, label }) => {
              const point = points[Number(label) - 1];
              if (!active || !point) return null;
              return <div className="chart-tooltip">
                <span>{point.day}일까지 누적 지출</span>
                <div className="tooltip-series"><span>{previousLabel}</span><strong style={{ color: '#4b5563' }}>{point.previous === null ? '—' : won(point.previous)}</strong></div>
                <div className="tooltip-series"><span>{currentLabel}</span><strong style={{ color: CURRENT_COLOR }}>{point.current === null ? '—' : won(point.current)}</strong></div>
              </div>;
            }} />
            <Area key={`fill-${throughDay}`} className="spending-pace-fill" dataKey="current" baseValue="dataMin" fill={`url(#${gradientId})`} fillOpacity={1} stroke="none" tooltipType="none" activeDot={false} isAnimationActive={false} />
            <Line dataKey="previous" stroke={PREVIOUS_COLOR} strokeWidth={2} dot={false} activeDot={false} isAnimationActive={false} />
            <Line dataKey="current" stroke="#b8c9ff" strokeWidth={3} strokeLinecap="round" dot={false} activeDot={false} isAnimationActive={false} />
            <Line
              key={`sweep-${throughDay}`}
              className="spending-pace-sweep"
              dataKey="current"
              stroke={CURRENT_COLOR}
              strokeWidth={3}
              strokeLinecap="round"
              tooltipType="none"
              activeDot={false}
              isAnimationActive={false}
              dot={({ cx, cy, index }) => {
                if (index !== throughDay - 1 || cx == null || cy == null) return <g />;
                return <g transform={`translate(${cx} ${cy})`} data-testid="spending-pace-endpoint" data-day={throughDay}>
                  <circle className="spending-pace-pulse" r={5} fill={`url(#${pulseId})`} />
                  <circle r={5} fill={CURRENT_COLOR} stroke="#fff" strokeWidth={1.5} />
                </g>;
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
    <p className="spending-pace-summary" aria-live="polite">{summary}</p>
  </section>;
}

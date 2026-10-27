import { useLayoutEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { layoutPieLabels, PIE_LABEL_FONT_SIZE, PIE_LABEL_LINE_HEIGHT } from '../pieLabels';
import type { CategoryBreakdown } from '../analysis';

type Props = {
  rows: (CategoryBreakdown & { key: string; color: string })[];
  onHighlight: (key: string | null) => void;
  onOtherClick: (point: { x: number; y: number }) => void;
  tooltip: (props: { active?: boolean; payload?: readonly { payload?: unknown }[] }) => ReactElement | null;
};

export default function AnalysisPieChart({ rows, onHighlight, onOtherClick, tooltip }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  useLayoutEffect(() => {
    const element = root.current!;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setViewport(previous => previous.width === width && previous.height === height ? previous : { width, height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const measure = useMemo(() => {
    const context = document.createElement('canvas').getContext('2d')!;
    context.font = `${PIE_LABEL_FONT_SIZE}px ${getComputedStyle(document.body).fontFamily}`;
    return (text: string) => context.measureText(text).width;
  }, []);
  const layout = useMemo(() => layoutPieLabels(rows, viewport.width, viewport.height, measure), [rows, viewport, measure]);

  return <div className="analysis-pie" ref={root}>
    {layout.radius > 0 && <ResponsiveContainer width="100%" height={layout.height}><PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
      <Pie data={rows} dataKey="amount" nameKey="category" cx={layout.cx} cy={layout.cy} outerRadius={layout.radius} isAnimationActive={false}
        onMouseEnter={(_, index) => onHighlight(rows[index]?.key ?? null)}
        onClick={(_, index, event) => { if (rows[index]?.isOther) onOtherClick({ x: event.clientX, y: event.clientY }); }}
        labelLine={false} label={({ index }) => {
          const label = layout.labels[index];
          if (!label) return null;
          return <g className="pie-category-label" data-placement={label.inside ? 'inside' : 'outside'} data-category={label.category} pointerEvents="none">
            {!label.inside && <polyline className="pie-label-connector" points={label.connector.map(point => `${point.x},${point.y}`).join(' ')} fill="none" stroke={rows[index].color} strokeWidth={1} />}
            <text className="pie-category-name" x={label.x} y={label.y - (label.lines.length - 1) * PIE_LABEL_LINE_HEIGHT / 2} textAnchor={label.anchor} dominantBaseline="central" fill={label.inside ? '#fff' : '#63718a'} fontSize={PIE_LABEL_FONT_SIZE}>
              {label.lines.map((line, lineIndex) => <tspan key={lineIndex} x={label.x} dy={lineIndex === 0 ? 0 : PIE_LABEL_LINE_HEIGHT}>{line}</tspan>)}
            </text>
            <text className="pie-percentage-label" x={label.percentage.x} y={label.percentage.y} textAnchor="middle" dominantBaseline="central" fill="#fff" fontSize={PIE_LABEL_FONT_SIZE}>{label.percentage.text}</text>
          </g>;
        }}>
        {rows.map(row => <Cell key={row.key} fill={row.color} data-category-key={row.key} style={{ cursor: row.isOther ? 'pointer' : 'default' }} className="analysis-category-shape" />)}
      </Pie>
      <Tooltip content={tooltip} />
    </PieChart></ResponsiveContainer>}
  </div>;
}

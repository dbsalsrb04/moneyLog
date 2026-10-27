import { useEffect, useMemo, useRef, useState } from 'react';
import { ChartPie } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, LabelList, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { aggregateCategoryShares, formatPercentage, groupCategoryLegend, type CategoryShare } from '../analysis';
import { useSettings } from '../settings';
import { won, type Transaction } from '../data';
import AnalysisMonthPicker from './AnalysisMonthPicker';
import HelpTip from './HelpTip';
import OtherCategoriesPopup from './OtherCategoriesPopup';

type Props = { transactions: Transaction[]; month: string; partLabel: string; active: boolean };
const COLORS = ['#5474e8', '#8495ed', '#57a5b4', '#7cbb95', '#d2ad67', '#ce8f9f', '#9b85c7', '#84adb5', '#b5b87b', '#ab77ad'];

export default function CategoryAnalysis({ transactions, month, partLabel, active }: Props) {
  // The parent keys this component by the shared month and uploaded dataset.
  const [selectedMonth, setSelectedMonth] = useState(month);
  const root = useRef<HTMLElement>(null);
  // Keep hover styling outside React renders to preserve Recharts SVG click targets.
  function highlightCategory(key: string | null) {
    root.current?.querySelectorAll<SVGElement>('.analysis-category-shape').forEach(element => element.classList.toggle('is-hovered', key !== null && element.dataset.categoryKey === key));
    root.current?.querySelectorAll<HTMLElement>('[data-legend-key]').forEach(element => element.classList.toggle('analysis-legend-hovered', key !== null && element.dataset.legendKey === key));
  }
  const [otherPoint, setOtherPoint] = useState<{ x: number; y: number } | null>(null);
  const otherLegend = useRef<HTMLTableRowElement>(null);
  const { analysisChartType, setAnalysisChartType, analysisCategoryGrouping, setAnalysisCategoryGrouping } = useSettings();
  const allRows = useMemo(() => aggregateCategoryShares(transactions.filter(transaction => transaction.dateKey.slice(0, 7) === selectedMonth), analysisCategoryGrouping), [transactions, selectedMonth, analysisCategoryGrouping]);
  const rows = useMemo(() => groupCategoryLegend(allRows), [allRows]);
  const otherRows = useMemo(() => {
    const visible = new Set(rows.filter(row => !row.isOther).map(row => row.category));
    return allRows.filter(row => !visible.has(row.category));
  }, [allRows, rows]);
  useEffect(() => { setOtherPoint(null); }, [allRows]);
  useEffect(() => { if (!active) setOtherPoint(null); }, [active]);
  const total = rows.reduce((sum, row) => sum + row.amount, 0);
  const hasNegative = rows.some(row => row.amount < 0);
  const pie = analysisChartType === 'pie' && !hasNegative;
  const chartRows = useMemo(() => rows.map((row, index) => ({ ...row, key: row.isOther ? 'other' : `category:${row.category}`, color: row.isOther ? '#9aa2af' : COLORS[index % COLORS.length] })), [rows]);
  const tooltip = ({ active: visible, payload }: { active?: boolean; payload?: readonly { payload?: unknown }[] }) => {
    const row = payload?.[0]?.payload as CategoryShare | undefined;
    return visible && row ? <div className="chart-tooltip"><span>{row.category}</span><strong>{won(row.amount)} · {formatPercentage(row.percentage)}</strong></div> : null;
  };

  return <section ref={root} className="chart-card analysis-panel" aria-label={`카테고리별 ${partLabel} 분석`}>
    <div className="chart-header analysis-header">
      <div>
        <div className="chart-title"><span className="icon-box"><ChartPie size={18} /></span><h2>카테고리별 {partLabel} 비중</h2></div>
        <AnalysisMonthPicker selected={selectedMonth} onChange={setSelectedMonth} />
      </div>
      <div className="analysis-controls">
        <div className="analysis-setting"><span>파이차트</span><button className="analysis-switch" role="switch" aria-label="그래프 모양" aria-checked={analysisChartType === 'bar'} onClick={() => setAnalysisChartType(analysisChartType === 'pie' ? 'bar' : 'pie')}><span /></button><span>막대 그래프</span><HelpTip label="그래프 설정 도움말">그래프 모양</HelpTip></div>
        <div className="analysis-setting"><span>카테고리 기준:</span><span>상위</span><button className="analysis-switch" role="switch" aria-label="하위 카테고리 기준" aria-checked={analysisCategoryGrouping === 'full'} onClick={() => setAnalysisCategoryGrouping(analysisCategoryGrouping === 'parent' ? 'full' : 'parent')}><span /></button><span>하위</span><HelpTip label="카테고리 기준 도움말">{'상위 기준 예시: 식비, 쇼핑, 교통비, ...\n하위 기준 예시: 식비/편의점, 식비/카페, ..., 쇼핑/옷, 쇼핑/생활용품, ...'}</HelpTip></div>
      </div>
    </div>
    <div className="chart-total" data-testid="analysis-total">{won(total)}<span>{Number(selectedMonth.slice(0, 4))}년 {Number(selectedMonth.slice(5))}월 {partLabel}</span></div>
    {hasNegative && analysisChartType === 'pie' && total > 0 && <p className="analysis-note">음수 금액이 포함되어 막대그래프로 표시합니다.</p>}
    {total > 0 ? <div className="analysis-visual">
      <div className="analysis-chart-scroll">
        <div className="chart analysis-chart" role="img" aria-label={`카테고리별 ${partLabel} 비중 ${pie ? '파이차트' : '막대그래프'}`} onMouseLeave={() => highlightCategory(null)}>
          {active && (pie ? <ResponsiveContainer width="100%" height="100%"><PieChart>
            <Pie data={chartRows} dataKey="amount" nameKey="category" outerRadius="78%" isAnimationActive={false} onMouseEnter={(_, index) => highlightCategory(chartRows[index]?.key ?? null)} onClick={(_, index, event) => { if (chartRows[index]?.isOther) setOtherPoint({ x: event.clientX, y: event.clientY }); }} labelLine={false} label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
              if (Number(percent) < .035) return null;
              const radius = Number(innerRadius) + (Number(outerRadius) - Number(innerRadius)) * .65;
              const angle = -Number(midAngle) * Math.PI / 180;
              return <text x={Number(cx) + radius * Math.cos(angle)} y={Number(cy) + radius * Math.sin(angle)} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={11}>{formatPercentage(Number(percent) * 100)}</text>;
            }}>{chartRows.map(row => <Cell key={row.key} fill={row.color} data-category-key={row.key} style={{ cursor: row.isOther ? 'pointer' : 'default' }} className="analysis-category-shape" />)}</Pie>
            <Tooltip content={tooltip} />
          </PieChart></ResponsiveContainer> : <ResponsiveContainer width="100%" height="100%"><BarChart data={chartRows} layout="vertical" margin={{ top: 10, right: 54, left: 0, bottom: 8 }} accessibilityLayer>
            <CartesianGrid strokeDasharray="3 5" horizontal={false} stroke="#e9edf3" />
            <XAxis type="number" domain={[Math.min(0, ...rows.map(row => row.percentage ?? 0)), Math.max(100, ...rows.map(row => row.percentage ?? 0))]} tickFormatter={value => `${value}%`} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#8490a3' }} />
            <YAxis type="category" dataKey="category" width={112} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#66748b' }} tickFormatter={value => String(value).length > 13 ? `${String(value).slice(0, 12)}…` : String(value)} />
            <Tooltip content={tooltip} cursor={{ fill: '#f0f4ff' }} />
            <Bar dataKey="percentage" maxBarSize={20} radius={[0, 3, 3, 0]} isAnimationActive={false} onMouseEnter={(_, index) => highlightCategory(chartRows[index]?.key ?? null)} onClick={(_, index, event) => { if (chartRows[index]?.isOther) setOtherPoint({ x: event.clientX, y: event.clientY }); }}>{chartRows.map(row => <Cell key={row.key} fill={row.color} data-category-key={row.key} style={{ cursor: row.isOther ? 'pointer' : 'default' }} className="analysis-category-shape" />)}<LabelList dataKey="percentage" position="right" formatter={value => formatPercentage(Number(value))} style={{ fontSize: 10, fill: '#66748b' }} /></Bar>
          </BarChart></ResponsiveContainer>)}
        </div>
      </div>
      <div className="analysis-table-scroll"><table className="analysis-table"><caption className="sr-only">카테고리별 {partLabel} 금액과 비중</caption><thead><tr><th>카테고리</th><th>금액</th><th>비중</th></tr></thead><tbody>{chartRows.map(row => <tr key={row.key} ref={row.isOther ? otherLegend : undefined} data-other={row.isOther} tabIndex={0} aria-haspopup={row.isOther ? 'dialog' : undefined} data-legend-key={row.key} onMouseEnter={() => highlightCategory(row.key)} onMouseLeave={() => highlightCategory(null)} onFocus={() => highlightCategory(row.key)} onBlur={() => highlightCategory(null)} onClick={event => { if (row.isOther) setOtherPoint({ x: event.clientX, y: event.clientY }); }} onKeyDown={event => {
        if (!row.isOther || !['Enter', ' '].includes(event.key)) return;
        event.preventDefault();
        const bounds = event.currentTarget.getBoundingClientRect();
        setOtherPoint({ x: bounds.left, y: bounds.bottom });
      }}><th scope="row"><i style={{ background: row.color }} />{row.category}</th><td>{won(row.amount)}</td><td>{formatPercentage(row.percentage)}</td></tr>)}</tbody></table></div>
    </div> : <p className="analysis-empty">{rows.length ? '비중을 표시할 양수 합계가 없습니다.' : '선택한 월과 필터에 해당하는 내역이 없습니다.'}</p>}
    {active && otherPoint && <OtherCategoriesPopup rows={otherRows} point={otherPoint} partLabel={partLabel} onClose={() => setOtherPoint(null)} restoreFocus={() => otherLegend.current?.focus()} />}
  </section>;
}

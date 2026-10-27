import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { toggleAnalysisMonth } from '../analysis';
import { getYearChoices, pageView, viewEndYear, yearView, type PickerView } from '../monthPicker';

type Props = { selected: string[]; onChange: (months: string[]) => void };

export default function AnalysisMonthPicker({ selected, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<PickerView>({ level: 0, start: Number(selected[0].slice(0, 4)) });
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);

  const label = selected.length === 1 ? `${Number(selected[0].slice(0, 4))}년 ${Number(selected[0].slice(5))}월` : `${selected.length}개월 선택`;
  return <div className="analysis-period" ref={root} onKeyDown={event => {
    if (event.key === 'Escape') { event.preventDefault(); setOpen(false); trigger.current?.focus(); }
  }}>
    <button ref={trigger} className="analysis-period-trigger" aria-label="분석 조회 월" aria-expanded={open} aria-controls={id} onClick={() => {
      if (!open) setView({ level: 0, start: Number(selected[0].slice(0, 4)) });
      setOpen(previous => !previous);
    }}>조회 월 <strong>{label}</strong><span>{selected.length}/12</span><ChevronDown size={14} /></button>
    {open && <div className="analysis-period-popup" id={id} role="group" aria-label="분석 월 선택">
      <div className="month-picker-heading">
        <button className="picker-page-arrow" aria-label="분석 이전 연도" disabled={view.start === 1} onClick={() => setView(previous => pageView(previous, -1))}>{'<'}</button>
        {view.level === 0 ? <button className="picker-zoom" aria-label="분석 연도 선택" onClick={() => setView(yearView(view.start))}><span>{view.start}년</span><span aria-hidden="true">…</span></button> : <span className="picker-year-heading">{view.start}–{viewEndYear(view)}년</span>}
        <button className="picker-page-arrow" aria-label="분석 다음 연도" disabled={viewEndYear(view) === 9999} onClick={() => setView(previous => pageView(previous, 1))}>{'>'}</button>
      </div>
      <div className="month-picker-grid">
        {view.level === 0 ? Array.from({ length: 12 }, (_, index) => {
          const month = `${String(view.start).padStart(4, '0')}-${String(index + 1).padStart(2, '0')}`;
          const active = selected.includes(month);
          return <button key={month} aria-label={`${view.start}년 ${index + 1}월 분석`} aria-pressed={active} disabled={active ? selected.length === 1 : selected.length === 12} onClick={() => onChange(toggleAnalysisMonth(selected, month))}>{index + 1}</button>;
        }) : getYearChoices(view).map(year => <button key={year} aria-label={`${year}년 분석 월 선택`} onClick={() => setView({ level: 0, start: year })}>{year}</button>)}
      </div>
      <div className="analysis-period-footer"><span>최대 12개월 · {selected.length}개월 선택</span><button onClick={() => { setOpen(false); trigger.current?.focus(); }}>닫기</button></div>
      <div className="analysis-month-list">{selected.map(month => <span key={month}>{month.replace('-', '.')}</span>)}</div>
    </div>}
  </div>;
}

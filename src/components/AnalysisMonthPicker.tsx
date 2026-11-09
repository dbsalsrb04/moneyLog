import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { getYearChoices, MAX_YEAR, MIN_YEAR, yearView } from '../monthPicker';

type Props = {
  selected: string;
  onChange: (month: string) => void;
  label?: string;
  allowAllYears?: boolean;
};
const FIRST_YEAR = 2020;
const LAST_YEAR = 2031;

export default function AnalysisMonthPicker({ selected, onChange, label = '분석', allowAllYears = false }: Props) {
  const year = Number(selected.slice(0, 4));
  const minYear = allowAllYears ? MIN_YEAR : FIRST_YEAR;
  const maxYear = allowAllYears ? MAX_YEAR : LAST_YEAR;
  const years = allowAllYears
    ? getYearChoices(yearView(year))
    : Array.from({ length: LAST_YEAR - FIRST_YEAR + 1 }, (_, index) => FIRST_YEAR + index);
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const yearGrid = useRef<HTMLDivElement>(null);
  const id = useId();
  useEffect(() => { setOpen(false); }, [selected]);

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);

  useEffect(() => {
    if (open) (yearGrid.current?.querySelector<HTMLButtonElement>('[aria-pressed="true"]') ?? yearGrid.current?.querySelector('button'))?.focus();
  }, [open]);

  function changeYear(next: number, restoreFocus = false) {
    const value = Math.max(minYear, Math.min(maxYear, next));
    onChange(`${String(value).padStart(4, '0')}-${selected.slice(5)}`);
    setOpen(false);
    if (restoreFocus) trigger.current?.focus();
  }

  function gridKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('button')];
    const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const columns = getComputedStyle(event.currentTarget).gridTemplateColumns.split(' ').length;
    const delta = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -columns, ArrowDown: columns }[event.key];
    if (delta === undefined && event.key !== 'Home' && event.key !== 'End') return;
    event.preventDefault();
    const index = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : current + (delta ?? 0);
    buttons[index]?.focus();
  }

  return <div className="analysis-period" ref={root} onKeyDown={event => {
    if (event.key === 'Escape' && open) { event.preventDefault(); setOpen(false); trigger.current?.focus(); }
  }} onBlur={event => {
    if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  }}>
    <div className="analysis-year-heading">
      <button ref={trigger} className="analysis-year-trigger" aria-label={`${label} 연도 선택`} aria-haspopup="dialog" aria-expanded={open} aria-controls={id} onClick={() => setOpen(previous => !previous)}>{year}년</button>
      {open && <div className="analysis-period-popup" id={id} role="dialog" aria-label={`${label} 연도 선택`} aria-modal="false">
        <div className="month-picker-grid" ref={yearGrid} onKeyDown={gridKeyDown}>
          {years.map(choice => <button key={choice} aria-label={`${choice}년 ${label} 월 선택`} aria-pressed={choice === year} onClick={() => changeYear(choice, true)}>{choice}</button>)}
        </div>
      </div>}
    </div>
    <div className="analysis-month-navigation">
      <button className="picker-page-arrow" aria-label={`${label} 이전 연도`} disabled={year <= minYear} onClick={() => changeYear(year - 1)}>{'<'}</button>
      <div className="month-picker-grid analysis-month-buttons" role="group" aria-label={`${label} 월 선택`} onKeyDown={gridKeyDown}>
        {Array.from({ length: 12 }, (_, index) => {
          const month = `${String(year).padStart(4, '0')}-${String(index + 1).padStart(2, '0')}`;
          return <button key={month} aria-label={`${year}년 ${index + 1}월 ${label}`} aria-pressed={selected === month} onClick={() => {
            onChange(month);
            setOpen(false);
          }}>{index + 1}월</button>;
        })}
      </div>
      <button className="picker-page-arrow" aria-label={`${label} 다음 연도`} disabled={year >= maxYear} onClick={() => changeYear(year + 1)}>{'>'}</button>
    </div>
  </div>;
}

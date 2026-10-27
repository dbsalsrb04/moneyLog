import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';

type Props = { selected: string; onChange: (month: string) => void };
const FIRST_YEAR = 2020;
const LAST_YEAR = 2031;

export default function AnalysisMonthPicker({ selected, onChange }: Props) {
  const year = Number(selected.slice(0, 4));
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const yearGrid = useRef<HTMLDivElement>(null);
  const id = useId();

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
    const value = Math.max(FIRST_YEAR, Math.min(LAST_YEAR, next));
    onChange(`${value}-${selected.slice(5)}`);
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
    if (event.key === 'Escape') { event.preventDefault(); setOpen(false); trigger.current?.focus(); }
  }} onBlur={event => {
    if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  }}>
    <div className="analysis-year-heading">
      <button ref={trigger} className="analysis-year-trigger" aria-label="분석 연도 선택" aria-haspopup="dialog" aria-expanded={open} aria-controls={id} onClick={() => setOpen(previous => !previous)}>{year}년</button>
      {open && <div className="analysis-period-popup" id={id} role="dialog" aria-label="분석 연도 선택" aria-modal="false">
        <div className="month-picker-grid" ref={yearGrid} onKeyDown={gridKeyDown}>
          {Array.from({ length: LAST_YEAR - FIRST_YEAR + 1 }, (_, index) => FIRST_YEAR + index).map(choice => <button key={choice} aria-label={`${choice}년 분석 월 선택`} aria-pressed={choice === year} onClick={() => changeYear(choice, true)}>{choice}</button>)}
        </div>
      </div>}
    </div>
    <div className="analysis-month-navigation">
      <button className="picker-page-arrow" aria-label="분석 이전 연도" disabled={year <= FIRST_YEAR} onClick={() => changeYear(year - 1)}>{'<'}</button>
      <div className="month-picker-grid analysis-month-buttons" role="group" aria-label="분석 월 선택" onKeyDown={gridKeyDown}>
        {Array.from({ length: 12 }, (_, index) => {
          const month = `${String(year).padStart(4, '0')}-${String(index + 1).padStart(2, '0')}`;
          return <button key={month} aria-label={`${year}년 ${index + 1}월 분석`} aria-pressed={selected === month} onClick={() => {
            onChange(month);
            setOpen(false);
          }}>{index + 1}월</button>;
        })}
      </div>
      <button className="picker-page-arrow" aria-label="분석 다음 연도" disabled={year >= LAST_YEAR} onClick={() => changeYear(year + 1)}>{'>'}</button>
    </div>
  </div>;
}

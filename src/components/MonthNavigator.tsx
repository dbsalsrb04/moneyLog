import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { canZoomOut, getYearChoices, pageView, stepMonth, viewEndYear, zoomOut, type PickerView } from '../monthPicker';

type Props = { month: string; onChange: (month: string) => void };

export default function MonthNavigator({ month, onChange }: Props) {
  const year = Number(month.slice(0, 4));
  const monthNumber = Number(month.slice(5));
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<PickerView>({ level: 0, start: year });
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  const dialogId = useId();

  useEffect(() => {
    setOpen(false);
    setView({ level: 0, start: year });
  }, [month, year]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setOpen(false);
      trigger.current?.focus();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onEscape);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const buttons = grid.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)');
    if (!buttons?.length) return;
    const target = view.level === 0 ? buttons[monthNumber - 1] : grid.current?.querySelector<HTMLButtonElement>('[aria-pressed="true"]');
    (target ?? buttons[0]).focus();
  }, [open, view.level, view.start, monthNumber]);

  function changeMonth(value: string) {
    setOpen(false);
    onChange(value);
    trigger.current?.focus();
  }

  function gridKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('button')];
    const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const delta = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -4, ArrowDown: 4 }[event.key];
    if (delta === undefined && event.key !== 'Home' && event.key !== 'End') return;
    event.preventDefault();
    let index = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : current + (delta ?? 0);
    const direction = delta !== undefined && delta < 0 || event.key === 'End' ? -1 : 1;
    while (index >= 0 && index < buttons.length && buttons[index].disabled) index += direction;
    buttons[index]?.focus();
  }

  const heading = view.level === 0 ? `${view.start}년` : `${view.start}–${viewEndYear(view)}년`;
  return <div className="month-navigator" ref={root} onBlur={event => {
    if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  }}>
    <div className="month-navigation" role="group" aria-label="세부 내역 월 이동">
      <button className="day-arrow" aria-label="이전 달" disabled={month === '0001-01'} onClick={() => changeMonth(stepMonth(month, -1))}>{'<'}</button>
      <button
        ref={trigger}
        className="month-picker-trigger"
        aria-label="세부 내역 조회 월"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={dialogId}
        onClick={() => {
          if (!open) setView({ level: 0, start: year });
          setOpen(previous => !previous);
        }}
      >{year}년 {monthNumber}월</button>
      <button className="day-arrow" aria-label="다음 달" disabled={month === '9999-12'} onClick={() => changeMonth(stepMonth(month, 1))}>{'>'}</button>
    </div>
    {open && <div id={dialogId} className="month-picker-popup" role="dialog" aria-label="조회 월 선택" aria-modal="false">
      <div className="month-picker-heading">
        <button className="picker-page-arrow" aria-label={view.level === 0 ? '이전 연도' : '이전 연도 구간'} disabled={view.start === 1} onClick={() => setView(previous => pageView(previous, -1))}>{'<'}</button>
        <button className="picker-zoom" aria-label={view.level === 0 ? '연도 선택' : '더 넓은 연도 범위 선택'} disabled={!canZoomOut(view)} onClick={() => setView(previous => zoomOut(previous))}>
          <span>{heading}</span><span aria-hidden="true">…</span>
        </button>
        <button className="picker-page-arrow" aria-label={view.level === 0 ? '다음 연도' : '다음 연도 구간'} disabled={viewEndYear(view) === 9999} onClick={() => setView(previous => pageView(previous, 1))}>{'>'}</button>
      </div>
      <div ref={grid} className="month-picker-grid" role="group" aria-label={view.level === 0 ? '월 목록' : view.level === 1 ? '연도 목록' : '연도 범위 목록'} onKeyDown={gridKeyDown}>
        {view.level === 0 ? Array.from({ length: 12 }, (_, index) => <button
          key={`month-${index}`}
          aria-label={`${view.start}년 ${index + 1}월 선택`}
          aria-pressed={view.start === year && index + 1 === monthNumber}
          onClick={() => changeMonth(`${String(view.start).padStart(4, '0')}-${String(index + 1).padStart(2, '0')}`)}
        >{index + 1}</button>) : getYearChoices(view).map(choice => <button
          key={`year-${view.level}-${choice.start}`}
          disabled={choice.disabled}
          aria-label={choice.disabled ? '선택 불가' : choice.start === choice.end ? `${choice.start}년 선택` : `${choice.start}–${choice.end}년 선택`}
          aria-pressed={!choice.disabled && year >= choice.start && year <= choice.end}
          onClick={() => setView({ level: view.level - 1, start: choice.start })}
        >{choice.disabled ? '—' : choice.start === choice.end ? choice.start : <>{choice.start}<span className="picker-range-separator">–</span>{choice.end}</>}</button>)}
      </div>
    </div>}
  </div>;
}

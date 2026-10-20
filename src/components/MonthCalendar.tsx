import { getMonthStartWeekday, TRANSACTION_PARTS, type CalendarDay, type TransactionPart } from '../data';

type Props = {
  days: CalendarDay[];
  selectedDate: string;
  onSelect: (day: number) => void;
};

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const formatAmount = (part: TransactionPart, amount: number) => {
  if (part === 'R') return `${amount < 0 ? '' : '+'}${amount.toLocaleString('ko-KR')}`;
  if (part === 'E') return `${amount < 0 ? '+' : '-'}${Math.abs(amount).toLocaleString('ko-KR')}`;
  return amount.toLocaleString('ko-KR');
};

export default function MonthCalendar({ days, selectedDate, onSelect }: Props) {
  const offset = getMonthStartWeekday(days[0].dateKey.slice(0, 7));
  const trailing = (7 - (offset + days.length) % 7) % 7;

  return <div className="month-calendar" role="group" aria-label="월간 거래 캘린더">
    <div className="calendar-legend">{TRANSACTION_PARTS.map(part => <span key={part.value} className={`calendar-part-${part.value}`}>{part.label}</span>)}</div>
    <div className="calendar-weekdays" aria-hidden="true">{WEEKDAYS.map(day => <span key={day}>{day}</span>)}</div>
    <div className="calendar-grid">
      {Array.from({ length: offset }, (_, index) => <div className="calendar-blank" aria-hidden="true" key={`before-${index}`} />)}
      {days.map((day, index) => <button
        key={day.dateKey}
        className="calendar-day"
        aria-label={`${day.dateKey} 선택`}
        aria-pressed={day.dateKey === selectedDate}
        title={[day.dateKey, ...TRANSACTION_PARTS.map(part => `${part.label} ${formatAmount(part.value, day.totals[part.value])}`)].join('\n')}
        onClick={() => onSelect(index + 1)}
      >
        <span className="calendar-day-number">{index + 1}</span>
        <span className="calendar-day-amounts">{TRANSACTION_PARTS.map(part => {
          const text = formatAmount(part.value, day.totals[part.value]);
          return <span
            key={part.value}
            className={`calendar-amount calendar-part-${part.value}`}
            aria-label={`${part.label} ${text}`}
            // Fit long amounts on one line even in narrow calendar cells.
            style={{ fontSize: `min(11px, calc(100cqi / ${text.length * 0.65}))` }}
          >{text}</span>;
        })}</span>
      </button>)}
      {Array.from({ length: trailing }, (_, index) => <div className="calendar-blank" aria-hidden="true" key={`after-${index}`} />)}
    </div>
  </div>;
}

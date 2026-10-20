import { useMemo, useState } from 'react';
import { CalendarDays, List } from 'lucide-react';
import { getDailyDetails, getMonthlyCalendar, won, type CalendarDay, type DayDetails, type Transaction } from '../data';
import MonthCalendar from './MonthCalendar';

// Display names confirmed by the user. Ask before adding names for other keys.
const FIELD_LABELS = {
  dateKey: '날짜',
  category: '카테고리',
  amount: '금액',
  memo: '메모',
  tags: '태그',
} as const;

type Props = {
  transactions: Transaction[];
  calendarTransactions: Transaction[];
  month: string;
  months: string[];
  partLabel: string;
  onMonthChange: (month: string) => void;
};

function DayPages({ pages, calendarDays }: { pages: DayDetails[]; calendarDays: CalendarDay[] }) {
  const [day, setDay] = useState(1);
  const page = pages[day - 1];
  return <>
    <MonthCalendar days={calendarDays} selectedDate={page.dateKey} onSelect={setDay} />
    <div className="day-navigation">
      <button className="day-arrow" aria-label="이전 날짜" disabled={day === 1} onClick={() => setDay(day - 1)}>{'<'}</button>
      <div className="day-heading" aria-live="polite" aria-atomic="true">
        <span>{FIELD_LABELS.dateKey}</span>
        <h3><time dateTime={page.dateKey}>{page.dateKey}</time></h3>
        <span className="day-page-number">{day} / {pages.length}</span>
      </div>
      <button className="day-arrow" aria-label="다음 날짜" disabled={day === pages.length} onClick={() => setDay(day + 1)}>{'>'}</button>
    </div>
    <div key={page.dateKey} className="detail-body" role="group" aria-label={`${page.dateKey} 세부 내역`}>
      {page.transactions.length ? <>
        <div className="detail-columns" aria-hidden="true">
          <span>{FIELD_LABELS.category}</span><span className="detail-amount">{FIELD_LABELS.amount}</span><span>{FIELD_LABELS.memo}</span><span>{FIELD_LABELS.tags}</span>
        </div>
        {page.transactions.map((transaction, index) => <dl className="detail-entry" key={`${transaction.id}-${index}`}>
          <div><dt>{FIELD_LABELS.category}</dt><dd>{transaction.category || '—'}</dd></div>
          <div className="detail-amount"><dt>{FIELD_LABELS.amount}</dt><dd>{won(transaction.amount)}</dd></div>
          <div><dt>{FIELD_LABELS.memo}</dt><dd className="detail-memo">{transaction.memo || '—'}</dd></div>
          <div><dt>{FIELD_LABELS.tags}</dt><dd className="detail-tags">{transaction.tags.length ? transaction.tags.map((tag, tagIndex) => <span className="detail-tag" key={`${tag}-${tagIndex}`}>{tag}</span>) : '—'}</dd></div>
        </dl>)}
      </> : <p className="detail-empty">해당 날짜에 조건과 일치하는 내역이 없습니다.</p>}
    </div>
  </>;
}

export default function DailyDetails({ transactions, calendarTransactions, month, months, partLabel, onMonthChange }: Props) {
  const pages = useMemo(() => getDailyDetails(transactions, month), [transactions, month]);
  const calendarDays = useMemo(() => getMonthlyCalendar(calendarTransactions, month), [calendarTransactions, month]);
  return <section className="card detail-card" aria-label={`세부 ${partLabel}`}>
    <div className="chart-header">
      <div className="chart-title"><span className="icon-box"><List size={18} /></span><h2>세부 {partLabel}</h2></div>
      <label className="month-select"><CalendarDays size={14} /><select aria-label="세부 내역 조회 월" value={month} onChange={event => onMonthChange(event.target.value)}>
        {months.map(value => <option key={value} value={value}>{value.split('-')[0]}년 {Number(value.split('-')[1])}월</option>)}
      </select></label>
    </div>
    <DayPages key={month} pages={pages} calendarDays={calendarDays} />
  </section>;
}

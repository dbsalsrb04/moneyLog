import { Fragment, useId, useLayoutEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { won, type DayDetails } from '../data';

export type AnalysisPopupPoint = { x: number; y: number };

const GUTTER = 8;

export function positionAnalysisPopup(element: HTMLElement, point: AnalysisPopupPoint) {
  const { width, height } = element.getBoundingClientRect();
  element.style.left = `${Math.max(GUTTER, Math.min(point.x + 10, window.innerWidth - width - GUTTER))}px`;
  element.style.top = `${Math.max(GUTTER, Math.min(point.y + 10, window.innerHeight - height - GUTTER))}px`;
}

type Props = {
  title: string;
  days: DayDetails[];
  point: AnalysisPopupPoint;
  beside?: HTMLElement;
  closeLabel?: string;
  onClose: () => void;
  restoreFocus: () => void;
};

export default function TransactionDetailsPopup({ title, days, point, beside, closeLabel = '거래 내역 닫기', onClose, restoreFocus }: Props) {
  const popup = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useLayoutEffect(() => {
    const element = popup.current!;
    element.showPopover();

    function position() {
      if (!beside) {
        positionAnalysisPopup(element, point);
        return;
      }

      positionAnalysisPopup(beside, point);
      const parent = beside.getBoundingClientRect();
      const { width, height } = element.getBoundingClientRect();
      if (parent.width + width + GUTTER * 3 <= window.innerWidth) {
        const left = Math.min(parent.right + GUTTER, window.innerWidth - width - GUTTER);
        beside.style.left = `${left - parent.width - GUTTER}px`;
        element.style.left = `${left}px`;
        element.style.top = `${Math.min(parent.top, window.innerHeight - height - GUTTER)}px`;
        return;
      }

      const top = parent.top > window.innerHeight - parent.bottom
        ? parent.top - height - GUTTER
        : parent.bottom + GUTTER;
      element.style.left = `${Math.min(parent.left, window.innerWidth - width - GUTTER)}px`;
      element.style.top = `${Math.max(GUTTER, Math.min(top, window.innerHeight - height - GUTTER))}px`;
    }

    position();
    closeButton.current?.focus({ preventScroll: true });
    window.addEventListener('resize', position);
    return () => {
      window.removeEventListener('resize', position);
      element.hidePopover();
      if (beside?.matches(':popover-open')) positionAnalysisPopup(beside, point);
    };
  }, [point, beside]);

  function close() {
    onClose();
    restoreFocus();
  }

  let rowIndex = 0;
  return <div
    ref={popup}
    className="category-transactions-popup"
    popover="auto"
    role="dialog"
    aria-labelledby={titleId}
    onToggle={event => { if (event.target === event.currentTarget && event.newState === 'closed') onClose(); }}
    onKeyDown={event => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      close();
    }}
  >
    <div className="other-popup-header category-transactions-header">
      <h3 id={titleId}>{title}</h3>
      <button ref={closeButton} type="button" aria-label={closeLabel} onClick={close}><X size={16} /></button>
    </div>
    <div className="other-popup-scroll category-transactions-scroll">
      {days.length === 0 && <p>해당 날짜에 조건과 일치하는 내역이 없습니다.</p>}
      {days.map(day => <section className="category-transactions-day" key={day.dateKey}>
        {(days.length > 1 || title !== day.dateKey) && <h4><time dateTime={day.dateKey}>{day.dateKey}</time></h4>}
        <ul>
          {day.transactions.map((transaction, index) => {
            const animationDelay = `${rowIndex * 20}ms`;
            rowIndex += 1;
            return <li key={`${transaction.id}-${index}`} className="category-transaction other-category-row" style={{ animationDelay }}>
              <strong>{won(transaction.amount)}</strong>
              <span>{transaction.memo || '—'}</span>
              <span className="detail-tags">
                {transaction.tags.length ? transaction.tags.map((tag, tagIndex) => <Fragment key={`${tag}-${tagIndex}`}>
                  {tagIndex > 0 && ' '}
                  <span className="detail-tag">#{tag}</span>
                </Fragment>) : '—'}
              </span>
            </li>;
          })}
        </ul>
      </section>)}
    </div>
  </div>;
}

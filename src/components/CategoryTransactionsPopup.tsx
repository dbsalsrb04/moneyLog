import { Fragment, useId, useLayoutEffect, useMemo, useRef } from 'react';
import { X } from 'lucide-react';
import { analysisCategory, type CategoryGrouping } from '../analysis';
import { getDailyDetails, won, type Transaction } from '../data';

export type AnalysisPopupPoint = { x: number; y: number };

const GUTTER = 8;

export function positionAnalysisPopup(element: HTMLElement, point: AnalysisPopupPoint) {
  const { width, height } = element.getBoundingClientRect();
  element.style.left = `${Math.max(GUTTER, Math.min(point.x + 10, window.innerWidth - width - GUTTER))}px`;
  element.style.top = `${Math.max(GUTTER, Math.min(point.y + 10, window.innerHeight - height - GUTTER))}px`;
}

type Props = {
  category: string;
  grouping: CategoryGrouping;
  transactions: Transaction[];
  month: string;
  point: AnalysisPopupPoint;
  beside?: HTMLElement;
  onClose: () => void;
  restoreFocus: () => void;
};

export default function CategoryTransactionsPopup({ category, grouping, transactions, month, point, beside, onClose, restoreFocus }: Props) {
  const popup = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const days = useMemo(() => {
    const matching = transactions.filter(transaction => analysisCategory(transaction.category, grouping) === category);
    return getDailyDetails(matching, month).filter(day => day.transactions.length);
  }, [transactions, month, grouping, category]);

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
      <h3 id={titleId}>{category}</h3>
      <button ref={closeButton} type="button" aria-label="카테고리 내역 닫기" onClick={close}><X size={16} /></button>
    </div>
    <div className="other-popup-scroll category-transactions-scroll">
      {days.map(day => <section className="category-transactions-day" key={day.dateKey}>
        <h4><time dateTime={day.dateKey}>{day.dateKey}</time></h4>
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

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search, X } from 'lucide-react';
import { getFilterOptions, TRANSACTION_PARTS, won, type Transaction } from '../data';
import { formatSearchDate, getSearchTotals, searchTransactions } from '../search';
import FilterPanel from './FilterPanel';
import MemoPreview from './MemoPreview';

type Props = { transactions: Transaction[]; onClose: () => void };

export default function SearchDialog({ transactions, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [showCategories, setShowCategories] = useState(() => !window.matchMedia('(max-width: 760px)').matches);
  const [showTags, setShowTags] = useState(() => !window.matchMedia('(max-width: 760px)').matches);
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const resultsList = useRef<HTMLDivElement>(null);
  const backdropPointerDown = useRef(false);
  const id = useId();
  const options = useMemo(() => getFilterOptions(transactions, null), [transactions]);
  const results = useMemo(() => searchTransactions(transactions, query, categories, tags), [transactions, query, categories, tags]);
  const totals = useMemo(() => getSearchTotals(results), [results]);

  useEffect(() => {
    const element = dialog.current!;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement;
    element.showModal();
    document.body.style.overflow = 'hidden';
    input.current?.focus();
    return () => {
      element.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, []);

  useEffect(() => {
    resultsList.current?.scrollTo({ top: 0 });
    dialog.current?.querySelectorAll<HTMLElement>('.memo-popover:popover-open').forEach(element => element.hidePopover());
  }, [query, categories, tags]);

  return createPortal(<dialog
    ref={dialog}
    className="search-dialog"
    aria-labelledby={`${id}-title`}
    aria-modal="true"
    onCancel={event => { event.preventDefault(); onClose(); }}
    onPointerDownCapture={event => {
      const bounds = event.currentTarget.getBoundingClientRect();
      backdropPointerDown.current = event.target === event.currentTarget && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom);
    }}
    onPointerCancel={() => { backdropPointerDown.current = false; }}
    onKeyDown={event => {
      if (event.key === 'Escape') {
        const memo = event.currentTarget.querySelector<HTMLElement>('.memo-popover:popover-open');
        if (memo) {
          event.preventDefault();
          event.stopPropagation();
          memo.hidePopover();
        }
        return;
      }
      if (event.key !== 'Tab') return;
      const controls = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), [tabindex="0"]')]
        .filter(element => element.getClientRects().length > 0);
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first?.focus();
      }
    }}
    onClick={event => {
      const startedOnBackdrop = backdropPointerDown.current;
      backdropPointerDown.current = false;
      if (!startedOnBackdrop || event.target !== event.currentTarget) return;
      const bounds = event.currentTarget.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose();
    }}
  >
    <div className="search-dialog-header">
      <h2 id={`${id}-title`}><Search className="memo-search-icon" size={20} />검색</h2>
      <button className="search-close" aria-label="검색 닫기" onClick={onClose}><X size={21} /></button>
    </div>
    <div className="search-dialog-body">
      <div className="search-main">
        <div className="search-controls">
          <label className="memo-search-field">
            <Search className="memo-search-icon" size={19} />
            <span className="sr-only">메모 검색</span>
            <input ref={input} type="search" placeholder="메모 검색" value={query} onChange={event => setQuery(event.target.value)} />
          </label>
        </div>
        <section className="search-summary" aria-label="검색 결과 합산">
          <div className="search-summary-heading"><h3>검색 결과 합산</h3><span role="status">{results.length.toLocaleString('ko-KR')}건</span></div>
          <div className="search-totals">{TRANSACTION_PARTS.map(part => <div key={part.value} className={`calendar-part-${part.value}`}>
            <span>{part.label}</span><strong data-testid={`search-total-${part.value}`}>{won(totals[part.value])}</strong>
          </div>)}</div>
        </section>
        <div ref={resultsList} className="search-results" role="list" aria-label="검색 결과" tabIndex={0}>
          {results.length ? results.map((transaction, index) => <dl className="search-result" role="listitem" key={`${transaction.id}-${index}`}>
            <div><dt className="sr-only">날짜</dt><dd><time dateTime={transaction.dateKey}>{formatSearchDate(transaction.dateKey)}</time></dd></div>
            <div className="search-result-amount"><dt className="sr-only">금액</dt><dd className={`calendar-part-${transaction.part}`} aria-label={`${TRANSACTION_PARTS.find(part => part.value === transaction.part)!.label} ${won(transaction.amount)}`}>{won(transaction.amount)}</dd></div>
            <div><dt className="sr-only">메모</dt><dd className="search-result-memo"><MemoPreview memo={transaction.memo} /></dd></div>
            <div><dt className="sr-only">카테고리</dt><dd>{transaction.category || '—'}</dd></div>
            <div><dt className="sr-only">태그</dt><dd className="detail-tags">{transaction.tags.length ? transaction.tags.map((tag, tagIndex) => <span className="detail-tag" key={`${tag}-${tagIndex}`}>{tag}</span>) : '—'}</dd></div>
          </dl>) : <p className="search-empty">검색 결과가 없습니다.</p>}
        </div>
      </div>
      <aside className="search-sidebar" aria-label="검색 필터">
        <div className="search-filter-section">
          <button className="search-filter-toggle" aria-expanded={showCategories} aria-controls={`${id}-categories`} onClick={() => setShowCategories(previous => !previous)}>
            카테고리별{categories.length > 0 && <span className="search-filter-count">{categories.length}</span>}<ChevronDown size={15} />
          </button>
          <div id={`${id}-categories`} hidden={!showCategories}>
            <FilterPanel kind="category" options={options.categories} recordedCategories={options.recordedCategories} selected={categories} onChange={setCategories} />
          </div>
        </div>
        <div className="search-filter-section">
          <button className="search-filter-toggle" aria-expanded={showTags} aria-controls={`${id}-tags`} onClick={() => setShowTags(previous => !previous)}>
            태그별{tags.length > 0 && <span className="search-filter-count">{tags.length}</span>}<ChevronDown size={15} />
          </button>
          <div id={`${id}-tags`} hidden={!showTags}>
            <FilterPanel kind="tag" options={options.tags} selected={tags} onChange={setTags} />
          </div>
        </div>
      </aside>
    </div>
  </dialog>, document.body);
}
